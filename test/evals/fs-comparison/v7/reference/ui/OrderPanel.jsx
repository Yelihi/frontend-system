import PanelCard from './PanelCard.jsx';
import ActionButton from './ActionButton.jsx';
import React from 'react';
import {useAction} from './useAction.mjs';
import Status from './Status.jsx';
export default function OrderPanel({orders}) {
  const action = useAction(async () => { await orders.load(); return orders.getState(); });
  const state = action.result ?? orders.getState();
  return <PanelCard aria-label="주문"><ActionButton disabled={action.pending} onClick={action.run}>주문 조회</ActionButton>
    <Status state={state}/><ul>{state.items.map(item => <li key={item.id}>{item.id}</li>)}</ul></PanelCard>;
}
