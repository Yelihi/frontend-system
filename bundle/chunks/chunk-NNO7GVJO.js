import { createRequire as __fsCreateRequire } from 'node:module'; import { fileURLToPath as __fsFileURLToPath } from 'node:url'; import { dirname as __fsDirname } from 'node:path'; const require = __fsCreateRequire(import.meta.url); const __filename = __fsFileURLToPath(import.meta.url); const __dirname = __fsDirname(__filename);
import {
  PROJECT_SOURCE_MAX_BYTES,
  _enum,
  array,
  assertProjectSourceSize,
  boolean,
  discriminatedUnion,
  lazy,
  literal,
  number,
  object,
  projectFile,
  projectFileBytes,
  projectFileHash,
  quoteLocationHint,
  record,
  strictObject,
  string,
  union
} from "./chunk-MHL22X7X.js";
import {
  validateStructuredFlow
} from "./chunk-VEDZPQTV.js";

// src/application/project-flows.ts
import { readFile as readFile7, readdir as readdir4, realpath as realpath7 } from "node:fs/promises";
import { join as join9, relative as relative7, resolve as resolve5 } from "node:path";

// src/adapters/filesystem/project-discovery.ts
import { execFile } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
var run = promisify(execFile);
var ignoredDirectories = /* @__PURE__ */ new Set([
  ".git",
  ".frontend-system",
  ".next",
  ".venv",
  ".turbo",
  ".cache",
  "test-results",
  "playwright-report",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "storybook-static"
]);
var configPattern = /(^|\/)([^/]+\.)?(config\.(js|cjs|mjs|ts)|rc(\.json)?|tsconfig\.json)$/;
var technologyPackages = {
  next: { name: "Next.js", category: "framework" },
  react: { name: "React", category: "library" },
  vue: { name: "Vue", category: "framework" },
  svelte: { name: "Svelte", category: "framework" },
  "@angular/core": { name: "Angular", category: "framework" },
  vite: { name: "Vite", category: "build-tool" },
  webpack: { name: "webpack", category: "build-tool" },
  typescript: { name: "TypeScript", category: "language" },
  jest: { name: "Jest", category: "test-tool" },
  vitest: { name: "Vitest", category: "test-tool" },
  playwright: { name: "Playwright", category: "test-tool" },
  "@playwright/test": { name: "Playwright", category: "test-tool" },
  pinia: { name: "Pinia", category: "state-management" },
  zustand: { name: "Zustand", category: "state-management" },
  "@reduxjs/toolkit": { name: "Redux Toolkit", category: "state-management" },
  tailwindcss: { name: "Tailwind CSS", category: "styling" },
  "@storybook/react": { name: "Storybook", category: "design-tool" },
  "@storybook/vue3": { name: "Storybook", category: "design-tool" },
  "@radix-ui/react-slot": { name: "Radix UI", category: "component-library" },
  "@mui/material": { name: "Material UI", category: "component-library" },
  antd: { name: "Ant Design", category: "component-library" }
};
async function exists(path) {
  return access(path).then(
    () => true,
    () => false
  );
}
async function git(rootPath, args) {
  try {
    return (await run("git", ["-C", rootPath, ...args])).stdout.trim();
  } catch {
    return void 0;
  }
}
async function readManifests(rootPath, files, warnings) {
  const manifests = [];
  for (const path of files.filter((file) => basename(file) === "package.json")) {
    try {
      const data = JSON.parse(await readFile(path, "utf8"));
      manifests.push({ path, directory: dirname(path), data });
    } catch {
      warnings.push(`Manifest unreadable or invalid: ${relative(rootPath, path)}`);
    }
  }
  return manifests.sort((a, b) => relative(rootPath, a.path).localeCompare(relative(rootPath, b.path)));
}
function detectTechnologies(rootPath, manifests) {
  const found = /* @__PURE__ */ new Map();
  for (const manifest of manifests) {
    const dependencies = {
      ...manifest.data.peerDependencies,
      ...manifest.data.devDependencies,
      ...manifest.data.dependencies
    };
    for (const [packageName, version] of Object.entries(dependencies)) {
      const known = technologyPackages[packageName];
      if (!known) continue;
      const evidence2 = `${relative(rootPath, manifest.path) || "package.json"}: ${packageName}`;
      const existing = found.get(known.name);
      if (existing) existing.evidence.push(evidence2);
      else {
        found.set(known.name, {
          name: known.name,
          packageName,
          version,
          category: known.category,
          confidence: 1,
          evidence: [evidence2]
        });
      }
    }
  }
  return [...found.values()];
}
function commandFor(manager, script) {
  return manager === "npm" ? `npm run ${script}` : `${manager} ${script}`;
}
var FileSystemProjectDiscovery = class {
  async inventory(rootPath) {
    const root = resolve(rootPath);
    const files = [];
    const excluded = [];
    const warnings = [];
    const visit = async (directory2) => {
      for (const entry of await readdir(directory2, { withFileTypes: true })) {
        const path = join(directory2, entry.name);
        if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
          excluded.push(relative(root, path));
          continue;
        }
        if (entry.isSymbolicLink()) {
          warnings.push(`Not followed (symbolic link): ${relative(root, path)}`);
          continue;
        }
        if (entry.isDirectory()) await visit(path);
        else if (entry.isFile()) files.push(path);
      }
    };
    await visit(root);
    return { files: files.sort(), excluded: excluded.sort(), warnings: warnings.sort() };
  }
  async listFiles(rootPath) {
    return (await this.inventory(rootPath)).files;
  }
  async createRef(rootPath) {
    const root = resolve(rootPath);
    if (!await exists(root)) throw new Error(`Project path does not exist: ${root}`);
    const repositoryRoot = await git(root, ["rev-parse", "--show-toplevel"]) ?? root;
    const remoteHead = await git(root, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
    const currentBranch = await git(root, ["branch", "--show-current"]);
    const commit2 = await git(root, ["rev-parse", "HEAD"]);
    return {
      id: basename(root).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: basename(root),
      rootPath: root,
      git: {
        repositoryRoot,
        defaultBranch: remoteHead?.replace(/^origin\//, "") || currentBranch || "main",
        ...commit2 ? { commit: commit2 } : {}
      }
    };
  }
  async discover(project) {
    const inventory3 = await this.inventory(project.rootPath);
    const files = inventory3.files;
    const manifests = await readManifests(project.rootPath, files, inventory3.warnings);
    const relativeFiles = files.map((file) => relative(project.rootPath, file));
    const lock = relativeFiles.filter((file) => /(^|\/)(pnpm-lock\.yaml|yarn\.lock|package-lock\.json|bun\.lockb?)$/.test(file)).sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))[0];
    const declaredManager = manifests.find((manifest) => manifest.data.packageManager)?.data.packageManager;
    const packageManagerName = declaredManager?.split("@")[0] ?? (lock?.endsWith("pnpm-lock.yaml") ? "pnpm" : lock?.endsWith("yarn.lock") ? "yarn" : lock?.match(/bun\.lockb?$/) ? "bun" : "npm");
    const packageManagerVersion = declaredManager?.split("@")[1];
    const scripts = {};
    const capabilities = [];
    const capabilityPattern = /^(build|e2e|build-storybook|(?:lint|typecheck|test|check)(?::[\w-]+)*)$/;
    for (const manifest of manifests) {
      const prefix = relative(project.rootPath, manifest.directory);
      const localLock = relativeFiles.find((file) => dirname(file) === prefix && /(?:pnpm-lock\.yaml|yarn\.lock|package-lock\.json|bun\.lockb?)$/.test(file));
      const manager = localLock?.endsWith("pnpm-lock.yaml") ? "pnpm" : localLock?.endsWith("yarn.lock") ? "yarn" : localLock?.match(/bun\.lockb?$/) ? "bun" : packageManagerName;
      for (const [name, command] of Object.entries(manifest.data.scripts ?? {})) {
        const key = prefix ? `${prefix}:${name}` : name;
        scripts[key] = command;
        if (capabilityPattern.test(name) && !/(^|:)(watch|dev|update|fix|ui)(:|$)/.test(name)) {
          capabilities.push({
            name,
            script: name,
            command: commandFor(manager, name),
            packageManager: manager,
            workingDirectory: manifest.directory
          });
        }
      }
    }
    const sourceDirectories = relativeFiles.filter((file) => /(^|\/)src\//.test(file)).map((file) => file.slice(0, file.indexOf("src/") + 3)).filter((value, index, all) => all.indexOf(value) === index);
    const architectureRoots = relativeFiles.filter((file) => /(^|\/)src\/(app|components|entities|features|pages|shared|views|widgets)\//.test(file)).map((file) => file.match(/^(.*?src\/(?:app|components|entities|features|pages|shared|views|widgets))/)?.[1]).filter((value) => Boolean(value)).filter((value, index, all) => all.indexOf(value) === index);
    const featureSliced = ["entities", "features", "shared", "widgets"].every(
      (layer2) => architectureRoots.some((root) => root.endsWith(`/src/${layer2}`) || root === `src/${layer2}`)
    );
    const configFiles = relativeFiles.filter((file) => configPattern.test(file));
    const nodeVersion = manifests.find((manifest) => manifest.data.engines?.node)?.data.engines?.node;
    const technologies = detectTechnologies(project.rootPath, manifests);
    const designFiles = relativeFiles.filter(
      (file) => /(^|\/)(components\.json|tailwind\.config\.(js|cjs|mjs|ts)|global(s)?\.css|[^/]+\.stories\.(js|jsx|ts|tsx|vue))$/.test(file) || /(^|\/)\.storybook\//.test(file)
    );
    const designSystems = [
      ...relativeFiles.includes("components.json") ? ["shadcn/ui"] : [],
      ...designFiles.some((file) => /(^|\/)\.storybook\//.test(file) || file.includes(".stories.")) ? ["Storybook"] : [],
      ...technologies.some((technology) => technology.name === "Tailwind CSS") ? ["Tailwind CSS"] : [],
      ...technologies.filter((technology) => technology.category === "component-library").map((technology) => technology.name)
    ].filter((value, index, all) => all.indexOf(value) === index);
    return {
      project,
      inventory: { fileCount: files.length, excluded: inventory3.excluded, warnings: inventory3.warnings },
      runtime: { name: "node", ...nodeVersion ? { version: nodeVersion } : {}, evidence: nodeVersion ? ["package.json engines.node"] : ["package.json detected"] },
      packageManager: {
        name: packageManagerName,
        ...packageManagerVersion ? { version: packageManagerVersion } : {},
        evidence: [declaredManager ? "packageManager field" : lock ?? "package.json fallback"]
      },
      technologies,
      scripts,
      paths: {
        root: project.rootPath,
        manifests: manifests.map((manifest) => relative(project.rootPath, manifest.path) || "package.json"),
        sourceDirectories,
        configFiles
      },
      architecture: {
        style: featureSliced ? "feature-sliced" : manifests.some((manifest) => manifest.directory !== project.rootPath) ? "nested application" : "single application",
        roots: architectureRoots,
        evidence: architectureRoots
      },
      design: {
        systems: designSystems,
        files: designFiles,
        evidence: [
          ...designFiles.slice(0, 50),
          ...technologies.filter((technology) => ["styling", "component-library", "design-tool"].includes(technology.category ?? "")).flatMap((technology) => technology.evidence)
        ]
      },
      conventions: [
        ...configFiles.some((file) => file.endsWith("tsconfig.json")) ? [{ id: "typescript", description: "TypeScript configuration is present.", evidence: configFiles.filter((file) => file.endsWith("tsconfig.json")) }] : [],
        ...sourceDirectories.length ? [{ id: "src-directory", description: "Source code is organized under src directories.", evidence: sourceDirectories }] : []
      ],
      capabilities,
      constraints: manifests.filter((manifest) => manifest.data.private).map((manifest) => ({ id: `private:${relative(project.rootPath, manifest.path) || "root"}`, description: "Package is private.", evidence: [relative(project.rootPath, manifest.path) || "package.json"] }))
    };
  }
};

// src/application/workflow-store.ts
import { createHash as createHash3, randomUUID } from "node:crypto";
import { mkdir, readFile as readFile6, readdir as readdir3, realpath as realpath6, rename, rm, writeFile } from "node:fs/promises";
import { join as join8, relative as relative6, resolve as resolve4 } from "node:path";

// src/application/pr-scope.ts
import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";

// src/application/git-state.ts
import { execFile as execFile2 } from "node:child_process";
function git2(root, args) {
  return new Promise((resolve6, reject) => {
    execFile2("git", ["-C", root, ...args], { maxBuffer: 10 * 1024 * 1024, env: { ...process.env, LC_ALL: "C" } }, (error, stdout, stderr) => {
      if (error) reject(Object.assign(new Error(stderr.trim() || error.message), { code: error.code, stderr }));
      else resolve6(stdout);
    });
  });
}
async function changedFiles(root, base) {
  const names = /* @__PURE__ */ new Set();
  if (base) {
    for (const path of (await git2(root, ["diff", "--name-only", "--no-renames", "-z", base, "--"])).split("\0").filter(Boolean)) names.add(path);
  }
  const entries = (await git2(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"])).split("\0").filter(Boolean);
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    names.add(entry.slice(3));
    if (/[RC]/.test(entry.slice(0, 2))) names.add(entries[++index]);
  }
  return [...names].filter((path) => path !== ".frontend-system" && !path.startsWith(".frontend-system/")).sort();
}
async function reviewBase(root, requested) {
  if (requested) {
    await git2(root, ["rev-parse", "--verify", requested]);
    return requested;
  }
  if (await git2(root, ["status", "--porcelain"])) return "HEAD";
  const head = (await git2(root, ["rev-parse", "HEAD"])).trim();
  try {
    await git2(root, ["rev-parse", "--verify", `${head}^`]);
    return `${head}^`;
  } catch {
    return head;
  }
}
async function diffStat(root, base) {
  return (await git2(root, ["diff", "--stat", base, "--"])).trim();
}

// src/application/pr-scope.ts
var commit = string().regex(/^[a-f0-9]{40,64}$/);
var prScopeSchema = strictObject({
  base: string().min(1).refine((value) => !value.startsWith("-") && !value.includes("\0")),
  baseCommit: commit,
  mergeBase: commit,
  headCommit: commit,
  diffHash: string().regex(/^[a-f0-9]{64}$/)
});
async function prScope(root, base) {
  prScopeSchema.shape.base.parse(base);
  const top = (await git2(root, ["rev-parse", "--show-toplevel"])).trim();
  if (await realpath(top) !== await realpath(root)) throw new Error("PR review requires the repository root, not a package subdirectory");
  const baseCommit = (await git2(root, ["rev-parse", "--verify", `${base}^{commit}`])).trim();
  const headCommit = (await git2(root, ["rev-parse", "--verify", "HEAD^{commit}"])).trim();
  const mergeBase = (await git2(root, ["merge-base", baseCommit, headCommit])).trim();
  const diff = await git2(root, ["diff", "--binary", "--no-ext-diff", "--no-textconv", mergeBase, headCommit, "--"]);
  const files = (await git2(root, ["diff", "--name-only", "--no-renames", "-z", mergeBase, headCommit, "--"])).split("\0").filter((path) => path && path !== ".frontend-system" && !path.startsWith(".frontend-system/")).sort();
  const scope2 = prScopeSchema.parse({
    base,
    baseCommit,
    mergeBase,
    headCommit,
    diffHash: createHash("sha256").update(diff).digest("hex")
  });
  return { scope: scope2, files, dirtyFiles: await changedFiles(root) };
}
function samePrScope(left, right) {
  return !!left && Object.keys(prScopeSchema.shape).every((key) => left[key] === right[key]);
}

// src/application/policy.ts
var ruleId = string().regex(/^[a-z0-9][a-z0-9._-]{0,119}$/);
var policyId = string().regex(/^[\p{L}\p{N}][\p{L}\p{N}:._-]{0,239}$/u);
var sha256 = string().regex(/^[a-f0-9]{64}$/);
var layer = _enum(["domain", "architecture", "framework", "accessibility", "security", "testing"]);
var localPath = string().min(1).refine(
  (path) => !path.startsWith("/") && !path.includes("\\") && !path.split("/").includes("..") && !path.startsWith(".frontend-system/"),
  "Expected a project-relative source path"
);
var ruleSchema = strictObject({
  id: policyId,
  version: number().int().positive(),
  title: string().min(1),
  statement: string().min(1),
  layer,
  obligation: _enum(["required", "recommended"]),
  conditions: array(string().min(1)),
  exclusions: array(string().min(1)),
  evidence: array(string().min(1)).min(1),
  verification: _enum(["existing-tool", "custom-check", "behavior-test", "review"]).describe("Select exactly one method. To require both tests and semantic review, use behavior-test here and link the same ruleId in checks AND reviews. Never concatenate enum values."),
  examples: array(object({
    path: string().min(1),
    expectation: _enum(["pass", "fail", "excluded"]),
    diagnostic: string().optional()
  })),
  validation: _enum(["proposed", "verified"]),
  limitations: array(string())
});
var policyObject = strictObject({
  version: literal(1),
  rules: array(ruleSchema),
  checks: array(strictObject({
    id: policyId,
    script: string().min(1).describe("Package script key; when command is omitted the script must already exist. Do not assume test/lint/build exists. Inspect capabilities and keep pending verification setup explicit; never claim a planned check already exists or passed."),
    command: string().min(1).describe("Exact package.json scripts[script] body, not the command invoking that script. For script test, supply an actual runner body such as node --test; npm test would invoke itself recursively."),
    ruleIds: array(policyId),
    guardPaths: array(localPath).min(1).optional()
  })),
  reviews: array(strictObject({ id: policyId, ruleIds: array(policyId), description: string().min(1) })),
  // Exact hashes protect checker/config/test assets. Changes require a policy update.
  guards: array(strictObject({ path: localPath, hash: sha256 })),
  exceptions: array(strictObject({
    id: policyId,
    ruleId: policyId,
    files: array(localPath).min(1),
    reason: string().min(1),
    risk: string().min(1),
    verification: string().min(1),
    resolveByStep: ruleId,
    reconsiderWhen: string().min(1)
  }))
});
var policyInputSchema = policyObject.extend({
  version: literal(1).default(1),
  rules: array(ruleSchema.extend({
    version: number().int().positive().default(1),
    conditions: ruleSchema.shape.conditions.default([]),
    exclusions: ruleSchema.shape.exclusions.default([]),
    examples: ruleSchema.shape.examples.default([]),
    limitations: ruleSchema.shape.limitations.default([]),
    validation: ruleSchema.shape.validation.default("proposed"),
    evidence: ruleSchema.shape.evidence.optional().describe("Legacy text evidence; omit to derive provenance from linked decisions. Open decisions may be saved but block approval. Code citations belong only in evidence.decisions[].evidence.")
  })),
  checks: array(policyObject.shape.checks.element.extend({
    command: policyObject.shape.checks.element.shape.command.optional(),
    guardPaths: array(localPath).min(1).optional().describe("Existing verification assets to protect. save_revision pins their current hashes; no need to duplicate these paths in guards. Do not pin a file whose edit this plan authorizes; retain appropriate review/other protected checks for that transition.")
  })),
  guards: array(policyObject.shape.guards.element.extend({ hash: sha256.optional() })).default([]),
  reviews: policyObject.shape.reviews.default([]),
  exceptions: policyObject.shape.exceptions.default([])
});
var policySchema = policyObject.superRefine((policy, context) => {
  for (const group of [policy.rules, policy.checks, policy.reviews, policy.exceptions]) {
    if (new Set(group.map(({ id: id4 }) => id4)).size !== group.length) context.addIssue({ code: "custom", message: "Duplicate policy IDs" });
  }
  const ids = new Set(policy.rules.map(({ id: id4 }) => id4));
  for (const check of policy.checks) {
    if (check.guardPaths?.some((path) => !policy.guards.some((guard) => guard.path === path))) {
      context.addIssue({ code: "custom", message: `Check references an unpinned verification asset: ${check.id}` });
    }
  }
  for (const item of [...policy.checks, ...policy.reviews]) {
    if (item.ruleIds.some((id4) => !ids.has(id4))) context.addIssue({ code: "custom", message: "Unknown policy rule" });
  }
  for (const exception of policy.exceptions) {
    if (!ids.has(exception.ruleId)) context.addIssue({ code: "custom", message: "Unknown exception rule" });
    if (!policy.reviews.some((review) => review.ruleIds.includes(exception.ruleId))) context.addIssue({ code: "custom", message: "Migration exception requires a resolution review" });
  }
  for (const rule of policy.rules.filter((rule2) => rule2.obligation === "required")) {
    if (![...policy.checks, ...policy.reviews].some((item) => item.ruleIds.includes(rule.id))) {
      context.addIssue({ code: "custom", message: `Required rule has no evidence requirement: ${rule.id}` });
    }
  }
});
function requiredScripts(policy) {
  return [...new Set(policy.checks.map(({ script }) => script))];
}
function policyProtectionFailures(policy) {
  const failures = new Set(policy.guards.map(({ path }) => path)).size !== policy.guards.length ? ["Duplicate guard paths"] : [];
  for (const check of policy.checks) {
    const invocation = check.command.trim().match(/^npm\s+(?:(run|run-script)\s+)?([a-zA-Z0-9:._-]+)$/);
    if (invocation?.[2] === check.script && (invocation[1] || ["test", "start", "stop", "restart"].includes(check.script)))
      failures.push(`Check ${check.id} recursively invokes its own script ${check.script}; command must be the package script body, not npm's invocation.`);
  }
  return failures.concat(policy.rules.filter((rule) => rule.obligation === "required").flatMap((rule) => {
    const checks = policy.checks.filter((check) => check.ruleIds.includes(rule.id));
    const reviewed = policy.reviews.some((review) => review.ruleIds.includes(rule.id));
    if (rule.verification === "review") return reviewed ? [] : [`Required rule needs semantic review: ${rule.id}`];
    if (!checks.length) return [`Required rule needs an automated check: ${rule.id}`];
    return checks.filter((check) => !reviewed && !check.guardPaths?.length).map((check) => `Required check needs guardPaths or semantic review for rule ${rule.id}: ${check.id}`);
  }));
}
function policyFailures(policy, scripts, files) {
  return [
    ...policyProtectionFailures(policy),
    ...policy.checks.filter((check) => scripts[check.script] !== check.command).map((check) => `Missing or changed required script: ${check.script}`),
    ...policy.guards.filter((guard) => files[guard.path] !== guard.hash).map((guard) => `Protected verification asset changed: ${guard.path}`)
  ];
}

// src/application/flow-schema.ts
var analysisId = string().regex(/^[a-z0-9][a-z0-9._-]{0,99}$/);
var text = string().trim().min(1).max(1600);
var flowCitation = object({ path: localPath, quote: text, line: number().int().positive().optional() });
var evidence = array(analysisId).max(20);
var designImage = object({ path: localPath, hash: sha256, alt: text });
var flowTestCaseSchema = object({
  id: analysisId,
  scenarioId: analysisId,
  given: text,
  when: text,
  then: text,
  method: _enum(["unit", "integration", "e2e", "manual"])
});
var outcomeKind = _enum(["idle", "loading", "success", "empty", "error", "cancelled", "retry", "custom"]);
var flowSchema = object({
  id: analysisId,
  title: text,
  basis: _enum(["observed", "proposed"]),
  summary: text,
  scope: object({
    files: array(localPath).min(1).max(100),
    discoveryMode: _enum(["source", "all"]).default("source").describe("source tracks new code/config/data files, not Markdown reports. Use all for Markdown-driven routes/content. Explicit files are always hashed."),
    discoveryRoots: array(string().regex(/^(\.|[a-zA-Z0-9_@.-]+(?:\/[a-zA-Z0-9_@.-]+)*)$/)).min(1).max(20).describe("Directories whose source content changes and file additions/removals invalidate the flow; use . for the whole first-party inventory. No .. segments."),
    snapshot: object({ baseRef: string(), expectedCommit: sha256.or(string().regex(/^[a-f0-9]{40}$/)) }).optional()
  }),
  evidence: record(analysisId, flowCitation),
  designState: _enum(["draft", "ready"]).optional().describe("New structured designs start draft; ready permits plan binding, not implementation approval."),
  pages: array(object({
    node: analysisId,
    route: text,
    domain: text.optional(),
    scenes: array(object({
      id: analysisId,
      title: text,
      kind: outcomeKind,
      description: text,
      blocks: array(object({
        node: analysisId,
        role: _enum(["heading", "input", "action", "list", "content", "feedback", "navigation"]),
        label: text,
        content: array(text).max(12).optional(),
        span: _enum(["full", "half"]).optional()
      })).max(30).optional().describe("Ordered proposed wireframe regions; not evidence of the existing UI.")
    })).min(1).max(20)
  })).min(1).max(80).optional(),
  navigation: array(object({
    id: analysisId,
    from: analysisId,
    to: analysisId,
    label: text,
    condition: text,
    evidence
  })).max(200).optional(),
  knowledge: array(object({
    id: analysisId,
    referenceId: analysisId,
    referenceHash: sha256,
    judgment: _enum(["apply", "keep", "not-applicable", "needs-context", "needs-decision"]),
    rationale: text,
    decisionId: analysisId.optional(),
    evidence,
    nodes: array(analysisId),
    edges: array(analysisId),
    scenarios: array(analysisId)
  })).max(80).optional().describe("Scoped learned judgments. Plan binding checks adoption and exact knowledge version; a link alone is not approval."),
  testCases: array(flowTestCaseSchema).max(80).optional(),
  checks: array(object({
    id: analysisId,
    requirement: text,
    nodes: array(analysisId),
    scenarios: array(analysisId),
    testCaseIds: array(analysisId).min(1)
  })).max(80).optional(),
  nodes: array(object({
    id: analysisId,
    kind: _enum(["page", "component", "store", "cache", "module", "service", "external"]),
    label: text,
    parent: analysisId.optional(),
    props: array(text).default([]),
    state: array(text).default([]),
    events: array(text).default([]),
    lifecycle: array(text).default([]),
    evidence,
    architecture: object({ layer: text, runtime: _enum(["browser", "server", "shared", "external"]), responsibility: text }).optional(),
    contracts: array(object({
      kind: _enum(["interface", "type", "function", "store"]),
      name: string().trim().min(1).max(160),
      path: localPath,
      signature: string().trim().min(1).max(4e3),
      evidence
    })).max(12).optional().describe("Relevant code declarations/signatures, not full implementations. Observed contracts need citations from path; proposed paths may not exist yet. Keep concrete props/state names in their existing fields.")
  })).min(1).max(80),
  edges: array(object({
    id: analysisId,
    from: analysisId,
    to: analysisId,
    kind: _enum(["call", "read", "write", "subscribe", "props", "return", "invalidate", "cleanup"]),
    label: text,
    condition: text.optional(),
    evidence
  })).max(200),
  scenarios: array(object({
    id: analysisId,
    title: text,
    entry: analysisId,
    event: text,
    category: _enum(["event", "lifecycle"]).optional(),
    variant: outcomeKind.optional(),
    steps: array(object({
      edge: analysisId,
      effect: text,
      condition: text.optional(),
      views: array(object({ page: analysisId, scene: analysisId })).min(1).optional(),
      changes: array(object({
        ownerNode: analysisId,
        field: text,
        before: text,
        after: text,
        basis: _enum(["source", "measured", "proposed"])
      })).optional()
    })).min(1).max(80),
    outcome: text,
    limitations: array(text).default([])
  })).max(20),
  design: object({
    stage: _enum(["visual-review", "detailed-design"]),
    screens: array(object({
      id: analysisId,
      page: analysisId,
      title: text,
      reference: designImage.optional(),
      image: designImage,
      feedback: array(text).max(20).default([]),
      confirmation: object({ evidence: analysisId, imageHash: sha256 }).optional(),
      regions: array(object({
        node: analysisId,
        x: number().min(0).max(100),
        y: number().min(0).max(100),
        width: number().positive().max(100),
        height: number().positive().max(100)
      })).max(30).default([])
    })).min(1).max(6),
    detailRequest: analysisId.optional().describe("Evidence quoting the user request to proceed with detailed design; visual confirmation alone is insufficient."),
    quality: array(object({
      category: _enum(["accessibility", "performance", "security", "resilience", "responsive", "other"]),
      requirement: text,
      verification: text,
      nodes: array(analysisId).min(1).max(20)
    })).max(20).default([])
  }).optional(),
  invariants: array(object({
    id: analysisId,
    statement: text,
    authority: _enum(["observed", "established", "proposed"]),
    evidence
  })).default([]),
  limitations: array(text).min(1).max(30)
}).superRefine((flow, ctx) => {
  if (!flow.scenarios.length && flow.design?.stage !== "visual-review" && !(flow.pages?.length && flow.designState === "draft")) ctx.addIssue({ code: "custom", message: "Event scenarios are required outside visual review", path: ["scenarios"] });
  if (flow.design && (flow.basis !== "proposed" || flow.scope.snapshot)) ctx.addIssue({ code: "custom", message: "Design screens require a proposed working flow", path: ["design"] });
});
var findingSchema = object({
  id: analysisId,
  title: text,
  flow: object({ id: analysisId, hash: sha256 }),
  kind: _enum(["violation", "choice", "hypothesis"]),
  status: _enum(["open", "deferred", "planned", "resolved", "dismissed"]),
  observation: text,
  consequence: text,
  evidence: array(flowCitation).min(1).max(12),
  knowledgeIds: array(analysisId).default([]),
  alternatives: array(object({ id: analysisId, description: text, cost: text })).min(1).max(6),
  question: text.optional(),
  authority: flowCitation.optional().describe("A violation needs a cited established requirement. This does not authorize edits."),
  resolution: object({
    summary: text,
    method: _enum(["static-review", "executed-check", "owner-decision"]),
    evidence: array(flowCitation).min(1),
    reconsiderWhen: text
  }).optional()
});
var analysisReferenceSchema = object({
  kind: _enum(["flow", "finding"]),
  id: analysisId,
  hash: sha256,
  issueIds: array(analysisId).min(1)
});
var analysisWriteSchema = object({
  expectedHash: sha256.nullable(),
  record: discriminatedUnion("kind", [object({ kind: literal("flow"), data: flowSchema }), object({ kind: literal("finding"), data: findingSchema })])
});

// src/application/knowledge/investigation.ts
var text2 = string().trim().min(1).max(1200);
var id = string().regex(/^[a-z0-9][a-z0-9._-]*$/);
var investigationSchema = object({
  version: literal(1),
  questions: array(object({
    id,
    kind: _enum(["code", "intent"]),
    role: _enum(["applicability", "exclusion", "context"]),
    instruction: text2
  })).min(2).max(12),
  preserve: array(text2).min(1).max(10),
  alternatives: array(object({ option: text2, tradeoff: text2 })).min(1).max(5),
  onMissing: text2
}).superRefine((value, context) => {
  if (new Set(value.questions.map((q) => q.id)).size !== value.questions.length)
    context.addIssue({ code: "custom", message: "Duplicate investigation question IDs" });
  for (const role of ["applicability", "exclusion"]) if (!value.questions.some((q) => q.role === role))
    context.addIssue({ code: "custom", message: `Investigation needs an explicit ${role} question` });
});
var citation = object({ path: text2, line: number().int().positive(), quote: text2 });
var investigationAssessmentSchema = object({
  findings: array(object({
    questionId: id,
    status: _enum(["supported", "refuted", "unknown"]),
    basis: _enum(["code", "inference", "owner", "unknown"]),
    rationale: text2,
    citations: array(citation).max(8),
    confirmation: text2.optional().describe("Required for basis owner: exact substring of a cited supplied answer/contract. A paraphrase is not confirmation; keep unknown without owner evidence.")
  })).min(1).max(12),
  action: _enum(["recommend", "repair", "ask", "inspect", "keep"]),
  authority: object({ basis: _enum(["approved-contract", "existing-behavior"]), citation }).optional(),
  limitations: array(text2).min(1).max(10)
});
function validateInvestigation(spec, decision, raw) {
  if (!spec) {
    if (raw) throw new Error("Knowledge has no investigation specification; do not invent completed investigation");
    return;
  }
  if (!raw) {
    if (["needs-context", "needs-decision"].includes(decision)) return;
    throw new Error("Investigation findings required before adoption, retention or exclusion");
  }
  const assessment = investigationAssessmentSchema.parse(raw);
  const byId = new Map(assessment.findings.map((f) => [f.questionId, f]));
  if (byId.size !== assessment.findings.length || byId.size !== spec.questions.length || spec.questions.some((q) => !byId.has(q.id)))
    throw new Error("Address every investigation question exactly once; unknown is a valid finding");
  for (const q of spec.questions) {
    const f = byId.get(q.id);
    if (f.status === "unknown") {
      if (f.basis !== "unknown") throw new Error(`Question ${q.id}: Unknown findings must retain unknown basis`);
      continue;
    }
    if (f.basis === "unknown" || !f.citations.length) throw new Error(`Question ${q.id}: Known investigation findings require scoped citations`);
    if (q.kind === "intent" && f.basis !== "owner") throw new Error(`Question ${q.id}: Intent questions require supplied owner or established contract evidence; otherwise keep unknown`);
    if (f.basis === "owner" && (!f.confirmation || !f.citations.some((c) => c.quote.includes(f.confirmation))))
      throw new Error(`Question ${q.id}: Owner findings require confirmation contained in a cited answer or contract`);
  }
  const unknown = assessment.findings.some((f) => f.status === "unknown");
  const excluded = spec.questions.some((q) => q.role === "exclusion" && byId.get(q.id).status === "supported");
  const applicable = spec.questions.filter((q) => q.role === "applicability").every((q) => byId.get(q.id).status === "supported");
  if (decision === "apply" && (unknown || excluded || !applicable)) {
    const unknownIds = assessment.findings.filter((f) => f.status === "unknown").map((f) => f.questionId);
    const exclusionIds = spec.questions.filter((q) => q.role === "exclusion" && byId.get(q.id).status === "supported").map((q) => q.id);
    const unmetIds = spec.questions.filter((q) => q.role === "applicability" && byId.get(q.id).status !== "supported").map((q) => q.id);
    throw new Error(`Cannot apply knowledge with unknown, excluded or unmet investigation conditions. Unknown: ${unknownIds.join(", ") || "none"}; supported exclusions: ${exclusionIds.join(", ") || "none"}; unmet applicability: ${unmetIds.join(", ") || "none"}. Recheck the scoped evidence or retain a pending/excluded judgment; do not flip findings just to pass.`);
  }
  if (decision === "not-applicable" && !excluded && !spec.questions.some((q) => q.role === "applicability" && byId.get(q.id).status === "refuted"))
    throw new Error("Exclusion needs a supported exclusion or refuted applicability condition");
  if (decision === "keep" && unknown && !excluded) throw new Error("Unresolved investigation must remain needs-context or needs-decision");
  const actions = { apply: ["recommend", "repair"], keep: ["keep"], "not-applicable": ["keep"], "needs-context": ["inspect"], "needs-decision": ["ask"] };
  if (!actions[decision]?.includes(assessment.action)) throw new Error("Investigation action must match the recorded decision");
  if (assessment.action === "repair" && !assessment.authority) throw new Error("Direct repair needs a cited existing behavior or approved contract; it does not grant execution permission");
}
function investigationCitations(assessment) {
  return assessment ? [...assessment.findings.flatMap((f) => f.citations), ...assessment.authority ? [assessment.authority.citation] : []] : [];
}

// src/application/design-evidence.ts
import { readFile as readFile5 } from "node:fs/promises";
import { join as join7 } from "node:path";

// src/application/knowledge/code-triggers.ts
import { realpath as realpath3 } from "node:fs/promises";
import { dirname as dirname2, isAbsolute as isAbsolute2, relative as relative3, resolve as resolve3 } from "node:path";

// src/application/knowledge/code-relations.ts
var isUnit = (c, node) => c.isFunctionDeclaration(node) || c.isFunctionExpression(node) || c.isArrowFunction(node) || c.isMethodDeclaration(node);
function owner(c, node) {
  for (let current = node.parent; current; current = current.parent) if (isUnit(c, current)) return current;
  return void 0;
}
function unwrapped(c, node) {
  return c.isParenthesizedExpression(node) ? unwrapped(c, node.expression) : node;
}
function parameterDispatch(c, checker, node) {
  let expression;
  if (c.isSwitchStatement(node)) expression = node.expression;
  if (c.isIfStatement(node)) {
    const condition = unwrapped(c, node.expression);
    if (c.isBinaryExpression(condition) && [
      c.SyntaxKind.EqualsEqualsEqualsToken,
      c.SyntaxKind.EqualsEqualsToken,
      c.SyntaxKind.ExclamationEqualsEqualsToken,
      c.SyntaxKind.ExclamationEqualsToken
    ].includes(condition.operatorToken.kind)) {
      const literal2 = (n) => c.isStringLiteral(n) || c.isNumericLiteral(n) || n.kind === c.SyntaxKind.TrueKeyword || n.kind === c.SyntaxKind.FalseKeyword;
      expression = literal2(condition.right) ? condition.left : literal2(condition.left) ? condition.right : void 0;
    }
  }
  if (!expression) return;
  const selector = expression;
  expression = unwrapped(c, expression);
  while (c.isPropertyAccessExpression(expression) || c.isElementAccessExpression(expression) && expression.argumentExpression && c.isStringLiteral(expression.argumentExpression))
    expression = unwrapped(c, expression.expression);
  if (!c.isIdentifier(expression)) return;
  const unit = owner(c, node);
  const declarations = checker.getSymbolAtLocation(expression)?.declarations ?? [];
  if (!unit || !declarations.some((d) => c.isParameter(d) && d.parent === unit)) return;
  return { unit, selector };
}
function relationCollector(c, checker, paths, limit = 200) {
  const facts = [];
  let omitted = 0;
  const short = (node) => node.getText().slice(0, 180);
  const location = (node) => {
    const source2 = node.getSourceFile();
    const pos = source2.getLineAndCharacterOfPosition(node.getStart(source2));
    return { path: paths.get(source2.fileName), line: pos.line + 1, column: pos.character + 1 };
  };
  const unitId = (node) => `${location(node).path}:${node.getStart()}`;
  function target(expression) {
    let symbol = checker.getSymbolAtLocation(expression);
    if (symbol && symbol.flags & c.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const declaration = symbol?.declarations?.[0];
    const unit = declaration && (isUnit(c, declaration) ? declaration : c.isVariableDeclaration(declaration) && declaration.initializer && isUnit(c, declaration.initializer) ? declaration.initializer : void 0);
    return unit && !c.isMethodDeclaration(unit) && paths.has(unit.getSourceFile().fileName) ? unitId(unit) : null;
  }
  const argument = (node) => {
    if (c.isStringLiteral(node) || c.isNumericLiteral(node) || [c.SyntaxKind.TrueKeyword, c.SyntaxKind.FalseKeyword, c.SyntaxKind.NullKeyword].includes(node.kind))
      return { kind: "literal", value: short(node) };
    if (c.isObjectLiteralExpression(node)) return { kind: "object", fields: node.properties.slice(0, 8).map((p) => ({
      name: "name" in p && p.name ? short(p.name) : "spread",
      value: c.isPropertyAssignment(p) ? short(p.initializer) : short(p),
      literal: c.isPropertyAssignment(p) && (c.isStringLiteral(p.initializer) || c.isNumericLiteral(p.initializer) || [c.SyntaxKind.TrueKeyword, c.SyntaxKind.FalseKeyword, c.SyntaxKind.NullKeyword].includes(p.initializer.kind))
    })), truncated: node.properties.length > 8 };
    const callbackTarget = isUnit(c, node) ? unitId(node) : c.isIdentifier(node) ? target(node) : null;
    return {
      kind: isUnit(c, node) ? "callback" : c.isIdentifier(node) ? "identifier" : "expression",
      expression: short(node),
      ...callbackTarget ? { target: callbackTarget } : {}
    };
  };
  function add(node, fact) {
    if (facts.length >= limit) {
      omitted++;
      return;
    }
    const enclosing = owner(c, node);
    facts.push({ ...location(node), owner: enclosing ? unitId(enclosing) : null, evidence: short(node), ...fact });
  }
  function visit(node) {
    if (isUnit(c, node)) add(node, {
      kind: "function",
      id: unitId(node),
      name: node.name ? short(node.name) : c.isVariableDeclaration(node.parent) ? short(node.parent.name) : "<callback>",
      parameters: node.parameters.slice(0, 8).map((p) => ({ name: short(p.name), type: p.type ? short(p.type) : null })),
      truncated: node.parameters.length > 8
    });
    if (c.isCallExpression(node)) add(node, {
      kind: "call",
      callee: short(node.expression),
      target: target(node.expression),
      arguments: node.arguments.slice(0, 8).map(argument),
      truncated: node.arguments.length > 8
    });
    if (c.isJsxAttribute(node) && node.initializer && c.isJsxExpression(node.initializer) && node.initializer.expression) {
      const expression = node.initializer.expression;
      if (isUnit(c, expression) || c.isIdentifier(expression)) add(node, {
        kind: "callback-binding",
        site: `jsx:${short(node.name)}`,
        target: isUnit(c, expression) ? unitId(expression) : target(expression),
        meaning: "JSX value binding only; custom props do not prove a DOM event"
      });
    }
    const dispatch = parameterDispatch(c, checker, node);
    if (dispatch) add(node, { kind: "parameter-dispatch", selector: short(dispatch.selector), function: unitId(dispatch.unit) });
    if (c.isReturnStatement(node)) add(node, { kind: "return", expression: node.expression ? short(node.expression) : null });
    if (c.isBinaryExpression(node) && node.operatorToken.kind >= c.SyntaxKind.FirstAssignment && node.operatorToken.kind <= c.SyntaxKind.LastAssignment)
      add(node, { kind: "write", target: short(node.left), operator: short(node.operatorToken), value: short(node.right), meaning: "Assignment syntax, not proof of ownership or mutation of caller data" });
  }
  return { visit, result: () => ({
    facts,
    omitted,
    truncated: omitted > 0,
    limit,
    authority: "Bounded syntax/binding facts from selected files only. Null call targets, dynamic registration, method dispatch, aliases and unselected callees require host inspection. No runtime execution, complete call graph or absence proof."
  }) };
}

// src/application/knowledge/reference-index.ts
import { createHash as createHash2 } from "node:crypto";
import { readFile as readFile2, realpath as realpath2 } from "node:fs/promises";
import { isAbsolute, relative as relative2, resolve as resolve2 } from "node:path";
var text3 = string().min(1).max(600);
var id2 = string().regex(/^[a-z0-9][a-z0-9._-]*$/);
var hash = string().regex(/^[a-f0-9]{64}$/);
var triggerSchema = object({ kind: _enum(["call", "import", "path", "jsx-element", "jsx-attribute", "semantic", "syntax"]), value: text3, description: text3.optional() });
var knowledgeCheckSchema = object({
  id: id2,
  question: text3,
  guidance: text3,
  verification: _enum(["review", "static", "behavior", "runtime"])
});
var referenceIndexSchema = object({
  version: union([literal(1), literal(2), literal(3)]),
  entries: array(object({
    id: id2,
    kind: _enum(["concept", "decision", "rule"]),
    title: text3,
    summary: text3,
    rule: ruleSchema.optional(),
    ruleApproval: object({ proposalId: id2, proposalHash: hash }).optional(),
    path: text3,
    contentHash: hash,
    keywords: array(text3).max(30),
    domains: array(text3).max(15),
    technologies: array(text3).max(15),
    excludedTechnologies: array(text3).max(15),
    conditions: array(text3).max(15),
    exclusions: array(text3).max(15),
    evidenceKind: _enum(["public-contract", "implementation", "experience", "hypothesis"]),
    review: _enum(["reviewed", "uncertain"]),
    sources: record(id2, hash),
    related: array(id2).max(15),
    routing: object({ mode: _enum(["direct", "supporting", "deferred"]), reason: text3 }).optional(),
    triggers: array(triggerSchema).min(1).max(30).optional(),
    investigation: investigationSchema.optional(),
    checks: array(knowledgeCheckSchema).min(1).max(15).optional()
  })).max(1e4),
  retrievalChecks: array(object({
    query: text3,
    technologies: array(text3).max(15),
    expectedIds: array(id2).max(20),
    forbiddenIds: array(id2).max(20),
    expectEmpty: boolean().optional()
  })).max(1e3).optional(),
  triggerChecks: array(object({
    signals: array(triggerSchema).max(30),
    technologies: array(text3).max(15),
    expectedIds: array(id2).max(20),
    forbiddenIds: array(id2).max(20),
    expectEmpty: boolean().optional()
  })).max(1e3).optional(),
  outcomes: array(object({
    sourceId: id2,
    sourceHash: hash,
    action: _enum(["represented", "deferred", "omitted"]),
    reason: text3
  })).max(1e4)
});
var contentHash = (value) => createHash2("sha256").update(value).digest("hex");
var technologyKey = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
async function confinedRead(root, path) {
  if (isAbsolute(path)) throw new Error("Expected a relative knowledge path.");
  const base = await realpath2(root);
  const target = await realpath2(resolve2(base, path));
  const rel = relative2(base, target);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Knowledge path escapes its root.");
  return readFile2(target, "utf8");
}
async function readReferenceIndex(root) {
  let raw;
  try {
    raw = await readFile2(resolve2(root, "index.json"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return void 0;
    throw error;
  }
  const index = referenceIndexSchema.parse(JSON.parse(raw));
  const ids = new Set(index.entries.map((entry) => entry.id));
  if (ids.size !== index.entries.length) throw new Error("Duplicate knowledge IDs.");
  if (new Set(index.outcomes.map((item) => item.sourceId)).size !== index.outcomes.length) throw new Error("Duplicate source outcomes.");
  for (const entry of index.entries) {
    if (index.version === 3) {
      if (!entry.routing) throw new Error(`Missing routing disposition: ${entry.id}`);
      if (entry.routing.mode === "direct" && (!entry.triggers || !entry.checks || !entry.conditions.length || !entry.exclusions.length)) throw new Error(`Direct routing needs triggers, checks and applicability: ${entry.id}`);
      if (entry.routing.mode !== "direct" && (entry.triggers || entry.checks)) throw new Error(`Only direct knowledge may own checks: ${entry.id}`);
      if (entry.routing.mode === "supporting" && !entry.related.some((id4) => index.entries.find((item) => item.id === id4)?.routing?.mode === "direct")) throw new Error(`Supporting knowledge needs a direct reference: ${entry.id}`);
      if (entry.triggers?.some((trigger) => trigger.kind === "semantic" && !trigger.description)) throw new Error(`Semantic trigger needs a description: ${entry.id}`);
    }
    if (entry.investigation && entry.routing?.mode !== "direct") throw new Error(`Only direct knowledge may own investigation: ${entry.id}`);
    if (!!entry.triggers !== !!entry.checks) throw new Error(`Triggers and checks must be published together: ${entry.id}`);
    if (entry.checks && new Set(entry.checks.map((check) => check.id)).size !== entry.checks.length) throw new Error(`Duplicate knowledge check IDs: ${entry.id}`);
    if (entry.kind === "rule" && (index.version < 2 || !entry.rule || !entry.ruleApproval || entry.review !== "reviewed" || entry.rule.id !== entry.id)) throw new Error(`Rule needs an approved v2 definition: ${entry.id}`);
    if (entry.kind !== "rule" && (entry.rule || entry.ruleApproval)) throw new Error(`Rule metadata on non-rule: ${entry.id}`);
    if (!Object.keys(entry.sources).length) throw new Error(`Missing source evidence: ${entry.id}`);
    if (entry.related.some((related) => !ids.has(related))) throw new Error(`Unknown related knowledge: ${entry.id}`);
  }
  for (const check of [...index.retrievalChecks ?? [], ...index.triggerChecks ?? []]) {
    if (check.expectEmpty && check.expectedIds.length > 0 || [...check.expectedIds, ...check.forbiddenIds].some((id4) => !ids.has(id4)) || check.expectedIds.some((id4) => check.forbiddenIds.includes(id4))) throw new Error("Invalid retrieval check IDs.");
  }
  return index;
}
function matchKnowledgeTriggers(index, signals, technologies = []) {
  const tech = technologies.map(technologyKey);
  return index.entries.filter(
    (entry) => (!entry.routing || entry.routing.mode === "direct") && !entry.excludedTechnologies.some((value) => tech.includes(technologyKey(value))) && (!tech.length || !entry.technologies.length || entry.technologies.some((value) => tech.includes(technologyKey(value))))
  ).flatMap((entry) => {
    const matched = signals.filter((signal) => entry.triggers?.some((trigger) => trigger.kind === signal.kind && (trigger.kind === "path" ? signal.value === trigger.value || signal.value.startsWith(trigger.value.replace(/\/$/, "") + "/") : signal.value === trigger.value)));
    return matched.length ? [{ entry, matched }] : [];
  });
}
function semanticReviewLenses(index, technologies = []) {
  const tech = technologies.map(technologyKey);
  return index.entries.filter((entry) => entry.routing?.mode === "direct" && entry.investigation && entry.triggers?.length && entry.triggers.every((trigger) => trigger.kind === "semantic") && !entry.excludedTechnologies.some((value) => tech.includes(technologyKey(value))) && (!tech.length || !entry.technologies.length || entry.technologies.some((value) => tech.includes(technologyKey(value))))).map((entry) => ({
    id: entry.id,
    domains: entry.domains,
    question: entry.investigation.questions.find((item) => item.role === "applicability")?.instruction ?? entry.conditions[0],
    authority: "Review lens only; inspect relevant code or planned operation before judgment"
  }));
}
function evaluateTriggerChecks(index) {
  return (index.triggerChecks ?? []).map((check) => {
    const ids = matchKnowledgeTriggers(index, check.signals, check.technologies).map(({ entry }) => entry.id);
    return { ...check, ids, passed: check.expectedIds.every((id4) => ids.includes(id4)) && check.forbiddenIds.every((id4) => !ids.includes(id4)) && (!check.expectEmpty || ids.length === 0) };
  });
}
function triggerPublicationFailures(index) {
  const failures = [];
  const check = (trigger, location) => {
    if (trigger.kind === "syntax" && trigger.value !== "parameter-dispatch") failures.push(`${location}: unsupported syntax trigger ${trigger.value}`);
    if (trigger.kind !== "call") return;
    const separator = trigger.value.lastIndexOf("#");
    if (separator <= 0 || separator === trigger.value.length - 1 || trigger.value.startsWith("global#") && trigger.value !== "global#fetch") {
      failures.push(`${location}: unsupported call trigger ${JSON.stringify(trigger.value)}. Use an inspected module#export (e.g. react#useEffect) or global#fetch; injected/local method meaning needs a cited semantic trigger. Matching synthetic signals alone does not validate code extraction.`);
    }
  };
  for (const entry of index.entries) for (const trigger of entry.triggers ?? []) check(trigger, entry.id);
  for (const [i, item] of (index.triggerChecks ?? []).entries()) for (const trigger of item.signals) check(trigger, `triggerChecks[${i}]`);
  return failures;
}
var ignoredWords = /* @__PURE__ */ new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "in",
  "on",
  "at",
  "to",
  "of",
  "is",
  "are",
  "a",
  "an",
  "implement",
  "approved",
  "task",
  "md",
  "please",
  "\uD604\uC7AC",
  "\uAE30\uB2A5",
  "\uBD84\uC11D",
  "\uAC1C\uC120",
  "\uD574\uC8FC\uC138\uC694"
]);
function terms(value) {
  return [...new Set(value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 1 && !ignoredWords.has(word)))];
}
function matches(token, words) {
  return words.some((word) => word === token || /[가-힣]/.test(token) && /[가-힣]/.test(word) && (word.startsWith(token) || token.startsWith(word)));
}
function searchReferenceIndex(index, query, technologies = [], limit = 5) {
  const tokens = terms(query);
  const tech = technologies.map(technologyKey);
  const candidates = index.entries.filter((entry) => {
    if (entry.routing?.mode === "deferred") return false;
    if (entry.excludedTechnologies.some((value) => tech.includes(technologyKey(value)))) return false;
    return !tech.length || !entry.technologies.length || entry.technologies.some((value) => tech.includes(technologyKey(value)));
  }).map((entry) => ({ entry, fields: {
    title: terms(entry.title),
    keywords: terms(entry.keywords.join(" ")),
    summary: terms(entry.summary),
    conditions: terms(entry.conditions.join(" ")),
    exclusions: terms(entry.exclusions.join(" ")),
    checks: terms((entry.checks ?? []).map((check) => `${check.question} ${check.guidance}`).join(" ")),
    investigation: terms(entry.investigation ? [
      ...entry.investigation.questions.map((question) => question.instruction),
      ...entry.investigation.preserve,
      entry.investigation.onMissing
    ].join(" ") : "")
  } }));
  const frequency = new Map(tokens.map((token) => [
    token,
    candidates.filter(({ fields }) => matches(token, Object.values(fields).flat())).length
  ]));
  const ranked = candidates.map(({ entry, fields }) => {
    const matchedFields = Object.fromEntries(Object.entries(fields).map(([field, words]) => [field, tokens.filter((token) => matches(token, words))]).filter(([, hits]) => hits.length));
    const matchedTerms = tokens.filter((token) => matches(token, Object.values(fields).flat()));
    const score = matchedTerms.reduce((sum, token) => sum + (matches(token, fields.title) ? 3 : matches(token, fields.keywords) ? 2 : matches(token, fields.summary) ? 1 : 0.5) * (1 + Math.log((candidates.length + 1) / ((frequency.get(token) ?? 0) + 1))), 0);
    const { sources: _sources, ...metadata } = entry;
    void _sources;
    return { ...metadata, score, matchedTerms, matchedFields, applicability: "candidate-needs-context-review" };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return ranked.filter((entry) => entry.score >= (ranked[0]?.score ?? 0) * 0.4).slice(0, Math.max(1, Math.min(20, limit)));
}
function evaluateRetrievalChecks(index) {
  return (index.retrievalChecks ?? []).map((check) => {
    const ids = searchReferenceIndex(index, check.query, check.technologies).map(({ id: id4 }) => id4);
    return { ...check, ids, passed: check.expectedIds.every((id4) => ids.includes(id4)) && check.forbiddenIds.every((id4) => !ids.includes(id4)) && (!check.expectEmpty || ids.length === 0) };
  });
}
async function readIndexedReference(root, id4, offset = 0, limit = 6e3) {
  const entry = (await readReferenceIndex(root))?.entries.find((entry2) => entry2.id === id4);
  if (!entry) throw new Error(`Unknown indexed knowledge: ${id4}`);
  const body = await confinedRead(root, entry.path);
  if (contentHash(body) !== entry.contentHash) throw new Error(`Reference changed; resync required: ${id4}`);
  const start = Math.max(0, offset);
  const end = start + Math.max(1, Math.min(12e3, limit));
  return { entry, referenceHash: contentHash(JSON.stringify(entry)), content: body.slice(start, end), totalCharacters: body.length, nextOffset: end < body.length ? end : null };
}

// src/application/project-snapshot.ts
import { join as join2 } from "node:path";
import { readFile as readFile3 } from "node:fs/promises";

// src/application/read-windows.ts
function boundReadWindows(windows, offset, budget = 24e3) {
  const sizes = new Array(windows.length);
  let remaining = budget;
  const shortestFirst = windows.map((window, index) => ({ index, length: window.content.length })).sort((a, b) => a.length - b.length);
  shortestFirst.forEach(({ index, length }, rank) => {
    sizes[index] = Math.min(length, Math.floor(remaining / (windows.length - rank)));
    remaining -= sizes[index];
  });
  return windows.map((window, index) => {
    const content = window.content.slice(0, sizes[index]);
    const end = offset + content.length;
    return { ...window, content, nextOffset: end < window.totalCharacters ? end : null };
  });
}

// src/application/project-snapshot.ts
var included = (path) => !path.split("/").includes(".frontend-system") || path === ".frontend-system/config.json";
async function projectSnapshot(root, baseRef = "main") {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(baseRef) || baseRef.includes("..")) throw new Error("Invalid base branch");
  const head = await git2(root, ["rev-parse", "--verify", "--quiet", "HEAD"]).then((value) => value.trim(), (error) => {
    if (error.code === 1 && !error.stderr?.trim() || /not a git repository/i.test(error.stderr ?? "")) return null;
    throw error;
  });
  if (!head) return { baseRef, commit: null, sourceHash: digest("[]"), files: [], manifests: {}, workingChanges: [], status: "unversioned" };
  const commit2 = (await git2(root, ["rev-parse", "--verify", `${baseRef}^{commit}`])).trim();
  const tree = (await git2(root, ["ls-tree", "-r", "-z", commit2, "--", "."])).split("\0").filter(Boolean);
  const entries = tree.map((line) => ({ path: line.slice(line.indexOf("	") + 1), object: line.slice(0, line.indexOf("	")) })).filter(({ path }) => included(path)).sort((a, b) => a.path.localeCompare(b.path));
  const files = entries.map(({ path }) => path);
  const manifests = {};
  for (const path of files.filter((path2) => /(^|\/)package\.json$/.test(path2))) {
    try {
      manifests[path] = JSON.parse(await git2(root, ["show", `${commit2}:./${path}`]));
    } catch {
      manifests[path] = { error: "Manifest could not be parsed at the base commit" };
    }
  }
  const workingChanges = [...new Set([
    ...(await git2(root, ["diff", "--name-only", "--relative", "-z", commit2, "--", "."])).split("\0"),
    ...(await git2(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", "."])).split("\0")
  ].filter((path) => path && included(path)))].sort();
  return { baseRef, commit: commit2, sourceHash: digest(JSON.stringify(entries)), files, manifests, workingChanges, status: "versioned" };
}
async function readProjectSource(root, path, expectedCommit, baseRef = "main", offset = 0, limit = 12e3) {
  const snapshot = await projectSnapshot(root, baseRef);
  if (snapshot.commit !== expectedCommit) throw new Error("Main changed; refresh project facts");
  if (!snapshot.files.includes(path)) throw new Error("Select a file from the main snapshot");
  return sourceWindow(root, path, expectedCommit, offset, limit);
}
async function readProjectSourceFile(root, path, expectedCommit, baseRef = "main") {
  const file = await readProjectSource(root, path, expectedCommit, baseRef, 0, PROJECT_SOURCE_MAX_BYTES);
  assertProjectSourceSize(file.nextOffset === null ? Buffer.byteLength(file.content) : PROJECT_SOURCE_MAX_BYTES + 1, path);
  return file;
}
async function sourceWindow(root, path, commit2, offset, limit) {
  const content = await git2(root, ["show", `${commit2}:./${path}`]);
  return { commit: commit2, path, hash: digest(content), content: content.slice(offset, offset + limit), totalCharacters: content.length, nextOffset: offset + limit < content.length ? offset + limit : null };
}
async function readProjectSources(root, paths, expectedCommit, baseRef = "main", offset = 0, limit = 6e3) {
  if (!paths.length || paths.length > 100 || new Set(paths).size !== paths.length) throw new Error("Select 1\u2013100 distinct main source paths");
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 12e3) throw new Error("Invalid source window");
  const snapshot = await projectSnapshot(root, baseRef);
  if (snapshot.commit !== expectedCommit) throw new Error("Main changed; refresh project facts");
  if (paths.some((path) => !snapshot.files.includes(path))) throw new Error("Select a file from the main snapshot");
  const files = await Promise.all(paths.slice(0, 40).map((path) => sourceWindow(root, path, expectedCommit, offset, limit)));
  return { files: boundReadWindows(files, offset), nextPaths: paths.slice(40) };
}
var metadataSchema = object({
  baseRef: string(),
  analyzedCommit: string().nullable(),
  sourceHash: string(),
  updatedAt: string(),
  analysisStatus: _enum(["partial", "complete", "legacy"]).optional()
});
var refreshSchema = object({
  baseRef: string(),
  commit: string().nullable(),
  status: _enum(["pending", "failed"]),
  reason: string(),
  updatedAt: string()
});
async function optional(path) {
  try {
    return await readFile3(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}
async function projectDocumentHash(root) {
  const content = await optional(join2(root, ".frontend-system/project.md"));
  return content ? digest(content) : null;
}
async function contextMetadata(root) {
  const content = await optional(join2(root, ".frontend-system/project.md"));
  const match = /^<!-- frontend-system-context (.+) -->$/m.exec(content);
  return match ? metadataSchema.parse(JSON.parse(match[1])) : null;
}
async function recordProjectRefresh(root, baseRef, expectedCommit, status, reason) {
  if (status === "failed" && !reason.trim()) throw new Error("Record the refresh failure reason");
  return locked(root, async () => {
    const snapshot = await projectSnapshot(root, baseRef);
    if (snapshot.commit !== expectedCommit) throw new Error("Main changed; refresh project facts");
    const record2 = refreshSchema.parse({ baseRef, commit: snapshot.commit, status, reason, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    await atomic(join2(await directory(root), "project-refresh.json"), JSON.stringify(record2));
    return record2;
  });
}
async function projectDocumentStatus(root) {
  const metadata = await contextMetadata(root);
  const refreshRaw = await optional(join2(root, ".frontend-system/project-refresh.json"));
  const refresh = refreshRaw ? refreshSchema.parse(JSON.parse(refreshRaw)) : null;
  if (!metadata && !refresh) return { status: "missing", analyzedCommit: null };
  const snapshot = await projectSnapshot(root, refresh?.baseRef ?? metadata.baseRef);
  const active = refresh && refresh.commit === snapshot.commit;
  return {
    ...metadata,
    mainCommit: snapshot.commit,
    workingChanges: snapshot.workingChanges,
    status: active ? refresh.status : !metadata ? "missing" : !snapshot.commit ? "unversioned" : snapshot.sourceHash === metadata.sourceHash ? "current" : "stale",
    ...active ? { refreshReason: refresh.reason, refreshStartedAt: refresh.updatedAt } : {}
  };
}

// src/application/knowledge/code-triggers.ts
async function inspectCode(root, paths, snapshot, includeRelations = false) {
  const compiler = (await import("./typescript-77ZD5HFR.js")).default;
  const base = await realpath3(root);
  const pinned = snapshot ? await projectSnapshot(root, snapshot.baseRef) : void 0;
  if (pinned && pinned.commit !== snapshot.expectedCommit) throw new Error("Main changed; refresh code snapshot");
  const snapshotContents = /* @__PURE__ */ new Map();
  if (pinned) {
    for (const path of [.../* @__PURE__ */ new Set([...paths, ...pinned.files.filter((path2) => /(^|\/)(?:tsconfig|jsconfig)(?:\.[^/]+)?\.json$/.test(path2))])]) {
      if (!pinned.files.includes(path) || path.split("/").some((part) => ["node_modules", ".git", ".frontend-system"].includes(part))) throw new Error("Select a source file from the pinned snapshot");
      const content = await git2(root, ["show", `${pinned.commit}:./${path}`]);
      assertProjectSourceSize(Buffer.byteLength(content), path);
      snapshotContents.set(resolve3(base, path), content);
    }
  }
  const files = await Promise.all([...new Set(paths)].sort().map(async (path) => pinned ? { absolute: resolve3(base, path), path, content: snapshotContents.get(resolve3(base, path)) } : projectFile(root, path)));
  const snapshotPaths = new Set(pinned?.files.map((path) => resolve3(base, path)));
  const system = pinned ? {
    ...compiler.sys,
    fileExists: (path) => snapshotPaths.has(resolve3(path)),
    readFile: (path) => snapshotContents.get(resolve3(path)),
    directoryExists: (path) => [...snapshotPaths].some((file) => file.startsWith(resolve3(path) + "/")),
    realpath: (path) => path
  } : compiler.sys;
  const sources = /* @__PURE__ */ new Map();
  const signals = [];
  const warnings = [];
  const imports = [];
  const hashes = {};
  const configHashes = {};
  const configCache = /* @__PURE__ */ new Map();
  const options = { allowJs: true, jsx: compiler.JsxEmit.Preserve, noLib: true, noResolve: true };
  for (const file of files) {
    hashes[file.path] = contentHash(file.content);
    signals.push({ kind: "path", value: file.path, path: file.path, line: 1, column: 1, evidence: file.path, origin: "static" });
    if (!/\.[cm]?[jt]sx?$/.test(file.path)) {
      warnings.push(`${file.path}: syntax extraction unsupported; path/host observations only`);
      continue;
    }
    const name = file.absolute.replaceAll("\\", "/");
    sources.set(name, compiler.createSourceFile(name, file.content, compiler.ScriptTarget.Latest, true));
  }
  const host = compiler.createCompilerHost(options);
  host.getSourceFile = (name) => sources.get(name.replaceAll("\\", "/"));
  host.writeFile = () => {
  };
  const program = compiler.createProgram([...sources.keys()], options, host);
  const checker = program.getTypeChecker();
  const relations = includeRelations ? relationCollector(compiler, checker, new Map(files.map((file) => [file.absolute.replaceAll("\\", "/"), file.path]))) : void 0;
  function moduleOptions(file) {
    let directory2 = dirname2(file);
    let config2;
    while (!relative3(base, directory2).startsWith("..") && !isAbsolute2(relative3(base, directory2))) {
      config2 = ["tsconfig.json", "jsconfig.json"].map((name) => resolve3(directory2, name)).find(system.fileExists);
      if (config2 || directory2 === base) break;
      directory2 = dirname2(directory2);
    }
    if (!config2) return { moduleResolution: compiler.ModuleResolutionKind.Bundler, allowJs: true };
    const cached = configCache.get(config2);
    if (cached) return cached;
    const read = (path) => {
      const body = system.readFile(path);
      if (body !== void 0) configHashes[relative3(base, path).replaceAll("\\", "/")] = contentHash(body);
      return body;
    };
    const raw = compiler.readConfigFile(config2, read);
    const parsed = compiler.parseJsonConfigFileContent(raw.config ?? {}, { ...system, readFile: read, readDirectory: () => [] }, dirname2(config2));
    for (const error of [raw.error, ...parsed.errors].filter((error2) => error2 && error2.code !== 18003)) {
      warnings.push(`${relative3(base, config2)}: ${compiler.flattenDiagnosticMessageText(error.messageText, " ")}`);
    }
    const resolvedOptions = { ...parsed.options, allowJs: true };
    configCache.set(config2, resolvedOptions);
    return resolvedOptions;
  }
  for (const file of files) {
    const source2 = sources.get(file.absolute.replaceAll("\\", "/"));
    if (!source2) continue;
    const errors = program.getSyntacticDiagnostics(source2);
    if (errors.length) {
      warnings.push(`${file.path}: parse failed; calls/imports not extracted`);
      continue;
    }
    const add = (kind, value, node) => {
      const position = source2.getLineAndCharacterOfPosition(node.getStart(source2));
      signals.push({
        kind,
        value,
        path: file.path,
        line: position.line + 1,
        column: position.character + 1,
        evidence: node.getText(source2).slice(0, 300),
        origin: "static"
      });
    };
    const visit = (node) => {
      relations?.visit(node);
      const dispatch = parameterDispatch(compiler, checker, node);
      if (dispatch) add("syntax", "parameter-dispatch", dispatch.selector);
      if (compiler.isJsxOpeningElement(node) || compiler.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source2);
        if (/^[a-z]/.test(tag) && !tag.includes(".")) {
          add("jsx-element", tag, node.tagName);
          for (const attribute of node.attributes.properties) {
            if (compiler.isJsxAttribute(attribute)) add("jsx-attribute", attribute.name.getText(source2), attribute);
          }
        }
      }
      if ((compiler.isImportDeclaration(node) || compiler.isExportDeclaration(node)) && node.moduleSpecifier && compiler.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        add("import", specifier, node);
        const resolved = compiler.resolveModuleName(specifier, file.absolute, moduleOptions(file.absolute), system).resolvedModule;
        const target = resolved?.resolvedFileName;
        imports.push({
          path: file.path,
          line: source2.getLineAndCharacterOfPosition(node.getStart(source2)).line + 1,
          specifier,
          resolvedPath: target ? relative3(base, target).replaceAll("\\", "/") : null
        });
        if (!target) warnings.push(`${file.path}: unresolved import ${specifier}`);
        if (compiler.isExportDeclaration(node)) warnings.push(`${file.path}: re-export ${specifier}; follow source before interpreting calls`);
      }
      if (compiler.isCallExpression(node)) {
        const callee = node.expression;
        const identifier = compiler.isIdentifier(callee) ? callee : compiler.isPropertyAccessExpression(callee) && compiler.isIdentifier(callee.expression) ? callee.expression : void 0;
        const declarations = identifier ? checker.getSymbolAtLocation(identifier)?.declarations ?? [] : [];
        if (compiler.isIdentifier(callee) && callee.text === "fetch" && declarations.length === 0) add("call", "global#fetch", callee);
        if (compiler.isPropertyAccessExpression(callee) && compiler.isIdentifier(callee.expression) && ["window", "globalThis"].includes(callee.expression.text) && callee.name.text === "fetch" && declarations.length === 0) add("call", "global#fetch", callee);
        for (const declaration of declarations) {
          let symbol;
          let current = declaration;
          if (compiler.isImportSpecifier(declaration) && compiler.isIdentifier(callee) && !declaration.isTypeOnly) symbol = (declaration.propertyName ?? declaration.name).text;
          if (compiler.isImportClause(declaration) && compiler.isIdentifier(callee)) symbol = "default";
          if ((compiler.isNamespaceImport(declaration) || compiler.isImportClause(declaration)) && compiler.isPropertyAccessExpression(callee)) symbol = callee.name.text;
          while (current && !compiler.isImportDeclaration(current)) current = current.parent;
          if (symbol && current && compiler.isImportDeclaration(current) && !current.importClause?.isTypeOnly && compiler.isStringLiteral(current.moduleSpecifier)) {
            add("call", `${current.moduleSpecifier.text}#${symbol}`, callee);
          }
        }
        if (callee.kind === compiler.SyntaxKind.ImportKeyword || compiler.isIdentifier(callee) && callee.text === "require") {
          warnings.push(`${file.path}: dynamic/CommonJS import requires host review`);
        }
      }
      compiler.forEachChild(node, visit);
    };
    visit(source2);
  }
  if (pinned && (await projectSnapshot(root, snapshot.baseRef)).commit !== pinned.commit) throw new Error("Main changed during inspection");
  return {
    signals,
    imports,
    hashes,
    configHashes,
    ...relations ? { relations: relations.result() } : {},
    warnings: [...new Set(warnings)],
    snapshot: snapshot ?? null,
    scope: "Selected files only; syntax facts are not domain/runtime judgments. Re-exports, dynamic imports and bundler-only aliases need host review."
  };
}

// src/application/knowledge/routing.ts
import { basename as basename2, dirname as dirname3, extname, join as join5 } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// src/application/knowledge/trigger-schema.ts
var text4 = string().trim().min(1).max(600);
var interpretationSchema = object({
  path: text4,
  line: number().int().positive(),
  column: number().int().positive().default(1),
  evidence: text4,
  signal: text4,
  interpretation: text4
});
var triggerInspectionSchema = object({
  includeRelations: boolean().optional().describe("Return up to 200 function/call/argument/dispatch facts for scoped investigation; omitted by default."),
  files: array(text4).min(1).max(40),
  technologies: array(text4).max(15).default([]),
  interpretations: array(interpretationSchema).max(40).default([]),
  snapshot: object({ baseRef: text4, expectedCommit: text4 }).optional()
});
var checkJudgmentSchema = object({
  investigation: investigationAssessmentSchema.optional(),
  itemId: string().regex(/^[a-f0-9]{64}$/),
  decision: _enum(["apply", "keep", "not-applicable", "needs-context", "needs-decision"]),
  rationale: text4,
  evidence: text4,
  evidenceLine: number().int().positive().optional(),
  verification: object({ kind: _enum(["none", "static", "test", "browser", "profiler"]), reason: text4 })
});
var triggerDiscoverySchema = object({
  query: string().max(600).default(""),
  technologies: array(text4).max(15).default([]),
  domains: array(text4).max(15).default([]),
  offset: number().int().min(0).default(0),
  limit: number().int().min(1).max(20).default(10),
  expectedHash: string().optional()
});

// src/application/knowledge/trigger-review.ts
import { join as join3 } from "node:path";
async function discoverKnowledgeTriggers(systemRoot, input) {
  const request = triggerDiscoverySchema.parse(input);
  const index = await readReferenceIndex(join3(systemRoot, "references/learned"));
  if (!index) throw new Error("Publish a knowledge index before trigger discovery");
  const hash3 = contentHash(JSON.stringify(index));
  if (request.expectedHash && request.expectedHash !== hash3) throw new Error("Knowledge changed; restart discovery");
  const technologies = request.technologies.map(technologyKey);
  const domains = new Set(index.entries.flatMap((entry) => entry.domains));
  if (request.domains.some((domain) => !domains.has(domain))) throw new Error(`Unknown domains; use: ${[...domains].sort().join(", ")}`);
  let entries = index.entries.filter((entry) => entry.triggers?.some((trigger) => trigger.kind === "semantic") && (!entry.routing || entry.routing.mode === "direct") && (!request.domains.length || entry.domains.some((domain) => request.domains.includes(domain))) && !entry.excludedTechnologies.some((value) => technologies.includes(technologyKey(value))) && (!technologies.length || !entry.technologies.length || entry.technologies.some((value) => technologies.includes(technologyKey(value)))));
  if (request.query.trim()) {
    const ids = searchReferenceIndex({ ...index, entries }, request.query, request.technologies, 20).map(({ id: id4 }) => id4);
    entries = ids.map((id4) => entries.find((entry) => entry.id === id4));
  }
  return {
    hash: hash3,
    total: entries.length,
    nextOffset: request.offset + request.limit < entries.length ? request.offset + request.limit : null,
    queryLimit: request.query.trim() ? 20 : null,
    domains: [...new Set(index.entries.filter((entry) => entry.routing?.mode === "direct").flatMap((entry) => entry.domains))].sort(),
    entries: entries.slice(request.offset, request.offset + request.limit).map((entry) => ({
      id: entry.id,
      title: entry.title,
      triggers: entry.triggers.filter((trigger) => trigger.kind === "semantic"),
      conditions: entry.conditions,
      exclusions: entry.exclusions,
      investigation: entry.investigation ? { questionCount: entry.investigation.questions.length, readWith: "read_learned_knowledge" } : null
    })),
    authority: "Discovery candidates only; read scoped code and cite evidence before emitting a semantic signal"
  };
}
function hasEvidence(content, line, evidence2) {
  return content.split(/\r?\n/).slice(line - 1, line + 9).join("\n").includes(evidence2);
}
async function inspectCodeKnowledge(projectRoot, systemRoot, input) {
  const request = triggerInspectionSchema.parse(input);
  const started = performance.now();
  const learned = join3(systemRoot, "references/learned");
  const index = await readReferenceIndex(learned);
  if (!index) throw new Error("Publish a knowledge index before trigger inspection");
  const analysis = await inspectCode(projectRoot, request.files, request.snapshot, request.includeRelations);
  const signals = [...analysis.signals];
  const semanticSignals = [...new Set(index.entries.flatMap((entry) => entry.triggers ?? []).filter((trigger) => trigger.kind === "semantic").map((trigger) => trigger.value))].sort();
  for (const observation of request.interpretations) {
    if (!semanticSignals.includes(observation.signal)) throw new Error(`Unknown semantic trigger: ${observation.signal}`);
    const file = request.snapshot ? { path: observation.path, content: (await readProjectSourceFile(projectRoot, observation.path, request.snapshot.expectedCommit, request.snapshot.baseRef)).content } : await projectFile(projectRoot, observation.path);
    if (analysis.hashes[file.path] !== contentHash(file.content)) throw new Error("Interpretation must cite a current inspected file");
    if (!hasEvidence(file.content, observation.line, observation.evidence)) throw new Error(`Interpretation evidence does not match cited lines: ${observation.path}:${observation.line}. ${quoteLocationHint(file.content, observation.evidence)}`);
    signals.push({
      kind: "semantic",
      value: observation.signal,
      path: file.path,
      line: observation.line,
      column: observation.column,
      evidence: observation.evidence,
      origin: "host"
    });
  }
  if (signals.length > 1e3) throw new Error("Too many signals; inspect a smaller file scope");
  const matches2 = matchKnowledgeTriggers(index, signals, request.technologies);
  if (matches2.length > 100) throw new Error("Too many references; narrow the file/technology scope");
  const candidates = [];
  for (const { entry, matched } of matches2) {
    const supporting = index.entries.filter((item) => item.routing?.mode === "supporting" && item.related.includes(entry.id));
    for (const reference of [entry, ...supporting]) {
      if (contentHash(await confinedRead(learned, reference.path)) !== reference.contentHash) throw new Error(`Reference changed; resync required: ${reference.id}`);
    }
    candidates.push({
      id: entry.id,
      title: entry.title,
      contentHash: entry.contentHash,
      kind: entry.kind,
      review: entry.review,
      conditions: entry.conditions,
      exclusions: entry.exclusions,
      checks: entry.checks ?? [],
      investigation: entry.investigation ?? null,
      investigationStatus: entry.investigation ? "pending" : "legacy-checklist",
      supporting: supporting.map((item) => ({ id: item.id, title: item.title, reason: item.routing.reason, readWith: "read_learned_knowledge" })),
      matches: matched,
      readWith: "read_learned_knowledge"
    });
  }
  const checklist = candidates.flatMap((candidate) => candidate.checks.flatMap((check) => {
    const locations = new Map(candidate.matches.map((signal) => [`${signal.path}:${signal.line}:${signal.column}`, signal]));
    return [...locations.values()].map((signal) => ({
      itemId: contentHash(JSON.stringify([candidate.id, check.id, signal.path, signal.line, signal.column])),
      referenceId: candidate.id,
      checkId: check.id,
      path: signal.path,
      line: signal.line,
      column: signal.column
    }));
  }));
  const payload = {
    request,
    analysis: { ...analysis, signals },
    candidates,
    checklist,
    discovery: { tool: "discover_knowledge_triggers", reason: "Use task symptoms, observed code and domain; static matches alone do not cover semantic knowledge" },
    knowledgeHash: contentHash(JSON.stringify(index)),
    authority: "Static facts and host interpretations; no automatic adoption or verification"
  };
  return { ...payload, inspectionHash: contentHash(JSON.stringify(payload)), elapsedMs: performance.now() - started };
}
async function saveKnowledgeReview(projectRoot, systemRoot, input, expectedInspectionHash, judgments, id4, expectedHash) {
  const inspection = await inspectCodeKnowledge(projectRoot, systemRoot, input);
  if (inspection.request.snapshot) throw new Error("Implementation reviews require working-tree evidence");
  if (inspection.inspectionHash !== expectedInspectionHash) throw new Error("Inspection changed; inspect code and knowledge again");
  const parsed = array(checkJudgmentSchema).max(5e3).parse(judgments);
  const byId = new Map(parsed.map((judgment2) => [judgment2.itemId, judgment2]));
  if (byId.size !== parsed.length || parsed.length !== inspection.checklist.length || inspection.checklist.some((item) => !byId.has(item.itemId))) throw new Error("Every checklist item needs exactly one judgment");
  const files = new Map(await Promise.all([...new Set(Object.keys(inspection.analysis.hashes))].map(async (path) => [path, await projectFile(projectRoot, path)])));
  for (const item of inspection.checklist) {
    const judgment2 = byId.get(item.itemId);
    const file = files.get(item.path);
    if (contentHash(file.content) !== inspection.analysis.hashes[item.path] || !hasEvidence(file.content, judgment2.evidenceLine ?? item.line, judgment2.evidence)) {
      throw new Error("Judgment evidence must match current code at the trigger location");
    }
    const reference = inspection.candidates.find((candidate) => candidate.id === item.referenceId);
    if (reference.review === "uncertain" && judgment2.decision === "apply") throw new Error("Uncertain knowledge needs further review before adoption");
    validateInvestigation(reference.investigation ?? void 0, judgment2.decision, judgment2.investigation);
    for (const citation2 of investigationCitations(judgment2.investigation)) {
      const cited = files.get(citation2.path);
      if (!cited || contentHash(cited.content) !== inspection.analysis.hashes[citation2.path] || !hasEvidence(cited.content, citation2.line, citation2.quote))
        throw new Error("Investigation citation must match the current inspected scope; include callers and contracts in files");
    }
  }
  const pending = parsed.filter((judgment2) => ["needs-context", "needs-decision"].includes(judgment2.decision));
  const record2 = {
    inspectionHash: inspection.inspectionHash,
    request: inspection.request,
    sourceHashes: inspection.analysis.hashes,
    configHashes: inspection.analysis.configHashes,
    knowledgeHash: inspection.knowledgeHash,
    checklist: inspection.checklist,
    judgments: parsed,
    warnings: inspection.analysis.warnings,
    status: pending.length ? "pending" : parsed.length ? "reviewed" : "no-matches",
    authority: "host-model-review",
    verification: "unverified; run existing project checks and policy reviews"
  };
  const saved = await saveProjectRecord(projectRoot, "evidence", id4, JSON.stringify(record2, null, 2), expectedHash);
  return { ...saved, status: record2.status, pending: pending.length, verification: record2.verification };
}

// src/application/project-facts.ts
import { join as join4, relative as relative4 } from "node:path";
var factReuseSchema = object({
  dependencies: array(localPath).min(1).max(100).describe("All local files needed for this interpretation, including callers and shared contracts. Not only its quoted line."),
  interpretations: array(interpretationSchema).min(1).max(40)
});
var factGuardSchema = object({
  hashes: record(localPath, sha256),
  configurationPathsHash: sha256,
  inventoryHash: sha256.optional(),
  signalHashes: record(string(), sha256)
});
var pathsHash = (paths) => contentHash(JSON.stringify([...new Set(paths)].sort()));
var configurationPaths = (paths) => paths.filter((path) => /(^|\/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|deno\.lock|(?:ts|js)config[^/]*\.json|[^/]*config\.[^/]+|\.eslintrc[^/]*)$/.test(path));
function semanticHashes(index) {
  const definitions = /* @__PURE__ */ new Map();
  for (const entry of index?.entries ?? []) for (const trigger of entry.triggers ?? []) {
    if (trigger.kind !== "semantic") continue;
    const values = definitions.get(trigger.value) ?? [];
    values.push(JSON.stringify([entry.id, trigger.description]));
    definitions.set(trigger.value, values);
  }
  return Object.fromEntries([...definitions].map(([signal, values]) => [signal, contentHash(JSON.stringify(values.sort()))]));
}
async function inventory(root, snapshot) {
  const paths = snapshot ? (await projectSnapshot(root, snapshot.baseRef)).files : (await new FileSystemProjectDiscovery().listFiles(root)).map((path) => relative4(root, path));
  return paths.filter((path) => !path.startsWith(".frontend-system/"));
}
async function source(root, path, snapshot) {
  if (!snapshot) return (await projectFile(root, path)).content;
  const file = await readProjectSourceFile(root, path, snapshot.expectedCommit, snapshot.baseRef);
  return file.content;
}
async function bindProjectFacts(root, systemRoot, evidence2, paths, snapshot) {
  const bindings = {};
  if (!evidence2.statements.some((item) => item.reuse)) return bindings;
  const index = await readReferenceIndex(join4(systemRoot, "references/learned"));
  if (!index) throw new Error("Publish knowledge before binding reusable facts");
  const signals = new Set(index.entries.flatMap((entry) => entry.triggers ?? []).filter((item) => item.kind === "semantic").map((item) => item.value));
  const signalHashes = semanticHashes(index);
  const inspected = new Set(evidence2.coverage.filter((item) => item.status === "inspected").map((item) => item.path));
  const configs = configurationPaths(paths);
  const contents = /* @__PURE__ */ new Map();
  const read = async (path) => {
    if (!contents.has(path)) contents.set(path, await source(root, path, snapshot));
    return contents.get(path);
  };
  for (const item of evidence2.statements) {
    if (!item.reuse) continue;
    if (!["fact", "interpretation"].includes(item.kind)) throw new Error("Only cited code facts or interpretations can emit reusable triggers");
    const dependencies = /* @__PURE__ */ new Set([...item.reuse.dependencies, ...item.evidence.map((cite) => cite.path), ...item.scope ?? []]);
    const uninspected = [...dependencies].filter((path) => !inspected.has(path));
    if (uninspected.length) throw new Error(`Statement ${item.id}: reusable fact dependencies must have inspected coverage. Missing or uninspected: ${uninspected.join(", ")}. Dependencies include reuse.dependencies, citation paths and scope. Use exact file paths, not folder names, globs or semantic labels. Inspect actual dependencies before marking coverage; do not remove necessary files just to pass.`);
    for (const cite of item.evidence) {
      if (cite.hash && contentHash(await read(cite.path)) !== cite.hash) throw new Error("Fact citation changed during dependency binding; repeat scoped inspection");
    }
    for (const interpretation of item.reuse.interpretations) {
      if (!signals.has(interpretation.signal)) throw new Error(`Unknown semantic trigger: ${interpretation.signal}`);
      if (!dependencies.has(interpretation.path)) throw new Error(`Reusable interpretation must quote a declared, inspected dependency: ${item.id}, ${interpretation.path} is not declared. Inspect and declare the dependency before reuse.`);
      const content = await read(interpretation.path);
      if (!content.split(/\r?\n/).slice(interpretation.line - 1, interpretation.line + 9).join("\n").includes(interpretation.evidence)) {
        throw new Error(`Reusable interpretation must quote a declared, inspected dependency: ${item.id}, ${interpretation.path}:${interpretation.line}. ${quoteLocationHint(content, interpretation.evidence)}`);
      }
    }
    bindings[item.id] = {
      hashes: Object.fromEntries(await Promise.all([.../* @__PURE__ */ new Set([...dependencies, ...configs])].sort().map(async (path) => [path, contentHash(await read(path))]))),
      configurationPathsHash: pathsHash(configs),
      ...item.absence ? { inventoryHash: pathsHash(paths) } : {},
      signalHashes: Object.fromEntries(item.reuse.interpretations.map((value) => [value.signal, signalHashes[value.signal]]))
    };
  }
  return bindings;
}
function createFactGuardChecker(root, systemRoot, snapshot) {
  let state;
  const hashes = /* @__PURE__ */ new Map();
  return async (guard) => {
    state ??= Promise.all([inventory(root, snapshot), readReferenceIndex(join4(systemRoot, "references/learned"))]).then(([paths2, index]) => ({ paths: paths2, signalHashes: semanticHashes(index) }));
    const { paths, signalHashes } = await state;
    const failures = [];
    if (pathsHash(configurationPaths(paths)) !== guard.configurationPathsHash) failures.push("Configuration inventory changed");
    if (guard.inventoryHash && pathsHash(paths) !== guard.inventoryHash) failures.push("Absence scope inventory changed");
    for (const [signal, hash3] of Object.entries(guard.signalHashes)) {
      if (signalHashes[signal] !== hash3) failures.push(`Knowledge trigger changed: ${signal}; reconsider saved meaning`);
    }
    for (const [path, hash3] of Object.entries(guard.hashes)) {
      try {
        if (!hashes.has(path)) hashes.set(path, source(root, path, snapshot).then(contentHash));
        if (await hashes.get(path) !== hash3) failures.push(`Fact dependency changed: ${path}`);
      } catch {
        failures.push(`Fact dependency unavailable: ${path}`);
      }
    }
    return failures;
  };
}
async function retrieveProjectFacts(root, systemRoot, record2, files, explicit = [], snapshot) {
  const selected = new Set(files);
  const matches2 = record2.statements.filter((item) => [...item.evidence.map((cite) => cite.path), ...item.scope, ...item.reuse?.dependencies ?? []].some((path) => selected.has(path)));
  const facts = [];
  const interpretations = [...explicit];
  const guards = [];
  const check = createFactGuardChecker(root, systemRoot, snapshot);
  const key = (value) => JSON.stringify([value.path, value.line, value.signal]);
  const meanings = /* @__PURE__ */ new Map();
  for (const item of matches2) for (const value of item.reuse?.interpretations ?? []) {
    const values = meanings.get(key(value)) ?? /* @__PURE__ */ new Set();
    values.add(JSON.stringify([value.evidence, value.interpretation]));
    meanings.set(key(value), values);
  }
  for (const item of matches2.slice(0, 20)) {
    const binding = record2.factBindings?.[item.id];
    const reasons = item.reuse && binding ? await check(binding) : ["No reusable dependency binding; inspect before emitting semantic triggers"];
    let reused = 0;
    if (!reasons.length && item.reuse && binding) {
      for (const interpretation of item.reuse.interpretations.filter((value) => selected.has(value.path))) {
        if (explicit.some((value) => value.path === interpretation.path && value.line === interpretation.line && value.signal === interpretation.signal)) continue;
        if ((meanings.get(key(interpretation))?.size ?? 0) > 1) {
          reasons.push("Conflicting saved interpretations; supply a current host interpretation");
          continue;
        }
        if (interpretations.some((value) => key(value) === key(interpretation))) continue;
        if (interpretations.length >= 40) {
          reasons.push("Interpretation limit reached; narrow file scope");
          break;
        }
        interpretations.push(interpretation);
        reused++;
      }
      if (reused) guards.push(binding);
    }
    facts.push({
      id: item.id,
      kind: item.kind,
      statement: item.statement,
      status: reasons.length ? "needs-review" : "current",
      reasons,
      reusedTriggers: reused,
      evidence: item.evidence.map(({ path, line, hash: hash3 }) => ({ path, line, hash: hash3 })),
      limitations: item.limitations
    });
  }
  return {
    facts,
    interpretations,
    guards,
    matched: matches2.length,
    omitted: Math.max(0, matches2.length - 20),
    authority: "Saved host interpretations, checked against declared dependencies; not a semantic proof or permission to adopt knowledge. Inspect needs-review facts and any undeclared context."
  };
}

// src/application/knowledge/routing.ts
var routingInputSchema = triggerInspectionSchema.extend({ query: string().trim().min(1).max(2e3), requirements: array(string().min(1)).max(40).optional(), factGuards: array(factGuardSchema).max(20).optional() });
function installedSystemRoot() {
  let path = dirname3(fileURLToPath(import.meta.url));
  while (!existsSync(join5(path, "references/learned/index.json"))) {
    const parent = dirname3(path);
    if (parent === path) throw new Error("Installed knowledge index not found");
    path = parent;
  }
  return path;
}
async function routeKnowledge(root, systemRoot, input) {
  const request = routingInputSchema.parse(input);
  const learned = join5(systemRoot, "references/learned");
  const index = await readReferenceIndex(learned);
  if (!index) throw new Error("Publish a knowledge index before routing");
  const checkFacts = createFactGuardChecker(root, systemRoot, request.snapshot);
  for (const guard of request.factGuards ?? []) {
    const failures = await checkFacts(guard);
    if (failures.length) throw new Error(`Saved project facts changed; refresh scoped context: ${failures.join("; ")}`);
  }
  const { elapsedMs, ...inspection } = await inspectCodeKnowledge(root, systemRoot, request);
  const scopeQuery = [...new Set(Object.keys(inspection.analysis.hashes).map((path) => basename2(path, extname(path))))].sort().join(" ").slice(0, 600);
  const requestHint = request.query.slice(0, Math.max(300, 600 - scopeQuery.length - (scopeQuery ? 1 : 0)));
  const discoveryQuery = [requestHint, scopeQuery.slice(0, Math.max(0, 599 - requestHint.length))].filter(Boolean).join(" ");
  const discovery = await discoverKnowledgeTriggers(systemRoot, {
    query: discoveryQuery,
    technologies: request.technologies
  });
  const lexical = searchReferenceIndex(index, request.query, request.technologies, 10);
  const scopeMatches = scopeQuery ? searchReferenceIndex(index, scopeQuery, request.technologies, 10) : [];
  const structureQuery = inspection.analysis.signals.some((signal) => signal.kind === "syntax" && signal.value === "parameter-dispatch") ? "\uBD84\uAE30 branch dispatch" : "";
  const structureMatches = structureQuery ? searchReferenceIndex(index, structureQuery, request.technologies, 5) : [];
  const requirements = {};
  for (const path of request.requirements ?? []) {
    const file = request.snapshot ? await readProjectSourceFile(root, path, request.snapshot.expectedCommit, request.snapshot.baseRef) : await projectFile(root, path);
    requirements[file.path] = contentHash(file.content);
  }
  const ids = [.../* @__PURE__ */ new Set([...inspection.candidates.map(({ id: id4 }) => id4), ...lexical.map(({ id: id4 }) => id4), ...scopeMatches.map(({ id: id4 }) => id4), ...structureMatches.map(({ id: id4 }) => id4)])];
  const candidates = await Promise.all(ids.map(async (id4) => {
    const { entry } = await readIndexedReference(learned, id4, 0, 1);
    return {
      id: id4,
      referenceHash: contentHash(JSON.stringify(entry)),
      contentHash: entry.contentHash,
      title: entry.title,
      review: entry.review,
      conditions: entry.conditions,
      exclusions: entry.exclusions,
      checks: entry.checks ?? [],
      investigation: entry.investigation ?? null,
      investigationStatus: entry.investigation ? "pending" : "legacy-checklist",
      reasons: [
        inspection.candidates.some((item) => item.id === id4) ? "code-trigger" : "",
        lexical.some((item) => item.id === id4) ? "request-search" : "",
        scopeMatches.some((item) => item.id === id4) ? "scope-search" : "",
        structureMatches.some((item) => item.id === id4) ? "structure-search" : ""
      ].filter(Boolean),
      readWith: "read_learned_knowledge"
    };
  }));
  const payload = {
    request,
    inspection,
    discovery,
    candidates,
    requirements,
    semanticLenses: semanticReviewLenses(index, request.technologies),
    semanticLensCoverage: "Only direct semantic-only references with investigation questions; use scoped discovery for other knowledge. This is not exhaustive code review.",
    structureSearch: {
      query: structureQuery,
      candidateCount: structureMatches.length,
      authority: "Observed syntax used for retrieval only; inspect callers and applicability. Not a defect, complete investigation or authorization."
    },
    scopeSearch: {
      query: scopeQuery,
      candidateCount: scopeMatches.length,
      authority: "File-name retrieval hints only, not semantic signals or applicable rules. Read code and reference conditions; an absent shortlist entry does not prove irrelevance."
    },
    status: candidates.length ? "candidates" : "no-matches",
    authority: "Candidate retrieval executed; applicability and domain meaning require evidence-backed review"
  };
  if (contentHash(JSON.stringify(await readReferenceIndex(learned))) !== inspection.knowledgeHash) throw new Error("Knowledge changed during routing");
  return { ...payload, hash: contentHash(JSON.stringify(payload)), elapsedMs };
}

// src/application/design-evidence.ts
import { relative as relative5 } from "node:path";

// src/application/analysis-receipts.ts
import { realpath as realpath4 } from "node:fs/promises";
var receipts = /* @__PURE__ */ new Map();
async function rememberAnalysis(root, projectHash, route) {
  const canonicalRoot = await realpath4(root);
  const id4 = contentHash(JSON.stringify([canonicalRoot, projectHash, route.hash]));
  receipts.delete(id4);
  receipts.set(id4, structuredClone({ root: canonicalRoot, projectHash, route }));
  if (receipts.size > 32) receipts.delete(receipts.keys().next().value);
  return id4;
}
async function recalledAnalysis(root, id4) {
  const receipt = receipts.get(id4);
  if (!receipt || receipt.root !== await realpath4(root)) throw new Error(`Unknown analysis context ${id4}; call get_work_context again in this project. Saved plans remain available.`);
  return structuredClone(receipt);
}

// src/application/project-decisions.ts
import { lstat, readFile as readFile4, readdir as readdir2, realpath as realpath5 } from "node:fs/promises";
import { join as join6 } from "node:path";
var statement = string().trim().min(1).max(1200);
var decisionId = string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
var projectDecisionSchema = strictObject({
  version: literal(1),
  id: decisionId,
  status: _enum(["active", "superseded"]),
  title: statement,
  decision: statement,
  confirmation: statement,
  conditions: array(statement).min(1).max(12),
  exclusions: array(statement).max(12),
  scope: array(statement).min(1).max(12),
  triggers: array(statement).min(1).max(20),
  entrypoints: array(localPath).max(20),
  preserve: array(statement).max(12),
  avoid: array(statement).max(12),
  reconsiderWhen: statement,
  verification: array(statement).min(1).max(12),
  sources: array(statement).min(1).max(12)
});
async function saveProjectDecision(root, input, expectedHash) {
  const decision = projectDecisionSchema.parse(input);
  const existing = await lstat(join6(root, ".frontend-system", "decisions", `${decision.id}.md`)).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (existing && !existing.isFile()) throw new Error("Project decision must be a regular file");
  return saveProjectRecord(root, "decisions", decision.id, JSON.stringify(decision, null, 2), expectedHash);
}
async function readProjectDecision(root, id4) {
  decisionId.parse(id4);
  const path = join6(root, ".frontend-system", "decisions", `${id4}.md`);
  if (!(await lstat(path)).isFile()) throw new Error("Project decision must be a regular file");
  const raw = (await readProjectRecord(root, "decisions", id4, 0, 1e4)).content;
  return { decision: projectDecisionSchema.parse(JSON.parse(raw)), hash: contentHash(raw) };
}
async function searchProjectDecisions(root, input) {
  const query = new Set(terms([input.request, ...input.files ?? [], ...input.technologies ?? []].join(" ")));
  const directory2 = join6(root, ".frontend-system", "decisions");
  const actual = await realpath5(directory2).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (actual && actual !== join6(await realpath5(root), ".frontend-system", "decisions")) {
    throw new Error("Project decision directory cannot traverse symlinks");
  }
  const names = await readdir2(directory2).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const candidates = [];
  let legacy = 0;
  for (const name of names.sort()) {
    if (!name.endsWith(".md") || !decisionId.safeParse(name.slice(0, -3)).success) continue;
    const info = await lstat(join6(directory2, name));
    if (!info.isFile() || info.size > 64e3) throw new Error(`Invalid project decision file: ${name}`);
    const raw = await readFile4(join6(directory2, name), "utf8");
    if (!raw.trimStart().startsWith("{")) {
      legacy++;
      continue;
    }
    const decision = projectDecisionSchema.parse(JSON.parse(raw));
    if (decision.id !== name.slice(0, -3)) throw new Error(`Decision ID does not match filename: ${name}`);
    if (decision.status !== "active") continue;
    const signals = [...decision.triggers, ...decision.scope, ...decision.entrypoints];
    const reasons = signals.filter((value) => terms(value).some((term) => query.has(term)));
    if (!reasons.length) continue;
    candidates.push({
      id: decision.id,
      title: decision.title,
      hash: contentHash(raw),
      reasons,
      conditions: decision.conditions,
      exclusions: decision.exclusions,
      entrypoints: decision.entrypoints
    });
  }
  candidates.sort((a, b) => b.reasons.length - a.reasons.length || a.id.localeCompare(b.id));
  return {
    candidates: candidates.slice(0, 12),
    legacy,
    authority: "Retrieval candidates only. Inspect the complete decision, current code and exclusions before applying."
  };
}

// src/application/design-contract.ts
function designContractFailures(evidence2, policy, issues) {
  if (!evidence2) return ["Evidence-based plans require project analysis, routing judgments and decisions"];
  const errors = [];
  const decisions = evidence2.decisions;
  if (new Set(decisions.map(({ id: id4 }) => id4)).size !== decisions.length) errors.push("Duplicate decisions");
  if (evidence2.routes.some((route) => route.judgments.some(({ decision }) => decision.startsWith("needs-")))) errors.push("Resolve pending knowledge judgments");
  for (const route of evidence2.routes) for (const item of route.judgments) {
    if (item.decision === "apply" && !decisions.some((decision) => decision.status === "resolved" && decision.knowledgeIds.includes(item.referenceId))) errors.push(`Adopted knowledge lacks a decision: ${item.referenceId}`);
  }
  for (const item of decisions) {
    if (new Set(item.options.map(({ id: id4 }) => id4)).size !== item.options.length) errors.push(`Duplicate options: ${item.id}`);
    if (item.status === "open" || item.status === "resolved" && !item.options.some(({ id: id4 }) => id4 === item.selected)) errors.push(`Unresolved decision: ${item.id}`);
    if (item.status === "excluded" && (item.ruleIds.length || item.issueIds.length || item.selected)) errors.push(`Excluded decision cannot authorize work: ${item.id}`);
    if (item.authority !== "model" && !item.confirmation) errors.push(`Missing supplied decision evidence: ${item.id}`);
    if (item.ruleIds.some((id4) => !policy?.rules.some((rule) => rule.id === id4)) || item.issueIds.some((id4) => !issues?.some((issue) => issue.id === id4))) errors.push(`Unknown contract links: ${item.id}`);
  }
  for (const rule of policy?.rules ?? []) {
    const owners = decisions.filter((item) => item.status === "resolved" && item.ruleIds.includes(rule.id));
    if (!owners.length) errors.push(`Rule lacks a decision: ${rule.id}`);
    if (rule.layer === "domain" && rule.obligation === "required" && !owners.some((item) => item.authority !== "model" && item.confirmation))
      errors.push(`Required domain rule needs supplied or established domain authority: ${rule.id}. Link the existing contract when it already specifies this outcome; otherwise keep the new outcome open. Model discretion cannot establish domain requirements.`);
  }
  const applied = new Set(evidence2.routes.flatMap((route) => route.judgments.filter((item) => item.decision === "apply").map((item) => item.referenceId)));
  for (const issue of issues ?? []) {
    if (!decisions.some((item) => item.status === "resolved" && item.issueIds.includes(issue.id))) errors.push(`Issue lacks a decision: ${issue.id}`);
    const targets = issue.implementationTargets ?? [];
    if (new Set(targets.map((item) => item.target)).size !== targets.length) errors.push(`Duplicate implementation target: ${issue.id}`);
    for (const target of targets) {
      const decision = decisions.find((item) => item.id === target.decisionId && item.status === "resolved" && item.issueIds.includes(issue.id));
      if (!decision) errors.push(`Implementation target lacks a resolved issue decision: ${issue.id}/${target.target}`);
      if (target.files.some((file) => !issue.files.includes(file))) errors.push(`Implementation target file outside issue: ${issue.id}/${target.target}`);
      for (const id4 of target.knowledgeIds) {
        if (!decision?.knowledgeIds.includes(id4) || !applied.has(id4)) errors.push(`Implementation target knowledge is not adopted: ${issue.id}/${target.target}/${id4}`);
      }
    }
  }
  return errors;
}

// src/application/design-evidence.ts
var text5 = string().trim().min(1).max(4e3);
var id3 = string().regex(/^[a-z0-9][a-z0-9._-]{0,119}$/);
var citationSchema = object({ path: localPath, line: number().int().positive(), quote: text5, hash: sha256 });
var citationInputSchema = citationSchema.extend({
  hash: sha256.optional(),
  line: citationSchema.shape.line.optional().describe("Omit for an exact quote occurring once; the server resolves its line. Repeated quotes require an explicit line.")
});
var projectEvidenceSchema = object({
  version: literal(1),
  coverage: array(object({ path: localPath, status: _enum(["inspected", "pending", "blocked", "excluded"]), reason: text5 })).min(1),
  statements: array(object({
    id: id3,
    kind: _enum(["fact", "interpretation", "user-decision", "unknown"]),
    statement: text5,
    evidence: array(citationInputSchema),
    confirmation: string().max(4e3).default("").describe("Required when kind is user-decision: copy the supplied answer. A citation or a summary alone is not confirmation."),
    absence: boolean().default(false),
    scope: array(localPath).default([]).describe("Exact inspected file paths extending the claim, e.g. src/client.ts. Not folder names, globs or semantic labels. These files also become reuse dependencies; omit when citations and reuse.dependencies already cover the claim."),
    limitations: array(text5).default([]),
    reuse: factReuseSchema.optional(),
    reuseReason: text5.optional().describe("Why this code claim cannot emit a saved semantic trigger, e.g. no applicable registered signal or an untraced dependency. Omit when reuse is supplied.")
  })).min(1)
});
var projectEvidenceInputSchema = projectEvidenceSchema.extend({ version: literal(1).default(1) }).superRefine((value, context) => {
  value.statements.forEach((item, index) => {
    if (!["fact", "interpretation"].includes(item.kind)) return;
    if (!item.reuse && !item.reuseReason) context.addIssue({
      code: "custom",
      path: ["statements", index],
      message: `Statement ${item.id}: supply reuse with inspected dependencies and registered semantic interpretations, or reuseReason explaining why no reusable trigger is justified. Do not invent a signal.`
    });
    if (item.reuse && item.reuseReason) context.addIssue({ code: "custom", path: ["statements", index], message: "Choose reuse or reuseReason, not both" });
  });
});
async function validateCitation(root, citation2, snapshot) {
  const content = snapshot ? (await readProjectSourceFile(root, citation2.path, snapshot.expectedCommit, snapshot.baseRef)).content : (await projectFile(root, citation2.path)).content;
  const hash3 = contentHash(content);
  if (!citation2.hash && !snapshot || citation2.hash && hash3 !== citation2.hash) {
    throw new Error(`Stale or invented citation: ${citation2.path}; working citations need a current context receipt or full-file hash.`);
  }
  let line = citation2.line;
  if (line === void 0) {
    const start = content.indexOf(citation2.quote);
    if (start < 0) throw new Error(`Stale or invented citation: ${citation2.path}. Use an exact quote from the inspected source.`);
    if (content.indexOf(citation2.quote, start + 1) >= 0) throw new Error(`Ambiguous citation: ${citation2.path}. Quote occurs more than once; supply its line or a longer unique quote. ${quoteLocationHint(content, citation2.quote)}`);
    line = content.slice(0, start).split(/\r?\n/).length;
  }
  if (citation2.line !== void 0 && !content.split(/\r?\n/).slice(line - 1, line + 9).join("\n").includes(citation2.quote.replace(/\r\n/g, "\n"))) {
    throw new Error(`Stale or invented citation: ${citation2.path}:${line}. ${quoteLocationHint(content, citation2.quote)} Omit line for a unique quote rather than guessing it.`);
  }
  return { ...citation2, line, hash: hash3 };
}
async function validateProjectEvidence(root, evidence2, baseRef, commit2) {
  const parsed = projectEvidenceSchema.parse(evidence2);
  const snapshot = await projectSnapshot(root, baseRef);
  if (snapshot.commit !== commit2) throw new Error("Project baseline changed");
  const inventory3 = commit2 ? snapshot.files.filter((path) => !path.startsWith(".frontend-system/")) : (await new FileSystemProjectDiscovery().listFiles(root)).map((path) => relative5(root, path)).filter((path) => !path.startsWith(".frontend-system/"));
  const covered = new Map(parsed.coverage.map((item) => [item.path, item]));
  if (covered.size !== parsed.coverage.length || inventory3.some((path) => !covered.has(path)) || parsed.coverage.some(({ path }) => !inventory3.includes(path))) throw new Error(`Coverage must account for the whole baseline inventory. Missing: ${inventory3.filter((path) => !covered.has(path)).join(", ") || "none"}; outside baseline: ${parsed.coverage.filter(({ path }) => !inventory3.includes(path)).map(({ path }) => path).join(", ") || "none"}. Working requirements are not main facts. Duplicate paths are invalid.`);
  if (new Set(parsed.statements.map(({ id: id4 }) => id4)).size !== parsed.statements.length) throw new Error("Duplicate statement IDs");
  for (const item of parsed.statements) {
    if (["fact", "interpretation"].includes(item.kind) && !item.evidence.length) throw new Error("Code claims require citations");
    if (item.kind === "user-decision" && !item.confirmation) throw new Error(`Statement ${item.id}: user-decision requires confirmation containing the supplied answer. Patch that field in the analysis draft; do not reinterpret the decision or invent consent.`);
    if (item.absence && (!item.scope.length || item.scope.some((path) => covered.get(path)?.status !== "inspected"))) throw new Error("Absence claims require an inspected scope");
    if (item.absence && !item.limitations.length) throw new Error("Absence claims must state unresolved edges and scope limitations");
    for (const citation2 of item.evidence) {
      if (covered.get(citation2.path)?.status !== "inspected") throw new Error("Citation must belong to inspected coverage");
      Object.assign(citation2, await validateCitation(root, citation2, commit2 ? { baseRef, expectedCommit: commit2 } : void 0));
    }
  }
  const factBindings = await bindProjectFacts(root, installedSystemRoot(), parsed, inventory3, commit2 ? { baseRef, expectedCommit: commit2 } : void 0);
  return {
    ...parsed,
    factBindings,
    baseRef,
    commit: commit2,
    baselineHash: commit2 ? snapshot.sourceHash : contentHash(JSON.stringify(await workingInventory(root))),
    completeness: parsed.coverage.some(({ status }) => status === "pending" || status === "blocked") ? "partial" : "accounted",
    authority: "Code citations checked; interpretation and coverage judgments belong to the host"
  };
}
async function workingInventory(root) {
  const files = await new FileSystemProjectDiscovery().listFiles(root);
  return Promise.all(files.filter((path) => !relative5(root, path).startsWith(".frontend-system/")).sort().map(async (path) => [relative5(root, path), contentHash(await readFile5(path, "utf8"))]));
}
async function readProjectEvidence(root) {
  const document = await readFile5(join7(root, ".frontend-system/project.md"), "utf8").catch((error) => {
    if (error.code === "ENOENT") throw new Error("Initial project baseline missing: inspect get_project_snapshot and save_project_context before binding a plan, then renew get_work_context. If baseline writes are prohibited, deliver an unbound draft; do not claim a saved or enforced plan.");
    throw error;
  });
  const match = /<!-- fs-project-evidence ([a-f0-9]{64}) -->/.exec(document);
  if (!match) throw new Error("Project context has no structured evidence; refresh it");
  const raw = await readFile5(join7(root, ".frontend-system/evidence", `project-${match[1]}.json`), "utf8");
  if (contentHash(raw) !== match[1]) throw new Error("Project evidence changed");
  const stored = JSON.parse(raw);
  projectEvidenceSchema.parse(stored);
  return { hash: match[1], documentHash: contentHash(document), record: stored };
}
var judgment = object({ investigation: investigationAssessmentSchema.optional().describe("Required for apply/keep/not-applicable when the candidate has an investigation specification; read its questions with read_learned_knowledge. A rationale or grouped dismissal cannot replace these findings."), referenceId: id3, decision: _enum(["apply", "keep", "not-applicable", "needs-context", "needs-decision"]), rationale: text5 });
var recordedDesignEvidenceSchema = object({
  version: literal(1),
  projectHash: sha256,
  analysisRefs: array(analysisReferenceSchema).max(100).optional(),
  projectDecisionRefs: array(object({ id: id3, hash: sha256 })).max(50).optional(),
  // Routing loads project evidence too; resolve the shared schema after ESM initialization.
  routes: array(object({ input: lazy(() => routingInputSchema), hash: sha256, judgments: array(judgment) })).min(1).max(100),
  decisions: array(object({
    id: id3,
    question: text5,
    evidence: array(citationSchema).min(1),
    knowledgeIds: array(id3),
    projectDecisionId: id3.optional(),
    options: array(object({ id: id3, description: text5, cost: text5 })).min(1),
    selected: id3.nullable(),
    status: _enum(["resolved", "open", "excluded"]),
    authority: _enum(["user", "existing", "model"]),
    confirmation: string().max(4e3).default("").describe("For a resolved user or existing decision, quote the supplied answer or established contract. Citations do not replace confirmation. Keep unanswered open choices unconfirmed; never fabricate consent."),
    rationale: text5,
    reconsiderWhen: text5,
    ruleIds: array(text5),
    issueIds: array(id3)
  })).min(1)
});
var decisionInput = recordedDesignEvidenceSchema.shape.decisions.element.omit({ status: true, selected: true }).extend({ evidence: array(citationInputSchema).min(1) });
var decisionInputSchema = decisionInput.extend({
  status: _enum(["resolved", "open", "excluded"]),
  selected: id3.nullable().default(null).describe("Required option ID for resolved; omit or null for open/excluded.")
}).superRefine((value, context) => {
  if (value.status === "resolved" !== (value.selected !== null)) context.addIssue({
    code: "custom",
    path: ["selected"],
    message: "Resolved decisions require an option ID; open/excluded decisions require null or omission."
  });
});
var designEvidenceSchema = recordedDesignEvidenceSchema.extend({
  version: literal(1).default(1),
  projectHash: sha256.optional(),
  routes: array(union([
    recordedDesignEvidenceSchema.shape.routes.element,
    strictObject({
      contextId: sha256,
      judgments: array(judgment),
      dismissed: array(strictObject({ referenceIds: array(id3).min(1), rationale: text5 })).default([])
    })
  ])).min(1).max(100),
  decisions: array(decisionInputSchema).min(1)
});
var boundEvidenceSchema = recordedDesignEvidenceSchema.extend({
  referenceHashes: record(string(), sha256),
  sourceHashes: record(string(), sha256),
  configHashes: record(string(), sha256),
  projectRecordHash: sha256,
  requirementHashes: record(string(), sha256).optional()
});
var decisionUpdatesSchema = array(strictObject({
  id: id3,
  changes: strictObject({
    status: _enum(["resolved", "open", "excluded"]).optional(),
    selected: id3.nullable().optional(),
    confirmation: text5.optional(),
    rationale: text5.optional(),
    knowledgeIds: array(id3).optional(),
    ruleIds: array(text5).optional(),
    issueIds: array(id3).optional(),
    evidence: array(citationInputSchema).min(1).optional()
  }).refine((value) => Object.keys(value).length > 0, "Supply changed fields")
})).min(1).max(100);
async function updateDesignDecisions(root, current, input, routes) {
  const updates = input ? decisionUpdatesSchema.parse(input) : [];
  const ids = new Set(updates.map((update) => update.id));
  if (ids.size !== updates.length || updates.some((update) => !current.decisions.some((decision) => decision.id === update.id))) throw new Error("Decision updates require unique existing IDs");
  const decisions = current.decisions.map((decision) => {
    const changes = updates.find((update) => update.id === decision.id)?.changes;
    if (!changes) return decision;
    const next = { ...decision, ...changes };
    if (next.authority === "user" && next.status === "resolved" && (next.selected !== decision.selected || next.status !== decision.status) && !changes.confirmation) {
      throw new Error("Changing a user selection requires the new supplied answer; previous confirmation cannot authorize it");
    }
    if (next.status !== "resolved") next.selected = null;
    if (next.status === "resolved" && !next.options.some((option) => option.id === next.selected)) throw new Error("Selection must identify an existing decision option");
    return next;
  });
  return bindDesignEvidence(root, designEvidenceSchema.parse({ ...current, ...routes ? { routes } : {}, decisions }));
}
async function bindDesignEvidence(root, input, systemRoot = installedSystemRoot()) {
  const parsed = designEvidenceSchema.parse(input);
  const projectDecisionRefs = new Map(parsed.projectDecisionRefs?.map((item) => [item.id, item.hash]) ?? []);
  if (projectDecisionRefs.size !== (parsed.projectDecisionRefs?.length ?? 0)) throw new Error("Duplicate project decision references");
  for (const decision of parsed.decisions.filter((item) => item.projectDecisionId)) {
    const expected = projectDecisionRefs.get(decision.projectDecisionId);
    if (!expected || decision.authority !== "existing" || decision.status !== "resolved") throw new Error(`Invalid project decision adoption: ${decision.id}`);
    const source2 = await readProjectDecision(root, decision.projectDecisionId);
    if (source2.hash !== expected || source2.decision.status !== "active" || !source2.decision.confirmation.includes(decision.confirmation) || !decision.confirmation.trim()) {
      throw new Error(`Project decision changed or confirmation was not preserved: ${decision.projectDecisionId}`);
    }
  }
  if ([...projectDecisionRefs.keys()].some((key) => !parsed.decisions.some((decision) => decision.projectDecisionId === key))) {
    throw new Error("Project decision references need an adopting plan decision");
  }
  const analysisErrors = await validateAnalysisReferences(root, systemRoot, parsed.analysisRefs ?? [], true);
  if (analysisErrors.length) throw new Error(analysisErrors.join("; "));
  const issueIds = new Set(parsed.decisions.flatMap((d) => d.issueIds));
  if (parsed.analysisRefs?.some((r) => r.issueIds.some((id4) => !issueIds.has(id4)))) throw new Error("Analysis references must link to decision-owned issue IDs");
  const project = await readProjectEvidence(root);
  const routes = await Promise.all(parsed.routes.map(async (route) => {
    if (!("contextId" in route)) {
      if (!parsed.projectHash) throw new Error("Legacy route input requires projectHash; prefer contextId from get_work_context");
      return route;
    }
    const receipt = await recalledAnalysis(root, route.contextId);
    if (receipt.projectHash !== project.documentHash) throw new Error("Project document changed; call get_work_context after saving project context");
    return { input: receipt.route.request, hash: receipt.route.hash, judgments: [
      ...route.judgments,
      ...route.dismissed.flatMap(({ referenceIds, rationale }) => referenceIds.map((referenceId) => ({ referenceId, decision: "not-applicable", rationale, investigation: void 0 })))
    ] };
  }));
  if (parsed.projectHash && project.documentHash !== parsed.projectHash) throw new Error("Project document changed; reread before designing");
  const references = {}, sources = {}, configs = {}, requirements = {};
  for (const route of routes) {
    if (route.input.snapshot) throw new Error("Plan routes must inspect the current working tree");
    const current = await routeKnowledge(root, systemRoot, route.input);
    if (current.hash !== route.hash) throw new Error("Routing evidence changed; repeat scoped analysis");
    const choices = new Map(route.judgments.map((item) => [item.referenceId, item]));
    if (choices.size !== route.judgments.length || choices.size !== current.candidates.length || current.candidates.some(({ id: id4 }) => !choices.has(id4))) throw new Error(`Review every retrieved candidate exactly once. Missing: ${current.candidates.filter(({ id: id4 }) => !choices.has(id4)).map(({ id: id4 }) => id4).join(", ") || "none"}; unknown: ${[...choices.keys()].filter((id4) => !current.candidates.some((candidate) => candidate.id === id4)).join(", ") || "none"}. Duplicated judgments are invalid; explicit grouped dismissals are allowed.`);
    for (const candidate of current.candidates) {
      if (candidate.review === "uncertain" && choices.get(candidate.id).decision === "apply") throw new Error("Uncertain knowledge cannot be adopted");
      const { entry } = await readIndexedReference(join7(systemRoot, "references/learned"), candidate.id, 0, 1);
      const choice = choices.get(candidate.id);
      try {
        validateInvestigation(entry.investigation, choice.decision, choice.investigation);
      } catch (error) {
        throw new Error(`Candidate ${candidate.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
      for (const citation2 of investigationCitations(choice.investigation)) {
        const hash3 = current.inspection.analysis.hashes[citation2.path] ?? current.requirements[citation2.path] ?? route.input.factGuards?.find((guard) => citation2.path in guard.hashes)?.hashes[citation2.path];
        if (!hash3) throw new Error(`Investigation must cite routed source or pinned requirement: ${citation2.path}`);
        await validateCitation(root, { ...citation2, hash: hash3 });
      }
      references[candidate.id] = contentHash(JSON.stringify(entry));
    }
    Object.assign(sources, current.inspection.analysis.hashes);
    for (const guard of route.input.factGuards ?? []) Object.assign(sources, guard.hashes);
    Object.assign(configs, current.inspection.analysis.configHashes);
    Object.assign(requirements, current.requirements);
  }
  for (const decision of parsed.decisions) {
    for (const citation2 of decision.evidence) {
      const inspectedHash = sources[citation2.path] ?? requirements[citation2.path];
      if (!inspectedHash || citation2.hash && inspectedHash !== citation2.hash) throw new Error(`Decision must cite routed source or a pinned requirement: ${citation2.path}. Add code to get_work_context.files, or documents to requirements. Then pass the new contextId and explicit candidate judgments in save_revision.evidenceRoutes alongside decisionUpdates (or replace evidence). Refreshing context alone does not change stored routes. Include all sources/documents still cited by retained decisions. Available: ${Object.keys({ ...sources, ...requirements }).join(", ")}`);
      citation2.hash = inspectedHash;
      Object.assign(citation2, await validateCitation(root, citation2));
    }
    if (decision.knowledgeIds.some((id4) => !references[id4])) throw new Error("Decision references unrouted knowledge");
  }
  return boundEvidenceSchema.parse({ ...parsed, projectHash: project.documentHash, routes, referenceHashes: references, sourceHashes: sources, configHashes: configs, requirementHashes: requirements, projectRecordHash: project.hash });
}
async function evidenceFreshness(root, evidence2, checkSources, systemRoot = installedSystemRoot()) {
  const errors = await validateAnalysisReferences(root, systemRoot, evidence2.analysisRefs ?? [], checkSources);
  for (const ref of evidence2.projectDecisionRefs ?? []) {
    try {
      const current = await readProjectDecision(root, ref.id);
      if (current.hash !== ref.hash || current.decision.status !== "active") errors.push(`Linked project decision changed: ${ref.id}`);
    } catch {
      errors.push(`Linked project decision unavailable: ${ref.id}`);
    }
  }
  const checkFacts = createFactGuardChecker(root, systemRoot);
  if (checkSources) for (const route of evidence2.routes) for (const guard of route.input.factGuards ?? []) {
    errors.push(...await checkFacts(guard));
  }
  try {
    const project = await readProjectEvidence(root);
    if (project.documentHash !== evidence2.projectHash || project.hash !== evidence2.projectRecordHash) errors.push("Project explanation changed; review linked decisions");
    const snapshot = await projectSnapshot(root, project.record.baseRef);
    const baselineHash = snapshot.commit ? snapshot.sourceHash : contentHash(JSON.stringify(await workingInventory(root)));
    if ((snapshot.commit || checkSources) && baselineHash !== project.record.baselineHash) errors.push("Project baseline changed; refresh explanation");
    const scoped = new Set(evidence2.routes.flatMap(({ input }) => input.files));
    if (project.record.coverage.some(({ path, status }) => scoped.has(path) && ["pending", "blocked"].includes(status))) errors.push("Plan scope contains unreviewed project areas");
  } catch (error) {
    errors.push(String(error));
  }
  for (const [id4, hash3] of Object.entries(evidence2.referenceHashes)) {
    try {
      if (contentHash(JSON.stringify((await readIndexedReference(join7(systemRoot, "references/learned"), id4, 0, 1)).entry)) !== hash3) errors.push(`Linked knowledge changed: ${id4}`);
    } catch {
      errors.push(`Linked knowledge unavailable: ${id4}`);
    }
  }
  for (const [path, hash3] of Object.entries({ ...evidence2.requirementHashes, ...checkSources ? { ...evidence2.sourceHashes, ...evidence2.configHashes } : {} })) {
    try {
      if (contentHash(await readFile5(join7(root, path), "utf8")) !== hash3) errors.push(`Analysis source changed: ${path}`);
    } catch {
      errors.push(`Analysis source missing: ${path}`);
    }
  }
  return errors;
}

// src/application/workflow-store.ts
var recordId = string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
var digest = (value) => createHash3("sha256").update(value).digest("hex");
var hash2 = string().regex(/^[a-f0-9]{64}$/);
var checksSchema = array(object({
  capability: string(),
  command: string(),
  passed: boolean(),
  output: string(),
  status: _enum(["passed", "failed", "not-run"]),
  workingDirectory: string().optional(),
  reason: string().optional()
}));
var issueSchema = strictObject({
  id: recordId,
  title: string().min(1),
  contract: string().min(1).describe("One domain flow expressible as a sequence diagram: initiating event, preconditions, participants/ordered calls, state/cache changes, success/error outcomes and exclusions. Keep UI/service/storage/tests together; separate independent domain outcomes. Name adopted visualization scenario IDs when present."),
  implementationTargets: array(strictObject({
    target: string().trim().min(1).describe("Planned function, component, service or boundary; not a claim that code already exists"),
    files: array(localPath).min(1),
    decisionId: recordId,
    knowledgeIds: array(recordId),
    flowTarget: object({ flowId: analysisId, nodeId: analysisId, contractName: string().trim().min(1) }).optional(),
    instruction: string().trim().min(1).describe("Concrete implementation instruction derived from the decision and applicable knowledge"),
    verification: string().trim().min(1).describe("Observable test, static check or scoped semantic review"),
    noKnowledgeReason: string().trim().min(1).optional().describe("Required when no learned reference applies after prospective search")
  }).superRefine((target, context) => {
    if (!target.knowledgeIds.length && !target.noKnowledgeReason) context.addIssue({ code: "custom", path: ["noKnowledgeReason"], message: "Explain the prospective knowledge search when no learned reference applies" });
    if (target.knowledgeIds.length && target.noKnowledgeReason) context.addIssue({ code: "custom", path: ["noKnowledgeReason"], message: "Omit noKnowledgeReason when knowledge is linked" });
  })).min(1).optional().describe("Prospective knowledge coverage for planned behavior-bearing boundaries. Existing plans may omit this legacy-compatible field."),
  testCases: array(strictObject({
    id: recordId,
    given: string().trim().min(1),
    when: string().trim().min(1),
    then: string().trim().min(1),
    method: _enum(["unit", "integration", "e2e", "manual"]),
    files: array(localPath).min(1),
    flowId: analysisId.optional(),
    scenarioId: analysisId.optional()
  })).min(1).optional().describe("Approved test intent for this domain flow. Version 3 runs tests through implementation and reviews evidence afterward; version 2 retains the test-code feedback checkpoint."),
  files: array(localPath),
  dependsOn: array(recordId),
  requiredCheckIds: array(string()),
  acceptance: array(string().min(1)).min(1)
});
var issuesSchema = array(issueSchema).min(1);
var executionObject = strictObject({
  revisionHash: hash2,
  status: _enum(["in-progress", "blocked", "complete"]),
  baselineCheckId: recordId.optional(),
  finalCheckId: recordId.optional(),
  kind: _enum(["setup", "implement", "refactor", "verify"]).optional(),
  steps: array(strictObject({
    id: recordId,
    title: string().min(1),
    status: _enum(["pending", "running", "blocked", "complete"]),
    files: array(string()),
    checkIds: array(recordId),
    remaining: array(string()),
    dependsOn: array(recordId).optional(),
    requiredCheckIds: array(string()).optional(),
    reviewIds: array(recordId).optional(),
    attemptId: recordId.optional(),
    testReview: strictObject({
      status: _enum(["pending", "approved"]),
      revisionHash: hash2,
      confirmation: string(),
      files: array(strictObject({ path: localPath, hash: hash2 })).min(1)
    }).optional().describe("Test-first checkpoint: exact reviewed test/fixture/instruction file hashes and actual user feedback. Approval concerns tests, not product completion."),
    caseEvidence: array(strictObject({
      caseId: recordId,
      checkId: recordId.optional(),
      testName: string().trim().min(1).optional(),
      reviewId: recordId.optional()
    })).optional(),
    implementationReview: strictObject({ sourceHash: hash2, confirmation: string().trim().min(1) }).optional()
  })).min(1),
  note: string()
});
var executionSchema = executionObject.refine((value) => new Set(value.steps.map((step) => step.id)).size === value.steps.length, "Duplicate step IDs");
var executionInputSchema = executionObject.extend({
  steps: array(executionSchema.shape.steps.element.partial({
    title: true,
    files: true
  })).min(1)
});
var revisionSchema = object({
  version: number().int().positive(),
  hash: hash2,
  approved: boolean(),
  approval: string(),
  policy: policySchema.optional(),
  issues: issuesSchema.optional(),
  // Evidence and storage call each other at runtime; defer schema lookup until parsing.
  contractVersion: union([literal(2), literal(3)]).optional(),
  evidence: lazy(() => boundEvidenceSchema).optional()
});
var executionRecordSchema = object({
  execution: executionSchema,
  fileHashes: record(string(), string()),
  updatedAt: string(),
  requiresRevalidation: boolean().optional()
});
var checkRecordSchema = object({
  id: recordId,
  planId: recordId.nullable().optional(),
  stage: _enum(["baseline", "issue", "delivery"]).optional(),
  purpose: _enum(["baseline", "verification"]),
  revisionHash: hash2.nullable(),
  sourceHash: hash2,
  stable: boolean(),
  full: boolean(),
  results: checksSchema,
  createdAt: string(),
  attemptId: recordId.optional(),
  coverage: object({
    requiredScripts: array(string()),
    missingOrFailedScripts: array(string()),
    allRequiredPassed: boolean()
  }).optional()
});
async function optional2(path) {
  try {
    return await readFile6(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}
async function directory(root, child = "") {
  const base = join8(resolve4(root), ".frontend-system");
  const path = join8(base, child);
  await mkdir(base, { recursive: true });
  const actualRoot = await realpath6(root);
  if (await realpath6(base) !== join8(actualRoot, ".frontend-system")) {
    throw new Error("Project records must not traverse symbolic links");
  }
  await mkdir(path, { recursive: true });
  if (await realpath6(path) !== join8(actualRoot, ".frontend-system", child)) throw new Error("Project records must not traverse symbolic links");
  return path;
}
async function atomic(path, content) {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, content, { flag: "wx" });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}
async function locked(root, action) {
  const lock = join8(await directory(root), ".workflow-lock");
  await mkdir(lock);
  try {
    return await action();
  } finally {
    await rm(lock, { recursive: true });
  }
}
async function sourceSnapshot(root) {
  const snapshot = {};
  for (const path of await new FileSystemProjectDiscovery().listFiles(root)) {
    snapshot[relative6(root, path)] = createHash3("sha256").update(await readFile6(path)).digest("hex");
  }
  return snapshot;
}
function scope(planId) {
  return planId === void 0 ? "" : `plans/${recordId.parse(planId)}`;
}
async function planDirectory(root, child, planId) {
  if (planId !== void 0) {
    await directory(root, "plans");
    await directory(root, scope(planId));
  }
  return directory(root, [scope(planId), child].filter(Boolean).join("/"));
}
async function listPlans(root) {
  let entries;
  try {
    entries = await readdir3(join8(root, ".frontend-system/plans"), { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(entries.filter((entry) => entry.isDirectory() && recordId.safeParse(entry.name).success).sort((a, b) => a.name.localeCompare(b.name)).map(async ({ name: id4 }) => {
    const revision = await readRevision(root, id4);
    return {
      id: id4,
      path: join8(root, ".frontend-system", scope(id4), "plan.md"),
      version: revision.version,
      hash: revision.hash,
      approved: revision.approved
    };
  }));
}
async function readRevision(root, planId) {
  const content = await optional2(join8(root, ".frontend-system", scope(planId), planId ? "plan.md" : "revision.md"));
  const raw = await optional2(join8(root, ".frontend-system", scope(planId), "revision.json"));
  const metadata = raw ? revisionSchema.parse(JSON.parse(raw)) : void 0;
  const currentHash = content ? revisionDigest(content, metadata?.policy, metadata?.issues, planId, metadata?.version, metadata?.contractVersion, metadata?.evidence) : null;
  return {
    planId: planId ?? null,
    content,
    hash: currentHash,
    version: metadata?.version ?? 0,
    approved: !!metadata?.approved && metadata.hash === currentHash,
    drifted: !!metadata && metadata.hash !== currentHash,
    policy: metadata?.policy,
    issues: metadata?.issues,
    contractVersion: metadata?.contractVersion,
    evidence: metadata?.evidence,
    evidenceStatus: metadata?.contractVersion ? metadata.evidence ? "recorded" : "missing" : "legacy"
  };
}
function revisionDigest(content, policy, issues, planId, version, contractVersion, evidence2) {
  return digest(policy || issues || planId ? JSON.stringify({ content, policy, issues, planId, ...planId ? { version } : {}, ...contractVersion ? { contractVersion, evidence: evidence2 } : {} }) : content);
}
async function saveRevision(root, content, expectedHash, policy, planId, issues, evidence2, decisionUpdates, evidenceRoutes, workflowVersion) {
  return locked(root, async () => {
    const current = await readRevision(root, planId);
    if (current.hash !== expectedHash) throw new Error("Revision changed; reread before saving");
    content ??= current.content;
    if (!content.trim()) throw new Error("Revision must not be empty; supply content for a new plan");
    const version = current.version + 1;
    if ((decisionUpdates || evidenceRoutes) && (evidence2 || !current.evidence)) throw new Error("Decision/route updates require existing evidence and cannot accompany evidence replacement");
    const nextEvidence = decisionUpdates || evidenceRoutes ? await updateDesignDecisions(root, current.evidence, decisionUpdates, evidenceRoutes) : evidence2 ? await bindDesignEvidence(root, evidence2) : current.evidence;
    let nextPolicy = current.policy;
    if (policy !== void 0) {
      const input = policyInputSchema.parse(policy);
      const discovery = new FileSystemProjectDiscovery();
      const profile = await discovery.discover(await discovery.createRef(root));
      const files = await sourceSnapshot(root);
      const declaredCheckAssets = [...new Set(input.checks.flatMap((check) => check.guardPaths ?? []))].filter((path) => !input.guards.some((guard) => guard.path === path));
      nextPolicy = policySchema.parse({
        ...input,
        rules: input.rules.map((rule) => ({ ...rule, evidence: rule.evidence ?? nextEvidence?.decisions.filter((decision) => decision.ruleIds.includes(rule.id)).map((decision) => `Decision ${decision.id} [${decision.status}]: ${decision.rationale}; ${decision.evidence.map((cite) => `${cite.path}:${cite.line}`).join(", ")}`) ?? [] })),
        checks: input.checks.map((check) => {
          const command = check.command ?? profile.scripts[check.script];
          if (!command) throw new Error(`Missing required script: ${check.script}. Available scripts: ${Object.keys(profile.scripts).sort().join(", ") || "(none)"}. Inspect actual capabilities; keep unimplemented verification setup explicit and do not claim a check exists or passed.`);
          return { ...check, command };
        }),
        guards: [...input.guards, ...declaredCheckAssets.map((path) => ({ path, hash: files[path] }))].map((guard) => {
          const hash3 = guard.hash ?? files[guard.path];
          if (!hash3) throw new Error(`Missing verification asset: ${guard.path}`);
          return { ...guard, hash: hash3 };
        })
      });
    }
    const nextIssues = issues === void 0 ? current.issues : issuesSchema.parse(issues);
    if (workflowVersion === 2 && current.contractVersion === 3) throw new Error("Cannot downgrade a continuous-work revision");
    const contractVersion = workflowVersion ?? current.contractVersion ?? (evidence2 || planId && !current.version ? 3 : void 0);
    if (planId && (!nextPolicy || !nextIssues)) throw new Error("Named plans require a verification policy and issue contracts");
    if (nextIssues) validateIssues(nextIssues, nextPolicy);
    if (nextEvidence && nextIssues) await validatePlanFlows(root, nextEvidence, nextIssues);
    if (nextIssues?.some((issue) => issue.testCases?.some((item) => item.flowId))) {
      const { getProjectAnalysis: getProjectAnalysis2 } = await import("./project-flows-IUEYFASR.js");
      const { installedSystemRoot: installedSystemRoot2 } = await import("./routing-XIF4XXAG.js");
      for (const item of nextIssues.flatMap((issue) => issue.testCases ?? []).filter((item2) => item2.flowId)) {
        const ref = nextEvidence?.analysisRefs?.find((ref2) => ref2.kind === "flow" && ref2.id === item.flowId);
        if (!ref) throw new Error(`Test case ${item.id} requires a pinned flow reference`);
        const found = (await getProjectAnalysis2(root, installedSystemRoot2(), { kind: "flow", ids: [item.flowId], full: true })).records[0];
        if (!found || found.hash !== ref.hash || !flowSchema.parse(found.data).scenarios.some((scenario) => scenario.id === item.scenarioId)) {
          throw new Error(`Test case ${item.id} references an unknown or changed flow scenario`);
        }
      }
    }
    if (planId) {
      const marker = "\n<!-- fs-issue-contracts -->\n";
      const design = content.includes(marker) ? content.slice(0, content.indexOf(marker)) : content;
      content = `${design.trimEnd()}${marker}
## Issue contracts

Progress: [progress.md](progress.md). AI references: [plan.ai.md](plan.ai.md).

${nextIssues.map(
        (issue) => `### ${issue.id}: ${issue.title}

${issue.contract}

- Files: ${issue.files.join(", ")}
- Depends on: ${issue.dependsOn.join(", ") || "none"}
- Required checks: ${issue.requiredCheckIds.join(", ")}

Acceptance:
${issue.acceptance.map((item) => `- ${item}`).join("\n")}
` + (issue.implementationTargets ? `
Planned implementation boundaries:
${issue.implementationTargets.map((target) => `- **${target.target}** (${target.files.join(", ")}): ${target.instruction} Knowledge: ${target.knowledgeIds.join(", ") || `none (${target.noKnowledgeReason})`}. Decision: ${target.decisionId}.${target.flowTarget ? ` Flow: ${target.flowTarget.flowId}/${target.flowTarget.nodeId}/${target.flowTarget.contractName}.` : ""} Verify: ${target.verification}`).join("\n")}
` : "") + (issue.testCases ? `
Test cases:
${issue.testCases.map((item) => `- **${item.id}** (${item.method})${item.flowId ? ` [${item.flowId}/${item.scenarioId}]` : ""} \u2014 Given: ${item.given}; When: ${item.when}; Then: ${item.then}. Files: ${item.files.join(", ")}`).join("\n")}
` : "")
      ).join("\n")}`;
      if (nextEvidence) content += `
## Decisions and evidence

Project: ${nextEvidence.projectHash}

${nextEvidence.decisions.map((item) => `- ${item.id} [${item.status}, ${item.authority}]: ${item.question}
  Choice: ${item.selected ?? "none"} \u2014 ${item.rationale}
  Options: ${item.options.map((option) => `${option.id}: ${option.description} (cost: ${option.cost})`).join("; ")}
  Evidence: ${item.evidence.map((cite) => `${cite.path}:${cite.line}`).join(", ")}; knowledge: ${item.knowledgeIds.join(", ") || "none"}
  Confirmation: ${item.confirmation || "not supplied"}
  Rules: ${item.ruleIds.join(", ")}; issues: ${item.issueIds.join(", ")}
  Reconsider: ${item.reconsiderWhen}`).join("\n\n")}
`;
    }
    const nextHash = revisionDigest(content, nextPolicy, nextIssues, planId, version, contractVersion, nextEvidence);
    const base = await planDirectory(root, "", planId);
    const history = await planDirectory(root, "revisions", planId);
    const previousMetadata = await optional2(join8(base, "revision.json"));
    if (previousMetadata) await atomic(join8(history, `approval-${current.version}.json`), previousMetadata);
    if (current.content) await atomic(join8(history, `${current.hash}.md`), current.content);
    await atomic(join8(history, `${nextHash}.md`), content);
    await atomic(join8(base, planId ? "plan.md" : "revision.md"), content);
    await atomic(join8(base, "revision.json"), JSON.stringify({ version, hash: nextHash, approved: false, approval: "", policy: nextPolicy, issues: nextIssues, contractVersion, evidence: nextEvidence }));
    if (planId) {
      const index = {
        planId,
        version,
        revisionHash: nextHash,
        source: "revision.json",
        human: "plan.md",
        progress: "progress.md",
        issues: nextIssues.map((issue) => ({
          id: issue.id,
          title: issue.title,
          dependsOn: issue.dependsOn,
          testCaseIds: issue.testCases?.map((item) => item.id) ?? [],
          requiredCheckIds: issue.requiredCheckIds
        })),
        analysisRefs: nextEvidence?.analysisRefs ?? [],
        openDecisionIds: nextEvidence?.decisions.filter((item) => item.status === "open").map((item) => item.id) ?? []
      };
      await atomic(join8(base, "plan.ai.md"), `# Plan reference index

Generated from the same revision as plan.md. This index is not approval.
Check get_workflow_context for the current revision/approval before editing; use get_revision(detail: contract) for issue/check contracts and detail: decisions only when their evidence is needed. Reuse an already read unchanged contract. Do not load HTML or duplicate human prose as implementation input.

\`\`\`json
${JSON.stringify(index)}
\`\`\`
`);
    }
    return readRevision(root, planId);
  });
}
async function approveRevision(root, expectedHash, approval, planId) {
  if (!approval.trim()) throw new Error("Record the user's explicit approval");
  return locked(root, async () => {
    const current = await readRevision(root, planId);
    if (!current.version || current.drifted || current.hash !== expectedHash) throw new Error("Save and review the current revision before approval");
    await requireDesignEvidence(root, current, true);
    const discovery = new FileSystemProjectDiscovery();
    const failures = current.policy ? policyFailures(
      current.policy,
      (await discovery.discover(await discovery.createRef(root))).scripts,
      await sourceSnapshot(root)
    ) : [];
    if (failures.length) throw new Error(failures.join("; "));
    await atomic(join8(await planDirectory(root, "", planId), "revision.json"), JSON.stringify({
      version: current.version,
      hash: current.hash,
      approved: true,
      approval,
      policy: current.policy,
      issues: current.issues,
      contractVersion: current.contractVersion,
      evidence: current.evidence
    }));
    return readRevision(root, planId);
  });
}
async function requireDesignEvidence(root, revision, checkSources) {
  if (!revision.contractVersion) return;
  const failures = designContractFailures(revision.evidence, revision.policy, revision.issues);
  if (revision.evidence) failures.push(...await evidenceFreshness(root, revision.evidence, checkSources));
  if (failures.length) throw new Error(failures.join("; "));
  if (revision.evidence && revision.issues) await validatePlanFlows(root, revision.evidence, revision.issues);
}
async function validatePlanFlows(root, evidence2, issues) {
  const { readPinnedFlow: readPinnedFlow2 } = await import("./project-flows-IUEYFASR.js");
  const { validateFlowPlan } = await import("./flow-contracts-Z7YRYNMA.js");
  for (const issue of issues) for (const target of issue.implementationTargets ?? []) {
    if (target.flowTarget && !evidence2.analysisRefs?.some((r) => r.kind === "flow" && r.id === target.flowTarget.flowId && r.issueIds.includes(issue.id)))
      throw new Error(`Implementation target requires an issue-linked flow: ${target.target}`);
  }
  for (const ref of evidence2.analysisRefs?.filter((r) => r.kind === "flow") ?? [])
    validateFlowPlan(await readPinnedFlow2(root, ref.id, ref.hash), evidence2, issues);
}
async function saveProjectRecord(root, kind, id4, content, expectedHash) {
  recordId.parse(id4);
  if (!content.trim()) throw new Error("Record must not be empty");
  return locked(root, async () => {
    const path = join8(await directory(root, kind), `${id4}.md`);
    const previous = await optional2(path);
    if ((previous ? digest(previous) : null) !== expectedHash) throw new Error("Record changed; reread before saving");
    await atomic(path, content);
    return { path, hash: digest(content) };
  });
}
async function readProjectRecord(root, kind, id4, offset = 0, limit = 200) {
  recordId.parse(id4);
  const content = await optional2(join8(root, ".frontend-system", kind, `${id4}.md`));
  if (!content) throw new Error("Record not found");
  const lines = content.split("\n");
  return { hash: digest(content), content: lines.slice(offset, offset + limit).join("\n"), totalLines: lines.length, nextOffset: offset + limit < lines.length ? offset + limit : null };
}
async function workflowContext(root, planId) {
  const revision = await readRevision(root, planId);
  const records = [];
  for (const kind of ["evidence", "decisions"]) {
    const path = join8(root, ".frontend-system", kind);
    try {
      for (const name of (await readdir3(path)).sort()) {
        if (name.endsWith(".md")) records.push({ kind, id: name.slice(0, -3), path: join8(path, name) });
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const raw = await optional2(join8(root, ".frontend-system", scope(planId), "execution.json"));
  const saved = raw ? executionRecordSchema.parse(JSON.parse(raw)) : void 0;
  const current = saved ? await sourceSnapshot(root) : void 0;
  const changedFiles2 = saved && current ? [.../* @__PURE__ */ new Set([...Object.keys(current), ...Object.keys(saved.fileHashes)])].filter((path) => current[path] !== saved.fileHashes[path]).sort() : [];
  const protectionFailures = revision.policy ? policyProtectionFailures(revision.policy) : [];
  if (revision.contractVersion) {
    protectionFailures.push(...designContractFailures(revision.evidence, revision.policy, revision.issues));
    if (revision.evidence) protectionFailures.push(...await evidenceFreshness(root, revision.evidence, false));
  }
  const needsRevalidation = !!saved && (saved.requiresRevalidation === true || changedFiles2.length > 0 || saved.execution.revisionHash !== revision.hash || !revision.approved || protectionFailures.length > 0);
  return {
    revision: { ...revision, content: revision.content.slice(0, 12e3), truncated: revision.content.length > 12e3 },
    records,
    execution: saved?.execution ?? null,
    executionHash: raw ? digest(raw) : null,
    changedSinceCheckpoint: changedFiles2,
    revisionChangedSinceCheckpoint: !!saved && saved.execution.revisionHash !== revision.hash,
    needsRevalidation,
    verification: {
      status: protectionFailures.length ? "blocked" : needsRevalidation ? "stale" : saved?.execution.status !== "complete" ? "unverified" : revision.policy ? "verified" : "legacy",
      failures: protectionFailures,
      sourceHash: current ? digest(JSON.stringify(current)) : null,
      revisionHash: revision.hash,
      finalCheckId: saved?.execution.finalCheckId ?? null,
      // IDs identify the approved scope, not an assertion of correctness outside it.
      requiredRuleIds: revision.policy?.rules.filter((rule) => rule.obligation === "required").map((rule) => rule.id) ?? [],
      reviewIds: saved?.execution.steps.flatMap((step) => step.reviewIds ?? []) ?? []
    },
    enforcement: revision.policy ? "policy" : "legacy"
  };
}
async function saveCheckRecord(root, record2, planId) {
  const validated = checkRecordSchema.parse(record2);
  const path = join8(await planDirectory(root, "checks", planId), `${record2.id}.json`);
  await writeFile(path, JSON.stringify(validated, null, 2), { flag: "wx" });
  return { id: record2.id, path };
}
async function readCheckRecord(root, id4, planId) {
  recordId.parse(id4);
  return checkRecordSchema.parse(JSON.parse(await readFile6(join8(root, ".frontend-system", scope(planId), "checks", `${id4}.json`), "utf8")));
}
async function saveExecution(root, input, expectedHash, planId) {
  const parsed = executionInputSchema.parse(input);
  return locked(root, async () => {
    const state = await workflowContext(root, planId);
    if (state.executionHash !== expectedHash) throw new Error("Execution changed; reread before saving");
    const execution = executionSchema.parse({
      ...parsed,
      steps: parsed.steps.map((step) => {
        const issue = state.revision.issues?.find(({ id: id4 }) => id4 === step.id);
        return issue ? {
          title: issue.title,
          files: issue.files,
          dependsOn: issue.dependsOn,
          requiredCheckIds: issue.requiredCheckIds,
          ...step
        } : step;
      })
    });
    if (!state.revision.approved || state.revision.hash !== execution.revisionHash) throw new Error("Execution requires the current approved revision");
    await requireDesignEvidence(root, state.revision, !state.execution || state.execution.revisionHash !== execution.revisionHash);
    const fileHashes = await sourceSnapshot(root);
    const sourceHash = digest(JSON.stringify(fileHashes));
    validateSteps(execution);
    if (state.revision.issues) {
      const issues = state.revision.issues;
      if (execution.steps.length !== issues.length || issues.some((issue) => {
        const step = execution.steps.find(({ id: id4 }) => id4 === issue.id);
        return !step || step.title !== issue.title || JSON.stringify(step.files) !== JSON.stringify(issue.files) || JSON.stringify(step.dependsOn ?? []) !== JSON.stringify(issue.dependsOn) || JSON.stringify(step.requiredCheckIds ?? []) !== JSON.stringify(issue.requiredCheckIds);
      })) throw new Error("Execution must preserve approved issue contracts; revise the plan to change them");
    }
    const policy = state.revision.policy;
    for (const exception of policy?.exceptions ?? []) {
      if (!execution.steps.some(({ id: id4 }) => id4 === exception.resolveByStep)) throw new Error(`Missing exception resolution step: ${exception.resolveByStep}`);
    }
    if (state.execution?.revisionHash === execution.revisionHash) {
      for (const old of state.execution.steps) {
        if (!execution.steps.some(({ id: id4 }) => id4 === old.id)) throw new Error("Preserve existing step IDs and their attempt history; revise the plan explicitly instead of resetting work");
      }
    }
    const verify = async (id4, full = false) => {
      const record2 = await readCheckRecord(root, id4, planId);
      const hasBehaviorCheck = record2.results.some((result) => /(^|:)(test|e2e)(:|$)/.test(result.capability)) || policy?.checks.some((check) => record2.results.some((result) => result.capability === check.script) && policy.rules.some((rule) => rule.verification === "behavior-test" && check.ruleIds.includes(rule.id)));
      if (record2.purpose !== "verification" || !record2.stable || record2.sourceHash !== sourceHash || record2.revisionHash !== execution.revisionHash || !record2.results.length || record2.results.some((result) => result.status !== "passed") || full && (!policy && !record2.full || !hasBehaviorCheck)) {
        throw new Error(`Check ${id4} does not verify the current source and revision`);
      }
      if (policy && full && requiredScripts(policy).some((script) => !record2.results.some((result) => result.capability === script && result.status === "passed"))) {
        throw new Error("Required checks are missing from the final run");
      }
      return record2;
    };
    if (execution.baselineCheckId) {
      if ((await readCheckRecord(root, execution.baselineCheckId, planId)).purpose !== "baseline") throw new Error("Expected a baseline check record");
    }
    for (const step of execution.steps) {
      if (["running", "complete"].includes(step.status) && (step.dependsOn ?? []).some((id4) => execution.steps.find((entry) => entry.id === id4)?.status !== "complete")) {
        throw new Error(`Prerequisites are incomplete: ${step.id}`);
      }
      const previous = state.execution?.steps.find(({ id: id4 }) => id4 === step.id);
      const cases = state.revision.issues?.find((issue) => issue.id === step.id)?.testCases;
      const review = step.testReview;
      if (cases && state.revision.contractVersion !== 3 && (JSON.stringify(previous) !== JSON.stringify(step) || state.revisionChangedSinceCheckpoint || execution.status === "complete")) {
        if ((step.status === "complete" || execution.status === "complete") && review?.status !== "approved") throw new Error(`Test-code feedback is required before completing issue: ${step.id}`);
        if (review?.status === "approved") {
          if (review.revisionHash !== execution.revisionHash) throw new Error(`Test review belongs to a different plan revision: ${step.id}`);
          const paths = new Set(review.files.map((item) => item.path));
          if (!review.confirmation.trim() || paths.size !== review.files.length || cases.some((item) => item.files.some((path2) => !paths.has(path2)))) throw new Error(`Test review requires actual user confirmation and every planned test artifact: ${step.id}`);
          if (review.files.some((item) => fileHashes[item.path] !== item.hash)) throw new Error(`Reviewed test artifacts changed or are missing; request feedback again: ${step.id}`);
        }
      }
      if (state.revision.contractVersion === 3 && cases && step.status === "complete") {
        const evidence2 = step.caseEvidence ?? [];
        if (new Set(evidence2.map((item) => item.caseId)).size !== evidence2.length || cases.some((item) => !evidence2.some((record2) => record2.caseId === item.id)) || evidence2.some((item) => !cases.some((testCase) => testCase.id === item.caseId))) {
          throw new Error(`Every approved test case needs distinct execution evidence: ${step.id}`);
        }
        for (const item of evidence2) {
          const testCase = cases.find((testCase2) => testCase2.id === item.caseId);
          if (!item.checkId && !item.reviewId) throw new Error(`Case ${item.caseId} has no check or semantic review evidence`);
          if (item.checkId) {
            const check = await verify(item.checkId);
            if (check.attemptId !== step.attemptId || !step.checkIds.includes(item.checkId)) throw new Error(`Case ${item.caseId} uses a check outside this issue attempt`);
            if (!check.results.some((result) => result.status === "passed" && (item.testName ? result.output.split(/\r?\n/).some((line) => {
              const name = line.match(/^\s*ok \d+ - (.+)$/)?.[1] ?? line.match(/^\s*✔ (.+?)(?: \([\d.]+ms\))?$/u)?.[1];
              return name?.trim() === item.testName;
            }) : false))) {
              if (!item.reviewId) throw new Error(`Case ${item.caseId} has no matching passing test in the check log or reviewed result`);
            } else continue;
          }
          const review2 = await readReview(root, item.reviewId, planId);
          if (review2.status !== "passed" || review2.revisionHash !== execution.revisionHash || review2.sourceHash !== sourceHash || review2.attemptId !== step.attemptId || review2.stepId !== step.id || !step.reviewIds?.includes(review2.id) || !review2.findings.some((finding) => finding.testCaseId === item.caseId) || testCase.method !== "manual" && !item.checkId) throw new Error(`Case ${item.caseId} lacks current, scoped review evidence`);
        }
      }
      if (step.implementationReview && (step.status !== "complete" || step.implementationReview.sourceHash !== sourceHash)) {
        throw new Error(`Implementation feedback is stale or the issue is unfinished: ${step.id}`);
      }
      if (step.status === "complete" && (JSON.stringify(previous) !== JSON.stringify(step) || state.revisionChangedSinceCheckpoint)) {
        if (!step.checkIds.length || step.remaining.length) throw new Error("Completed steps require checks and no remaining work");
        for (const id4 of step.checkIds) await verify(id4);
        if (policy) await verifyStep(root, step, policy, execution.revisionHash, sourceHash, planId);
      }
    }
    if (execution.status === "complete") {
      if (execution.steps.some((step) => step.status !== "complete") || !execution.finalCheckId) throw new Error("Complete all steps and provide a final full check");
      const finalCheck = await verify(execution.finalCheckId, true);
      if (policy) {
        if (!finalCheck.attemptId || !execution.steps.some((step) => step.attemptId === finalCheck.attemptId)) throw new Error("Final verification requires an execution attempt");
        const discovery = new FileSystemProjectDiscovery();
        const profile = await discovery.discover(await discovery.createRef(root));
        const failures = policyFailures(policy, profile.scripts, fileHashes);
        if (failures.length) throw new Error(failures.join("; "));
        const reviews = await Promise.all(execution.steps.flatMap((step) => (step.reviewIds ?? []).map((id4) => readReview(root, id4, planId))));
        await verifyReviews(root, reviews, policy, execution.revisionHash, sourceHash, planId);
      }
    }
    const path = join8(await planDirectory(root, "", planId), "execution.json");
    const requiresRevalidation = execution.status !== "complete" && state.needsRevalidation;
    const content = JSON.stringify({ execution, fileHashes, requiresRevalidation, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, null, 2);
    await atomic(path, content);
    await writeChecklist(root, execution, planId);
    return { path, hash: digest(content) };
  });
}
async function recordImplementationFeedback(root, planId, stepId, expectedHash, sourceHash, confirmation) {
  if (!confirmation.trim()) throw new Error("Actual user implementation feedback is required");
  const state = await workflowContext(root, planId);
  if (state.executionHash !== expectedHash || state.verification.sourceHash !== sourceHash || state.revision.contractVersion !== 3 || !state.execution) throw new Error("Review the current completed work before confirming it");
  const step = state.execution.steps.find((item) => item.id === stepId);
  if (!step || step.status !== "complete") throw new Error("Implementation feedback requires a completed issue");
  return saveExecution(root, { ...state.execution, steps: state.execution.steps.map((item) => item.id === stepId ? { ...item, implementationReview: { sourceHash, confirmation } } : item) }, expectedHash, planId);
}
function validateSteps(execution) {
  const steps = new Map(execution.steps.map((step) => [step.id, step]));
  const visited = /* @__PURE__ */ new Set();
  const visiting = /* @__PURE__ */ new Set();
  const visit = (id4) => {
    if (visited.has(id4)) return;
    if (visiting.has(id4)) throw new Error("Cyclic step dependencies");
    const step = steps.get(id4);
    if (!step) throw new Error(`Unknown dependency: ${id4}`);
    visiting.add(id4);
    for (const dependency of step.dependsOn ?? []) visit(dependency);
    visiting.delete(id4);
    visited.add(id4);
  };
  for (const id4 of steps.keys()) visit(id4);
}
function validateIssues(issues, policy) {
  if (new Set(issues.map(({ id: id4 }) => id4)).size !== issues.length) throw new Error("Duplicate issue IDs");
  validateSteps({ steps: issues });
  for (const issue of issues) {
    if (issue.testCases && new Set(issue.testCases.map((item) => item.id)).size !== issue.testCases.length) throw new Error("Duplicate test-case IDs within issue");
    if (issue.testCases?.some((item) => Boolean(item.flowId) !== Boolean(item.scenarioId))) throw new Error("Test case flow and scenario IDs must be supplied together");
    if (issue.testCases?.some((item) => item.files.some((path) => !issue.files.includes(path)))) throw new Error("Test artifacts must belong to issue files");
    if (issue.requiredCheckIds.some((id4) => !policy?.checks.some((check) => check.id === id4))) throw new Error("Unknown issue check");
  }
  if (policy?.checks.some((check) => !issues.some((issue) => issue.requiredCheckIds.includes(check.id)))) throw new Error("Every policy check needs an issue");
  if (policy?.exceptions.some((exception) => !issues.some((issue) => issue.id === exception.resolveByStep))) throw new Error("Missing exception resolution issue");
}
async function writeChecklist(root, execution, planId) {
  const path = join8(await planDirectory(root, "", planId), planId ? "progress.md" : "refactoring.md");
  const previous = await optional2(path);
  const body = `# Work plan

Revision: ${execution.revisionHash}
Kind: ${execution.kind ?? "refactor"}
Status: ${execution.status}

${execution.steps.map((step) => `- [${step.status === "complete" ? "x" : " "}] ${step.id}: ${step.title} (${step.status})
  Depends on: ${(step.dependsOn ?? []).join(", ") || "none"}
  Remaining: ${step.remaining.join("; ") || "none"}`).join("\n")}

${execution.note}
`;
  if (previous && previous !== body) await atomic(join8(await planDirectory(root, planId ? "history" : "plans", planId), `${digest(previous)}.md`), previous);
  await atomic(path, body);
}
var attemptSchema = object({ id: recordId, stepId: recordId, revisionHash: hash2, number: number().int().min(1).max(3), createdAt: string() });
async function readAttempt(root, id4, planId) {
  recordId.parse(id4);
  return attemptSchema.parse(JSON.parse(await readFile6(join8(root, ".frontend-system", scope(planId), "attempts", `${id4}.json`), "utf8")));
}
async function beginAttempt(root, stepId, expectedHash, planId) {
  recordId.parse(stepId);
  return locked(root, async () => {
    const state = await workflowContext(root, planId);
    if (state.executionHash !== expectedHash || !state.execution || !state.revision.approved || state.revision.hash !== state.execution.revisionHash) throw new Error("Reread the current approved execution");
    const step = state.execution.steps.find(({ id: id4 }) => id4 === stepId);
    if (!step || step.status === "complete") throw new Error("Select an incomplete step");
    validateSteps(state.execution);
    if ((step.dependsOn ?? []).some((id4) => state.execution.steps.find((entry) => entry.id === id4)?.status !== "complete")) throw new Error("Prerequisites are incomplete");
    const next = state.execution.steps.find((item) => item.status !== "complete" && (item.dependsOn ?? []).every((id4) => state.execution.steps.find((entry) => entry.id === id4)?.status === "complete"));
    if (next?.id !== stepId) throw new Error(`Complete the next eligible issue in plan order first: ${next?.id ?? "none"}`);
    const folder = await planDirectory(root, "attempts", planId);
    const attempts = await Promise.all((await readdir3(folder)).filter((name) => name.endsWith(".json")).map((name) => readAttempt(root, name.slice(0, -5), planId)));
    await requireDesignEvidence(root, state.revision, !attempts.some((item) => item.revisionHash === state.revision.hash));
    const number2 = attempts.filter((item) => item.stepId === stepId && item.revisionHash === state.revision.hash).length + 1;
    if (number2 > 3) throw new Error("Attempt budget exhausted; record blocked state and resolve the cause");
    const attempt = attemptSchema.parse({ id: randomUUID(), stepId, revisionHash: state.revision.hash, number: number2, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
    await writeFile(join8(folder, `${attempt.id}.json`), JSON.stringify(attempt), { flag: "wx" });
    return attempt;
  });
}
var reviewInputSchema = strictObject({
  delivery: strictObject({
    checks: strictObject({ unit: string().min(1), lint: string().min(1), types: string().min(1), e2e: array(string().min(1)) }),
    manual: array(strictObject({
      setup: string().trim().min(1),
      steps: array(string().trim().min(1)).min(1),
      expected: string().trim().min(1),
      fixture: localPath.optional(),
      existingEntry: string().trim().min(1).optional(),
      result: _enum(["passed", "not-run"])
    }).refine((value) => !!value.fixture || !!value.existingEntry, "Provide a runnable fixture path or existing entry point")).min(1)
  }).optional().describe("Required on PR scope reviews: exact policy script IDs for unit/lint/types and existing E2E; reproducible developer checks with actual execution status."),
  prScope: prScopeSchema.optional().describe("For PR preflight: exact scope returned by check_pr_readiness, after committing intended changes. Ordinary work reviews may omit it."),
  stepId: recordId,
  reviewId: string().min(1).describe("Exact existing policy.reviews[].id (also workflow.revision.policy.reviewIds). Select the approved review requirement, not a new record name. The server generates the saved record id; attemptId identifies the attempt."),
  attemptId: recordId,
  status: _enum(["passed", "failed"]),
  findings: array(strictObject({ ruleId: string().min(1), testCaseId: recordId.optional(), files: array(string()).min(1), evidence: string().min(1), conclusion: string().min(1) })).min(1),
  remaining: array(string()),
  resolvedExceptions: array(string())
});
var reviewSchema = reviewInputSchema.extend({ id: recordId, revisionHash: hash2, sourceHash: hash2, createdAt: string(), authority: literal("host-model-review") });
async function readReview(root, id4, planId) {
  recordId.parse(id4);
  return reviewSchema.parse(JSON.parse(await readFile6(join8(root, ".frontend-system", scope(planId), "reviews", `${id4}.json`), "utf8")));
}
async function saveReview(root, input, planId) {
  const data = reviewInputSchema.parse(input);
  return locked(root, async () => {
    const state = await workflowContext(root, planId);
    const policy = state.revision.policy;
    const requirement = policy?.reviews.find(({ id: id4 }) => id4 === data.reviewId);
    if (!state.revision.approved || !policy) throw new Error("Review requires the current approved policy");
    if (!requirement) throw new Error(`Unknown policy reviewId ${data.reviewId}. Select an existing review requirement: ${policy.reviews.map(({ id: id4 }) => id4).join(", ") || "none"}. The server generates the saved record id; do not invent a reviewId.`);
    if (!state.execution?.steps.some(({ id: id4 }) => id4 === data.stepId)) throw new Error("Review requires an existing execution step; select its approved issue ID");
    const attempt = await readAttempt(root, data.attemptId, planId);
    if (attempt.revisionHash !== state.revision.hash || attempt.stepId !== data.stepId) throw new Error("Review attempt does not match");
    const snapshot = await sourceSnapshot(root);
    const changes = data.prScope ? await prScope(root, data.prScope.base) : null;
    if (changes && (changes.dirtyFiles.length || !samePrScope(data.prScope, changes.scope))) throw new Error("PR scope changed or has uncommitted files; reread before reviewing");
    if (data.findings.some((finding) => !policy.rules.some(({ id: id4 }) => id4 === finding.ruleId) || finding.files.some((file) => !snapshot[file] && !changes?.files.includes(file)))) throw new Error("Review findings require existing files (or PR deletions) and policy rules");
    const missingRules = requirement.ruleIds.filter((id4) => !data.findings.some((finding) => finding.ruleId === id4));
    if (missingRules.length) throw new Error(`Review must address all required rules. Review ${data.reviewId} is missing: ${missingRules.join(", ")}. Supply findings for these approved rule IDs; do not remove obligations to pass.`);
    if (data.resolvedExceptions.some((id4) => !policy.exceptions.some((item) => item.id === id4))) throw new Error("Unknown exception resolution");
    if (data.status === "passed" && data.remaining.length) throw new Error("Passing review cannot have remaining work");
    const review = reviewSchema.parse({ ...data, id: randomUUID(), revisionHash: state.revision.hash, sourceHash: digest(JSON.stringify(snapshot)), createdAt: (/* @__PURE__ */ new Date()).toISOString(), authority: "host-model-review" });
    await writeFile(join8(await planDirectory(root, "reviews", planId), `${review.id}.json`), JSON.stringify(review), { flag: "wx" });
    if (data.status === "failed" && state.execution?.status === "complete") {
      const path = join8(await planDirectory(root, "", planId), "execution.json");
      const saved = executionRecordSchema.parse(JSON.parse(await readFile6(path, "utf8")));
      await atomic(path, JSON.stringify({ ...saved, requiresRevalidation: true }, null, 2));
    }
    return review;
  });
}
async function verifyReviews(root, reviews, policy, revisionHash, sourceHash, planId) {
  const passing = reviews.filter((item) => item.status === "passed" && !item.remaining.length && item.revisionHash === revisionHash && item.sourceHash === sourceHash);
  if (policy.reviews.some((item) => !passing.some((review) => review.reviewId === item.id))) throw new Error("Missing current semantic review evidence");
  if (policy.exceptions.some((item) => !passing.some((review) => review.resolvedExceptions.includes(item.id)))) throw new Error("Unresolved migration exceptions");
  if (!policy.reviews.length) return;
  const path = join8(root, ".frontend-system", scope(planId), "reviews");
  for (const name of await readdir3(path)) {
    if (!name.endsWith(".json")) continue;
    const review = await readReview(root, name.slice(0, -5), planId);
    if (review.status === "failed" && review.revisionHash === revisionHash && review.sourceHash === sourceHash && policy.reviews.some((item) => item.id === review.reviewId) && !passing.some((item) => item.reviewId === review.reviewId && item.createdAt > review.createdAt)) {
      throw new Error(`Unresolved later failed review: ${review.reviewId}`);
    }
  }
}
async function verifyStep(root, step, policy, revisionHash, sourceHash, planId) {
  if (!step.attemptId) throw new Error("Policy steps require a recorded attempt");
  const attempt = await readAttempt(root, step.attemptId, planId);
  if (attempt.stepId !== step.id || attempt.revisionHash !== revisionHash) throw new Error("Step attempt does not match");
  const records = await Promise.all(step.checkIds.map((id4) => readCheckRecord(root, id4, planId)));
  if (records.some((item) => item.attemptId !== attempt.id)) throw new Error("Step checks must belong to its attempt");
  const checks = step.requiredCheckIds ?? policy.checks.map(({ id: id4 }) => id4);
  for (const id4 of checks) {
    const check = policy.checks.find((item) => item.id === id4);
    if (!check || !records.some((record2) => record2.results.some((result) => result.capability === check.script && result.status === "passed"))) throw new Error(`Missing required step check: ${id4}`);
  }
  const reviews = await Promise.all((step.reviewIds ?? []).map((id4) => readReview(root, id4, planId)));
  if (reviews.some((review) => review.stepId !== step.id || review.attemptId !== attempt.id)) throw new Error("Step reviews must belong to its attempt");
  await verifyReviews(root, reviews, { ...policy, exceptions: policy.exceptions.filter((item) => item.resolveByStep === step.id) }, revisionHash, sourceHash, planId);
}

// src/application/flow-design.ts
import { createHash as createHash4 } from "node:crypto";
function validateFlowDesign(flow) {
  const design = flow.design;
  if (!design) return;
  const nodes = new Map(flow.nodes.map((n) => [n.id, n]));
  const ids = /* @__PURE__ */ new Set();
  for (const screen of design.screens) {
    if (ids.has(screen.id)) throw new Error("Duplicate design screen ID");
    ids.add(screen.id);
    if (nodes.get(screen.page)?.kind !== "page") throw new Error("Design screen must reference a page");
    for (const asset of [screen.image, ...screen.reference ? [screen.reference] : []]) {
      if (!flow.scope.files.includes(asset.path)) throw new Error("Design image must be included in scope.files");
    }
    if (screen.confirmation && (!flow.evidence[screen.confirmation.evidence] || screen.confirmation.imageHash !== screen.image.hash)) {
      throw new Error("Design confirmation requires evidence and the exact image hash");
    }
    for (const region of screen.regions) {
      let node = nodes.get(region.node);
      if (node?.kind !== "component") throw new Error("Design region must link a component");
      while (node && node.id !== screen.page) node = node.parent ? nodes.get(node.parent) : void 0;
      if (!node || region.x + region.width > 100 || region.y + region.height > 100) throw new Error("Design region must fit its image and belong to its page");
    }
  }
  if (design.stage === "visual-review") {
    if (flow.edges.length || flow.scenarios.length || design.quality.length || design.screens.some((s) => s.regions.length) || flow.nodes.some((n) => n.kind !== "page" || n.contracts?.length || n.props.length || n.state.length || n.events.length || n.lifecycle.length)) {
      throw new Error("Visual review contains pages and mockups only; detailed design requires a subsequent request");
    }
  } else if (design.screens.some((s) => !s.confirmation) || !design.detailRequest || !flow.evidence[design.detailRequest]) {
    throw new Error("Detailed design requires confirmed images and user request evidence");
  }
  for (const item of design.quality) if (item.nodes.some((id4) => !nodes.has(id4))) throw new Error("Unknown quality requirement node");
}
async function loadFlowDesignImages(root, flow) {
  const images = {};
  let bytes = 0;
  for (const screen of flow.design?.screens ?? []) for (const asset of [screen.image, ...screen.reference ? [screen.reference] : []]) {
    const data = await projectFileBytes(root, asset.path);
    if (createHash4("sha256").update(data).digest("hex") !== asset.hash) throw new Error(`Design image hash changed: ${asset.path}`);
    bytes += data.length;
    if (bytes > 24 * 1024 * 1024) throw new Error("Design images exceed the 24 MiB total budget");
    if (images[asset.path]) continue;
    const mime = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png" : data[0] === 255 && data[1] === 216 && data[2] === 255 ? "image/jpeg" : data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : null;
    if (!mime) throw new Error("Design images must be PNG, JPEG or WebP raster files");
    images[asset.path] = `data:${mime};base64,${data.toString("base64")}`;
  }
  return images;
}

// src/application/project-flows.ts
var envelope = object({
  version: union([literal(1), literal(2)]),
  record: analysisWriteSchema.shape.record,
  hashes: record(string(), string()),
  inventoryHash: string(),
  inventoryMode: _enum(["source", "all"]).default("all"),
  roots: array(string()),
  discoveryHashes: record(string(), string()).optional(),
  knowledgeHashes: record(string(), string()),
  createdAt: string()
});
var config = (path) => /(^|\/)(package\.json|[^/]*lock[^/]*|[^/]*config\.[^/]+|\.eslintrc[^/]*)$/.test(path);
async function inventory2(root) {
  return (await new FileSystemProjectDiscovery().listFiles(root)).map((p) => relative7(root, p).replaceAll("\\", "/")).sort();
}
var inRoots = (path, roots) => roots.some((r) => r === "." || path === r || path.startsWith(`${r}/`));
var structuralSource = (path) => /\.(?:[cm]?[jt]sx?|vue|svelte|astro|html?|css|s[ac]ss|less|mdx|json|ya?ml|toml|graphql|gql|wasm)$/i.test(path);
var discoveryFiles = (paths, roots, mode) => paths.filter((p) => !/^design\/fs\/(?:[^/]+\.captures\.json|captures\/.*\.png)$/.test(p) && (config(p) || inRoots(p, roots) && (mode === "all" || structuralSource(p)))).sort();
var inventoryHash = (paths, roots, mode) => contentHash(JSON.stringify(discoveryFiles(paths, roots, mode)));
async function readEnvelope(root, kind, id4, hash3) {
  analysisId.parse(id4);
  if (hash3 && !/^[a-f0-9]{64}$/.test(hash3)) throw new Error("Invalid analysis hash");
  const path = join9(resolve5(root), ".frontend-system/analysis", ...hash3 ? ["history", `${hash3}.json`] : [kind, `${id4}.json`]);
  const actual = await realpath7(path);
  if (actual !== join9(await realpath7(root), ".frontend-system/analysis", ...hash3 ? ["history", `${hash3}.json`] : [kind, `${id4}.json`])) throw new Error("Analysis records cannot traverse symlinks");
  const raw = await readFile7(actual, "utf8");
  const record2 = envelope.parse(JSON.parse(raw));
  if (record2.record.kind !== kind || record2.record.data.id !== id4 || hash3 && contentHash(raw) !== hash3) throw new Error("Analysis identity/hash mismatch");
  return { hash: contentHash(raw), ...record2 };
}
async function code(root, path, snapshot) {
  if (!snapshot) return (await projectFile(root, path)).content;
  const file = await readProjectSourceFile(root, path, snapshot.expectedCommit, snapshot.baseRef);
  return file.content;
}
function validateGraph(flow) {
  const nodes = new Map(flow.nodes.map((n) => [n.id, n]));
  const edges = new Map(flow.edges.map((e) => [e.id, e]));
  for (const [kind, items] of Object.entries({ nodes: flow.nodes, edges: flow.edges, scenarios: flow.scenarios, invariants: flow.invariants })) {
    const seen = /* @__PURE__ */ new Set(), duplicates = /* @__PURE__ */ new Set();
    for (const { id: id4 } of items) {
      if (seen.has(id4)) duplicates.add(id4);
      seen.add(id4);
    }
    if (duplicates.size) throw new Error(`Duplicate flow IDs in ${kind}: ${[...duplicates].join(", ")}. Update existing entries by ID instead of appending them.`);
  }
  for (const node of flow.nodes) {
    const visited = /* @__PURE__ */ new Set([node.id]);
    let parent = node.parent;
    while (parent) {
      if (!nodes.has(parent) || visited.has(parent)) throw new Error("Invalid or cyclic flow containment");
      visited.add(parent);
      parent = nodes.get(parent).parent;
    }
    const contracts = /* @__PURE__ */ new Set();
    for (const contract of node.contracts ?? []) {
      const key = `${contract.path}:${contract.name}`;
      if (contracts.has(key)) throw new Error(`Duplicate node contract: ${key}`);
      contracts.add(key);
      if (flow.basis === "observed" && !contract.evidence.some((id4) => flow.evidence[id4]?.path === contract.path)) {
        throw new Error(`Observed contract requires evidence from its path: ${key}`);
      }
    }
  }
  for (const item of [...flow.nodes, ...flow.nodes.flatMap((n) => n.contracts ?? []), ...flow.edges, ...flow.invariants]) {
    if (flow.basis === "observed" && !item.evidence.length) throw new Error("Observed graph elements require evidence");
    if (item.evidence.some((id4) => !flow.evidence[id4])) throw new Error("Unknown flow evidence ID");
  }
  for (const edge of flow.edges) if (!nodes.has(edge.from) || !nodes.has(edge.to)) throw new Error("Unknown flow edge endpoint");
  for (const scenario of flow.scenarios) if (!nodes.has(scenario.entry) || scenario.steps.some((s) => !edges.has(s.edge))) throw new Error("Unknown scenario node/edge");
  if (flow.scope.discoveryRoots.some((r) => r.split("/").some((p) => p === ".."))) throw new Error("Invalid discovery root");
  validateFlowDesign(flow);
  validateStructuredFlow(flow);
}
async function readPinnedFlow(root, id4, hash3) {
  const stored = await readEnvelope(root, "flow", id4, hash3);
  if (stored.record.kind !== "flow") throw new Error("Expected flow record");
  return stored.record.data;
}
async function checkQuotes(root, citations, files, snapshot) {
  const texts = /* @__PURE__ */ new Map();
  for (const c of citations) {
    if (!files.includes(c.path)) throw new Error(`Citation outside declared scope: ${c.path}`);
    if (!texts.has(c.path)) texts.set(c.path, await code(root, c.path, snapshot));
    const body = texts.get(c.path);
    const start = body.indexOf(c.quote);
    const lines = body.split(/(?<=\n)/);
    const lineStart = c.line ? lines.slice(0, c.line - 1).join("").length : 0;
    const occurrence = c.line ? body.indexOf(c.quote, lineStart) : start;
    if (start < 0 || c.line && (c.line > lines.length || occurrence < lineStart || occurrence >= lineStart + lines[c.line - 1].length)) {
      throw new Error(`Analysis quote not found at the declared line: ${c.path}. ${quoteLocationHint(body, c.quote)}`);
    }
    if (!c.line && body.indexOf(c.quote, start + 1) >= 0) throw new Error(`Ambiguous quote; supply line: ${c.path}`);
    c.line ??= body.slice(0, start).split(/\r?\n/).length;
  }
  return Object.fromEntries([...texts].map(([path, body]) => [path, contentHash(body)]));
}
function freshnessScan(root, systemRoot, snapshot) {
  const stats = { inventoryReads: 0, sourceReads: 0, sourceBytes: 0 };
  let paths;
  const hashes = /* @__PURE__ */ new Map();
  let index;
  const knowledge = /* @__PURE__ */ new Map();
  return {
    stats,
    inventory: () => paths ??= (stats.inventoryReads++, snapshot ? projectSnapshot(root, snapshot.baseRef).then((value) => {
      if (value.commit !== snapshot.expectedCommit) throw new Error("Project baseline changed");
      return value.files;
    }) : inventory2(root)),
    hash: (path) => {
      if (!hashes.has(path)) hashes.set(path, (async () => {
        stats.sourceReads++;
        if (snapshot) {
          const content = await code(root, path, snapshot);
          stats.sourceBytes += Buffer.byteLength(content);
          return contentHash(content);
        }
        const result = await projectFileHash(root, path);
        stats.sourceBytes += result.bytes;
        return result.hash;
      })());
      return hashes.get(path);
    },
    index: () => index ??= readReferenceIndex(join9(systemRoot, "references/learned")),
    knowledge: (id4) => {
      if (!knowledge.has(id4)) knowledge.set(id4, readIndexedReference(join9(systemRoot, "references/learned"), id4, 0, 1));
      return knowledge.get(id4);
    }
  };
}
async function readBaselineRecords(root, systemRoot, refs, snapshot) {
  const scan = freshnessScan(root, systemRoot, snapshot);
  const records = [];
  for (const ref of refs) {
    const stored = await readEnvelope(root, ref.kind, ref.id, ref.hash);
    const flow = stored.record.kind === "flow" ? stored.record.data : flowSchema.parse((await readEnvelope(root, "flow", stored.record.data.flow.id, stored.record.data.flow.hash)).record.data);
    if (flow.basis !== "observed" || flow.scope.snapshot?.baseRef !== snapshot.baseRef || flow.scope.snapshot.expectedCommit !== snapshot.expectedCommit) {
      throw new Error(`Baseline report requires observed records from the same snapshot: ${ref.id}`);
    }
    const freshness = await analysisFreshness(root, stored, systemRoot, scan);
    if (freshness.status !== "current") throw new Error(`Baseline record is stale: ${ref.id}: ${freshness.reasons.join("; ")}`);
    records.push(stored);
  }
  return records;
}
async function analysisFreshness(root, stored, systemRoot, scan = freshnessScan(root, systemRoot)) {
  const reasons = [];
  const paths = await scan.inventory();
  if (inventoryHash(paths, stored.roots, stored.inventoryMode) !== stored.inventoryHash) reasons.push("Discovery/configuration inventory changed");
  if (!stored.discoveryHashes) reasons.push("Legacy analysis lacks discovery content coverage; reanalyze before reuse");
  const dependencies = { ...stored.discoveryHashes, ...stored.hashes };
  for (const [path, hash3] of Object.entries(dependencies)) {
    const role = path in stored.hashes ? "dependency" : "discovery source";
    try {
      if (await scan.hash(path) !== hash3) reasons.push(`Changed ${role}: ${path}`);
    } catch {
      reasons.push(`Missing ${role}: ${path}`);
    }
  }
  const index = Object.keys(stored.knowledgeHashes).length ? await scan.index() : void 0;
  for (const [id4, hash3] of Object.entries(stored.knowledgeHashes)) {
    const entry = index?.entries.find((e) => e.id === id4);
    if (!entry || contentHash(JSON.stringify(entry)) !== hash3) reasons.push(`Changed knowledge: ${id4}`);
    else try {
      await scan.knowledge(id4);
    } catch {
      reasons.push(`Changed or unavailable knowledge body: ${id4}`);
    }
  }
  if (stored.record.kind === "finding") {
    try {
      if ((await readEnvelope(root, "flow", stored.record.data.flow.id)).hash !== stored.record.data.flow.hash) reasons.push("Linked flow changed");
    } catch {
      reasons.push("Linked flow unavailable");
    }
  }
  return {
    status: reasons.length ? "stale" : "current",
    reasons,
    meaning: "Declared dependency and discovery-content freshness, not semantic correctness or complete runtime coverage"
  };
}
async function saveProjectAnalysis(root, systemRoot, input) {
  const parsed = analysisWriteSchema.parse(input);
  return locked(root, async () => {
    let previous;
    try {
      previous = await readEnvelope(root, parsed.record.kind, parsed.record.data.id);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if ((previous?.hash ?? null) !== parsed.expectedHash) throw new Error("Analysis changed; read current hash before updating");
    const initialPaths = await inventory2(root);
    let quoteHashes = {};
    let flow;
    const knowledgeHashes = {};
    if (parsed.record.kind === "flow") {
      flow = flowSchema.parse(parsed.record.data);
      validateGraph(flow);
      parsed.record.data = flow;
      for (const judgment2 of flow.knowledge ?? []) {
        const { entry } = await readIndexedReference(join9(systemRoot, "references/learned"), judgment2.referenceId, 0, 1);
        if (contentHash(JSON.stringify(entry)) !== judgment2.referenceHash) throw new Error(`Flow knowledge changed: ${judgment2.referenceId}`);
        knowledgeHashes[judgment2.referenceId] = contentHash(JSON.stringify(entry));
      }
    } else {
      const finding = findingSchema.parse(parsed.record.data);
      parsed.record.data = finding;
      const linked = await readEnvelope(root, "flow", finding.flow.id);
      if (linked.hash !== finding.flow.hash) throw new Error("Finding must reference the current flow hash");
      flow = flowSchema.parse(linked.record.data);
      const freshness = await analysisFreshness(root, linked, systemRoot, freshnessScan(root, systemRoot, flow.scope.snapshot));
      if (freshness.status !== "current") throw new Error(`Refresh stale flow before saving finding: ${freshness.reasons.join("; ")}`);
      if (finding.kind === "violation" && !finding.authority) throw new Error("Violation needs an established requirement citation");
      if (["resolved", "dismissed"].includes(finding.status) && !finding.resolution) throw new Error("Closing a finding requires resolution evidence and reconsideration condition");
      quoteHashes = await checkQuotes(root, [...finding.evidence, ...finding.authority ? [finding.authority] : [], ...finding.resolution?.evidence ?? []], flow.scope.files, flow.scope.snapshot);
      const index = await readReferenceIndex(join9(systemRoot, "references/learned"));
      for (const id4 of finding.knowledgeIds) {
        const entry = index?.entries.find((e) => e.id === id4);
        if (!entry) throw new Error(`Unknown finding knowledge: ${id4}`);
        await readIndexedReference(join9(systemRoot, "references/learned"), id4, 0, 1);
        knowledgeHashes[id4] = contentHash(JSON.stringify(entry));
      }
    }
    const flowQuoteHashes = await checkQuotes(root, Object.values(flow.evidence), flow.scope.files, flow.scope.snapshot);
    await loadFlowDesignImages(root, flow);
    const paths = flow.scope.snapshot ? (await projectSnapshot(root, flow.scope.snapshot.baseRef)).files : await inventory2(root);
    const discovered = discoveryFiles(paths, flow.scope.discoveryRoots, flow.scope.discoveryMode);
    const files = [.../* @__PURE__ */ new Set([...flow.scope.files, ...discovered])];
    const hashes = {};
    for (const p of files) hashes[p] = flow.scope.snapshot ? contentHash(await code(root, p, flow.scope.snapshot)) : (await projectFileHash(root, p)).hash;
    for (const screen of flow.design?.screens ?? []) for (const asset of [screen.image, ...screen.reference ? [screen.reference] : []]) {
      if (hashes[asset.path] !== asset.hash) throw new Error("Design image changed during capture");
    }
    for (const quoted of [quoteHashes, flowQuoteHashes]) for (const [path, hash4] of Object.entries(quoted)) {
      if (hashes[path] !== hash4) throw new Error("Source changed during analysis capture; reread before saving");
    }
    if (!flow.scope.snapshot && inventoryHash(initialPaths, flow.scope.discoveryRoots, flow.scope.discoveryMode) !== inventoryHash(await inventory2(root), flow.scope.discoveryRoots, flow.scope.discoveryMode)) throw new Error("Inventory changed during analysis capture");
    const discoveryHashes = Object.fromEntries(discovered.map((p) => [p, hashes[p]]));
    const directHashes = Object.fromEntries([.../* @__PURE__ */ new Set([...flow.scope.files, ...paths.filter(config)])].map((p) => [p, hashes[p]]));
    const record2 = {
      version: 2,
      record: parsed.record,
      hashes: directHashes,
      discoveryHashes,
      inventoryHash: inventoryHash(paths, flow.scope.discoveryRoots, flow.scope.discoveryMode),
      inventoryMode: flow.scope.discoveryMode,
      roots: flow.scope.discoveryRoots,
      knowledgeHashes,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (previous && JSON.stringify({ ...record2, createdAt: null }) === JSON.stringify({ version: previous.version, record: previous.record, hashes: previous.hashes, discoveryHashes: previous.discoveryHashes, inventoryHash: previous.inventoryHash, inventoryMode: previous.inventoryMode, roots: previous.roots, knowledgeHashes: previous.knowledgeHashes, createdAt: null })) {
      return {
        id: parsed.record.data.id,
        kind: parsed.record.kind,
        hash: previous.hash,
        status: "unchanged",
        authority: "Identical analysis and dependency versions retained; no approval or main refresh"
      };
    }
    const raw = JSON.stringify(record2);
    const hash3 = contentHash(raw);
    await atomic(join9(await directory(root, "analysis/history"), `${hash3}.json`), raw);
    await atomic(join9(await directory(root, `analysis/${parsed.record.kind}`), `${parsed.record.data.id}.json`), raw);
    const links = [];
    for (const kind of ["flow", "finding"]) {
      const folder = await directory(root, `analysis/${kind}`);
      for (const name of (await readdir4(folder)).filter((n) => n.endsWith(".json")).sort()) {
        const stored = await readEnvelope(root, kind, name.slice(0, -5));
        const data = stored.record.data;
        links.push(`- [${kind}/${data.id}](${kind}/${data.id}.json) \u2014 ${"basis" in data ? data.basis : data.status}`);
      }
    }
    await atomic(
      join9(await directory(root, "analysis"), "index.md"),
      "# Working flow and finding index\n\nNot the main baseline. Query get_project_analysis for current dependency freshness. Resolved/dismissed records retain history.\n\n" + links.join("\n") + "\n"
    );
    return {
      id: parsed.record.data.id,
      kind: parsed.record.kind,
      hash: hash3,
      status: "saved",
      authority: "Host analysis recorded; no execution, approval, or automatic project.md refresh"
    };
  });
}
async function getProjectAnalysis(root, systemRoot, options = {}) {
  const selected = [];
  for (const kind of options.kind ? [options.kind] : ["flow", "finding"]) {
    let names;
    try {
      names = await readdir4(join9(root, ".frontend-system/analysis", kind));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const name of names.filter((n) => n.endsWith(".json")).sort()) {
      const id4 = name.slice(0, -5);
      if (options.ids && !options.ids.includes(id4)) continue;
      const stored = await readEnvelope(root, kind, id4);
      if (options.files?.length && !options.files.some((p) => p in stored.hashes || inRoots(p, stored.roots))) continue;
      selected.push({ kind, id: id4, stored });
    }
  }
  const offset = options.offset ?? 0, limit = options.limit ?? 10;
  const scan = freshnessScan(root, systemRoot);
  const rows = [];
  for (const { kind, id: id4, stored } of selected.slice(offset, offset + limit)) {
    const freshness = await analysisFreshness(root, stored, systemRoot, scan);
    const data = stored.record.data;
    rows.push({
      kind,
      id: id4,
      hash: stored.hash,
      title: data.title,
      freshness,
      ..."basis" in data ? { basis: data.basis, scenarios: data.scenarios.map((s) => ({ id: s.id, event: s.event })) } : { status: data.status, observation: data.observation },
      ..."basis" in data && data.pages ? {
        designState: data.designState ?? null,
        pages: data.pages.map((p) => ({ node: p.node, route: p.route, scenes: p.scenes.map((s) => ({ id: s.id, kind: s.kind })) })),
        contractCount: data.nodes.reduce((sum, n) => sum + (n.contracts?.length ?? 0), 0),
        knowledge: data.knowledge?.map((k) => ({ id: k.id, referenceId: k.referenceId, judgment: k.judgment })) ?? [],
        testCaseCount: data.testCases?.length ?? 0
      } : {},
      ..."basis" in data && data.design ? { design: { stage: data.design.stage, screens: data.design.screens.map((s) => ({ id: s.id, page: s.page, imageHash: s.image.hash, confirmed: !!s.confirmation })) } } : {},
      ...options.full ? { data } : {}
    });
  }
  return {
    records: rows,
    total: selected.length,
    nextOffset: offset + limit < selected.length ? offset + limit : null,
    scan: scan.stats,
    authority: "Recorded host interpretation; inspect stale/unknown edges. Proposed flows are not implementation facts."
  };
}
async function validateAnalysisReferences(root, systemRoot, refs, checkSources) {
  const errors = [];
  const scan = freshnessScan(root, systemRoot);
  for (const ref of refs) {
    try {
      const stored = await readEnvelope(root, ref.kind, ref.id, ref.hash);
      if (stored.record.kind === "flow" && stored.record.data.design?.stage === "visual-review") errors.push(`Visual-review flow is not an implementation contract: ${ref.id}`);
      if (stored.record.kind === "flow" && stored.record.data.design) await loadFlowDesignImages(root, stored.record.data);
      if (checkSources) {
        if ((await readEnvelope(root, ref.kind, ref.id)).hash !== ref.hash) errors.push(`Analysis version changed: ${ref.id}`);
        errors.push(...(await analysisFreshness(root, stored, systemRoot, scan)).reasons.map((r) => `${ref.id}: ${r}`));
      }
    } catch (error) {
      errors.push(`Analysis reference unavailable: ${ref.id}: ${String(error)}`);
    }
  }
  return errors;
}

export {
  ruleId,
  sha256,
  localPath,
  ruleSchema,
  policyInputSchema,
  requiredScripts,
  policyProtectionFailures,
  policyFailures,
  contentHash,
  technologyKey,
  confinedRead,
  readReferenceIndex,
  evaluateTriggerChecks,
  triggerPublicationFailures,
  terms,
  searchReferenceIndex,
  evaluateRetrievalChecks,
  readIndexedReference,
  git2 as git,
  changedFiles,
  reviewBase,
  diffStat,
  FileSystemProjectDiscovery,
  prScope,
  samePrScope,
  analysisId,
  flowSchema,
  analysisWriteSchema,
  loadFlowDesignImages,
  readPinnedFlow,
  readBaselineRecords,
  analysisFreshness,
  saveProjectAnalysis,
  getProjectAnalysis,
  validateAnalysisReferences,
  triggerInspectionSchema,
  checkJudgmentSchema,
  triggerDiscoverySchema,
  discoverKnowledgeTriggers,
  inspectCodeKnowledge,
  saveKnowledgeReview,
  retrieveProjectFacts,
  routingInputSchema,
  installedSystemRoot,
  routeKnowledge,
  recordId,
  digest,
  issuesSchema,
  executionInputSchema,
  directory,
  atomic,
  locked,
  sourceSnapshot,
  listPlans,
  readRevision,
  saveRevision,
  approveRevision,
  saveProjectRecord,
  readProjectRecord,
  workflowContext,
  saveCheckRecord,
  readCheckRecord,
  saveExecution,
  recordImplementationFeedback,
  readAttempt,
  beginAttempt,
  reviewInputSchema,
  readReview,
  saveReview,
  verifyReviews,
  verifyStep,
  boundReadWindows,
  projectSnapshot,
  readProjectSource,
  readProjectSources,
  projectDocumentHash,
  recordProjectRefresh,
  projectDocumentStatus,
  rememberAnalysis,
  projectDecisionSchema,
  saveProjectDecision,
  readProjectDecision,
  searchProjectDecisions,
  designContractFailures,
  projectEvidenceInputSchema,
  validateProjectEvidence,
  readProjectEvidence,
  designEvidenceSchema,
  decisionUpdatesSchema
};
