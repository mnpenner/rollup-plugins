const {promises: FileSystem} = require('fs')
const Path = require('path')

const log = console.error.bind(console);

module.exports = (pluginOptions = {}) => ({
    name: 'rollup-plugin-clean',
    async generateBundle(outputOptions, bundle, isWrite) {
        if(!isWrite) return
        if(!outputOptions.dir) {
            return this.warn("Not cleaning; output.dir not specifeid")
        }

        const outputDir = Path.relative('.', outputOptions.dir)

        if(outputDir === '.' || outputDir.startsWith('..')) {
            return this.error(`Refusing to delete "${outputDir}"`)
        }

        const deleting = []
        let entries
        try {
            entries = await FileSystem.readdir(outputDir, {withFileTypes: true});
        } catch(err) {
            if(err.code === 'ENOENT') return
            throw err
        }

        for(const entry of entries) {
            const filePath = Path.join(outputDir, entry.name)
            if(entry.isSymbolicLink() || !entry.isDirectory()) {
                deleting.push(FileSystem.unlink(filePath));
            } else {
                deleting.push(FileSystem.rmdir(filePath, {recursive: true}));
            }
        }

        await Promise.allSettled(deleting)
        log(`Deleted ${deleting.length} files from ${outputDir}${Path.sep}`)
    }
})

