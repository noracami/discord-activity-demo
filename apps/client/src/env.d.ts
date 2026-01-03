/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Build-time injected constants
declare const __CLIENT_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID: string;
  readonly VITE_NAKAMA_HOST: string;
  readonly VITE_NAKAMA_PORT: string;
  readonly VITE_NAKAMA_USE_SSL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
