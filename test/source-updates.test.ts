import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { acknowledgeSource, checkSources, readSourceChange, registerSource, sourceRegistry } from "../src/application/knowledge/sources.js";
import { catalogKnowledgeDocument } from "../src/application/knowledge/catalog.js";

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
    // This fixture isolates acknowledgement from the separately tested sync publisher.
    const catalog = JSON.parse(await readFile(join(root, "knowledge/catalog.json"), "utf8"));
    catalog.documents.hooks.publishedHash = document.contentHash;
    await writeFile(join(root, "knowledge/catalog.json"), JSON.stringify(catalog));
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
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failed, HTML, oversized and private sources never overwrite a valid snapshot", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-source-errors-"));
  try {
    await registerSource(root, "rules", "https://docs.example/rules.md", null);
    await assert.rejects(registerSource(root, "rules", "https://docs.example/new.md", null), /changed/);
    await checkSources(root, undefined, async () => response("# Valid\nPreserve me."), dns);
    const before = await readSourceChange(root, "rules");
    for (const reply of [new Response("missing", { status: 404 }), response("large", "v2")]) {
      if (reply.status === 200) reply.headers.set("content-length", "3000000");
      assert.equal((await checkSources(root, undefined, async () => reply, dns))[0]!.status, "failed");
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
