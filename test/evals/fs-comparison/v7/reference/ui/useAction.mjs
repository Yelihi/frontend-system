import {useRef, useState} from 'react';
export function useAction(task) {
  const [state, setState] = useState({pending: false, result: null, error: null});
  const active = useRef(false);
  async function run(...args) {
    if (active.current) return;
    active.current = true;
    setState({pending: true, result: null, error: null});
    try { setState({pending: false, result: await task(...args), error: null}); }
    catch (error) { setState({pending: false, result: null, error}); }
    finally { active.current = false; }
  }
  return {...state, run};
}
