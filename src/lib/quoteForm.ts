import {
  QUOTE_FORM_ACCESS_KEY,
  QUOTE_FORM_ENDPOINT,
  isQuoteFormLive,
} from '@/lib/constants'

export const QUOTE_FILE_EXTENSIONS = ['.xlsx', '.pdf', '.dxf'] as const
export const QUOTE_MAX_FILE_BYTES = 5 * 1024 * 1024

export interface QuoteFormValues {
  name: string
  company: string
  email: string
  phone: string
  material: string
  quantity: string
  notes: string
  file: File | null
  consent: boolean
}

export type QuoteFormField = keyof QuoteFormValues

export interface QuoteFormErrorCopy {
  name: string
  company: string
  email: string
  phone: string
  material: string
  quantity: string
  notes: string
  fileType: string
  fileSize: string
  consent: string
}

export const EMPTY_QUOTE_FORM: QuoteFormValues = {
  name: '',
  company: '',
  email: '',
  phone: '',
  material: '',
  quantity: '',
  notes: '',
  file: null,
  consent: false,
}

export function fileExtension(filename: string): string {
  const index = filename.lastIndexOf('.')
  return index >= 0 ? filename.slice(index).toLowerCase() : ''
}

export function isAcceptedQuoteFile(file: File): boolean {
  return (QUOTE_FILE_EXTENSIONS as readonly string[]).includes(fileExtension(file.name))
}

export function validateQuoteForm(
  values: QuoteFormValues,
  errors: QuoteFormErrorCopy,
): Partial<Record<QuoteFormField, string>> {
  const next: Partial<Record<QuoteFormField, string>> = {}

  if (!values.name.trim()) next.name = errors.name
  if (!values.company.trim()) next.company = errors.company
  if (!values.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    next.email = errors.email
  }
  if (!isPlausiblePhone(values.phone)) next.phone = errors.phone
  if (!values.material.trim()) next.material = errors.material
  if (!values.quantity.trim()) next.quantity = errors.quantity
  if (!values.notes.trim()) next.notes = errors.notes

  if (values.file) {
    if (!isAcceptedQuoteFile(values.file)) next.file = errors.fileType
    else if (values.file.size > QUOTE_MAX_FILE_BYTES) next.file = errors.fileSize
  }

  if (!values.consent) next.consent = errors.consent

  return next
}

export function buildQuoteFormData(values: QuoteFormValues): FormData {
  const data = new FormData()
  data.set('name', values.name.trim())
  data.set('company', values.company.trim())
  data.set('email', values.email.trim())
  data.set('phone', values.phone.trim())
  data.set('material', values.material.trim())
  data.set('quantity', values.quantity.trim())
  data.set('notes', values.notes.trim())
  data.set('consent', values.consent ? 'yes' : 'no')
  data.set('subject', 'Ajánlatkérés (ottbenjamin.hu mintaűrlap)')
  data.set('_subject', 'Ajánlatkérés (ottbenjamin.hu mintaűrlap)')
  data.set('from_name', 'ottbenjamin.hu')
  data.set('replyto', values.email.trim())
  data.set('_replyto', values.email.trim())

  if (values.file) {
    data.set('attachment', values.file, values.file.name)
  }

  if (QUOTE_FORM_ACCESS_KEY) {
    data.set('access_key', QUOTE_FORM_ACCESS_KEY)
  }

  return data
}

export async function submitQuoteRequest(
  values: QuoteFormValues,
): Promise<{ demo: boolean }> {
  if (!isQuoteFormLive()) {
    await wait(450)
    return { demo: true }
  }

  const response = await fetch(QUOTE_FORM_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: buildQuoteFormData(values),
  })

  const payload = await readJson(response)

  if (!response.ok || isExplicitFailure(payload)) {
    throw new Error('quote-form-submit-failed')
  }

  return { demo: false }
}

function isPlausiblePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

function isExplicitFailure(payload: unknown): boolean {
  return (
    !!payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    (payload as { success: unknown }).success === false
  )
}
