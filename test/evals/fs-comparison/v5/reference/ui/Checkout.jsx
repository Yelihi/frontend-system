import React, {useState} from 'react';
export default function Checkout({orders}) {
  const [message, setMessage] = useState('');
  async function submit() {
    try { const result = await orders.submit({kind:'purchase', quantity:1, coupon:''}); setMessage(result.id); }
    catch { setMessage('주문에 실패했습니다.'); }
  }
  return <section><button onClick={submit}>주문</button><p role="status">{message}</p></section>;
}
