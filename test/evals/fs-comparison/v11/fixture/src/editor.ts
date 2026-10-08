import type { Document, Edit, Result } from './model';
import { applyEdit } from './edits';
export function createEditor(initial: Document, render: (document: Document) => void) {
  let document = initial;
  function dispatch(edit: Edit): Result {
    const result = applyEdit(document, edit);
    if (result.ok) { document = result.document; render(document); }
    return result;
  }
  return { dispatch, snapshot: () => document };
}
