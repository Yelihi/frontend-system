import { purchaseToolbar } from './purchase';
import { navigationCard } from './navigation';
import { applyTheme } from './styles';
export function mount(root:HTMLElement,buy:()=>void) {
 applyTheme('blue');
 const a=purchaseToolbar(root,buy,true), b=navigationCard(root,true);
 return () => { a(); b(); };
}
