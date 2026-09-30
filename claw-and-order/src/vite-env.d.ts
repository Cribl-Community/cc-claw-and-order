/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    CRIBL_API_URL: string
    CRIBL_BASE_PATH: string
    getCriblUser?: () => Promise<{
      id: string
      username: string
      email?: string
      firstName?: string
      lastName?: string
      initials?: string
    }>
  }
}
