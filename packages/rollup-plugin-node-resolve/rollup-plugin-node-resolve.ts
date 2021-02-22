import type {Plugin} from 'rollup'
import Path, {dirname} from 'path'
import {constants as FSC, promises as FileSys} from 'fs'
import builtinModules from 'builtin-modules'
import {ResolveIdResult} from 'rollup'

export interface RollupPluginNodeResolveOptions {
    rootDir?: string
    extensions?: string[]
}

const NUL = '\x00'

export default function (opts: RollupPluginNodeResolveOptions = {}): Plugin {
    const rootDir = opts.rootDir || process.cwd()
    const extensions = opts.extensions ?? ['.mjs', '.js', '.json', '.node']
    // extensions.push('')
    const builtins = new Set(builtinModules)
    const cache = new Map<string, ResolveIdResult>()

    return {
        name: 'rollup-plugin-node-resolve',
        async resolveId(importee, importer, opts) {
            // https://nodejs.org/api/modules.html#modules_all_together

            if (/^\x00/.test(importee)) {
                // https://github.com/rollup/plugins/blob/6bee5980155df7b73cfbd9746556517c8d7f0ad7/packages/node-resolve/src/index.js#L98
                return null  // defer to other resolveId functions
            }

            if(builtins.has(importee)) {
                return false  // mark as external
            }

            if (importer && /^\x00/.test(importer)) {
                importer = undefined
            }

            const baseDir = importer ? dirname(importer) : rootDir
            const cacheKey = importee + '\x00' + baseDir
            const cacheHit = cache.get(cacheKey)

            if(cacheHit !== undefined) {
                return cacheHit
            }

            const resolved = await (async () => {
                if (/^\.{0,2}\//.test(importee)) {  // relative path
                    const fullPath = Path.resolve(baseDir, importee)
                    const stat = await fileStat(fullPath)
                    if (stat) {
                        if (stat.isDirectory()) {
                            // TODO: technically we should look for a package.json in this dir
                            for (const ext of extensions) {
                                const pathWithExt = Path.join(fullPath, 'index' + ext)
                                if (await fileStat(pathWithExt)) {
                                    return pathWithExt
                                }
                            }
                            return false
                        }
                        return fullPath
                    }
                    for (const ext of extensions) {
                        const pathWithExt = fullPath + ext
                        if (await fileStat(pathWithExt)) {
                            return pathWithExt
                        }
                    }

                    throw new Error(importer
                        ? `Could not resolve "${importee}" imported by "${importer}"`
                        : `Could not resolve entry point "${importee}" relative to "${rootDir}"`
                    )
                }

                // TODO: prefer loading "module" instead of "main"
                return require.resolve(importee, {paths: [baseDir]})
            })()

            cache.set(cacheKey, resolved)
            return resolved
        }
    }
}



async function fileStat(path: string) {
    try {
        return await FileSys.stat(path)
    } catch (err) {
        if (err.code === 'ENOENT') {
            return null
        }
        throw err
    }
}


function debug(...obj: any[]) {
    for (const o of obj) {
        console.dir(o, {depth: 3, maxStringLength: 255})
    }
}

async function exists(path: string) {
    try {
        await FileSys.access(path, FSC.F_OK)
        return true
    } catch (err) {
        return false
    }
}
