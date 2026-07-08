export interface ContactFormData {
  name: string
  email: string
  message: string
}

export async function submitContact(data: ContactFormData): Promise<void> {
  // Placeholder for EmailJS, Resend or backend API integration.
  await new Promise((resolve) => setTimeout(resolve, 600))
  console.info('Contact form submission (frontend-only):', data)
}
