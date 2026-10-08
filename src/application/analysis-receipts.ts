import { realpath } from 'node:fs/promises';
import { contentHash } from './knowledge/reference-index.js';
import type { routeKnowledge } from './knowledge/routing.js';

type Receipt = { root: string; projectHash: string | null; route: Awaited<ReturnType<typeof routeKnowledge>> };
// ponytail: bounded, process-local receipts keep reads read-only. Restart/eviction requires a fresh context;
// saved revisions embed the complete evidence and do not depend on this cache.
const receipts = new Map<string, Receipt>();

export async function rememberAnalysis(root: string, projectHash: string | null, route: Receipt['route']) {
  const canonicalRoot = await realpath(root);
  const id = contentHash(JSON.stringify([canonicalRoot, projectHash, route.hash]));
  receipts.delete(id);
  receipts.set(id, structuredClone({ root: canonicalRoot, projectHash, route }));
  if (receipts.size > 32) receipts.delete(receipts.keys().next().value!);
  return id;
}

export async function recalledAnalysis(root: string, id: string) {
  const receipt = receipts.get(id);
  if (!receipt || receipt.root !== await realpath(root)) throw new Error(`Unknown analysis context ${id}; call get_work_context again in this project. Saved plans remain available.`);
  return structuredClone(receipt);
}
