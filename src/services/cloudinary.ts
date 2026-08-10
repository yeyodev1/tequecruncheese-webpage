/**
 * Cloudinary service
 * Provee URLs optimizadas para imágenes en CDN.
 * Cloud: dvq6znk71
 */

const CLOUD_BASE = 'https://res.cloudinary.com/dvq6znk71/image/upload'

export type ImgQuality = 'auto' | 'auto:low' | 'auto:good' | 'auto:best' | 60 | 70 | 80 | 90

export interface CloudinaryOptions {
  width?: number
  height?: number
  quality?: ImgQuality
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png'
  crop?: 'fill' | 'fit' | 'scale' | 'limit'
}

/**
 * Mapa de nombre-de-archivo → public_id en Cloudinary
 */
export const CLOUD_IDS: Record<string, string> = {
  // Stock
  'DSC00027.jpg':             'tequecruncheese/stock/DSC00027',
  'DSC05880.jpg':             'tequecruncheese/stock/DSC05880',
  'DSC06027.jpg':             'tequecruncheese/stock/DSC06027',
  'DSC06029.jpg':             'tequecruncheese/stock/DSC06029',
  'DSC06039.jpg':             'tequecruncheese/stock/DSC06039',
  'DSC06085.jpg':             'tequecruncheese/stock/DSC06085',
  'DSC06117.jpg':             'tequecruncheese/stock/DSC06117',
  'DSC06129.jpg':             'tequecruncheese/stock/DSC06129',
  'DSC06140.jpg':             'tequecruncheese/stock/DSC06140',
  'DSC06147.jpg':             'tequecruncheese/stock/DSC06147',
  'DSC06148.jpg':             'tequecruncheese/stock/DSC06148',
  'DSC06166.jpg':             'tequecruncheese/stock/DSC06166',
  'DSC06177.jpg':             'tequecruncheese/stock/DSC06177',
  'DSC06180.jpg':             'tequecruncheese/stock/DSC06180',
  'DSC06199.jpg':             'tequecruncheese/stock/DSC06199',
  'DSC06201.jpg':             'tequecruncheese/stock/DSC06201',
  'DSC06229.jpg':             'tequecruncheese/stock/DSC06229',
  'DSC06286.jpg':             'tequecruncheese/stock/DSC06286',
  'DSC06292.jpg':             'tequecruncheese/stock/DSC06292',
  'DSC06334.jpg':             'tequecruncheese/stock/DSC06334',
  'DSC06385.jpg':             'tequecruncheese/stock/DSC06385',
  'DSC06583.jpg':             'tequecruncheese/stock/DSC06583',
  'HORARIO.png':              'tequecruncheese/stock/HORARIO',
  'LOGO Variante-03.png':     'tequecruncheese/stock/LOGO Variante-03',
  'Pastelitos NEW PRODUCT.png': 'tequecruncheese/stock/Pastelitos NEW PRODUCT',
  'Tea fresh.png':            'tequecruncheese/stock/Tea fresh',
  'WhatsApp Image 2026-02-08 at 11.51.16 AM.jpeg': 'tequecruncheese/stock/WhatsApp Image 2026-02-08 at 11.51.16 AM',
  'capu y moka.png':          'tequecruncheese/stock/capu y moka',
  'images (2).jpeg':          'tequecruncheese/stock/images (2)',
  'moka iced latte.png':      'tequecruncheese/stock/moka iced latte',
  'salted caramel.png':       'tequecruncheese/stock/salted caramel',
  'thumbnail (1).jpeg':       'tequecruncheese/stock/thumbnail (1)',
  'thumbnail (3).jpeg':       'tequecruncheese/stock/thumbnail (3)',
  'thumbnail (4).jpeg':       'tequecruncheese/stock/thumbnail (4)',
  'IMG_2253.JPG.jpeg':        'tequecruncheese/stock/IMG_2253',
  // Logos
  'logo-long.png':            'tequecruncheese/logos/logo-long',
  'logo-small.png':           'tequecruncheese/logos/logo-small',
}

/**
 * Genera una URL optimizada de Cloudinary.
 * @param filename - Nombre del archivo original (e.g. 'DSC06085.jpg')
 * @param opts     - Transformaciones opcionales
 */
export function cloudImg(filename: string, opts: CloudinaryOptions = {}): string {
  const publicId = CLOUD_IDS[filename]
  if (!publicId) {
    console.warn(`[cloudinary] No se encontró public_id para: ${filename}`)
    return ''
  }

  const transforms: string[] = ['f_auto', 'q_auto']

  if (opts.format && opts.format !== 'auto') transforms[0] = `f_${opts.format}`
  if (opts.quality) transforms[1] = `q_${opts.quality}`
  if (opts.width) transforms.push(`w_${opts.width}`)
  if (opts.height) transforms.push(`h_${opts.height}`)
  if (opts.crop) transforms.push(`c_${opts.crop}`)

  const transformStr = transforms.join(',')
  const encodedId = publicId.replace(/ /g, '%20')
  return `${CLOUD_BASE}/${transformStr}/${encodedId}`
}

/**
 * Inserta transformaciones en una URL de Cloudinary ya existente.
 *
 * Las imágenes de producto llegan del backend como URLs completas, sin
 * transformar: mostrarlas en una miniatura de 56px descargaba el original.
 * Devuelve la URL tal cual si no es de Cloudinary, para no romper nada.
 */
export function cloudThumb(url: string | undefined | null, width: number): string {
  if (!url) return ''
  const marker = '/image/upload/'
  const at = url.indexOf(marker)
  if (at === -1) return url

  const head = url.slice(0, at + marker.length)
  let tail = url.slice(at + marker.length)

  // Drop any transform segment already present so ours is the only one.
  const first = tail.split('/')[0] ?? ''
  if (/^[a-z]{1,3}_[^/]+/.test(first)) tail = tail.slice(first.length + 1)

  return `${head}f_auto,q_auto,w_${width},h_${width},c_fill/${tail}`
}

/**
 * Genera srcset para imágenes responsive.
 * @param filename - Nombre del archivo original
 * @param widths   - Array de anchos en px (e.g. [400, 800, 1200])
 */
export function cloudSrcset(filename: string, widths: number[]): string {
  return widths
    .map(w => `${cloudImg(filename, { width: w, crop: 'limit' })} ${w}w`)
    .join(', ')
}
