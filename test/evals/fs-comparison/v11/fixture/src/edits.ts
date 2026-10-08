import type { Document, Edit, Result } from './model';
import { validate } from './validate';
export function applyEdit(document: Document, edit: Edit): Result {
  const index = document.segments.findIndex(item => item.id === edit.id);
  if (index < 0) return { ok: false, message: 'Segment not found.' };
  const segments = [...document.segments];
  const current = segments[index];
  switch (edit.type) {
    case 'explain':
      segments[index] = { ...current, explanation: edit.explanation };
      break;
    case 'split':
      segments.splice(index, 1, { ...current, end: edit.offset },
        { id: edit.newId, start: edit.offset, end: current.end, explanation: '' });
      break;
    case 'merge': {
      const next = segments[index + 1];
      if (!next) return { ok: false, message: 'No next segment.' };
      segments.splice(index, 2, { ...current, end: next.end,
        explanation: [current.explanation, next.explanation].filter(Boolean).join('\n') });
      break;
    }
  }
  return validate({ ...document, segments, reviewStatus: 'needs-review' });
}
