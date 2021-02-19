import type {Plugin} from 'rollup'
import MagicString from 'magic-string';

export interface RollupPluginExecutableOptions {
    /**
     * Aborting instead of exiting causes a core file to be generated for post-mortem analysis using a debugger (such as `lldb`, `gdb`, and `mdb`).
     * @link https://nodejs.org/api/cli.html#cli_abort_on_uncaught_exception
     */
    abortOnUncaughtException?: boolean
    /**
     * Enables report to be generated on uncaught exceptions. Useful when inspecting the JavaScript stack in conjunction with native stack and other runtime environment data.
     */
    reportUncaughtException?: boolean
    /**
     * Throw errors for deprecations.
     */
    throwDeprecation?: boolean
    /**
     * Set `process.title` on startup.
     */
    title?: string
    /**
     * Silence all process warnings (including deprecations).
     */
    noWarnings?: boolean
    /**
     * Enable experimental Source Map v3 support for stack traces.
     */
    enableSourceMaps?: boolean
    /**
     * Sets the max memory size of V8's old memory section. As memory consumption approaches the limit, V8 will spend more time on garbage collection in an effort to free unused memory.
     * @link https://nodejs.org/api/cli.html#cli_max_old_space_size_size_in_megabytes
     */
    maxOldSpaceSize?: number
}

const plugin = (opts: RollupPluginExecutableOptions = {}): Plugin => {
    return {
        name: 'rollup-plugin-executable',
        renderChunk(code, chunk, {sourcemap}) {
            if(!chunk.isEntry) return null

            const ms = new MagicString(code)
            const flags = []
            if(opts.title) {
                flags.push(`--title=${shellescapeArg(opts.title)}`)
            }
            if(opts.abortOnUncaughtException) {
                flags.push(`--abort-on-uncaught-exception`)
            }
            if(opts.reportUncaughtException) {
                flags.push(`--report-uncaught-exception`)
            }
            if(opts.throwDeprecation) {
                flags.push(`--throw-deprecation`)
            }
            if(opts.noWarnings) {
                flags.push(`--no-warnings`)
            }
            if(opts.enableSourceMaps) {
                flags.push(`--enable-source-maps`)
            }
            if(opts.maxOldSpaceSize) {
                flags.push(`--max-old-space-size=${shellescapeArg(String(opts.maxOldSpaceSize))}`)
            }
            if(flags.length) {
                ms.prepend(`#!/usr/bin/env -S node${flags.map(f => ' '+f).join('')}\n`)
            } else {
                ms.prepend(`#!/usr/bin/env node\n`)
            }
            return {
                code: ms.toString(),
                map: sourcemap ? ms.generateMap({hires: true}) : null
            }
        }
    }
}


function debug(obj: any) {
    console.dir(obj,{depth:3,maxStringLength :80})
}

export default plugin


function shellescapeArg(s: string) {
    if (!/^[A-Za-z0-9=._\/-]+$/.test(s)) {
        s = "'" + s.replace(/'/g, "'\\''") + "'";
        s = s.replace(/^(?:'')+/g, '') // unduplicate single-quote at the beginning
            .replace(/\\'''/g, "\\'"); // remove non-escaped single-quote if there are enclosed between 2 escaped
    }
    return s;
}
