import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@capra/theme/base.css'
import '@capra/core/styles.css'
import '@capra/icons/styles.css'
import { resolveAppBasePath } from './app-base-path'
import { installThemeBridge } from './host-theme'
import { installSandboxShims } from './sandbox-shims'
import App from './App'
import './App.css'
import './styles/layout.css'
import './styles/brand.css'

// index.html also installs these before modules; call again before render.
installSandboxShims()
installThemeBridge()
document.body.classList.add('brand-root')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={resolveAppBasePath()}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
