import { spawnSync } from 'node:child_process';
import type { ExtensionContext, TextDocument, DiagnosticCollection } from 'vscode';
import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Ajv, { ValidateFunction } from 'ajv';

const ajv = new Ajv();

interface TemplateValidatorResult {
    identifier: string,
    path: string,
    errors: TemplateValidatorResultError[],
    deprecations: TemplateValidatorResultDeprecation[],
}

interface TemplateValidatorResultError {
    file: string,
    line: number,
    message: string,
    templateLocation?: {
        identifierOrPath: string,
        line: number,
        character: number,
    },
}

interface TemplateValidatorResultDeprecation {
    file: string,
    line: number,
    message: string
}

interface BinaryCommand {
    command: string,
    args: string[],
}

const userBinaries = {
    typo3: '',
    fluid: '',
    useDdevIfAvailable: true,
};
let binaryPathCache: { [key: string]: BinaryCommand} = {};
let validateFluidAnalyzeResult: ValidateFunction<TemplateValidatorResult>;
let diagnosticCollection: DiagnosticCollection;

export async function activate(ctx: ExtensionContext) {
    validateFluidAnalyzeResult = ajv.compile<TemplateValidatorResult>(JSON.parse(fs.readFileSync(path.join(ctx.extensionPath, 'client', 'fluidAnalyze.schema.json'), 'utf-8')));

    userBinaries.typo3 = vscode.workspace.getConfiguration('fluid.bin').get('typo3');
    userBinaries.fluid = vscode.workspace.getConfiguration('fluid.bin').get('fluid');
    userBinaries.useDdevIfAvailable = vscode.workspace.getConfiguration('fluid.bin').get('useDdevIfAvailable');
    ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('fluid.bin')) {
            userBinaries.typo3 = vscode.workspace.getConfiguration('fluid.bin').get('typo3');
            userBinaries.fluid = vscode.workspace.getConfiguration('fluid.bin').get('fluid');
            userBinaries.useDdevIfAvailable = vscode.workspace.getConfiguration('fluid.bin').get('useDdevIfAvailable');
            binaryPathCache = {};
        }
    }));

    diagnosticCollection = vscode.languages.createDiagnosticCollection('fluid');
    ctx.subscriptions.push(diagnosticCollection);
    ctx.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            updateDiagnostics(editor.document, diagnosticCollection);
        }
    }));
    ctx.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document && e.document.uri) {
            updateDiagnostics(e.document, diagnosticCollection);
        }
    }));
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
    }
}

function tryAndVerifyAnalyzeCommand(command: BinaryCommand, input, cwd): TemplateValidatorResult|null {
    try {
        const process = spawnSync(command.command, command.args, { input, cwd });
        const data = JSON.parse(process.stdout.toString());
        if (validateFluidAnalyzeResult(data)) {
            return data;
        }
    } catch (err) {
        // console.error(err);
    }
    return null;
}

function analyzeTemplate(document: TextDocument): TemplateValidatorResult|null {
    if (document.uri.scheme !== 'file' || (document.languageId !== 'fluid' && document.languageId !== 'html-fluid')) {
        return null;
    }
    const workspacePath = vscode.workspace.getWorkspaceFolder(document.uri).uri.fsPath;
    if (binaryPathCache[workspacePath]) {
        const data = tryAndVerifyAnalyzeCommand(binaryPathCache[workspacePath], document.getText(), workspacePath);
        if (data) {
            return data;
        }
    }

    const candidates: BinaryCommand[] = [];
    const isDdevProject = userBinaries.useDdevIfAvailable ? fs.existsSync(path.join(workspacePath, '.ddev')) : false;
    const ddev = isDdevProject ? spawnSync('which', ['ddev'], { shell: true }).stdout.toString().trim() : '';

    if (userBinaries.typo3) {
        candidates.push({
            command: userBinaries.typo3,
            args: ['fluid:analyze', '--json', '--stdin'],
        });
    }
    if (userBinaries.fluid) {
        candidates.push({
            command: userBinaries.fluid,
            args: ['analyze', '--json', '--stdin'],
        });
    }
    if (isDdevProject && ddev) {
        candidates.push({
            command: ddev,
            args: ['typo3', 'fluid:analyze', '--json', '--stdin'],
        });
    }
    for (const typo3Binary of ['vendor/bin/typo3', 'bin/typo3', '.Build/bin/typo3']) {
        candidates.push({
            command: path.join(workspacePath, typo3Binary),
            args: ['fluid:analyze', '--json', '--stdin'],
        });
    }
    const fluidBinaryPaths = ['vendor/bin/fluid', 'bin/fluid', '.Build/bin/fluid'];
    if (isDdevProject && ddev) {
        for (const fluidBinary of fluidBinaryPaths) {
            candidates.push({
                command: ddev,
                args: ['exec', fluidBinary, 'analyze', '--json', '--stdin'],
            });
        }
    }
    for (const fluidBinary of fluidBinaryPaths) {
        candidates.push({
            command: fluidBinary,
            args: ['analyze', '--json', '--stdin'],
        });
    }

    // TODO show error if custom path has been defined but didn't work

    for (const candidate of candidates) {
        const data = tryAndVerifyAnalyzeCommand(candidate, document.getText(), workspacePath);
        if (data) {
            binaryPathCache[workspacePath] = candidate;
            console.log('Using "%s" as binary to analyze template.', [candidate.command, ...candidate.args].join(' '));
            return data;
        }
    }
    return null;
}


function updateDiagnostics(document: TextDocument, collection: DiagnosticCollection): void {
    const analyzeResult = analyzeTemplate(document);
    if (!analyzeResult) {
        collection.delete(document.uri);
        return;
    }
    const diagnostics = [];
    analyzeResult.errors.forEach(error => {
        const matches = error.message.match(/Fluid parse error in template .*, line [0-9]+ at character [0-9]+. Error: (.*?)(?: Template source chunk:|$)/);
        const position = error.templateLocation
            ? new vscode.Position(Number(error.templateLocation?.line ?? 1) - 1, Number(error.templateLocation?.character ?? 1) - 1)
            : new vscode.Position(0, 0);
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            (matches && matches[1]) ? matches[1] : error.message,
            vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
    });
    analyzeResult.deprecations.forEach(deprecation => {
        const position = new vscode.Position(Number(deprecation.line) - 1, 0);
        const diagnostic = new vscode.Diagnostic(new vscode.Range(position, position), deprecation.message, vscode.DiagnosticSeverity.Information);
        diagnostics.push(diagnostic);
    });
    collection.set(document.uri, diagnostics);
}
