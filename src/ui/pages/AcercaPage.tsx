import { Card, PageHeader } from '../comp'

export function AcercaPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        titulo="Acerca de Libro Hespérides"
        subtitulo="Una herramienta gratuita para mantener tu libro y tu archivo personal."
      />

      <Card titulo="Tus datos son tuyos">
        <div className="space-y-3 text-cuerpo text-texto-secundario">
          <p>
            La aplicación funciona localmente y no exige una cuenta. Los apuntes y
            justificantes permanecen en el navegador que utilizas.
          </p>
          <p>
            Descarga copias de seguridad periódicas desde Ajustes. Borrar los datos del
            navegador, cambiar de dispositivo o desinstalar la aplicación puede eliminar la
            única copia local.
          </p>
        </div>
      </Card>

      <Card titulo="Alcance">
        <p className="text-cuerpo text-texto-secundario">
          La herramienta ayuda a ordenar información y documentación. No presta asesoramiento
          jurídico, contable o fiscal ni sustituye la revisión de un profesional.
        </p>
      </Card>

      <p className="font-mono text-caption text-texto-mudo">Versión {__APP_VERSION__}</p>
    </div>
  )
}
