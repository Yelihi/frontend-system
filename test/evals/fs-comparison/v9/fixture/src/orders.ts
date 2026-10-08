import type { Session } from './session';
import type { Transport, View, Row } from './types';
export function createOrders(view: View, session: Session, send: Transport, base: string) {
  let disposed = false;
  async function refresh(): Promise<void> {
    const token = session.token();
    view.pending(true);
    try {
      const response = await send(`${base}/orders`, {
        headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin',
      });
      if (token !== session.token()) return;
      if (response.status === 401) { session.expire(); return; }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json() as Row[];
      if (!disposed) view.items(rows.map(row => ({ id: row.id, label: row.title })));
    } catch { view.message('Orders could not be loaded.'); }
    finally { view.pending(false); }
  }
  async function submit(sku: string): Promise<void> {
    const response = await send(`${base}/orders`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.token()}`, 'Content-Type': 'application/json' },
      credentials: 'same-origin', body: JSON.stringify({ sku }),
    });
    if (response.status === 409) { view.message('This item cannot be ordered.'); return; }
    if (response.status === 401) { session.expire(); return; }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    view.message('Order submitted.');
  }
  return { refresh, submit, dispose: () => { disposed = true; } };
}
