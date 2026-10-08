import { createAction } from './action';
export function purchaseToolbar(root:HTMLElement, buy:()=>void, blocked:boolean) {
 const button=createAction({label:'Buy now',disabled:blocked,onPress:buy});
 const form=document.createElement('form'); form.append(button); root.append(form);
 return () => form.remove();
}
