// Single source of the package prices. The home page imports it, and the
// Vite build writes the same values into /megrendeles/ ({{huf:…}} placeholders).
// Keep this module free of aliases and import.meta.env: vite.config.ts loads it.

export const AMOUNTS = {
  orderForm: 149_000,
  orderFormSheet: 189_000,
  introSite: 129_000,
  hosting: 4_900,
  hostingWithEdits: 9_900,
  // Termékleírás webshopba: trial round of 20 products (owner's decision, 2026-10-20).
  productDescriptionsTrial: 49_000,
} as const

export type AmountKey = keyof typeof AMOUNTS
export type PriceLocale = 'hu' | 'en'

export const VAT_LABEL: Record<PriceLocale, string> = {
  hu: 'AAM (áfamentes)',
  en: 'VAT exempt (AAM)',
}

export function isAmountKey(key: string): key is AmountKey {
  return Object.hasOwn(AMOUNTS, key)
}

/** 149000 → "149 000 Ft" (hu) or "HUF 149,000" (en); spaces are non-breaking. */
export function formatHuf(key: AmountKey, locale: PriceLocale, space = ' '): string {
  const digits = String(AMOUNTS[key])
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'hu' ? space : ',')
  return locale === 'hu' ? `${grouped}${space}Ft` : `HUF${space}${grouped}`
}
