import React, {useState} from 'react';
import {formatMoney} from './money.mjs';

async function getQuote(api, values) {
  const quote = await api.quote(values);
  await api.track('quote-viewed', values);
  return quote;
}

export default function App({api}) {
  const [purchase, setPurchase] = useState({quantity: '1', email: '', coupon: '', message: ''});
  const [gift, setGift] = useState({quantity: '1', email: '', coupon: '', message: ''});
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [giftResult, setGiftResult] = useState(null);
  const [purchaseError, setPurchaseError] = useState('');
  const [giftError, setGiftError] = useState('');
  const [purchasePending, setPurchasePending] = useState(false);
  const [giftPending, setGiftPending] = useState(false);

  async function submit(event, kind) {
    event.preventDefault();
    const values = kind === 'purchase' ? purchase : gift;
    const pending = kind === 'purchase' ? purchasePending : giftPending;
    const setPending = kind === 'purchase' ? setPurchasePending : setGiftPending;
    const setError = kind === 'purchase' ? setPurchaseError : setGiftError;
    const setResult = kind === 'purchase' ? setPurchaseResult : setGiftResult;
    if (pending) return;
    if (!values.email.includes('@') || !Number.isInteger(Number(values.quantity)) || Number(values.quantity) < 1) {
      setError('이메일과 수량을 확인해주세요.');
      return;
    }
    setPending(true);
    setError('');
    setResult(null);
    try {
      const input = {...values, kind, quantity: Number(values.quantity)};
      const quote = await getQuote(api, input);
      const order = await api.submit({...input, total: quote.total});
      setResult(order.id);
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }

  return <main>
    <h1>상품 주문</h1>
    <p>상품 단가 {formatMoney(10000)}</p>
    {['purchase', 'gift'].map(kind => {
      const values = kind === 'purchase' ? purchase : gift;
      const update = kind === 'purchase' ? setPurchase : setGift;
      const result = kind === 'purchase' ? purchaseResult : giftResult;
      const error = kind === 'purchase' ? purchaseError : giftError;
      const pending = kind === 'purchase' ? purchasePending : giftPending;
      const title = kind === 'purchase' ? '일반 주문' : '선물 주문';
      const change = (key, value) => update(current => ({...current, [key]: value}));
      return <section key={kind} aria-label={title}>
        <h2>{title}</h2>
        <form onSubmit={event => submit(event, kind)}>
          <label>수량 <input type="number" min="1" required value={values.quantity}
            onChange={event => change('quantity', event.target.value)} disabled={pending} /></label>
          <label>이메일 <input type="email" required value={values.email}
            onChange={event => change('email', event.target.value)} disabled={pending} /></label>
          <label>쿠폰 <input value={values.coupon} onChange={event => change('coupon', event.target.value)} disabled={pending} /></label>
          {kind === 'gift' && <label>메시지 <textarea value={values.message}
            onChange={event => change('message', event.target.value)} disabled={pending} /></label>}
          <p>할인 전 금액 {formatMoney(Number(values.quantity) * 10000)}</p>
          <button disabled={pending} type="submit">주문하기</button>
          {error && <p role="alert">{error}</p>}
          {result && <p role="status">주문 완료: {result}</p>}
        </form>
      </section>;
    })}
  </main>;
}
