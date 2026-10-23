/** Same index on the server and in the browser. Not Math.random. */
export function stableIndex(seed: string, length: number) {
  if (length <= 0) return 0
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (Math.imul(hash, 33) + seed.charCodeAt(i)) >>> 0
  return hash % length
}
