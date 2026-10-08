import PanelCard from './PanelCard.jsx';
import ActionButton from './ActionButton.jsx';
import React from 'react';
import {useAction} from './useAction.mjs';
import Status from './Status.jsx';
export default function InventoryPanel({inventory}) {
  const action = useAction(async () => { await inventory.load(); return inventory.getState(); });
  const state = action.result ?? inventory.getState();
  return <PanelCard aria-label="재고"><ActionButton disabled={action.pending} onClick={action.run}>재고 조회</ActionButton>
    <Status state={state}/><ul>{state.items.map(item => <li key={item.id}>{item.sku}: {item.available}</li>)}</ul></PanelCard>;
}
