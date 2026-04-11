import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: './client/src/extension.ts',
    platform: 'node',
    format: 'cjs',
    outDir: 'client/out/',
    fixedExtension: false,
    deps: {
        alwaysBundle: ['ajv'],
        neverBundle: ['vscode'],
        onlyBundle: false,
    },
});
