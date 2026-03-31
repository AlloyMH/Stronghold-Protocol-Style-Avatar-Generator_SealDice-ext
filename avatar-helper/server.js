import express from 'express'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()

app.use(express.json({ limit: '20mb' }))

const PORT = Number(process.env.PORT || 8787)
const OUTPUT_SIZE = 1024
const AVATAR_RATIO = 0.95
const GRID_ALPHA = 0.25
const GRID_LINE_ALPHA = 0.15
const GRID_LINE_HEIGHT = 3
const GRID_GAP = 8
const ACCENT_RGB = [48, 219, 177]
const BADGE_RATIO = 0.4
const BADGE_OFFSET_X = 0
const BADGE_OFFSET_Y = 0
const ASSET_DIR = path.resolve(__dirname, '..', 'stronghold-protocol-avatar', 'public')

const textOverlayBuffer = await sharp(path.join(ASSET_DIR, 'av-text-1.png'))
  .resize(OUTPUT_SIZE, OUTPUT_SIZE)
  .png()
  .toBuffer()

const badgeOverlayBuffer = await sharp(path.join(ASSET_DIR, 'av-icon.png'))
  .png()
  .toBuffer()

function getEnv(name, fallback = '') {
  return process.env[name] || fallback
}

async function downloadImage(imageUrl) {
  const resp = await fetch(imageUrl)
  if (!resp.ok) {
    throw new Error(`download failed: ${resp.status}`)
  }

  return Buffer.from(await resp.arrayBuffer())
}

function guessExtension(mimeType) {
  if (mimeType.includes('jpeg')) return '.jpg'
  if (mimeType.includes('webp')) return '.webp'
  return '.png'
}

function createSvgBuffer(svg) {
  return Buffer.from(svg)
}

function createCircleMaskSvg(size) {
  const radius = size / 2
  return createSvgBuffer(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="black"/>
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/>
    </svg>
  `)
}

function createGridOverlaySvg(size) {
  const pitch = GRID_LINE_HEIGHT + GRID_GAP
  const lines = []

  for (let y = 0; y < size; y += pitch) {
    lines.push(
      `<rect x="0" y="${y}" width="${size}" height="${GRID_LINE_HEIGHT}" fill="rgba(${ACCENT_RGB.join(',')},${GRID_LINE_ALPHA})"/>`
    )
  }

  return createSvgBuffer(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="rgba(${ACCENT_RGB.join(',')},${GRID_ALPHA})"/>
      ${lines.join('')}
    </svg>
  `)
}

