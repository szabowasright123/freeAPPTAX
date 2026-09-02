import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { escucharInstalacion } from './pwa/instalacion'
import './index.css'

// `beforeinstallprompt` se dispara una sola vez y muy pronto, a menudo antes de que React
// monte nada: el oyente tiene que estar puesto ya. Ver `pwa/instalacion.ts`.
escucharInstalacion()

const contenedor = document.getElementById('root')
if (!contenedor) {
  throw new Error('No se encontró el elemento raíz #root')
}

createRoot(contenedor).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
