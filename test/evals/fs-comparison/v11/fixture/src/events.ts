import type { Edit } from './model';
export function events(dispatch: (edit: Edit) => unknown) {
  return {
    explain: (id: string, explanation: string) => dispatch({ type: 'explain', id, explanation }),
    split: (id: string, offset: number, newId: string) => dispatch({ type: 'split', id, offset, newId }),
    merge: (id: string) => dispatch({ type: 'merge', id }),
  };
}
