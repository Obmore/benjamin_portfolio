import './styles.css'
import { mountInquiry } from './inquiry'
import { mountFlow } from './flow'

const EMAIL = 'bendzsiott1998@gmail.com'
const COPIED_ANNOUNCEMENT = 'E-mail-cím a vágólapra másolva'

const copyBtn = document.querySelector<HTMLButtonElement>('#mg-copy')
const addressEl = document.querySelector<HTMLElement>('#mg-email-text')
const statusEl = document.querySelector<HTMLElement>('#mg-status')
const copyIdle = document.querySelector<HTMLElement>('.mg-copy-idle')
const copyDone = document.querySelector<HTMLElement>('.mg-copy-done')

if (copyBtn) copyBtn.hidden = false

let copiedReset = 0
let announceFrame = 0

function selectAddress(): void {
  if (!addressEl) return
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(addressEl)
  selection.removeAllRanges()
  selection.addRange(range)
}

function isClipboardWriteAvailable(): boolean {
  return window.isSecureContext && typeof navigator.clipboard?.writeText === 'function'
}

async function copyText(text: string): Promise<boolean> {
  if (!isClipboardWriteAvailable()) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function setCopiedLabels(copied: boolean): void {
  copyBtn?.classList.toggle('is-copied', copied)
  copyIdle?.toggleAttribute('aria-hidden', copied)
  copyDone?.toggleAttribute('aria-hidden', !copied)
}

function clearCopiedUi(): void {
  setCopiedLabels(false)
  if (statusEl) statusEl.textContent = ''
}

function announceCopied(): void {
  if (!statusEl) return
  statusEl.textContent = ''
  if (announceFrame) window.cancelAnimationFrame(announceFrame)
  announceFrame = window.requestAnimationFrame(() => {
    statusEl.textContent = COPIED_ANNOUNCEMENT
    announceFrame = 0
  })
}

function showCopied(): void {
  setCopiedLabels(true)
  announceCopied()
  window.clearTimeout(copiedReset)
  copiedReset = window.setTimeout(() => {
    clearCopiedUi()
    copiedReset = 0
  }, 2000)
}

mountInquiry(copyText)
mountFlow()

copyBtn?.addEventListener('click', () => {
  void (async () => {
    const ok = await copyText(EMAIL)
    if (ok) {
      showCopied()
      return
    }
    clearCopiedUi()
    selectAddress()
  })()
})
