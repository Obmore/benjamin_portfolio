import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { isQuoteFormLive } from '@/lib/constants'
import { flyField } from '@/lib/flipFly'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  EMPTY_QUOTE_FORM,
  submitQuoteRequest,
  validateQuoteForm,
  type QuoteFormField,
  type QuoteFormValues,
} from '@/lib/quoteForm'
import type { QuoteFormCopy } from '@/data/types'

gsap.registerPlugin(ScrollTrigger)

const FIELD_CLASS =
  'w-full rounded-[6px] border border-line/30 bg-surface px-4 py-2.5 text-foreground outline-none transition-colors focus:border-line disabled:opacity-60'
const ERROR_FIELD_CLASS = 'border-red-500/70 focus:border-red-500'

const FIELD_ORDER: QuoteFormField[] = [
  'name',
  'company',
  'email',
  'phone',
  'material',
  'quantity',
  'notes',
  'file',
  'consent',
]

export function QuoteRequestForm({ demoOnly = false }: { demoOnly?: boolean }) {
  const { content } = useI18n()
  const copy = content.services.form
  const live = !demoOnly && isQuoteFormLive()
  const reduced = usePrefersReducedMotion()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const valuesRef = useRef<QuoteFormValues>(EMPTY_QUOTE_FORM)
  const prevRef = useRef<QuoteFormValues>(EMPTY_QUOTE_FORM)
  const flyTimers = useRef<Partial<Record<QuoteFormField, number>>>({})

  const [values, setValues] = useState<QuoteFormValues>(EMPTY_QUOTE_FORM)
  const [errors, setErrors] = useState<Partial<Record<QuoteFormField, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [result, setResult] = useState<'demo' | 'live' | null>(null)
  valuesRef.current = values

  const setField = <K extends QuoteFormField>(key: K, value: QuoteFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  useEffect(() => {
    if (reduced) {
      prevRef.current = values
      return
    }
    const root = formRef.current
    if (!root) {
      prevRef.current = values
      return
    }

    const keys: QuoteFormField[] = [
      'name',
      'company',
      'email',
      'phone',
      'material',
      'quantity',
      'notes',
      'file',
    ]
    const pending: number[] = []
    for (const key of keys) {
      const next = previewText(values, copy, key)
      const prev = previewText(prevRef.current, copy, key)
      if (!next || next === prev) continue
      window.clearTimeout(flyTimers.current[key])
      const timer = window.setTimeout(() => {
        flyField(root, key, next)
      }, 220)
      flyTimers.current[key] = timer
      pending.push(timer)
    }
    prevRef.current = values
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer))
    }
  }, [copy, reduced, values])

  useLayoutEffect(() => {
    const form = formRef.current
    if (!form || !demoOnly || reduced) return

    const playDemo = async () => {
      const current = valuesRef.current
      if (current.name.trim() || current.company.trim() || current.email.trim()) return
      const material = copy.materials.find((item) => item.value === 'fa')?.value || copy.materials[0]?.value || ''
      setValues({
        ...EMPTY_QUOTE_FORM,
        name: copy.sampleName,
        company: copy.sampleCompany,
        email: copy.sampleEmail,
        phone: copy.samplePhone,
        material,
        quantity: copy.sampleQuantity,
        notes: copy.sampleNotes,
        consent: true,
      })
    }

    const trigger = ScrollTrigger.create({
      trigger: form,
      start: 'top 72%',
      once: true,
      onEnter: () => {
        void playDemo()
      },
    })
    return () => trigger.kill()
  }, [copy, demoOnly, reduced])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitError(false)
    setResult(null)

    const nextErrors = validateQuoteForm(values, copy.errors)
    setErrors(nextErrors)

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field])
    if (firstInvalid) {
      document.getElementById(`quote-${firstInvalid}`)?.focus()
      return
    }

    setSubmitting(true)
    try {
      if (demoOnly || !isQuoteFormLive()) {
        await wait(400)
        setResult('demo')
      } else {
        const response = await submitQuoteRequest(values)
        setResult(response.demo ? 'demo' : 'live')
      }
      setValues(EMPTY_QUOTE_FORM)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setSubmitError(false)
    setErrors({})
    setValues(EMPTY_QUOTE_FORM)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (result) {
    return (
      <div className="space-y-5" role="status">
        <p className="text-foreground leading-relaxed">
          {result === 'demo' ? copy.demoSuccess : copy.liveSuccess}
        </p>
        <Button type="button" variant="outline" onClick={handleReset}>
          {copy.tryAgain}
        </Button>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
      aria-labelledby="quote-form-heading"
    >
      <div
        className="rounded-[6px] border border-line/30 bg-background px-4 py-3 text-sm leading-relaxed text-muted"
        role="status"
      >
        {live ? copy.liveBanner : copy.demoBanner}
      </div>

      <div className="quote-live">
        <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="quote-name"
          source="name"
          label={copy.fields.name}
          requiredLabel={copy.required}
          value={values.name}
          autoComplete="name"
          error={errors.name}
          disabled={submitting}
          onChange={(value) => setField('name', value)}
        />
        <TextField
          id="quote-company"
          source="company"
          label={copy.fields.company}
          requiredLabel={copy.required}
          value={values.company}
          autoComplete="organization"
          error={errors.company}
          disabled={submitting}
          onChange={(value) => setField('company', value)}
        />
        <TextField
          id="quote-email"
          source="email"
          label={copy.fields.email}
          requiredLabel={copy.required}
          type="email"
          value={values.email}
          autoComplete="email"
          error={errors.email}
          disabled={submitting}
          onChange={(value) => setField('email', value)}
        />
        <TextField
          id="quote-phone"
          source="phone"
          label={copy.fields.phone}
          requiredLabel={copy.required}
          type="tel"
          value={values.phone}
          autoComplete="tel"
          error={errors.phone}
          disabled={submitting}
          onChange={(value) => setField('phone', value)}
        />
        <div>
          <FieldLabel
            htmlFor="quote-material"
            label={copy.fields.material}
            required
            requiredLabel={copy.required}
          />
          <select
            id="quote-material"
            data-quote-source="material"
            value={values.material}
            disabled={submitting}
            aria-invalid={Boolean(errors.material)}
            aria-describedby={errors.material ? 'quote-material-error' : undefined}
            onChange={(event) => setField('material', event.target.value)}
            className={`${FIELD_CLASS} ${errors.material ? ERROR_FIELD_CLASS : ''}`}
          >
            <option value="">{copy.fields.materialPlaceholder}</option>
            {copy.materials.map((material) => (
              <option key={material.value} value={material.value}>
                {material.label}
              </option>
            ))}
          </select>
          <FieldError id="quote-material-error" message={errors.material} />
        </div>
        <TextField
          id="quote-quantity"
          source="quantity"
          label={copy.fields.quantity}
          requiredLabel={copy.required}
          value={values.quantity}
          error={errors.quantity}
          disabled={submitting}
          onChange={(value) => setField('quantity', value)}
        />
      </div>

      <div>
        <FieldLabel
          htmlFor="quote-notes"
          label={copy.fields.notes}
          required
          requiredLabel={copy.required}
        />
        <textarea
          id="quote-notes"
          data-quote-source="notes"
          rows={4}
          value={values.notes}
          disabled={submitting}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? 'quote-notes-error' : undefined}
          onChange={(event) => setField('notes', event.target.value)}
          className={`${FIELD_CLASS} resize-y ${errors.notes ? ERROR_FIELD_CLASS : ''}`}
        />
        <FieldError id="quote-notes-error" message={errors.notes} />
      </div>

      <div>
        <FieldLabel
          htmlFor="quote-file"
          label={copy.fields.file}
          required={false}
          optionalLabel={copy.optional}
        />
        <div className="relative flex min-w-0 flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            id="quote-file"
            name="attachment"
            type="file"
            disabled={submitting}
            accept=".xlsx,.pdf,.dxf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-invalid={Boolean(errors.file)}
            aria-describedby={
              errors.file ? 'quote-file-error quote-file-hint' : 'quote-file-status quote-file-hint'
            }
            onChange={(event) => setField('file', event.target.files?.[0] ?? null)}
            className="peer sr-only focus-visible:outline-none"
          />
          <label
            htmlFor="quote-file"
            className={`inline-flex cursor-pointer items-center justify-center rounded-[6px] border border-line/30 bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-line peer-focus-visible:border-line peer-focus-visible:ring-2 peer-focus-visible:ring-line peer-focus-visible:ring-offset-2 ${
              submitting ? 'pointer-events-none cursor-not-allowed opacity-60' : ''
            }`}
          >
            {copy.fileChoose}
          </label>
          <span
            id="quote-file-status"
            data-quote-source="file"
            className="min-w-0 break-all text-sm text-muted"
            aria-live="polite"
          >
            {values.file ? values.file.name : copy.fileNone}
          </span>
        </div>
        <p id="quote-file-hint" className="mt-1 text-xs text-muted">
          {copy.fileHint}
        </p>
        <FieldError id="quote-file-error" message={errors.file} />
      </div>

      <div>
        <div className="flex items-start gap-3">
          <input
            id="quote-consent"
            type="checkbox"
            checked={values.consent}
            disabled={submitting}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? 'quote-consent-error' : undefined}
            onChange={(event) => setField('consent', event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-accent"
          />
          <label htmlFor="quote-consent" className="text-sm leading-relaxed text-muted">
            {copy.fields.consent}
            <span className="text-accent"> *</span>
            <span className="sr-only"> ({copy.required})</span>
          </label>
        </div>
        <FieldError id="quote-consent-error" message={errors.consent} />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Button type="submit" disabled={submitting}>
          {submitting ? copy.submitting : copy.submit}
        </Button>
        <p className="text-sm leading-relaxed text-muted" aria-hidden="true">
          {live ? copy.liveBanner : copy.demoBanner}
        </p>
      </div>

      {submitError ? (
        <p className="text-sm text-red-500" role="alert">
          {copy.error}
        </p>
      ) : null}
        </div>
        <MailPreview values={values} copy={copy} />
      </div>
    </form>
  )
}

interface TextFieldProps {
  id: string
  source: QuoteFormField
  label: string
  requiredLabel: string
  value: string
  error?: string
  disabled?: boolean
  type?: 'text' | 'email' | 'tel'
  autoComplete?: string
  onChange: (value: string) => void
}

function TextField({
  id,
  source,
  label,
  requiredLabel,
  value,
  error,
  disabled,
  type = 'text',
  autoComplete,
  onChange,
}: TextFieldProps) {
  const errorId = `${id}-error`
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required requiredLabel={requiredLabel} />
      <input
        id={id}
        data-quote-source={source}
        type={type}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${FIELD_CLASS} ${error ? ERROR_FIELD_CLASS : ''}`}
      />
      <FieldError id={errorId} message={error} />
    </div>
  )
}

interface FieldLabelProps {
  htmlFor: string
  label: string
  required?: boolean
  requiredLabel?: string
  optionalLabel?: string
}

function FieldLabel({ htmlFor, label, required, requiredLabel, optionalLabel }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm text-muted">
      {label}
      {required ? (
        <>
          <span className="text-accent" aria-hidden="true">
            {' '}
            *
          </span>
          {requiredLabel ? <span className="sr-only"> ({requiredLabel})</span> : null}
        </>
      ) : optionalLabel ? (
        <span className="text-muted"> ({optionalLabel})</span>
      ) : null}
    </label>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 text-xs text-red-500">
      {message}
    </p>
  )
}

function previewText(values: QuoteFormValues, copy: QuoteFormCopy, key: QuoteFormField): string {
  if (key === 'consent') return ''
  if (key === 'file') return values.file?.name ?? ''
  if (key === 'material') {
    return copy.materials.find((item) => item.value === values.material)?.label ?? values.material
  }
  return String(values[key] ?? '').trim()
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function MailPreview({
  values,
  copy,
}: {
  values: QuoteFormValues
  copy: QuoteFormCopy
}) {
  const name = values.name.trim() || copy.sampleName
  const company = values.company.trim() || copy.sampleCompany
  const email = values.email.trim() || copy.sampleEmail
  const phone = values.phone.trim() || copy.samplePhone
  const material =
    copy.materials.find((item) => item.value === values.material)?.label ||
    copy.materials.find((item) => item.value === 'fa')?.label ||
    '—'
  const quantityValue = values.quantity.trim() || copy.sampleQuantity
  const quantity = quantityValue.endsWith(copy.previewQuantityUnit.trim())
    ? quantityValue
    : `${quantityValue}${copy.previewQuantityUnit}`
  const notes = values.notes.trim() || copy.sampleNotes
  const file = values.file?.name || copy.previewFileNone

  return (
    <aside className="mail-preview" aria-live="polite">
      <p className="mail-preview-title">{copy.previewTitle}</p>
      <div className="mail-preview-window">
        <dl className="mail-preview-headers">
          <div>
            <dt>{copy.previewFrom}</dt>
            <dd>
              <span>{name}</span>
              <span className="mail-preview-meta">{company}</span>
              <span className="mail-preview-meta">{email}</span>
            </dd>
          </div>
          <div>
            <dt>{copy.previewTo}</dt>
            <dd>{copy.previewRecipient}</dd>
          </div>
          <div>
            <dt>{copy.previewSubjectLabel}</dt>
            <dd>{copy.previewSubject}</dd>
          </div>
        </dl>
        <div className="mail-preview-body">
          <p data-preview-line="name">
            {copy.fields.name}: {name}
          </p>
          <p data-preview-line="company">
            {copy.fields.company}: {company}
          </p>
          <p data-preview-line="email">
            {copy.fields.email}: {email}
          </p>
          <p data-preview-line="phone">
            {copy.fields.phone}: {phone}
          </p>
          <p data-preview-line="material">
            {copy.fields.material}: {material}
          </p>
          <p data-preview-line="quantity">
            {copy.fields.quantity}: {quantity}
          </p>
          <p data-preview-line="notes">
            {copy.fields.notes}: {notes}
          </p>
          <p data-preview-line="file">
            {copy.fields.file}: {file}
          </p>
        </div>
      </div>
    </aside>
  )
}
