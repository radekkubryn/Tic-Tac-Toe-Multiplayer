/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly DEV: boolean
    // add other variables as needed
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
