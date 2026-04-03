import { spawnSync } from 'child_process';
import { hash } from 'crypto';
import type { CompletionItem, ExtensionContext, ProviderResult, Hover } from 'vscode';
import * as vscode from 'vscode';

let diagnosticCollection: vscode.DiagnosticCollection;
let fluidBinary;

export function activate(ctx: ExtensionContext) {
	fluidBinary = vscode.workspace.getConfiguration('fluid').get('fluidBinary');

	if (fluidBinary !== '') {
		diagnosticCollection = vscode.languages.createDiagnosticCollection('fluid');
		ctx.subscriptions.push(diagnosticCollection);
		ctx.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				updateDiagnostics(editor.document, diagnosticCollection);
			}
		}));
		ctx.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
			updateDiagnostics(e.document, diagnosticCollection);
		}));
		if (vscode.window.activeTextEditor) {
			updateDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
		}
	} else {
		console.log('Skipping file validation because Fluid CLI path is not set in configuration.');
	}

	const virtualDocumentContents = new Map<string, string>();

	vscode.workspace.registerTextDocumentContentProvider('embedded-content', {
		provideTextDocumentContent: uri => {
			const decodedUri = decodeURIComponent(uri.path.slice(1));
			return virtualDocumentContents.get(decodedUri);
		}
	});

	vscode.languages.registerHoverProvider('html-fluid', {
		async provideHover(document, position, token) {
			const embeddedContentIdentifier = hash('sha256', document.uri.toString(true)) + '.html';
			virtualDocumentContents.set(embeddedContentIdentifier, document.getText());
			const vdocUriString = `embedded-content://html/${encodeURIComponent(embeddedContentIdentifier)}`;
			const vdocUri = vscode.Uri.parse(vdocUriString);
			const result = await vscode.commands.executeCommand<Hover[]>(
				'vscode.executeHoverProvider',
				vdocUri,
				position,
			);
			return Promise.resolve(result[0]) as ProviderResult<Hover>;
		}
	});

	vscode.languages.registerCompletionItemProvider('html-fluid', {
		async provideCompletionItems(document, position, token, context) {
			const embeddedContentIdentifier = hash('sha256', document.uri.toString(true)) + '.html';
			virtualDocumentContents.set(embeddedContentIdentifier, document.getText());
			const vdocUriString = `embedded-content://html/${encodeURIComponent(embeddedContentIdentifier)}`;
			const vdocUri = vscode.Uri.parse(vdocUriString);
			return await vscode.commands.executeCommand<CompletionItem[]>(
				'vscode.executeCompletionItemProvider',
				vdocUri,
				position,
				context.triggerCharacter
			);
		},
	});
}

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
	if (fluidBinary === '') {
		return;
	}
	if (document.languageId !== 'fluid' && document.languageId !== 'html-fluid') {
		return;
	}
	const diagnostics = [];
	let result;
	try {
		const fluidCli = spawnSync(vscode.workspace.getWorkspaceFolder(document.uri).uri.fsPath + "/" + fluidBinary, ['analyze'], { input: document.getText() });
		result = JSON.parse(fluidCli.stdout.toString());
	} catch (err) {
		console.error(err);
		return;
	}
	result.errors.forEach(error => {
		const [, line, character, message] = error.message.match(
			/Fluid parse error in template .*, line ([0-9]+) at character ([0-9]+). Error: (.*?)(?: Template source chunk:|$)/
		);
		const position = (line && character) ? new vscode.Position(Number(line) - 1, Number(character) - 1) : new vscode.Position(0, 0);
		const diagnostic = new vscode.Diagnostic(new vscode.Range(position, position), message ?? error.message, vscode.DiagnosticSeverity.Error);
		diagnostics.push(diagnostic);
	});
	result.deprecations.forEach(deprecation => {
		const position = new vscode.Position(Number(deprecation.line) - 1, 0);
		const diagnostic = new vscode.Diagnostic(new vscode.Range(position, position), deprecation.message, vscode.DiagnosticSeverity.Information);
		diagnostics.push(diagnostic);
	});
	collection.set(document.uri, diagnostics);
}