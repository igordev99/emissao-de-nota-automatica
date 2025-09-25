/// <reference types="vite/client" />

declare module 'react-dom/client' {
  export * from 'react-dom'
  export function createRoot(element: Element | DocumentFragment): {
    render(children: React.ReactNode): void
    unmount(): void
  }
}

declare module '*.css' {
  const content: string
  export default content
}

declare module '@vitejs/plugin-react'
declare module 'vite'

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}