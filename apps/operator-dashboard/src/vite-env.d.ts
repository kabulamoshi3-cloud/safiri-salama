/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Allow importing PNG assets as module strings (required for Leaflet marker icons)
declare module '*.png' {
  const src: string;
  export default src;
}
