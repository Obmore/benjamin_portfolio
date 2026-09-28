import { useRef, useState, type FormEvent } from 'react'
import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { isQuoteFormLive } from '@/lib/constants'
import {
  EMPTY_QUOTE_FORM,
  submitQuoteRequest,
  validateQuoteForm,
  type QuoteFormField,
  type QuoteFormValues,
} from '@/lib/quoteForm'

const FIELD_CLASS =
  'w-full rounded-xl border border-border/70 bg-surface/70 px-4 py-2.5 text-foreground outline-none transition-colors focus:border-accent disabled:opacity-60'
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

export function QuoteRequestForm() {
  const { content } = useI18n()
  const copy = content.services.form
  const live = isQuoteFormLive()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [values, setValues] = useState<QuoteFormValues>(EMPTY_QUOTE_FORM)
  const [errors, setErrors] = useState<Partial<Record<QuoteFormField, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [result, setResult] = useState<'demo' | 'live' | null>(null)

  const setField = <K extends QuoteFormField>(key: K, value: QuoteFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

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
      const response = await submitQuoteRequest(values)
      setResult(response.demo ? 'demo' : 'live')
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
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
      aria-labelledby="quote-form-heading"
    >
      <div
        className="rounded-xl border border-cyan/40 bg-cyan/5 px-4 py-3 text-sm leading-relaxed text-muted"
        role="status"
      >
        {live ? copy.liveBanner : copy.demoBanner}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id="quote-name"
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
            className={`inline-flex cursor-pointer items-center justify-center rounded-xl border border-border/70 bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/50 peer-focus-visible:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 ${
              submitting ? 'pointer-events-none cursor-not-allowed opacity-60' : ''
            }`}
          >
            {copy.fileChoose}
          </label>
          <span id="quote-file-status" className="min-w-0 break-all text-sm text-muted" aria-live="polite">
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

      <Button type="submit" disabled={submitting}>
        {submitting ? copy.submitting : copy.submit}
      </Button>

      {submitError ? (
        <p className="text-sm text-red-500" role="alert">
          {copy.error}
        </p>
      ) : null}
    </form>
  )
}

interface TextFieldProps {
  id: string
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
