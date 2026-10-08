import StatusBadge from './StatusBadge.jsx';
import React from 'react';
export default function Status({state}) {
  return <div><p role="status"><StatusBadge status={state.status}>{state.status}</StatusBadge></p>{state.error && <p role="alert">요청을 처리하지 못했습니다.</p>}</div>;
}
