import type {ForkOptions} from 'child_process'
import {ChildProcess, exec} from 'child_process'
import * as path from 'path'
import {Plugin, RenderedChunk} from 'rollup'
import Readline from 'readline'
import Chalk from 'chalk'

export interface RollupRunOptions extends ForkOptions {
    args?: readonly string[];
    options?: ForkOptions;
    memory?: number
}

const ESCAPE_TIMEOUT = 500

export default function run(opts: RollupRunOptions = {}): Plugin {
    let input: string
    let proc: ChildProcess|null = null

    const args = opts.args || []
    const forkOptions = opts.options || opts
    delete (forkOptions as RollupRunOptions).args

    let firstRun = true
    const rl = Readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        removeHistoryDuplicates: true,
        crlfDelay: Infinity,
        escapeCodeTimeout: ESCAPE_TIMEOUT,
        tabSize: 2,
    })
    let cmdPrefix = ''
    rl.on('line', additionalArgs => {
        if (proc) {
            proc.kill()
            proc = null
        }
        proc = exec(`${cmdPrefix} ${additionalArgs}`, {}, (error, stdout, stderr) => {
            proc = null
            // TODO: figure out how to clear prompt
            if (error) {
                console.error(Chalk.red(error))
            } else {
                if (stdout) console.log(stdout)
                if (stderr) console.error(Chalk.red(stderr))
            }

            rl.prompt()
            rl.write(additionalArgs)
        })
    })
    let lastInt: number|null = null
    rl.on('SIGINT', () => {
        const now = Date.now()
        if(lastInt != null && (now - lastInt) < ESCAPE_TIMEOUT && !rl.line) {
            console.log(`\n🛑 Exiting`)
            process.exit(0)
            // rl.write(null as any, {ctrl:true,name:'c'})
        }
        if(proc) {
            proc.kill()
            proc = null
            console.log(`\n💀 Killed process`)
            rl.prompt(true)
        } else if(rl.line) {
            // https://stackoverflow.com/a/16687377/65387
            // https://nodejs.org/dist/latest-v14.x/docs/api/readline.html#readline_tty_keybindings
            rl.write(null as any, {ctrl:true,name:'e'})
            rl.write(null as any, {ctrl:true,name:'u'})
            // rl.write(null as any, {ctrl:true,name:'c'})
        } else {
            // rl.write(null as any, {ctrl:true,name:'c'})
            // console.log(`\nExiting`)
            // process.exit(0)
            rl.write(null as any, {ctrl:true,name:'l'})
            lastInt = now
        }
    })
    // TODO: map UP to Ctrl+P (previous history item)
    // TODO: map DOWN to Ctrl+N (previous history item)
    // TODO: use ctrl+r to restart the process with the same args
    // also add option for autoRestart

    return {
        name: 'run',

        buildStart(options) {
            let inputs = options.input

            if (typeof inputs === 'string') {
                inputs = [inputs]
            }

            if (typeof inputs === 'object') {
                inputs = Object.values(inputs)
            }

            if (inputs.length > 1) {
                throw new Error(`@mpen/rollup-plugin-run only works with a single entry point`)
            }

            input = path.resolve(inputs[0])
        },

        generateBundle(_outputOptions, _bundle, isWrite) {
            if (!isWrite) {
                this.error(`@mpen/rollup-plugin-run currently only works with bundles that are written to disk`)
            }
        },

        writeBundle(outputOptions, bundle) {
            const dir = outputOptions.dir || path.dirname(outputOptions.file!)
            const entryFileName = Object.keys(bundle).find((fileName) => {
                const chunk = bundle[fileName] as RenderedChunk
                return chunk.isEntry && chunk.facadeModuleId === input
            })

            if (!entryFileName) {
                return this.error(`@mpen/rollup-plugin-run could not find output chunk`)
            }

            const filePath = path.join(dir, entryFileName)
            cmdPrefix = `${process.argv[0]} --max-old-space-size=${opts.memory ?? 4*1024} --enable-source-maps -- ${shellescapeArg(filePath)}`

            rl.setPrompt(`${Chalk.bold.green('❯')} ${Chalk.bold.cyan(cmdPrefix)} `)

            // Readline.clearLine(process.stdout, 0)
            // TODO: figure out how to clear prompt
            setTimeout(() => {
                rl.prompt(true)
            }, 0)
        }
    }
}

function shellescapeArg(s: string) {
    if (!/^[A-Za-z0-9=._\/-]+$/.test(s)) {
        s = "'" + s.replace(/'/g, "'\\''") + "'";
        s = s.replace(/^(?:'')+/g, '') // unduplicate single-quote at the beginning
            .replace(/\\'''/g, "\\'"); // remove non-escaped single-quote if there are enclosed between 2 escaped
    }
    return s;
}

function shellescape(s: string[]) {
    return s.map(shellescapeArg).join(' ')
}
