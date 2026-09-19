import { mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import * as z from "zod/v4";
import { ruleId, ruleSchema, sha256 } from "../policy.js";
import { loadKnowledgeCatalog } from "./catalog.js";
import { confinedRead, contentHash } from "./reference-index.js";

export const proposalInputSchema = z.strictObject({
  id: ruleId, rules: z.array(ruleSchema).min(1), sources: z.record(ruleId, sha256),
  rationale: z.string().min(1), validationEvidence: z.string().min(1),
}).refine((value) => Object.keys(value.sources).length > 0 && new Set(value.rules.map(({ id }) => id)).size === value.rules.length, "Unique rules and source evidence are required");
const proposalSchema = z.object({
  proposal: proposalInputSchema, hash: sha256, approved: z.boolean(), approval: z.string(),
});
type Proposal = z.infer<typeof proposalInputSchema>;

async function currentSources(root: string, sources: Record<string, string>) {
  const catalog = await loadKnowledgeCatalog(root);
  for (const [id, hash] of Object.entries(sources)) {
    const source = catalog.documents[id];
    if (!source || source.contentHash !== hash || contentHash(await confinedRead(root, source.path)) !== hash) throw new Error(`Source changed or missing: ${id}`);
  }
}

export async function readRuleProposal(root: string, id: string) {
  ruleId.parse(id);
  const record = proposalSchema.parse(JSON.parse(await confinedRead(root, `knowledge/proposals/${id}.json`)));
  if (record.hash !== contentHash(JSON.stringify(record.proposal))) throw new Error("Proposal content changed; save and review again");
  await currentSources(root, record.proposal.sources);
  return record;
}

async function save(root: string, record: z.infer<typeof proposalSchema>, expectedHash: string | null) {
  const folder = join(resolve(root), "knowledge/proposals");
  await mkdir(folder, { recursive: true });
  if (await realpath(folder) !== join(await realpath(root), "knowledge/proposals")) throw new Error("Proposal path must not traverse symlinks");
  const path = join(folder, `${record.proposal.id}.json`);
  const lock = `${path}.lock`;
  await mkdir(lock);
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    let old: z.infer<typeof proposalSchema> | undefined;
    try { old = proposalSchema.parse(JSON.parse(await readFile(path, "utf8"))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if ((old?.hash ?? null) !== expectedHash) throw new Error("Proposal changed; reread before saving");
    await currentSources(root, record.proposal.sources);
    await writeFile(temp, JSON.stringify(record, null, 2), { flag: "wx" });
    await rename(temp, path);
  } finally { await rm(temp, { force: true }); await rm(lock, { recursive: true }); }
  return record;
}

export async function saveRuleProposal(root: string, input: Proposal, expectedHash: string | null) {
  const proposal = proposalInputSchema.parse(input);
  return save(root, { proposal, hash: contentHash(JSON.stringify(proposal)), approved: false, approval: "" }, expectedHash);
}

export async function approveRuleProposal(root: string, id: string, expectedHash: string, approval: string) {
  if (!approval.trim()) throw new Error("Record explicit user approval");
  const record = await readRuleProposal(root, id);
  if (record.hash !== expectedHash) throw new Error("Review the current proposal before approval");
  return save(root, { ...record, approved: true, approval }, expectedHash);
}
