import type {RollupOptions, WatcherOptions} from 'rollup'
import type {RPT2Options} from 'rollup-plugin-typescript2'
import {readFileSync} from 'fs'
import findUp from 'find-up'
import cleanPlugin from '@mpen/rollup-plugin-clean'
import packagePlugin from '@mpen/rollup-plugin-package'
import typescript from 'rollup-plugin-typescript2'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeExternals from 'rollup-plugin-node-externals'
import {nodeResolve} from '@rollup/plugin-node-resolve'


// see also: https://github.com/rollup/rollup-starter-lib

interface RollupPresetTslibOptions {
    tsconfig?: string
    typescript?: RPT2Options
    plugins?: Plugin[]
    watch?: WatcherOptions
}

type Truthy<T> = T extends false | '' | 0 | null | undefined ? never : T;  // https://stackoverflow.com/a/58110124/65387

function truthy<T>(value: T): value is Truthy<T> {
    return Boolean(value);
}

export default function rollupPresetTslib(opts: RollupPresetTslibOptions = {}): RollupOptions {
    const tsconfigFile = findUp.sync(opts.tsconfig ?? 'tsconfig.json')
    if(!tsconfigFile) throw new Error('tsconfig.json file not found')
    const tsconfig = JSON.parse(readFileSync(tsconfigFile, 'utf8'))
    const isWatch = process.env.ROLLUP_WATCH === 'true'

    return {
        input: tsconfig.files,
        plugins: [
            !isWatch && cleanPlugin(),
            commonjs({
                include: 'node_modules/**',
            }),
            nodeExternals({
                builtins: true,
                deps: true,
                devDeps: isWatch,
                peerDeps: true,
                optDeps: true,
            }),
            json({preferConst: true}),
            typescript({
                abortOnError: process.env.NODE_ENV === 'production',
                tsconfigDefaults: {},
                tsconfig: tsconfigFile,
                tsconfigOverride: {},
                ...opts.typescript,
            }),
            nodeResolve({
                extensions: ['.ts'],
                preferBuiltins: true,
            }),
            !isWatch && packagePlugin(),
            ...opts.plugins ?? [],
        ].filter(truthy),
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
