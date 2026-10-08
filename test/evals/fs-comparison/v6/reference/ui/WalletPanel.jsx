import React from 'react';
import {useAction} from './useAction.mjs';
import Status from './Status.jsx';
import Amount from './Amount.jsx';
export default function WalletPanel({wallet}) {
  const action = useAction(async () => { await wallet.load(); return wallet.getState(); });
  const state = action.result ?? wallet.getState();
  return <section aria-label="지갑"><button disabled={action.pending} onClick={action.run}>지갑 조회</button>
    <Status state={state}/>{state.items.map(item => <Amount key={item.id} value={item.balance}/>)}</section>;
}
