export async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`image load failed: ${src.slice(0, 120)}`))
    img.src = src
  })
}

export async function cropCenterSquareToDataUrl(
  src: string,
  size = 1024,
  mime = 'image/png',
): Promise<string> {
  const img = await loadImage(src)

  const w = img.naturalWidth
  const h = img.naturalHeight
  const side = Math.min(w, h)
  const sx = (w - side) / 2
  const sy = (h - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas context unavailable')

  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)

  return canvas.toDataURL(mime)
}