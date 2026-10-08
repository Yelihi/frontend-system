import React from 'react';
import {useAction} from './useAction.mjs';
export default function CheckoutForm({checkout, input}) {
  const action = useAction(() => checkout.submit(input));
  return <section><button disabled={action.pending} onClick={action.run}>결제</button>
    {action.result && <output>{action.result.order.id}</output>}
    {action.error && <p role="alert">결제에 실패했습니다.</p>}</section>;
}
