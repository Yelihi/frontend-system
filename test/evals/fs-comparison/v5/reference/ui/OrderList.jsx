import React, {useState} from 'react';
export default function OrderList({orders}) {
  const [state, setState] = useState(() => orders.getState());
  async function load() {
    const pending = orders.load(); setState(orders.getState());
    await pending; setState(orders.getState());
  }
  return <section><button onClick={load}>조회</button><p role="status">{state.status}</p>
    {state.error && <p role="alert">조회에 실패했습니다.</p>}
    <ul>{state.items.map(item => <li key={item.id}>{item.id}</li>)}</ul></section>;
}
