export type Quantized = {
  p: string
  s: number
  o: [number, number, number]
}

export type BakedLayer = {
  i?: Quantized
  b?: Quantized
  d?: Quantized
}

export type BakedObject = {
  id: string
  layers: BakedLayer[]
}
