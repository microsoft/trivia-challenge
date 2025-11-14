/// <reference types="vite/client" />

declare module 'vite/client' {
  interface ImportMetaEnv {
    readonly VITE_REQUIRE_STATION_ID?: string
    readonly VITE_STATION_LOCKDOWN_MESSAGE?: string
  }
}
