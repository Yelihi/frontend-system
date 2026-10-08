import ActionButton from './ActionButton.jsx';
import React from 'react';
import {useAction} from './useAction.mjs';
export default function CheckoutForm({checkout, input}) {
  const action = useAction(() => checkout.submit(input));
  return <section><ActionButton disabled={action.pending} onClick={action.run}>결제</ActionButton>
    {action.result && <output>{action.result.order.id}</output>}
    {action.error && <p role="alert">결제에 실패했습니다.</p>}</section>;
}
