import type { Session } from './session';
import type { Transport, View, Row } from './types';
export function createCatalog(view: View, session: Session, send: Transport, base: string) {
  let disposed = false;
  async function search(term: string): Promise<void> {
    const token = session.token();
    view.pending(true);
    try {
      const response = await send(`${base}/catalog?q=${encodeURIComponent(term)}`, {
        headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin',
      });
      if (token !== session.token()) return;
      if (response.status === 401) { session.expire(); return; }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json() as Row[];
      if (!disposed) view.items(rows.map(row => ({ id: row.id, label: row.title })));
    } catch { view.message('Catalog could not be loaded.'); }
    finally { view.pending(false); }
  }
  return { search, dispose: () => { disposed = true; } };
}
