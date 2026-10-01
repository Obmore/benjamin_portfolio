export const C_OBJECTS = [
  { id: 'c-pi', poster: '3d/c-pi.svg' },
  { id: 'c-pcb', poster: '3d/c-pcb.svg' },
  { id: 'c-sw', poster: '3d/c-sw.svg' },
] as const

export type CObjectId = (typeof C_OBJECTS)[number]['id']
