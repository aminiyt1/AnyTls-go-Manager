/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STANDALONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
