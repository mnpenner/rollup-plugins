import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";
import tsconfig from './tsconfig.json'

export default {
    input: tsconfig.files,
    output: [
        {
            file: pkg.main,
            format: "cjs",
            exports: "auto",
        },
        {
            file: pkg.module,
            format: "esm",
            exports: "auto",
        },
    ],
    external: ['path','child_process','readline', ...Object.keys(pkg.dependencies ?? {})],
    plugins: [typescript({
        abortOnError: false,
    })],
};
