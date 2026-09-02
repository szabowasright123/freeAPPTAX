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
            Cuando necesites aprender, compartir dudas o revisar tu caso, puedes continuar dentro del ecosistema LEGEL.
          </p>
        </div>
      </header>

      <section aria-labelledby="continuar-titulo" className="space-y-5">
        <div>
          <h2 id="continuar-titulo" className="text-pagina font-bold tracking-tight text-texto">Elige cómo quieres continuar</h2>
          <p className="mt-1 text-cuerpo text-texto-secundario">
            La aplicación seguirá siendo gratuita y local. Los enlaces siguientes abren servicios independientes;
            ningún dato de tu libro se comparte al utilizarlos.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card tono="acento" className="lg:col-span-7">
            <div className="flex h-full flex-col">
              <p className="text-apoyo font-semibold text-texto-acento">Founding · Estándar · Pro</p>
              <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">Campus LEGEL Learning</h3>
              <p className="mt-2 max-w-2xl flex-1 text-cuerpo text-texto-secundario">
                Consulta el itinerario, los módulos y las condiciones de cada membresía. Es la puerta de entrada
                para alumnos y el lugar desde el que se organiza la formación.
              </p>
              <div className="mt-5">
                <button type="button" onClick={() => irA('planes')} className={BTN_PRIMARIO}>Ver planes y precios</button>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-5">
            <div className="flex h-full flex-col">
              <p className="text-apoyo font-semibold text-texto-acento">Founding · Estándar · Pro</p>
              <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">Asistente MCP</h3>
              <p className="mt-2 flex-1 text-cuerpo text-texto-secundario">
                Accede al motor de conocimiento docente para orientarte por el temario y continuar la siguiente
                actividad. No recibe automáticamente la información guardada en esta app.
              </p>
              <div className="mt-5"><EnlaceExterno href={CONEXIONES.mcp}>Abrir acceso al MCP</EnlaceExterno></div>
            </div>
          </Card>

          <Card className="lg:col-span-12">
            <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-apoyo font-semibold text-texto-acento">Founding · Estándar · Pro</p>
                <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">Comunidad de Telegram</h3>
                <p className="mt-2 max-w-2xl text-cuerpo text-texto-secundario">
                  Comparte dudas generales, materiales y aprendizajes con la comunidad de LEGEL Learning.
                  No publiques claves privadas, semillas ni información personal de tu expediente.
                </p>
              </div>
              <EnlaceExterno href={CONEXIONES.comunidad}>Abrir comunidad</EnlaceExterno>
            </div>
          </Card>

          <Card className="lg:col-span-6">
            <div className="flex h-full flex-col">
              <p className="text-apoyo font-semibold text-texto-acento">Sólo Pro</p>
              <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">App docente especializada</h3>
              <p className="mt-2 flex-1 text-cuerpo text-texto-secundario">
                Trabaja el taller, las autoevaluaciones y los entregables con acompañamiento. El acceso se gestiona
                desde la página Pro; esta edición gratuita y la app docente permanecen separadas.
              </p>
              <div className="mt-5"><EnlaceExterno href={CONEXIONES.appDocente}>Ir al acceso Pro</EnlaceExterno></div>
            </div>
          </Card>

          <Card className="lg:col-span-6">
            <div className="flex h-full flex-col">
              <p className="text-apoyo font-semibold text-texto-acento">Formación general</p>
              <h3 className="mt-2 text-titulo font-semibold tracking-tight text-texto">Curso intensivo</h3>
              <p className="mt-2 flex-1 text-cuerpo text-texto-secundario">
                Un recorrido concentrado de cuatro horas en vídeo y cuatro horas en directo, con materiales,
                grabación y soporte incluidos.
              </p>
              <div className="mt-5">
                <span className={`${BTN_SECUNDARIO} cursor-default opacity-60`} aria-label="Curso intensivo próximamente">
                  Próximamente
                </span>
              </div>
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
