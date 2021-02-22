import {babel, RollupBabelInputPluginOptions} from '@rollup/plugin-babel'
// import {nodeResolve} from '@rollup/plugin-node-resolve'
import nodeResolve from '@mpen/rollup-plugin-node-resolve'
import nodeExternals from 'rollup-plugin-node-externals'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import findUp from 'find-up'
import {readFileSync} from 'fs'
import packagePlugin from '@mpen/rollup-plugin-package'
import cleanPlugin from '@mpen/rollup-plugin-clean'
import runPlugin from '@mpen/rollup-plugin-run'
import execPlugin, {RollupPluginExecutableOptions} from '@mpen/rollup-plugin-executable'
// import renameNodeModules from 'rollup-plugin-rename-node-modules'
import type {RollupOptions, WatcherOptions} from 'rollup'

// see also: https://github.com/rollup/rollup-starter-app

interface RollupPresetTsappOptions {
    tsconfig?: string
    babelOptions?: RollupBabelInputPluginOptions
    watch?: WatcherOptions
    nodeOptions?: RollupPluginExecutableOptions
}

type Truthy<T> = T extends false | '' | 0 | null | undefined ? never : T;  // https://stackoverflow.com/a/58110124/65387

function truthy<T>(value: T): value is Truthy<T> {
    return Boolean(value);
}

export default function rollupPresetTsapp(opts: RollupPresetTsappOptions = {}): RollupOptions {
    const tsconfigFile = findUp.sync(opts.tsconfig ?? 'tsconfig.json')
    if(!tsconfigFile) throw new Error('tsconfig.json file not found')
    const tsconfig = JSON.parse(readFileSync(tsconfigFile, 'utf8'))
    const extensions = ['.ts', '.mjs', '.js', '.json', '.node'];
    const isWatch = process.env.ROLLUP_WATCH === 'true'

    return {
        input: tsconfig.files,
        context: 'global',  // https://nodejs.org/api/globals.html#globals_global
        plugins: [
            !isWatch && cleanPlugin(),
            nodeExternals({
                builtins: true,
                deps: isWatch,
                devDeps: isWatch,
                peerDeps: true,
                optDeps: true,
            }),
            commonjs({
                // include: 'node_modules/**',
            }),
            nodeResolve({
                extensions,
                preferBuiltins: true,
            }),
            json({preferConst: true}),
            babel({
                exclude: 'node_modules/**',
                extensions,
                comments: false,
                babelHelpers: 'bundled',  // https://github.com/rollup/plugins/tree/master/packages/babel#babelhelpers
                root: `${__dirname}/..`,
                // babelrcRoots: ['.', __dirname],  // https://babeljs.io/docs/en/options#babelrcroots
                ...opts.babelOptions,
            }),
            execPlugin({
                maxOldSpaceSize: 4*1024,
                enableSourceMaps: true,
                ...opts.nodeOptions,
            }),
            // renameNodeModules('external'),
            !isWatch && packagePlugin(),
            isWatch && runPlugin(),
        ].filter(truthy),
        watch: {
            buildDelay: 200,
            clearScreen: false,
            ...opts.watch,
        },
        preserveSymlinks: true,  // https://www.npmjs.com/package/@rollup/plugin-commonjs#usage-with-symlinks
        preserveModules: true,  // outputs multiple files; https://stackoverflow.com/questions/66219812/force-include-node-modules-in-package  https://github.com/rollup/rollup/issues/3684
        output: {
            // banner: `#!/usr/bin/env -S node --max-old-space-size=${opts.memory ?? 8192} --enable-source-maps`,
            dir: 'dist',
            format: 'cjs',
            sourcemap: true,
            exports: 'named',
        },
    }
}
