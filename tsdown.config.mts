import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: './client/src/extension.ts',
    platform: 'node',
    format: 'cjs',
    outDir: 'client/out/',
    deps: {
        alwaysBundle: ['ajv'],
        neverBundle: ['vscode'],
        onlyBundle: false,
    },
});
