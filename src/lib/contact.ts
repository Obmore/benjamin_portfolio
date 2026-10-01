export function isClipboardWriteAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator.clipboard?.writeText === 'function'
  )
}

/** Copies text with the Clipboard API only. Returns false on any failure. */
export async function copyTextWithClipboardApi(text: string): Promise<boolean> {
  if (!isClipboardWriteAvailable()) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
