/**
 * Script: upload-to-cloudinary.mjs
 * Sube todas las imágenes de src/assets/stock/ y src/assets/logos/ a Cloudinary
 * y genera un archivo de mapeo JSON con las URLs CDN resultantes.
 *
 * Uso: node scripts/upload-to-cloudinary.mjs
 */

import { v2 as cloudinary } from 'cloudinary'
import { readdir, writeFile } from 'fs/promises'
import { join, extname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')

cloudinary.config({
  cloud_name: 'dvq6znk71',
  api_key: '159869349288522',
  api_secret: 'NrrVRUmHaE2Mub1GUgF4QcoxZd4',
})

const FOLDERS_TO_UPLOAD = [
  { localDir: join(ROOT, 'src/assets/stock'), cloudFolder: 'tequecruncheese/stock' },
  { localDir: join(ROOT, 'src/assets/logos'), cloudFolder: 'tequecruncheese/logos' },
]

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'])

async function uploadFolder(localDir, cloudFolder) {
  let files
  try {
    files = await readdir(localDir)
  } catch {
    console.warn(`  [skip] Directory not found: ${localDir}`)
    return {}
  }

  const imageFiles = files.filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()))
  const mapping = {}

  for (const file of imageFiles) {
    const localPath = join(localDir, file)
    const publicId = `${cloudFolder}/${basename(file, extname(file))}`

    try {
      // Use upload with overwrite:false to skip already-uploaded files
      const result = await cloudinary.uploader.upload(localPath, {
        public_id: publicId,
        overwrite: false,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      })
      console.log(`  ✅ ${file} → ${result.secure_url}`)
      mapping[file] = result.secure_url
    } catch (err) {
      // If it already exists, fetch its URL
      if (err.error?.http_code === 400 || String(err).includes('already exists')) {
        try {
          const info = await cloudinary.api.resource(publicId)
          console.log(`  ⏭  ${file} (ya existe) → ${info.secure_url}`)
          mapping[file] = info.secure_url
        } catch {
          console.error(`  ❌ Error con ${file}:`, err.message)
        }
      } else {
        console.error(`  ❌ Error con ${file}:`, err.message || err)
      }
    }
  }

  return mapping
}

async function main() {
  console.log('🚀 Iniciando subida a Cloudinary...\n')
  const fullMapping = {}

  for (const { localDir, cloudFolder } of FOLDERS_TO_UPLOAD) {
    console.log(`📁 Procesando: ${localDir}`)
    const result = await uploadFolder(localDir, cloudFolder)
    Object.assign(fullMapping, result)
    console.log()
  }

  const outputPath = join(ROOT, 'src/assets/cloudinary-map.json')
  await writeFile(outputPath, JSON.stringify(fullMapping, null, 2), 'utf-8')
  console.log(`\n📄 Mapa guardado en: ${outputPath}`)
  console.log(`✅ Total imágenes subidas/encontradas: ${Object.keys(fullMapping).length}`)
}

main().catch(console.error)
