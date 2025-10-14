import { createElectronApiAdapter } from '../adapters/electronAPI.web'

let polyfill: ReturnType<typeof createElectronApiAdapter> | undefined

export function attachElectronApiPolyfill() {
  if (typeof window === 'undefined') return
  if (!polyfill) {
    polyfill = createElectronApiAdapter()
  }
  window.electronAPI = polyfill
}


