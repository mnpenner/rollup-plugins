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

        const deleting = []
        let entries
        try {
            entries = await FileSystem.readdir(outputOptions.dir, {withFileTypes: true});
        } catch(err) {
            if(err.code === 'ENOENT') return
            throw err
        }

        for(const entry of entries) {
            const path = Path.join(outputOptions.dir, entry.name)
            if(entry.isSymbolicLink() || !entry.isDirectory()) {
                deleting.push(FileSystem.unlink(path));
            } else {
                deleting.push(FileSystem.rmdir(path));
            }
        }

        await Promise.allSettled(deleting)
        log(`Deleted ${deleting.length} files from ${outputOptions.dir}`)
    }
})

