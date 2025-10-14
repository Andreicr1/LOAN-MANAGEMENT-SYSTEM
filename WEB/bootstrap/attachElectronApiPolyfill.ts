import { createElectronApiAdapter } from '../adapters/electronAPI.web'

declare global {
  interface Window {
    electronAPI?: ReturnType<typeof createElectronApiAdapter>
  }
}

export function attachElectronApiPolyfill() {
  if (window.electronAPI) {
    return window.electronAPI
  }

  const adapter = createElectronApiAdapter()
  window.electronAPI = adapter
  return adapter
}


