import React from 'react';
import OrderList from './ui/OrderList.jsx';
import Checkout from './ui/Checkout.jsx';
export default function App({orders}) {
  return <main><OrderList orders={orders}/><Checkout orders={orders}/></main>;
}
