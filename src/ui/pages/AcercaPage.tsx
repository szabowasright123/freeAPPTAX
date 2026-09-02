import type { ReactNode } from 'react'
import { BTN_PRIMARIO, BTN_SECUNDARIO, Card } from '../comp'
import { CONEXIONES } from '../conexiones'
import { irA } from '../shell/rutas'

function EnlaceExterno({ href, children, primario = false }: { href: string; children: ReactNode; primario?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={primario ? BTN_PRIMARIO : BTN_SECUNDARIO}>
      {children}
    </a>
  )
}

export function AcercaPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 py-2 sm:py-4">
      <button
        type="button"
        onClick={() => irA('inicio')}
        className="text-cuerpo font-medium text-texto-secundario underline decoration-borde-fuerte underline-offset-4 hover:text-texto-acento"
      >
        ← Volver al inicio
      </button>

      <header className="relative overflow-hidden rounded-panel bg-brand-600 px-6 py-10 text-white shadow-elevada sm:px-10 sm:py-14">
        <div aria-hidden="true" className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[3.5rem] border-white/10" />
        <div className="relative max-w-3xl">
          <p className="mb-3 text-apoyo font-semibold uppercase tracking-widest text-white/70">Libro Hespérides</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Tu punto de partida para ordenar y comprender tu patrimonio cripto
          </h1>
          <p className="mt-4 max-w-2xl text-lectura text-white/80">
            Esta edición gratuita te ayuda a registrar operaciones, conservar pruebas y visualizar tu cartera.
            No incluye la app docente de pago ni enlaza a su acceso privado.
          </p>
        </div>
      </header>

      <section aria-labelledby="continuar-titulo" className="space-y-5">
        <div>
          <h2 id="continuar-titulo" className="text-pagina font-bold tracking-tight text-texto">Esta es la aplicación gratuita</h2>
          <p className="mt-1 text-cuerpo text-texto-secundario">
            Los enlaces siguientes son informativos y abren recursos separados. Ningún dato de tu libro se comparte al utilizarlos.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card tono="acento" className="lg:col-span-7">
            <div className="flex h-full flex-col">
              <p className="text-apoyo font-semibold text-texto-acento">Formación separada</p>
              <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">LEGEL Learning</h3>
              <p className="mt-2 max-w-2xl flex-1 text-cuerpo text-texto-secundario">
                Consulta la información pública sobre el itinerario formativo. La contratación, el campus privado
                y la app docente funcionan fuera de esta aplicación gratuita.
              </p>
              <div className="mt-5">
                <EnlaceExterno href={CONEXIONES.formacion} primario>Ver formación</EnlaceExterno>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-5">
            <div className="flex h-full flex-col">
              <p className="text-apoyo font-semibold text-texto-acento">Recurso externo</p>
              <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">Asistente MCP</h3>
              <p className="mt-2 flex-1 text-cuerpo text-texto-secundario">
                Accede al asistente de aprendizaje desde su propio dominio. No recibe automáticamente la información
                guardada en esta app.
              </p>
              <div className="mt-5"><EnlaceExterno href={CONEXIONES.mcp}>Abrir acceso al MCP</EnlaceExterno></div>
            </div>
          </Card>

          <Card className="lg:col-span-12">
            <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-apoyo font-semibold text-texto-acento">Área privada</p>
                <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">Campus LEGEL Learning</h3>
                <p className="mt-2 max-w-2xl text-cuerpo text-texto-secundario">
                  El campus es el lugar adecuado para alumnos acreditados. La app docente Pro no se sirve desde
                  app.legelbitcoin.com y no se enlaza desde esta edición gratuita.
                </p>
              </div>
              <EnlaceExterno href={CONEXIONES.campus}>Ir al campus</EnlaceExterno>
            </div>
          </Card>

          <Card className="lg:col-span-6">
            <div className="flex h-full flex-col">
              <p className="text-apoyo font-semibold text-texto-acento">Aplicación abierta</p>
              <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">Qué incluye esta edición</h3>
              <p className="mt-2 flex-1 text-cuerpo text-texto-secundario">
                Libro, archivo, cartera, importación, copias locales y resultados orientativos para uso personal.
              </p>
            </div>
          </Card>

          <Card className="lg:col-span-6">
            <div className="flex h-full flex-col">
              <p className="text-apoyo font-semibold text-texto-acento">Límite de alcance</p>
              <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">Qué queda fuera</h3>
              <p className="mt-2 flex-1 text-cuerpo text-texto-secundario">
                La edición docente, los casos del taller, las autoevaluaciones, los entregables y el acompañamiento
                pertenecen al campus acreditado, no a esta URL pública.
              </p>
            </div>
          </Card>

          <Card className="lg:col-span-12">
            <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-apoyo font-semibold text-texto-acento">Servicio independiente</p>
                <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">Asesoramiento fiscal sobre tu caso</h3>
                <p className="mt-2 max-w-2xl text-cuerpo text-texto-secundario">
                  Para aplicar la normativa a hechos personales, revisar operaciones o preparar una estrategia fiscal,
                  solicita una consulta profesional. No está incluida en la app ni en la formación general.
                </p>
              </div>
              <EnlaceExterno href={CONEXIONES.asesoramiento}>Solicitar consulta</EnlaceExterno>
            </div>
          </Card>
        </div>

      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Privacidad local">
          <div className="space-y-2 text-cuerpo text-texto-secundario">
            <p>Tus apuntes, ubicaciones y justificantes permanecen en este navegador. La app no necesita una cuenta para funcionar.</p>
            <p>Conserva copias desde Ajustes. Cambiar de dispositivo, borrar el navegador o desinstalar la aplicación puede eliminar la única copia local.</p>
          </div>
        </Card>
        <Card titulo="Qué hace y qué no hace">
          <div className="space-y-2 text-cuerpo text-texto-secundario">
            <p>Libro Hespérides organiza información, calcula resultados orientativos y prepara un archivo documental. No envía declaraciones ni presta asesoramiento fiscal por sí mismo.</p>
            <p>Los servicios profesionales y la formación se contratan aparte y cuentan con su propio alcance.</p>
          </div>
        </Card>
      </section>

      <section className="border-t border-borde pt-6">
        <dl className="grid gap-x-8 gap-y-3 text-cuerpo sm:grid-cols-[10rem_1fr]">
          <dt className="text-texto-mudo">Autoría</dt><dd className="text-texto">Javier Bravezo Durán</dd>
          <dt className="text-texto-mudo">Proyecto</dt>
          <dd><a href={CONEXIONES.repositorio} target="_blank" rel="noopener noreferrer" className="text-texto-acento underline underline-offset-4 hover:text-texto-acento-fuerte">Código fuente de la edición gratuita</a></dd>
          <dt className="text-texto-mudo">Licencia</dt><dd className="text-texto">PUSL-1.0 para uso personal</dd>
          <dt className="text-texto-mudo">Contacto</dt>
          <dd><a href={CONEXIONES.contacto} className="text-texto-acento underline underline-offset-4 hover:text-texto-acento-fuerte">contacto@legelbitcoin.com</a></dd>
          <dt className="text-texto-mudo">Versión</dt><dd className="font-mono text-texto">v{__APP_VERSION__}</dd>
        </dl>
      </section>
    </div>
  )
}
