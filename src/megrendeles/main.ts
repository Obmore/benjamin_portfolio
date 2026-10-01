import './styles.css'

const EMAIL = 'bendzsiott1998@gmail.com'
const COPIED_ANNOUNCEMENT = 'Az e-mail-cím a vágólapra került.'

const writeLink = document.querySelector<HTMLAnchorElement>('#mg-write')
const copyBtn = document.querySelector<HTMLButtonElement>('#mg-copy')
const addressEl = document.querySelector<HTMLElement>('#mg-email-text')
const statusEl = document.querySelector<HTMLElement>('#mg-status')

let copiedReset = 0
let announceFrame = 0

function setMailtoSubject(subject: string): void {
  if (!writeLink) return
  writeLink.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`
}

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

function clearCopiedUi(): void {
  copyBtn?.classList.remove('is-copied')
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
  copyBtn?.classList.add('is-copied')
  announceCopied()
  window.clearTimeout(copiedReset)
  copiedReset = window.setTimeout(() => {
    clearCopiedUi()
    copiedReset = 0
  }, 2000)
}

document.querySelectorAll<HTMLAnchorElement>('[data-subject]').forEach((link) => {
  link.addEventListener('click', () => {
    const subject = link.getAttribute('data-subject')
    if (subject) setMailtoSubject(subject)
    window.setTimeout(() => {
      writeLink?.focus()
    }, 0)
  })
})

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
