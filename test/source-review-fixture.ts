import { readKnowledgeDocument, reviewKnowledgeSource, addKnowledgeNote, prepareActiveKnowledge } from "../src/application/knowledge/catalog.js";
import {readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";

// Simulates an explicit author metadata edit before the existing publication fixtures.
export async function addActiveFixtureNote(root: string, input: {title: string; content: string}) {
  const added = await addKnowledgeNote(root, input);
  const path = join(root, added.document.path);
  await writeFile(path, (await readFile(path, "utf8")).replace(/^state: pending$/m, "state: active"));
  const prepared = await prepareActiveKnowledge(root);
  if (prepared.errors.length) throw new Error(JSON.stringify(prepared.errors));
  return {...added, document: (await readKnowledgeDocument(root, added.document.id)).document};
}

// Only synthetic test sources: this helper never reviews the repository's knowledge.
export async function approveFixtureSource(root: string, id: string) {
  const source = await readKnowledgeDocument(root, id);
  return reviewKnowledgeSource(root, id, source.sourceHash, source.metadataHash, source.reviewHash, {
    status: "approved", reviewer: "host", summary: "Synthetic fixture reviewed for this test only", scope: "Publication contract fixture",
    claims: [{ quote: source.content.trim().slice(0, 100), assessment: "Fixture content matches the scenario", evidence: "Hand-authored test setup; not a real-world factual claim", verdict: "qualified" }],
    conditions: ["This synthetic test"], exclusions: ["Production knowledge"], unresolved: [],
  });
}
