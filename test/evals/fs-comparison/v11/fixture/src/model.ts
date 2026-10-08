export type Segment = { id: string; start: number; end: number; explanation: string };
export type Document = { text: string; segments: Segment[]; reviewStatus: 'reviewed' | 'needs-review' };
export type Edit =
  | { type: 'explain'; id: string; explanation: string }
  | { type: 'split'; id: string; offset: number; newId: string }
  | { type: 'merge'; id: string };
export type Result = { ok: true; document: Document } | { ok: false; message: string };
