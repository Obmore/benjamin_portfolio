export const MORPH_COLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export const MORPH_ROWS = ['1', '2', '3', '4'] as const

export const MOBILE_FIELD_KEYS = ['name', 'email', 'material', 'quantity'] as const

export function isCompactField(key: string) {
  return (MOBILE_FIELD_KEYS as readonly string[]).includes(key)
}
