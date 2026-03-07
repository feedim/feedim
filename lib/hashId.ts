/**
 * Simple reversible ID obfuscation for public-facing URLs.
 * Converts numeric IDs to opaque base36 strings so raw database IDs
 * are never exposed to end users.
 *
 * NOT cryptographic — just obfuscation to prevent enumeration and
 * hide internal data structure.
 */

const KEY = 0x5A7E3C1D;

export function encodeId(id: number): string {
  let n = (id ^ KEY) >>> 0;
  n = (((n & 0x0F0F0F0F) << 4) | ((n & 0xF0F0F0F0) >>> 4)) >>> 0;
  return n.toString(36);
}

export function decodeId(hash: string): number | null {
  const parsed = parseInt(hash, 36);
  if (isNaN(parsed) || parsed < 0) return null;
  const n = (((parsed & 0x0F0F0F0F) << 4) | ((parsed & 0xF0F0F0F0) >>> 4)) >>> 0;
  return (n ^ KEY) >>> 0;
}
