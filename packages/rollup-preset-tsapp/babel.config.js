module.exports = (api) => {
    const isDev = api.env('development')
    api.cache(isDev)

    const presets = [
        "@babel/preset-typescript",
        [
            "@babel/preset-env",
            {
                "targets": {
                    "node": isDev ? "current" : '10',
                },
                "loose": true
            }
        ]
    ]

    const plugins = []

    return {presets, plugins}
}
