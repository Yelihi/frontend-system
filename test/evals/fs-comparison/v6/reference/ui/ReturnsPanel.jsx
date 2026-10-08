import React from 'react';
import {useAction} from './useAction.mjs';
import Status from './Status.jsx';
export default function ReturnsPanel({returns}) {
  const action = useAction(async () => { await returns.load(); return returns.getState(); });
  const state = action.result ?? returns.getState();
  return <section aria-label="반품"><button disabled={action.pending} onClick={action.run}>반품 조회</button>
    <Status state={state}/><ul>{state.items.map(item => <li key={item.id}>{item.id}: {item.reason}</li>)}</ul></section>;
}