function createCoverOverlaySvg(size) {
  return createSvgBuffer(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cover" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
          <stop offset="36%" stop-color="rgba(255,255,255,0)"/>
          <stop offset="48%" stop-color="rgba(50,50,50,0.015)"/>
          <stop offset="58%" stop-color="rgba(50,50,50,0.04)"/>
          <stop offset="67%" stop-color="rgba(50,50,50,0.085)"/>
          <stop offset="75%" stop-color="rgba(50,50,50,0.16)"/>
          <stop offset="82%" stop-color="rgba(50,50,50,0.3)"/>
          <stop offset="88%" stop-color="rgba(50,50,50,0.52)"/>
          <stop offset="94%" stop-color="rgba(50,50,50,0.82)"/>
          <stop offset="100%" stop-color="rgba(50,50,50,1)"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="${size}" height="${size}" fill="url(#cover)"/>
    </svg>
  `)
}

async function buildCircularAvatar(inputBuffer) {
  const avatarSize = Math.round(OUTPUT_SIZE * AVATAR_RATIO)
  const circleMask = createCircleMaskSvg(avatarSize)
  const gridOverlay = createGridOverlaySvg(avatarSize)
  const coverOverlay = createCoverOverlaySvg(avatarSize)

  return sharp(inputBuffer)
    .resize(avatarSize, avatarSize, { fit: 'cover', position: 'centre' })
    .composite([
      { input: gridOverlay, blend: 'over' },
      { input: coverOverlay, blend: 'over' },
      { input: circleMask, blend: 'dest-in' },
    ])
    .png()
    .toBuffer()
}

async function buildBadgeComposite() {
  const badgeSize = Math.round(OUTPUT_SIZE * BADGE_RATIO)
  return sharp(badgeOverlayBuffer).resize(badgeSize, badgeSize).png().toBuffer()
}

async function renderAvatarImage(inputBuffer) {
  const background = sharp({
    create: {
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      channels: 4,
      background: { r: 50, g: 50, b: 50, alpha: 1 },
    },
  })

  const circularAvatar = await buildCircularAvatar(inputBuffer)
  const badge = await buildBadgeComposite()

  const avatarSize = Math.round(OUTPUT_SIZE * AVATAR_RATIO)
  const avatarLeft = Math.round((OUTPUT_SIZE - avatarSize) / 2)
  const avatarTop = Math.round((OUTPUT_SIZE - avatarSize) / 2)
  const badgeSize = Math.round(OUTPUT_SIZE * BADGE_RATIO)
  const badgeTop = Math.round(((-6 + BADGE_OFFSET_Y) / 100) * OUTPUT_SIZE)
  const badgeRight = Math.round(((-6 + BADGE_OFFSET_X) / 100) * OUTPUT_SIZE)
  const badgeLeft = OUTPUT_SIZE - badgeSize - badgeRight

  return background
    .composite([
      { input: circularAvatar, left: avatarLeft, top: avatarTop },
      { input: textOverlayBuffer, left: 0, top: 0 },
      { input: badge, left: badgeLeft, top: badgeTop },
    ])
    .png()
    .toBuffer()
}

async function uploadToSealDiceResource(buffer, filename, mimeType = 'image/png') {
  const baseUrl = getEnv('SEALDICE_BASE_URL', 'http://localhost:3211')
  const url = `${baseUrl}/sd-api/resource`

  const authorization = getEnv('SEALDICE_AUTHORIZATION')
  const token = getEnv('SEALDICE_TOKEN')
  const webuiToken = getEnv('SEALDICE_WEBUI_TOKEN')

  const form = new FormData()
  form.append('files', new Blob([buffer], { type: mimeType }), filename)

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      token,
      Cookie: `webui_token=${webuiToken}`,
    },
    body: form,
  })

  const text = await resp.text()
  if (!resp.ok) {
    throw new Error(`upload failed: HTTP ${resp.status} - ${text}`)
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`upload response is not valid JSON: ${text}`)
  }

  if (!data?.result) {
    throw new Error(`upload failed: ${text}`)
  }

  return data
}

app.get('/health', (_req, res) => {
  return res.json({
    ok: true,
    pid: process.pid,
    port: PORT,
    renderer: 'sharp',
    assetDir: ASSET_DIR,
  })
})

app.post('/generate', async (req, res) => {
  try {
    const { imageUrl } = req.body || {}
    if (!imageUrl) {
      return res.status(400).json({ ok: false, error: 'missing imageUrl' })
    }

    const inputBuffer = await downloadImage(imageUrl)
    const avatarBuffer = await renderAvatarImage(inputBuffer)
    const mimeType = 'image/png'
    const ext = guessExtension(mimeType)
    const filename = `avatar_${Date.now()}${ext}`

    await uploadToSealDiceResource(avatarBuffer, filename, mimeType)

    const resourcePath = `data/images/${filename}`
    const sealCode = `[图:${resourcePath}]`

    return res.json({
      ok: true,
      resourcePath,
      sealCode,
    })
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e.message || String(e),
    })
  }
})

const server = app.listen(PORT, () => {
  console.log('[helper] renderer: sharp')
  console.log(`helper listening on http://127.0.0.1:${PORT}`)
})

server.on('error', (error) => {
  console.error('[helper] server error', error)
})
