export interface Item { id: string; label: string; }
export interface View {
  pending(value: boolean): void;
  items(value: Item[]): void;
  message(value: string): void;
}
export type Transport = typeof fetch;
export interface Row { id: string; title: string; }
