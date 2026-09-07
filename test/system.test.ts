import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { FileSystemProjectDiscovery } from "../src/adapters/filesystem/project-discovery.js";
import {
  catalogKnowledgeDocument,
  knowledgeStatus,
  loadKnowledgeCatalog,
  markKnowledgeSynced,
  searchKnowledge,
} from "../src/application/knowledge/catalog.js";
import {
  readProjectConfig,
  readProjectState,
  writeProjectArtifacts,
  writeProjectConfig,
} from "../src/application/project-store.js";
import { RuleResolver } from "../src/application/rules/rule-resolver.js";
import type { ProjectAnalysis, ProjectProfile, WorkRequest } from "../src/domain/types.js";

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "frontend-system-"));
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return root;
}

const request: WorkRequest = {
  raw: "Improve the current structure",
  mode: "prepare",
  constraints: [],
};

const analysis: ProjectAnalysis = {
  summary: "A small React application.",
  observed: ["React is installed."],
  architecture: ["UI lives under src."],
  conventions: ["TypeScript is used."],
  decisions: ["Keep state local by default."],
  qualityGates: ["Run tests."],
  assumptions: [],
  questions: [],
};

test("discovers framework, safe capabilities, and design-system evidence", async () => {
  const root = await fixture({
    "package.json": JSON.stringify({
      private: true,
      scripts: { build: "next build", lint: "eslint .", "lint:fix": "eslint . --fix" },
      dependencies: { next: "16.0.0", react: "19.0.0", tailwindcss: "4.0.0" },
      devDependencies: { typescript: "5.9.0", "@storybook/react": "9.0.0" },
    }),
    "package-lock.json": "{}",
    "components.json": "{}",
    ".storybook/main.ts": "export default {};",
    "src/app/globals.css": ":root { --background: white; }",
    "src/features/example.ts": "export {};",
    "src/entities/example.ts": "export {};",
    "src/shared/example.ts": "export {};",
    "src/widgets/example.ts": "export {};",
    "tsconfig.json": "{}",
  });

  try {
    const discovery = new FileSystemProjectDiscovery();
    const profile = await discovery.discover(await discovery.createRef(root));
    assert.equal(profile.architecture.style, "feature-sliced");
    assert.ok(profile.technologies.some(({ name }) => name === "Next.js"));
    assert.ok(profile.design.systems.includes("shadcn/ui"));
    assert.ok(profile.design.systems.includes("Storybook"));
    assert.ok(profile.design.systems.includes("Tailwind CSS"));
    assert.ok(profile.design.files.includes("src/app/globals.css"));
    assert.ok(!profile.capabilities.some(({ script }) => script === "lint:fix"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("persists project configuration and evidence-backed context", async () => {
  const root = await fixture({
    "package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
    "package-lock.json": "{}",
    "src/App.tsx": "export function App() { return null; }",
  });

  try {
    const discovery = new FileSystemProjectDiscovery();
    const profile = await discovery.discover(await discovery.createRef(root));
    await writeProjectConfig(root, { version: 1, designProvider: { name: "built-in" } });
    await writeProjectArtifacts(profile, analysis);
    assert.equal((await readProjectConfig(root))?.designProvider.name, "built-in");
    assert.match(await readFile(join(root, ".frontend-system/project.md"), "utf8"), /Keep state local/);
    assert.ok((await readProjectState(root))?.fileHashes["package.json"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("user knowledge outranks project convention and security keeps a fallback", async () => {
  const profile: ProjectProfile = {
    project: { id: "sample", name: "sample", rootPath: "/sample", git: { repositoryRoot: "/sample", defaultBranch: "main" } },
    technologies: [],
    scripts: {},
    paths: { root: "/sample", manifests: [], sourceDirectories: [], configFiles: [] },
    architecture: { style: "unknown", roots: [], evidence: [] },
    design: { systems: [], files: [], evidence: [] },
    conventions: [{ id: "legacy", description: "Prefer explicit state", evidence: ["src/"] }],
    capabilities: [],
    constraints: [],
  };
  const rules = await new RuleResolver(join(process.cwd(), "mandatory-rules")).resolve(
    profile,
    request,
    [{ id: "knowledge:state", path: "/knowledge/state.md", title: "Prefer explicit state", summary: "User guidance", domains: ["architecture"] }],
    [{ domain: "security", status: "missing-user-knowledge", fallbackRequired: true }],
  );

  assert.equal(rules.find(({ title }) => title === "Prefer explicit state")?.source, "knowledge");
  assert.equal(rules.find(({ id }) => id === "model-fallback:security")?.mandatory, true);
});

test("knowledge catalog shortlists, detects duplicates, and tracks publication", async () => {
  const root = await fixture({
    "knowledge/source/manual/cache.md": "# Cache boundaries\n\nKeep request caches version-aware.",
    "knowledge/source/imported/copy.md": "# Cache boundaries\n\nKeep request caches version-aware.",
  });

  try {
    const first = await catalogKnowledgeDocument(root, {
      id: "cache-boundaries",
      path: "knowledge/source/manual/cache.md",
      title: "Cache boundaries",
      summary: "Framework-aware request cache guidance.",
      sourceType: "manual",
      facets: { framework: ["nextjs"], topic: ["caching"] },
    });
    assert.equal(first.document.id, "cache-boundaries");
    const duplicate = await catalogKnowledgeDocument(root, {
      id: "cache-copy",
      path: "knowledge/source/imported/copy.md",
      title: "Cache copy",
      summary: "Duplicate.",
      sourceType: "imported",
      facets: { topic: ["caching"] },
    });
    assert.equal(duplicate.duplicateOf, "cache-boundaries");
    assert.equal((await searchKnowledge(root, "Next.js cache", { framework: ["nextjs"] }))[0]?.id, "cache-boundaries");
    assert.deepEqual((await knowledgeStatus(root)).unpublished, ["cache-boundaries"]);
    await markKnowledgeSynced(root, ["cache-boundaries"]);
    assert.deepEqual((await knowledgeStatus(root)).unpublished, []);
    assert.deepEqual(Object.keys((await loadKnowledgeCatalog(root)).documents), ["cache-boundaries"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
