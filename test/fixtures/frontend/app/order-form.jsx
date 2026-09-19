'use client';
import { useState } from 'react';
import { createOrderSubmitter } from '@/domain/orders';
import { statusAction } from './actions';

async function send(quantity) {
  const response = await fetch('/api/orders', { method: 'POST', body: JSON.stringify({ quantity }) });
  if (!response.ok) throw new Error('Order failed. Try again.');
}

export default function OrderForm({ children }) {
  const [status, setStatus] = useState({ pending: false, error: '', submitted: false });
  const [submit] = useState(() => createOrderSubmitter(send, setStatus));
  return <section>
    {children}
    <form onSubmit={event => { event.preventDefault(); void submit(1); }}>
      <button disabled={status.pending} type="submit">{status.pending ? 'Submitting' : 'Place order'}</button>
      {status.error && <p role="alert">{status.error}</p>}
      {status.submitted && <p role="status">Order received</p>}
    </form>
    <button type="button" onClick={() => void statusAction()}>Check availability</button>
  </section>;
}
