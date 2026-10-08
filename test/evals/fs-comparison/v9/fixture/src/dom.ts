import type { View } from './types';
export function domView(root: HTMLElement): View {
  return {
    pending: value => root.setAttribute('aria-busy', String(value)),
    items: rows => {
      const list = root.querySelector('ul')!;
      list.replaceChildren(...rows.map(row => {
        const li = document.createElement('li'); li.textContent = row.label; return li;
      }));
    },
    message: value => { root.querySelector('[role="status"]')!.textContent = value; },
  };
}
