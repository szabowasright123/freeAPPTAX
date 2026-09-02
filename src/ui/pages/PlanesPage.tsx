import type { ReactNode } from 'react'
import { BTN_PRIMARIO, BTN_SECUNDARIO, cx } from '../comp'
import { CONEXIONES } from '../conexiones'
import { irA } from '../shell/rutas'

type Plan = {
  nombre: string
  precio: string
  periodo: string
  introduccion: string
  incluye: string[]
  accion: string
  href: string
  destacado?: boolean
  proximamente?: boolean
  nota?: ReactNode
}

const PLANES: Plan[] = [
  {
    nombre: 'Founding Member',
    precio: '10 €',
    periodo: 'al mes durante 12 meses',
    introduccion: 'La entrada para las primeras 20 personas que construyan la comunidad.',
    incluye: ['Campus completo', 'Asistente MCP', 'Comunidad de Telegram', 'Herramienta gratuita'],
    accion: 'Reservar plaza Founding',
    href: CONEXIONES.pagoFounding,
    destacado: true,
    nota: <>20 plazas. El precio se mantiene durante los primeros 12 meses.</>,
  },
  {
    nombre: 'Estándar',
    precio: '39 €',
    periodo: 'al mes',
    introduccion: 'Formación continua para aprender el método con criterio y acompañamiento comunitario.',
    incluye: ['Campus completo', 'Asistente MCP', 'Comunidad de Telegram', 'Herramienta gratuita'],
    accion: 'Avisarme de la apertura',
    href: CONEXIONES.interesEstandar,
    nota: <>Se abrirá cuando se completen las 20 plazas Founding.</>,
  },
  {
    nombre: 'Pro',
    precio: '99 €',
    periodo: 'al mes',
    introduccion: 'Para trabajar con la app docente y recibir un acompañamiento más cercano.',
    incluye: [
      'Todo el plan Estándar',
      'App docente especializada',
      'Una sesión grupal mensual',
      'Una revisión mensual limitada',
      'Soporte prioritario',
    ],
    accion: 'Elegir Pro',
    href: CONEXIONES.pagoPro,
  },
  {
    nombre: 'Curso intensivo',
    precio: '500 €',
    periodo: 'pago único',
    introduccion: 'Aprende contabilidad y fiscalidad cripto en un recorrido concentrado de 8 horas.',
    incluye: ['4 horas en vídeo', '4 horas en directo', 'Materiales', 'Grabación', 'Soporte incluido'],
    accion: 'Reservar el intensivo',
    href: CONEXIONES.pagoIntensivo,
    proximamente: true,
    nota: <>Formación general. No incluye el análisis individual de un caso personal.</>,
  },
]

function EnlacePlan({ href, children, destacado }: { href: string; children: ReactNode; destacado?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={destacado ? BTN_PRIMARIO : BTN_SECUNDARIO}
    >
      {children}
    </a>
  )
}

export function PlanesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-8">
      <button
        type="button"
        onClick={() => irA('acerca')}
        className="text-cuerpo font-medium text-texto-secundario underline decoration-borde-fuerte underline-offset-4 hover:text-texto-acento"
      >
        ← Volver a conexiones
      </button>

      <header className="grid gap-8 rounded-panel border border-borde bg-superficie-elevada px-6 py-9 shadow-reposo md:grid-cols-[1.35fr_.65fr] md:px-10 md:py-12">
        <div>
          <p className="text-apoyo font-semibold uppercase tracking-widest text-texto-acento">LEGEL Learning</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-texto sm:text-5xl">
            Elige cuánto acompañamiento necesitas
          </h1>
          <p className="mt-4 max-w-2xl text-lectura text-texto-secundario">
            Aprende contabilidad y fiscalidad cripto con un recorrido claro, herramientas propias y apoyo profesional bien delimitado.
          </p>
        </div>
        <div className="self-end border-l-2 border-borde-acento pl-5">
          <p className="text-cuerpo font-semibold text-texto">La aplicación gratuita sigue siendo gratuita.</p>
          <p className="mt-2 text-cuerpo text-texto-secundario">Las membresías añaden formación, comunidad y acompañamiento.</p>
        </div>
      </header>

      <section aria-labelledby="planes-titulo">
        <h2 id="planes-titulo" className="text-2xl font-bold tracking-tight text-texto">Planes disponibles</h2>
        <p className="mt-2 max-w-2xl text-cuerpo text-texto-secundario">
          Precios sin IVA. La contratación y los cobros recurrentes se procesan de forma segura mediante Stripe.
        </p>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {PLANES.map((plan) => (
            <article
              key={plan.nombre}
              className={cx(
                'flex flex-col rounded-panel border p-6 shadow-reposo transition-transform hover:-translate-y-0.5',
                plan.destacado
                  ? 'border-borde-acento bg-superficie-acento'
                  : 'border-borde bg-superficie-elevada',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h3 className="text-titulo font-bold tracking-tight text-texto">{plan.nombre}</h3>
                {plan.destacado && <span className="text-apoyo font-semibold text-texto-acento">20 plazas</span>}
              </div>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums tracking-tight text-texto">{plan.precio}</span>
                <span className="text-apoyo text-texto-secundario">{plan.periodo}</span>
              </p>
              <p className="mt-4 text-cuerpo text-texto-secundario">{plan.introduccion}</p>
              <ul className="mt-6 flex-1 space-y-3 text-cuerpo text-texto">
                {plan.incluye.map((elemento) => (
                  <li key={elemento} className="flex gap-3">
                    <span aria-hidden="true" className="font-bold text-texto-acento">✓</span>
                    <span>{elemento}</span>
                  </li>
                ))}
              </ul>
              {plan.nota && <p className="mt-6 text-apoyo text-texto-secundario">{plan.nota}</p>}
              <div className="mt-5">
                {plan.proximamente ? (
                  <span className={`${BTN_SECUNDARIO} cursor-default opacity-60`} aria-label={`${plan.nombre} próximamente`}>
                    Próximamente
                  </span>
                ) : (
                  <EnlacePlan href={plan.href} destacado={plan.destacado}>{plan.accion}</EnlacePlan>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 rounded-panel bg-brand-600 px-6 py-8 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:px-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">¿Tu caso necesita una revisión individual?</h2>
          <p className="mt-2 max-w-2xl text-cuerpo text-white/80">
            La formación es general. Las entrevistas individuales de una hora se contratan por separado por 200 € más IVA.
          </p>
        </div>
        <a href={CONEXIONES.asesoramiento} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center whitespace-nowrap rounded-control bg-white px-4 py-2 font-semibold text-brand-700 transition-transform active:translate-y-px">
          Solicitar entrevista
        </a>
      </section>

      <p className="text-center text-apoyo text-texto-mudo">
        Ningún plan exige compartir semillas, claves privadas ni datos almacenados en Libro Hespérides.
      </p>
    </div>
  )
}
