const {nodeResolve} = require('@rollup/plugin-node-resolve')
const nodeExternals = require('rollup-plugin-node-externals');
const json = require('@rollup/plugin-json');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const packagePlugin = require('@mpen/rollup-plugin-package');
const cleanPlugin = require('@mpen/rollup-plugin-clean');
const findUp = require('find-up');
const {readFileSync} = require('fs');

// see also: https://github.com/rollup/rollup-starter-lib

module.exports = function rollupPresetTslib(opts = {}) {
    const tsconfigFile = findUp.sync(opts.tsconfig ?? 'tsconfig.json')
    const tsconfig = JSON.parse(readFileSync(tsconfigFile))

    return {
        input: tsconfig.files,
        plugins: [
            commonjs({
                include: 'node_modules/**',
            }),
            nodeExternals({
                builtins: true,
                deps: true,
                devDeps: false,
                peerDeps: true,
                optDeps: false,
            }),
            json(),
            typescript({
                abortOnError: process.env.NODE_ENV === 'production',
                tsconfig: tsconfigFile,
                ...opts.typescriptOptions,
            }),
            nodeResolve({
                extensions: ['.ts', '.json']
            }),
            packagePlugin(),
            cleanPlugin(),
            ...opts.plugins ?? [],
        ],
        watch: {
            buildDelay: 200,
            ...opts.watch,
        },
        preserveSymlinks: true,  // https://www.npmjs.com/package/@rollup/plugin-commonjs#usage-with-symlinks
        preserveModules: false,  // outputs multiple files

        // https://stackoverflow.com/questions/66216414/rollup-typescript-declarations-in-dist-cjs-es
        output: {
            dir: 'dist',
            format: 'cjs',
            sourcemap: true,
            inlineDynamicImports: false,
        },
    }
}
