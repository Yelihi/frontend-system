import {useSyncExternalStore} from 'react';
import {ticketStore} from './store';
import {Button,Indicator} from './Button';
export function TicketsPage(){const selected=useSyncExternalStore(ticketStore.subscribe,ticketStore.getSnapshot,ticketStore.getSnapshot);return <section><Button size="small" tone="neutral" onClick={()=>ticketStore.select('t1')}>Choose ticket</Button><Indicator active={selected==='t1'}/></section>;}
export function TicketDetailsPage(){const selected=useSyncExternalStore(ticketStore.subscribe,ticketStore.getSnapshot,ticketStore.getSnapshot);return <article aria-live="polite">{selected||'No selection'}</article>;}
