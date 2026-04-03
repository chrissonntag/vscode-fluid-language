import { spawnSync } from 'child_process';
import type { ExtensionContext, TextDocument, DiagnosticCollection } from 'vscode';
import * as vscode from 'vscode';

let fluidBinary;
let diagnosticCollection: DiagnosticCollection;

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
}

function updateDiagnostics(document: TextDocument, collection: DiagnosticCollection): void {
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