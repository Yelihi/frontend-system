import type { Document, Result } from './model';
export function validate(candidate: Document): Result {
  if (!candidate.segments.length) return { ok: false, message: 'A document needs a segment.' };
  const ids = new Set<string>();
  let end = 0;
  for (const item of candidate.segments) {
    if (ids.has(item.id) || item.start !== end || item.end <= item.start || item.end > candidate.text.length)
      return { ok: false, message: 'Invalid segment range or identity.' };
    ids.add(item.id); end = item.end;
  }
  return end === candidate.text.length ? { ok: true, document: candidate }
    : { ok: false, message: 'Segments must cover the document.' };
}
