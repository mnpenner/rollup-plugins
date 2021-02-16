const {babel} = require('@rollup/plugin-babel');
const {nodeResolve} = require('@rollup/plugin-node-resolve');
const nodeExternals = require('rollup-plugin-node-externals');
const json = require('@rollup/plugin-json');
const commonjs = require('@rollup/plugin-commonjs');
const findUp = require('find-up');
const {readFileSync} = require('fs');
const packagePlugin = require('@mpen/rollup-plugin-package');

// see also: https://github.com/rollup/rollup-starter-app

module.exports = function rollupPresetTsapp(opts = {}) {
    const tsconfigFile = findUp.sync(opts.tsconfig ?? 'tsconfig.json')
    const tsconfig = JSON.parse(readFileSync(tsconfigFile))
    const extensions = ['.ts'];

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
                optDeps: true,
            }),
            json(),
            babel({
                include: 'src/**',
                extensions,
                comments: false,
                babelHelpers: 'bundled',  // https://github.com/rollup/plugins/tree/master/packages/babel#babelhelpers
                babelrcRoots: ['.', __dirname],  // https://babeljs.io/docs/en/options#babelrcroots
            }),
            nodeResolve({
                extensions,
                preferBuiltins: true
            }),
            packagePlugin(),
        ],
        output: {
            banner: `#!/usr/bin/env -S node --max-old-space-size=${opts.memory ?? 8192} --enable-source-maps`,
            dir: 'dist',
            format: 'cjs',
            sourcemap: true,
        },
    }
}
