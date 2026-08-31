import '../style.css'
import { rescue, type RescueResult } from '../core/rescue'
import type { InputFile } from '../core/model'

const dropzone = document.getElementById('dropzone') as HTMLDivElement
const fileInput = document.getElementById('fileinput') as HTMLInputElement
const results = document.getElementById('results') as HTMLElement
const sourcesEl = document.getElementById('sources') as HTMLUListElement
const warningsEl = document.getElementById('warnings') as HTMLUListElement
const summaryEl = document.getElementById('summary') as HTMLParagraphElement
const downloadBtn = document.getElementById('download') as HTMLButtonElement

let current: RescueResult | undefined

async function handleFiles(fileList: FileList | File[]): Promise<void> {
  const files: InputFile[] = []
  for (const f of Array.from(fileList)) {
    files.push({ name: f.name, text: await f.text() })
  }
  if (files.length === 0) return

  current = await rescue(files, new Date())
  const d = current.dataset

  sourcesEl.replaceChildren(
    ...d.sources.map((s) => {
      const li = document.createElement('li')
      li.textContent = `${s.filename} — ${s.detected_type.replace(/_/g, ' ')} (${s.rows} rows)`
      return li
    }),
  )
  warningsEl.replaceChildren(
    ...d.warnings.map((w) => {
      const li = document.createElement('li')
      li.className = w.level
      li.textContent = w.message
      if (/not recognized|failed to parse/.test(w.message)) {
        li.append(' ')
        const a = document.createElement('a')
        a.href = 'https://github.com/qsor27/stocky-rescue/issues/new?template=format-sample.yml'
        a.target = '_blank'
        a.rel = 'noopener'
        a.textContent = 'report this format'
        li.append(a)
      }
      return li
    }),
  )
  if (d.warnings.length === 0) {
    const li = document.createElement('li')
    li.textContent = 'None — everything parsed cleanly.'
    warningsEl.replaceChildren(li)
  }
  summaryEl.textContent =
    `${d.purchase_orders.length} purchase orders · ${d.purchase_order_lines.length} lines · ` +
    `${d.suppliers.length} suppliers reconstructed · ${d.wac_report.length} SKUs in cost report · ` +
    `${d.stocktakes.length} stocktake rows`
  results.hidden = false
}

downloadBtn.addEventListener('click', () => {
  if (current === undefined) return
  const url = URL.createObjectURL(current.zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'stocky-rescue-dataset.zip'
  a.click()
  URL.revokeObjectURL(url)
})

dropzone.addEventListener('click', () => fileInput.click())
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropzone.classList.add('over')
})
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'))
dropzone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropzone.classList.remove('over')
  if (e.dataTransfer) void handleFiles(e.dataTransfer.files)
})
fileInput.addEventListener('change', () => {
  if (fileInput.files) void handleFiles(fileInput.files)
})
