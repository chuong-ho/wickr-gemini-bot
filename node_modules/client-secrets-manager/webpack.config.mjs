import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const main_webpack ={
    entry: [join(__dirname,"entry.mjs")],
    output: {
        path: __dirname,
        filename: "index.min.mjs",
        library: {
            type: "module"
        },
        module: true
    },
    mode: "production",
    target: "web",
    experiments: {
        outputModule: true
    }
}

export default main_webpack;