import React from 'react';
import OrderPanel from './ui/OrderPanel.jsx';
import InventoryPanel from './ui/InventoryPanel.jsx';
import ReturnsPanel from './ui/ReturnsPanel.jsx';
import WalletPanel from './ui/WalletPanel.jsx';
import CheckoutForm from './ui/CheckoutForm.jsx';
import ReturnForm from './ui/ReturnForm.jsx';
import SessionBar from './ui/SessionBar.jsx';
export default function App({system, checkoutInput, refundInput}) {
  return <main className="mx-auto max-w-5xl space-y-4 p-6"><h1>운영 콘솔</h1><SessionBar onLogin={system.login} onLogout={system.logout}/>
    <OrderPanel orders={system.orders}/><InventoryPanel inventory={system.inventory}/>
    <ReturnsPanel returns={system.returns}/><WalletPanel wallet={system.wallet}/>
    <CheckoutForm checkout={system.checkout} input={checkoutInput}/><ReturnForm refund={system.refund} input={refundInput}/></main>;
}
