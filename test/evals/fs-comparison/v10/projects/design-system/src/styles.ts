export type Tone = 'primary' | 'quiet';
export const styles = { primary:'bg-blue-600 text-white px-4 py-2', quiet:'bg-gray-100 text-gray-900 px-4 py-2' };
export function applyTheme(color:string) { document.documentElement.style.setProperty('--accent', color); }
