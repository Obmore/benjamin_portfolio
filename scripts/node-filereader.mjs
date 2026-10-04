if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    result = null
    onload = null
    onloadend = null
    onerror = null
    readAsArrayBuffer(blob) {
      Promise.resolve(blob.arrayBuffer())
        .then((buf) => {
          this.result = buf
          this.onload?.({ target: this })
          this.onloadend?.({ target: this })
        })
        .catch((err) => {
          this.onerror?.(err)
          this.onloadend?.({ target: this })
        })
    }
  }
}

