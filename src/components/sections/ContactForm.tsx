import { useState, type FormEvent } from 'react'
import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { submitContact } from '@/lib/contact'
import { LINKEDIN_URL } from '@/lib/constants'

export function ContactForm() {
  const { content } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = content.contact.form.errors.name
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = content.contact.form.errors.email
    }
    if (!message.trim()) nextErrors.message = content.contact.form.errors.message
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSuccess(false)
    if (!validate()) return

    setSubmitting(true)
    try {
      await submitContact({ name, email, message })
      setSuccess(true)
      setName('')
      setEmail('')
      setMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm text-muted">
          {content.contact.form.name}
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-border/70 bg-surface/70 px-4 py-2.5 text-foreground outline-none transition-colors focus:border-accent"
        />
        {errors.name ? <p className="mt-1 text-xs text-red-500">{errors.name}</p> : null}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-muted">
          {content.contact.form.email}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border/70 bg-surface/70 px-4 py-2.5 text-foreground outline-none transition-colors focus:border-accent"
        />
        {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email}</p> : null}
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm text-muted">
          {content.contact.form.message}
        </label>
        <textarea
          id="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-none rounded-xl border border-border/70 bg-surface/70 px-4 py-2.5 text-foreground outline-none transition-colors focus:border-accent"
        />
        {errors.message ? <p className="mt-1 text-xs text-red-500">{errors.message}</p> : null}
      </div>

      <Button type="submit" disabled={submitting}>
        {content.contact.form.submit}
      </Button>

      {success ? (
        <p className="text-sm text-accent" role="status">
          {content.contact.form.success}
        </p>
      ) : null}
    </form>
  )
}

interface ContactInfoProps {
  email: string
  location: string
  linkedIn: string
}

export function ContactInfo({ email, location, linkedIn }: ContactInfoProps) {
  const { content } = useI18n()

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-accent">
          {content.common.emailLabel}
        </p>
        <a href={`mailto:${email}`} className="mt-1 block text-foreground hover:text-accent">
          {email}
        </a>
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-accent">
          {content.common.locationLabel}
        </p>
        <p className="mt-1 text-foreground">{location}</p>
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-accent">
          {content.common.linkedInLabel}
        </p>
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-foreground hover:text-accent"
        >
          {linkedIn}
        </a>
      </div>
    </div>
  )
}
