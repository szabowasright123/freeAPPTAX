/**
 * PanelInstalacion — el ofrecimiento de instalar el Libro, en la pantalla de Inicio.
 *
 * La app se puede instalar desde hace versiones y no se lo decía a nadie (ver
 * `pwa/instalacion.ts`). Esto es ese aviso, y está escrito para el alumno que no sabe qué es
 * una PWA: no se le habla de «aplicación web progresiva» ni de «service worker», se le dice
 * qué gana —icono propio, ventana propia, funciona sin conexión— y que no descarga nada de
 * ninguna tienda.
 *
 * Cuándo NO aparece, que es la mitad del trabajo: si la app ya está instalada (se estaría
 * ofreciendo instalar dentro de la propia app instalada, el clásico que delata que nadie lo
 * probó), si el navegador no lo permite, y durante el resto de la sesión si el alumno dice
 * que ahora no. En iPhone y iPad no hay botón posible —Safari no emite el evento—, así que
 * ahí se enseñan los dos pasos manuales en vez de un botón que no haría nada.
 */
import { useState } from 'react'
import { instalar, useEstadoInstalacion } from './instalacion'
import { BTN_PRIMARIO, BTN_SECUNDARIO, Card } from '../ui/comp'

/** Clave del descarte por sesión: si dice «ahora no», no se le repite hasta que vuelva. */
const CLAVE_DESCARTE = 'hesperides:instalacion-descartada'

function yaDescartada(): boolean {
  try {
    return window.sessionStorage.getItem(CLAVE_DESCARTE) === '1'
  } catch {
    // Navegador con almacenamiento bloqueado: se prefiere volver a ofrecerlo antes que fallar.
    return false
  }
}

export function PanelInstalacion() {
  const estado = useEstadoInstalacion()
  const [descartada, setDescartada] = useState(yaDescartada)

  if (estado === 'instalada' || estado === 'no-disponible' || descartada) return null

  const descartar = () => {
    setDescartada(true)
    try {
      window.sessionStorage.setItem(CLAVE_DESCARTE, '1')
    } catch {
      // Sin almacenamiento el descarte dura lo que dure la pantalla. Suficiente.
    }
  }

  return (
    <Card tono="acento" aria-labelledby="instalar-titulo">
      <div className="space-y-2">
        <h2
          id="instalar-titulo"
          className="text-titulo font-semibold tracking-tight text-texto"
        >
          Ten el Libro en tu escritorio
        </h2>
        <p className="text-cuerpo text-texto-secundario">
          Guárdalo como aplicación y tendrás <strong>su propio icono y su propia ventana</strong>,
          sin barra de direcciones, y <strong>funcionará sin conexión</strong>. No se descarga
          nada de ninguna tienda: es esta misma app, guardada en tu equipo. Tus datos siguen
          donde están.
        </p>

        {estado === 'instalable' ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className={BTN_PRIMARIO} onClick={() => void instalar()}>
              Instalar el Libro
            </button>
            <button type="button" className={BTN_SECUNDARIO} onClick={descartar}>
              Ahora no
            </button>
          </div>
        ) : (
          // manual-ios: en Safari no hay diálogo que lanzar, así que se explican los pasos.
          <div className="space-y-2 pt-1">
            <p className="text-cuerpo text-texto">
              En iPhone y iPad se hace a mano, y <strong>tiene que ser desde Safari</strong>:
              pulsa <strong>Compartir</strong> y luego <strong>Añadir a pantalla de inicio</strong>.
            </p>
            <button type="button" className={BTN_SECUNDARIO} onClick={descartar}>
              Entendido
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
