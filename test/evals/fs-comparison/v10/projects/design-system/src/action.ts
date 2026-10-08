import { styles, type Tone } from './styles';
export type Action = { label:string; href?:string; disabled?:boolean; tone?:Tone; onPress?:()=>void };
export function createAction(props: Action) {
 const element = document.createElement(props.href ? 'a' : 'button');
 element.textContent = props.label;
 element.className = styles[props.tone ?? 'primary'];
 if (props.href) element.setAttribute('href', props.href);
 if (props.disabled) element.setAttribute('aria-disabled', 'true');
 element.addEventListener('click', () => props.onPress?.());
 return element;
}
