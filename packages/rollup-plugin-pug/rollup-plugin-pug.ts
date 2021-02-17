import Pug from 'pug'
import {promises as FileSystem} from 'fs'
import getPkgDir from 'pkg-dir'
import Path from 'path'
import type {Plugin} from 'rollup'

interface RollupPluginPugOptions {
    debug?: boolean
}

const plugin = (options: RollupPluginPugOptions = {debug:false}): Plugin => ({
    name: 'pug',
    async load(absPath) {
        if(!absPath.endsWith('.pug')) return null

        const source = await FileSystem.readFile(absPath, 'utf8')
        const pkgDir = await getPkgDir()
        if(!pkgDir) throw new Error("package.json not found")
        const filename = Path.relative(pkgDir, absPath)

        const fn: any = Pug.compile(source, {
            filename: filename,
            inlineRuntimeFunctions: false,
            compileDebug: !!options.debug,
            debug: false,
            pretty: false,
        })

        if(fn.dependencies) {
            for (const dep of fn.dependencies) {
                this.addWatchFile(dep)
            }
        }

        return {
            code: `import pug from 'pug-runtime';\n${fn};\nexport default template;`,
            moduleSideEffects: false,
        }
    }
})

export default plugin
