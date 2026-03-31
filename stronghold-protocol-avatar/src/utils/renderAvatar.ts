import html2canvas from 'html2canvas'

export async function renderPreviewShellToDataUrl(
  el: HTMLElement,
  scale = 2,
): Promise<string> {
  const canvas = await html2canvas(el, {
    backgroundColor: null,
    scale,
    useCORS: true,
    logging: false,
  })

  return canvas.toDataURL('image/png')
}