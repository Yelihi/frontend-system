import React, {useState} from 'react';
export default function SessionBar({onLogin, onLogout}) {
  const [token, setToken] = useState('');
  return <section><input aria-label="세션 토큰" type="password" value={token} onChange={event => setToken(event.target.value)}/>
    <button onClick={() => onLogin(token)}>로그인</button><button onClick={onLogout}>로그아웃</button></section>;
}
