import { hash } from 'crypto';
import type { CompletionItem, ExtensionContext, ProviderResult, Hover } from 'vscode';
import * as vscode from 'vscode';

export function activate(context: ExtensionContext) {
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
			console.log('provideHover ' + embeddedContentIdentifier);
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
			console.log('provideCompletionItems ' + embeddedContentIdentifier);
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
