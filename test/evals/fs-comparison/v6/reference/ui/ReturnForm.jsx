import React from 'react';
import {useAction} from './useAction.mjs';
export default function ReturnForm({refund, input}) {
  const action = useAction(() => refund.submit(input));
  return <section><button disabled={action.pending} onClick={action.run}>환불</button>
    {action.result && <output>{action.result.record.id}{action.result.restockPending ? ' 재입고 대기' : ''}</output>}
    {action.error && <p role="alert">환불에 실패했습니다.</p>}</section>;
}
