const {promises: FileSystem, constants: FileConst} = require('fs')
const Path = require('path')
const pkgUp = require('pkg-up')

const COPY_FILES = ['LICENSE', 'README.md']
const FILE_FIELDS = ['main','module', 'browser','bin']
const log = console.error.bind(console);

module.exports = (pluginOptions = {}) => {
    let pkgFile;
    let pkgDir;
    let build = 0
    const isWatch = process.env.ROLLUP_WATCH === 'true'

    return {
        name: 'rollup-plugin-package',
        async buildStart(inputOptions) {
            pkgFile = await pkgUp()
            pkgDir = Path.dirname(pkgFile)
            this.addWatchFile(pkgFile)
            for(const f of COPY_FILES) {
                this.addWatchFile(f)
            }

            // console.dir(inputOptions,{depth:1,maxStringLength :32})
        },
        async generateBundle(outputOptions, bundle, isWrite) {
            if(!isWrite) return
            if(!outputOptions.dir) {
                return this.warn("Not generating package.json; output.dir not specifeid")
            }
            // console.log(outputOptions, bundle, isWrite)
            // console.log(await pkgUp());
            // const pkgFile = await pkgUp()
            // debug(outputOptions)

            // console.dir(outputOptions,{depth:1,maxStringLength :32})

            // TODO: support publishConfig https://pnpm.js.org/en/package_json#publishconfig

            const inPkg = JSON.parse(await FileSystem.readFile(pkgFile, 'utf8'))

            const outPkg = pick(inPkg, {
                name: () => Path.basename(pkgDir),
                version: '0.1.0',
                description: undefined,
                license: 'UNLICENSED',
                dependencies: undefined,
                peerDependencies: undefined,
                engines: undefined,
                enginesStrict: undefined,
                os: undefined,
                cpu: undefined,
                author: undefined,
                contributors: undefined,
                funding: undefined,
                bugs: undefined,
                homepage: undefined,
                repository: undefined,
                keywords: undefined,
                bin: undefined,
                main: undefined,
                browser: undefined,
                publishConfig: {  // https://docs.npmjs.com/cli/v6/configuring-npm/package-json#publishconfig
                    access: 'public'
                },
            })

            if(isWatch) {
                outPkg.version += `+${++build}`;
            }

            // delete pkg.devDependencies
            // delete pkg.scripts
            // delete pkg.jest
            // console.log(Path.basename(Path.dirname(pkgFile)))

            for(const chunk of Object.values(bundle)) {
                if(chunk.facadeModuleId) {
                    const facadeModuleId = Path.resolve(pkgDir, chunk.facadeModuleId)
                    for(const field of FILE_FIELDS) {
                        if(inPkg[field]) {
                            const inputFile = Path.resolve(pkgDir, inPkg[field])
                            if(facadeModuleId === inputFile) {
                                outPkg[field] = chunk.fileName
                                log(`Rewrote pkg["${field}"]: ${inPkg[field]} → ${chunk.fileName}`)
                            }
                        }
                    }
                }
                if(chunk.isEntry) {
                    // console.dir(chunk,{depth:1,maxStringLength :32})
                    // console.log(chunk.facadeModuleId)
                    // outPkg.main = chunk.fileName;
                    const types = chunk.fileName.replace(/\.js$/, '.d.ts');
                    if(bundle[types]) {
                        outPkg.types = bundle[types].fileName
                        log(`Added package.types: ${bundle[types].fileName}`)
                    }
                    // break;
                }
            }

            this.emitFile({
                type: 'asset',
                fileName: 'package.json',
                source: JSON.stringify(outPkg, null, 2),
            })

            for(const file of COPY_FILES) {
                try {
                    const license = await FileSystem.readFile(Path.join(pkgDir, file))
                    this.emitFile({
                        type: 'asset',
                        fileName: file,
                        source: license,
                    })
                    log(`Copied ${file} → ${Path.join(outputOptions.dir, file)}`)
                } catch(err) {
                    if(err.code !== 'ENOENT') {
                        return this.error(err)
                    }
                }
            }
        }
    }
}

function debug(obj) {
    console.dir(obj,{depth:1,maxStringLength :32})
}

function exists(path, mode = FileConst.R_OK) {
    return FileSystem.access(path, mode).then(() => true, () => false)
}

function pick(input, defaults) {
    const output = Object.create(null)
    for(const k of Object.keys(defaults)) {
        const defaultValue = resolveValue(defaults[k])
        if(input[k] === undefined) {
            output[k] = defaultValue
        } else if(typeof defaultValue === 'object') {
            if(typeof input[k] !== 'object') throw new Error(`defaults["${k}"] is an object, but input is not`)
            output[k] = {...defaults[k], ...input[k]}
        } else {
            output[k] = input[k]
        }
    }
    return output
}

function resolveValue(x) {
    return typeof x === 'function' ? x() : x
}
