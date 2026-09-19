import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { catalogKnowledgeDocument, knowledgeStatus, markKnowledgeSynced } from "../src/application/knowledge/catalog.js";
import { approveRuleProposal, readRuleProposal, saveRuleProposal } from "../src/application/knowledge/rule-proposals.js";
import { contentHash, readReferenceIndex } from "../src/application/knowledge/reference-index.js";

test("shared rules need exact proposal approval; changed sources or candidates invalidate it", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-proposal-"));
  try {
    await mkdir(join(root, "knowledge/source/manual"), { recursive: true });
    await mkdir(join(root, "references/learned"), { recursive: true });
    const path = "knowledge/source/manual/rules.md";
    await writeFile(join(root, path), "A conditionally applicable dependency contract.");
    const { document } = await catalogKnowledgeDocument(root, { id: "source", path, title: "Rule source", summary: "Boundary", sourceType: "manual", facets: {} });
    const rule = { id: "boundary", version: 1, title: "Boundary", statement: "Use public entry points", layer: "architecture" as const, obligation: "required" as const, conditions: ["Feature boundaries adopted"], exclusions: ["Single feature"], evidence: [path], verification: "custom-check" as const, examples: [], validation: "proposed" as const, limitations: ["Checker not yet run"] };
    const proposal = { id: "boundaries", rules: [rule], sources: { source: document.contentHash }, rationale: "Protect feature internals", validationEvidence: "Proposed, not executed" };
    const draft = await saveRuleProposal(root, proposal, null);
    assert.equal((await knowledgeStatus(root)).ruleProposals[0]!.status, "pending");
    const body = "# Boundary\nUse public entry points only where feature boundaries were adopted.\n";
    await writeFile(join(root, "references/learned/boundary.md"), body);
    const entry = { id: rule.id, kind: "rule", title: rule.title, summary: rule.statement, path: "boundary.md", contentHash: contentHash(body), keywords: ["boundary"], domains: ["architecture"], technologies: [], excludedTechnologies: [], conditions: rule.conditions, exclusions: rule.exclusions, evidenceKind: "public-contract", review: "reviewed", sources: proposal.sources, related: [], rule, ruleApproval: { proposalId: proposal.id, proposalHash: draft.hash } };
    const index = { version: 2, entries: [entry], outcomes: [{ sourceId: "source", sourceHash: document.contentHash, action: "represented", reason: "Rule candidate" }] };
    const indexPath = join(root, "references/learned/index.json");
    await writeFile(indexPath, JSON.stringify(index));
    await assert.rejects(markKnowledgeSynced(root, ["source"]), /approved proposal/);
    await assert.rejects(approveRuleProposal(root, proposal.id, "stale", "Approved"), /current/);
    await approveRuleProposal(root, proposal.id, draft.hash, "User approved this conditional rule");
    assert.equal((await knowledgeStatus(root)).ruleProposals[0]!.status, "approved");
    await markKnowledgeSynced(root, ["source"]);
    assert.equal((await readReferenceIndex(join(root, "references/learned")))!.entries[0]!.kind, "rule");
    const updated = await saveRuleProposal(root, { ...proposal, rationale: "Clarified tradeoff" }, draft.hash);
    assert.equal(updated.approved, false);
    await assert.rejects(markKnowledgeSynced(root, ["source"]), /approved proposal/);
    await writeFile(join(root, path), "Changed conditions.");
    await assert.rejects(readRuleProposal(root, proposal.id), /Source changed/);
    assert.equal((await knowledgeStatus(root)).ruleProposals[0]!.status, "stale");
    assert.match(await readFile(join(root, "knowledge/proposals/boundaries.json"), "utf8"), /Clarified tradeoff/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
