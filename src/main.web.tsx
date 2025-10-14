import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { configureAmplify } from '../WEB/bootstrap/amplifyConfig'
import { attachElectronApiPolyfill } from '../WEB/bootstrap/attachElectronApiPolyfill'

configureAmplify()
attachElectronApiPolyfill()

const rootElement = document.getElementById('root') as HTMLElement

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)


