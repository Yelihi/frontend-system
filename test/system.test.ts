import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { FileSystemProjectDiscovery } from "../src/adapters/filesystem/project-discovery.js";
import type { Reasoner } from "../src/application/ai-work.js";
import { readProjectState, writeProjectArtifacts } from "../src/application/project-store.js";
import { RuleResolver } from "../src/application/rules/rule-resolver.js";
import type { ProjectAnalysis, ProjectProfile, ReviewAnalysis, WorkRequest } from "../src/domain/types.js";
import { inspectProject, type InspectAnalyzer } from "../src/graph/inspect.graph.js";
import { verifyProject } from "../src/graph/verify.graph.js";

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
  mode: "prepare",
  constraints: [],
};

const analysis = (questions: ProjectAnalysis["questions"] = []): ProjectAnalysis => ({
  summary: "A small React application.",
  observed: ["React is installed."],
  architecture: ["UI lives under src."],
  conventions: ["TypeScript is used."],
  decisions: [],
  qualityGates: ["Run tests."],
  assumptions: [],
  questions,
});

test("discovers root and nested frontend projects without project-specific branches", async () => {
  const root = await fixture({
    "package.json": JSON.stringify({
      private: true,
      scripts: { build: "next build", lint: "eslint .", "lint:fix": "eslint . --fix" },
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
      scripts: { test: "vitest run", "test:storybook": "vitest --run" },
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
    assert.ok(profile.capabilities.some(({ command }) => command === "pnpm test:storybook"));
    assert.ok(!profile.capabilities.some(({ script }) => script === "lint:fix"));
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

test("interactive inspect asks model-generated questions and persists the result", async () => {
  const root = await fixture({
    "package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
    "package-lock.json": "{}",
    "src/App.tsx": "export function App() { return null; }",
  });
  const calls: string[] = [];
  const analyzer: InspectAnalyzer = async (input) => {
    calls.push(input.answers ? "finalize" : "analyze");
    if (!input.answers) return analysis([{ id: "state", question: "Where should shared state live?", reason: "Two owners are plausible." }]);
    return { ...analysis(), decisions: [`Shared state: ${input.answers.state}`] };
  };

  try {
    const result = await inspectProject(
      new FileSystemProjectDiscovery(),
      analyzer,
      async () => "URL",
      { rootPath: root, overall: false },
    );
    await writeProjectArtifacts(result.profile, result.analysis);
    assert.deepEqual(calls, ["analyze", "finalize"]);
    assert.deepEqual(result.analysis.decisions, ["Shared state: URL"]);
    assert.match(await readFile(join(root, ".frontend-system/project.md"), "utf8"), /Shared state: URL/);
    assert.ok((await readProjectState(root))?.fileHashes["package.json"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("--overall inspect skips questions", async () => {
  const root = await fixture({ "package.json": "{}" });
  let asked = false;
  try {
    const result = await inspectProject(
      new FileSystemProjectDiscovery(),
      async () => analysis(),
      async () => { asked = true; return "unused"; },
      { rootPath: root, overall: true },
    );
    assert.equal(asked, false);
    assert.equal(result.analysis.questions.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("verify reviews, writes missing tests, then runs discovered checks", async () => {
  const root = await fixture({
    "package.json": JSON.stringify({ scripts: { test: "node --test test/*.test.js" }, dependencies: { react: "19.0.0" } }),
    "package-lock.json": "{}",
    "src/value.js": "export const value = 1;",
    "test/value.test.js": "import assert from 'node:assert/strict'; import test from 'node:test'; test('value', () => assert.equal(1, 1));",
  });
  const initial: ReviewAnalysis = {
    summary: "One test gap.",
    risk: "low",
    applicableDimensions: ["testing"],
    findings: [],
    questions: [],
    tests: [{ kind: "unit", reason: "Changed behavior needs coverage.", target: "test/value.test.js" }],
  };
  const final: ReviewAnalysis = { ...initial, summary: "Verified.", tests: [] };
  const responses = [initial, final];
  let edits = 0;
  const runner: Reasoner = {
    structured: async (_root, _prompt, schema) => schema.parse(responses.shift()),
    read: async () => "prepared",
    edit: async () => { edits += 1; return "tests written"; },
  };

  try {
    const result = await verifyProject(new FileSystemProjectDiscovery(), runner, async () => "", {
      projectPath: root,
      systemRoot: process.cwd(),
      base: "HEAD",
      fix: "never",
      request: { raw: "Review changes", mode: "verify", constraints: [] },
    });
    assert.equal(edits, 1);
    assert.equal(result.verification[0]?.passed, true);
    assert.match(await readFile(result.reportPath, "utf8"), /PASS `npm run test`/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
