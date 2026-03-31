<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import AvatarPreview from '@/components/avatarPreview.vue'
import { cropCenterSquareToDataUrl } from '@/utils/crop'
import { renderPreviewShellToDataUrl } from '@/utils/renderAvatar'

const cropImageBase64 = ref('')
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const resultDataUrl = ref('')

function getSrcFromQuery(): string {
  const url = new URL(window.location.href)
  return url.searchParams.get('src') || ''
}

async function run(src: string) {
  try {
    status.value = 'running'
    errorMessage.value = ''
    resultDataUrl.value = ''

    cropImageBase64.value = await cropCenterSquareToDataUrl(src, 1024)
    await nextTick()

    const el = document.getElementById('PreviewShell')
    if (!el) {
      throw new Error('PreviewShell not found')
    }

    resultDataUrl.value = await renderPreviewShellToDataUrl(el, 2)
    status.value = 'done'

    ;(window as any).__BOT_RENDER_RESULT__ = {
      ok: true,
      dataUrl: resultDataUrl.value,
    }
  } catch (err: any) {
    status.value = 'error'
    errorMessage.value = err?.message || String(err)

    ;(window as any).__BOT_RENDER_RESULT__ = {
      ok: false,
      error: errorMessage.value,
    }
  }
}

onMounted(async () => {
  const src = getSrcFromQuery()
  if (src) {
    await run(src)
  }

  window.addEventListener('message', async (event) => {
    const data = event.data
    if (data?.type === 'BOT_RENDER' && data?.src) {
      await run(data.src)
    }
  })
})
</script>

<template>
  <div class="bot-render-page">
    <AvatarPreview v-if="cropImageBase64" :img="cropImageBase64" :show-controls="false" />

    <div class="debug-panel">
      <div>Status: {{ status }}</div>
      <div v-if="errorMessage">Error: {{ errorMessage }}</div>
    </div>
  </div>
</template>

<style scoped>
.bot-render-page {
  width: 512px;
  height: auto;
  padding: 0;
  margin: 0;
  background: transparent;
}

.debug-panel {
  position: fixed;
  left: -99999px;
  top: -99999px;
}
</style>
