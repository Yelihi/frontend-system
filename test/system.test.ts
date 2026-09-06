import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { FileSystemProjectDiscovery } from "../src/adapters/filesystem/project-discovery.js";
import { RuleResolver } from "../src/application/rules/rule-resolver.js";
import type { ProjectProfile, WorkRequest } from "../src/domain/types.js";
import { runWorkflow } from "../src/graph/frontend-system.graph.js";

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "frontend-system-"));
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, content);
  }
  return root;
}

const request: WorkRequest = {
  raw: "Improve the current structure",
  mode: "plan",
  constraints: [],
  maxWorkers: 1,
};

test("discovers root and nested frontend projects without project-specific branches", async () => {
  const root = await fixture({
    "package.json": JSON.stringify({
      private: true,
      scripts: { build: "next build", lint: "eslint ." },
      dependencies: { next: "16.0.0", react: "19.0.0" },
      devDependencies: { typescript: "5.9.0" },
    }),
    "package-lock.json": "{}",
    "src/features/example.ts": "export {};",
    "src/entities/example.ts": "export {};",
    "src/shared/example.ts": "export {};",
    "src/widgets/example.ts": "export {};",
    "tsconfig.json": "{}",
    "nested/frontend/package.json": JSON.stringify({
      scripts: { test: "vitest run" },
      dependencies: { vue: "3.5.0" },
      devDependencies: { vite: "7.0.0", vitest: "4.0.0" },
    }),
    "nested/frontend/pnpm-lock.yaml": "lockfileVersion: '9.0'",
    "nested/frontend/src/App.vue": "<template />",
  });

  try {
    const discovery = new FileSystemProjectDiscovery();
    const profile = await discovery.discover(await discovery.createRef(root));
    assert.equal(profile.packageManager?.name, "npm");
    assert.equal(profile.architecture.style, "feature-sliced");
    assert.ok(profile.technologies.some(({ name }) => name === "Next.js"));
    assert.ok(profile.technologies.some(({ name }) => name === "Vue"));
    assert.equal(profile.scripts["nested/frontend:test"], "vitest run");
    assert.ok(profile.capabilities.some(({ command }) => command === "pnpm test"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("user knowledge outranks an existing project convention and gaps retain fallback", async () => {
  const profile: ProjectProfile = {
    project: { id: "sample", name: "sample", rootPath: "/sample", git: { repositoryRoot: "/sample", defaultBranch: "main" } },
    technologies: [],
    scripts: {},
    paths: { root: "/sample", manifests: [], sourceDirectories: [], configFiles: [] },
    architecture: { style: "unknown", roots: [], evidence: [] },
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
  assert.ok(rules.some(({ title }) => title === "Security review is never skipped"));
});

test("LangGraph analyze and plan workflow produces context and a valid dependency chain", async () => {
  const root = await fixture({
    "package.json": JSON.stringify({ scripts: { build: "vite build", test: "vitest run" }, dependencies: { react: "19.0.0" }, devDependencies: { vite: "7.0.0" } }),
    "package-lock.json": "{}",
    "src/App.tsx": "export function App() { return null; }",
  });

  try {
    const discovery = new FileSystemProjectDiscovery();
    const analyze = await runWorkflow(discovery, process.cwd(), root, { ...request, mode: "analyze" });
    assert.equal(analyze.plan, undefined);
    assert.ok(analyze.context.applicableRules.some(({ title }) => title === "Security review is never skipped"));

    const planned = await runWorkflow(discovery, process.cwd(), root, request);
    assert.deepEqual(planned.plan?.tasks.map(({ dependencies }) => dependencies), [[], ["task-001"], ["task-002"]]);
    assert.ok(planned.profile.capabilities.some(({ name }) => name === "build"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
