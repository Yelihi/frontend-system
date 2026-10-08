import PanelCard from './PanelCard.jsx';
import ActionButton from './ActionButton.jsx';
import React from 'react';
import {useAction} from './useAction.mjs';
import Status from './Status.jsx';
import Amount from './Amount.jsx';
export default function WalletPanel({wallet}) {
  const action = useAction(async () => { await wallet.load(); return wallet.getState(); });
  const state = action.result ?? wallet.getState();
  return <PanelCard aria-label="지갑"><ActionButton disabled={action.pending} onClick={action.run}>지갑 조회</ActionButton>
    <Status state={state}/>{state.items.map(item => <Amount key={item.id} value={item.balance}/>)}</PanelCard>;
}
