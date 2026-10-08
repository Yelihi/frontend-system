import { createAction } from './action';
export function navigationCard(root:HTMLElement, disabled:boolean) {
 const link=createAction({label:'Open order',href:'/orders/current',disabled});
 root.append(link); return () => link.remove();
}
