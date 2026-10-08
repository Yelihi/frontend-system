import { approveFixtureSource } from "./source-review-fixture.js";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { acknowledgeSource, checkSources, readSourceChange, registerSource, sourceRegistry } from "../src/application/knowledge/sources.js";
import { addKnowledgeNote, catalogKnowledgeDocument, markKnowledgeSynced } from "../src/application/knowledge/catalog.js";
import { contentHash, type ReferenceIndex } from "../src/application/knowledge/reference-index.js";

const dns = async () => [{ address: "93.184.216.34", family: 4 }];
const response = (body: string, etag = "v1") => new Response(body, { headers: { "content-type": "text/markdown", etag } });

test("source checks preserve pending differences, bound output and avoid unchanged bodies", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-sources-"));
  try {
    await registerSource(root, "hooks", "https://docs.example/rules.md", null);
    const body = `# Rules\n${"stable line\n".repeat(1400)}\n# Rule\nRequired.\n`;
    const first = await checkSources(root, undefined, async () => response(body), dns);
    assert.equal(first[0]!.status, "pending-review");
    assert.ok(!JSON.stringify(first).includes("stable line"));
    const page = await readSourceChange(root, "hooks");
    assert.equal(page.content.length, 12000);
    assert.ok(page.nextOffset);
    await checkSources(root, undefined, async (_url, options) => {
      assert.equal((options!.headers as Record<string, string>)["If-None-Match"], "v1");
      return new Response(null, { status: 304 });
    }, dns);
    assert.equal((await readSourceChange(root, "hooks")).hash, page.hash);
    await assert.rejects(acknowledgeSource(root, "hooks", page.hash, "hooks"), /Publish/);
    await mkdir(join(root, "knowledge/source/manual"), { recursive: true });
    await writeFile(join(root, "knowledge/source/manual/hooks.md"), "Reviewed summary");
    const { document } = await catalogKnowledgeDocument(root, { id: "hooks", path: "knowledge/source/manual/hooks.md", title: "Hooks", summary: "Rules", sourceType: "manual", sourceUrl: "https://docs.example/rules.md", remoteHash: page.hash, facets: {} });
    await mkdir(join(root, "references/learned"), { recursive: true });
    await writeFile(join(root, "references/learned/hooks.md"), "Review scoped hook contracts");
    const index: ReferenceIndex = { version: 3, entries: [{
      id: "hooks", title: "Hooks", summary: "Review scoped hook contracts", kind: "concept", path: "hooks.md", contentHash: contentHash("Review scoped hook contracts"),
      keywords: ["hooks"], domains: ["react"], technologies: ["react"], excludedTechnologies: [], conditions: ["React hooks"], exclusions: ["Other frameworks"],
      evidenceKind: "experience", review: "reviewed", sources: { hooks: document.contentHash }, related: [],
      routing: { mode: "direct", reason: "Check hook usage" }, triggers: [{ kind: "call", value: "react#useEffect" }],
      checks: [{ id: "purpose", question: "Does this synchronize an external system?", guidance: "Read the caller", verification: "review" }],
    }], outcomes: [{ sourceId: "hooks", sourceHash: document.contentHash, action: "represented", reason: "Scoped hook summary" }],
    triggerChecks: [
      { signals: [{ kind: "call", value: "react#useEffect" }], technologies: ["React"], expectedIds: ["hooks"], forbiddenIds: [] },
      { signals: [{ kind: "call", value: "react#useEffect" }], technologies: ["Vue"], expectedIds: [], forbiddenIds: ["hooks"] },
    ] };
    const saveIndex = () => writeFile(join(root, "references/learned/index.json"), JSON.stringify(index));
    await saveIndex();
    await approveFixtureSource(root, "hooks");
    await markKnowledgeSynced(root, ["hooks"]);
    index.entries[0]!.checks![0]!.guidance = "Read the caller and lifecycle";
    await saveIndex();
    await assert.rejects(acknowledgeSource(root, "hooks", page.hash, "hooks"), /Republish changed knowledge artifacts/);
    assert.equal((await readSourceChange(root, "hooks")).content, page.content, "Rejected ACK must preserve the pending diff");
    await approveFixtureSource(root, "hooks");
    await markKnowledgeSynced(root, ["hooks"]);
    await writeFile(join(root, document.path), "Uncataloged correction");
    await assert.rejects(acknowledgeSource(root, "hooks", page.hash, "hooks"), /Stale reference source/);
    await writeFile(join(root, document.path), "Reviewed summary");
    await writeFile(join(root, "references/learned/hooks.md"), "Changed reference body");
    await assert.rejects(acknowledgeSource(root, "hooks", page.hash, "hooks"), /Changed reference/);
    await writeFile(join(root, "references/learned/hooks.md"), "Review scoped hook contracts");
    await acknowledgeSource(root, "hooks", page.hash, "hooks");
    const unchanged = await checkSources(root, undefined, async () => response(body), dns);
    assert.equal(unchanged[0]!.status, "unchanged");
    assert.equal((await readSourceChange(root, "hooks")).content, "");
    await checkSources(root, undefined, async () => response(body.replace("Required.", "Required only for components."), "v2"), dns);
    const changed = await readSourceChange(root, "hooks");
    assert.match(changed.content, /-Required\./);
    assert.match(changed.content, /\+Required only/);
    assert.ok(changed.content.length < 1000);
    await assert.rejects(readSourceChange(root, "hooks", 0, 100, false, page.hash), /changed/);
    await checkSources(root, undefined, async () => new Response(null, { status: 304 }), dns);
    assert.equal((await readSourceChange(root, "hooks")).content, changed.content);
    const recataloged = await catalogKnowledgeDocument(root, { id: "hooks", path: document.path, title: "Hooks", summary: "Rules", sourceType: "manual", sourceUrl: document.sourceUrl!, remoteHash: changed.hash, facets: {} });
    assert.equal(recataloged.document.contentHash, document.contentHash, "Summary can remain unchanged after remote corrections");
    assert.equal(recataloged.document.publishedArtifactsHash, undefined, "New remote evidence requires publication even with the same summary");
    await assert.rejects(acknowledgeSource(root, "hooks", changed.hash, "hooks"), /Publish/);
    await approveFixtureSource(root, "hooks");
    await markKnowledgeSynced(root, ["hooks"]);
    await acknowledgeSource(root, "hooks", changed.hash, "hooks");
    assert.equal((await readSourceChange(root, "hooks")).content, "");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failed, HTML, oversized and private sources never overwrite a valid snapshot", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-source-errors-"));
  try {
    await registerSource(root, "rules", "https://docs.example/rules.md", null);
    await assert.rejects(registerSource(root, "rules", "https://docs.example/new.md", null), /changed/);
    await checkSources(root, undefined, async () => response("# Valid\nPreserve me."), dns);
    const before = await readSourceChange(root, "rules");
    const oversized = response("large", "v2"); oversized.headers.set("content-length", "3000000");
    for (const reply of [new Response("missing", { status: 404 }), oversized,
      new Response("only a fragment", { status: 206, headers: { "content-type": "text/markdown" } }),
      new Response("only a fragment", { headers: { "content-type": "text/markdown", "content-range": "bytes 0-14/100" } }),
    ]) {
      assert.equal((await checkSources(root, undefined, async () => reply, dns))[0]!.status, "failed");
      assert.deepEqual(await readSourceChange(root, "rules"), before);
    }
    assert.equal((await checkSources(root, undefined, async () => new Response("<html/>", { headers: { "content-type": "text/html" } }), dns))[0]!.status, "needs-host");
    assert.equal((await readSourceChange(root, "rules")).hash, before.hash);
    const local = async () => [{ address: "127.0.0.1", family: 4 }];
    let fetched = false;
    assert.equal((await checkSources(root, undefined, async () => { fetched = true; return response("bad"); }, local))[0]!.status, "failed");
    assert.equal(fetched, false);
    assert.equal((await checkSources(root, undefined, async () => new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } }), dns))[0]!.status, "failed");
    await assert.rejects(registerSource(root, "local", "http://localhost/", (await sourceRegistry(root)).hash), /public HTTPS/);
    await assert.rejects(checkSources(root, ["missing"], async () => response("x"), dns), /registered/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("capture deduplication checks current files and retains distinct URL provenance", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-source-dedup-"));
  try {
    for (const operation of ["changed", "deleted"]) {
      const input = { title: operation, content: `Original note ${operation}` };
      const first = await addKnowledgeNote(root, input);
      if (operation === "changed") await writeFile(join(root, first.document.path), "Changed user note");
      else await rm(join(root, first.document.path));
      const second = await addKnowledgeNote(root, input);
      assert.equal(second.duplicateOf, undefined);
      assert.equal(await readFile(join(root, second.document.path), "utf8"), `---\nstate: pending\n---\n\n${input.content}\n`);
      assert.equal((await addKnowledgeNote(root, input)).duplicateOf, second.document.id);
    }
    await mkdir(join(root, "knowledge/source/imported"), { recursive: true });
    const capture = async (id: string, sourceUrl: string) => {
      const path = `knowledge/source/imported/${id}.md`;
      await writeFile(join(root, path), "Identical captured text from different sources");
      return catalogKnowledgeDocument(root, { id, path, sourceUrl, title: id, summary: "Capture", sourceType: "imported", facets: {} });
    };
    assert.equal((await capture("one", "https://docs.example/one")).duplicateOf, undefined);
    assert.equal((await capture("two", "https://docs.example/two")).duplicateOf, undefined);
    assert.equal((await capture("same", "https://docs.example/one")).duplicateOf, "one");
    await writeFile(join(root, "outside.md"), "Not knowledge source");
    await symlink(join(root, "outside.md"), join(root, "knowledge/source/imported/escape.md"));
    await assert.rejects(catalogKnowledgeDocument(root, { id: "escape", path: "knowledge/source/imported/escape.md", title: "Escape", summary: "Invalid capture", sourceType: "imported", facets: {} }), /escapes/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
