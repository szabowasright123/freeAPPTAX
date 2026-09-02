/**
 * gen-iconos.mjs — regenera los iconos PNG de la PWA a partir del PNG fuente
 * (`public/legel-learning-icon.png`). Herramienta de desarrollo:
 * se ejecuta a mano cuando cambia el icono, no en el build.
 *
 *   node scripts/gen-iconos.mjs
 *
 * Local-first: sharp solo se usa aquí, en tiempo de diseño; nunca en runtime.
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const fuente = join(pub, 'legel-learning-icon.png')

async function png(size, out) {
  await sharp(fuente).resize(size, size, { fit: 'cover' }).png().toFile(join(pub, out))
  console.log('  ✓', out, size + 'px')
}

await png(192, 'pwa-192x192.png')
await png(512, 'pwa-512x512.png')
await png(180, 'apple-touch-icon.png')
await png(512, 'pwa-maskable-512x512.png')
console.log('Iconos generados.')
