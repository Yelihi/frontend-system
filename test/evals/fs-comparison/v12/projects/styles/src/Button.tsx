type Props={size:'small'|'large';tone:'neutral'|'danger';onClick:()=>void;children:React.ReactNode};
const styles={base:'rounded px-3 py-2 focus-visible:outline-2'};
export function Button({size,tone,onClick,children}:Props){return <button type="button" onClick={onClick} className={styles.base+' '+(size==='small'?'text-sm':'text-lg')+' '+(tone==='danger'?'bg-red-600 text-white':'bg-gray-100 text-black')}>{children}</button>;}
export function Indicator({active}:{active:boolean}){return <span className={active?'opacity-100':'opacity-50'}>Selected</span>;}
