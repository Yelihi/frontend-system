import { execFile } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

import type {
  DetectedTechnology,
  ProjectCapability,
  ProjectProfile,
  ProjectRef,
} from "../../domain/types.js";
import type { ProjectDiscoveryPort } from "../../ports/project-discovery.port.js";

const run = promisify(execFile);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".venv",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "storybook-static",
]);
const configPattern = /(^|\/)([^/]+\.)?(config\.(js|cjs|mjs|ts)|rc(\.json)?|tsconfig\.json)$/;

const technologyPackages: Record<string, { name: string; category: string }> = {
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
};

interface PackageManifest {
  path: string;
  directory: string;
  data: {
    name?: string;
    private?: boolean;
    packageManager?: string;
    engines?: { node?: string };
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

async function git(rootPath: string, args: string[]): Promise<string | undefined> {
  try {
    return (await run("git", ["-C", rootPath, ...args])).stdout.trim();
  } catch {
    return undefined;
  }
}

async function readManifests(rootPath: string, files: string[]): Promise<PackageManifest[]> {
  const manifests: PackageManifest[] = [];
  for (const path of files.filter((file) => basename(file) === "package.json")) {
    try {
      const data = JSON.parse(await readFile(path, "utf8")) as PackageManifest["data"];
      manifests.push({ path, directory: dirname(path), data });
    } catch {
      // Invalid manifests are evidence for review, not a reason to abort discovery.
    }
  }
  return manifests.sort((a, b) => relative(rootPath, a.path).localeCompare(relative(rootPath, b.path)));
}

function detectTechnologies(rootPath: string, manifests: PackageManifest[]): DetectedTechnology[] {
  const found = new Map<string, DetectedTechnology>();
  for (const manifest of manifests) {
    const dependencies = {
      ...manifest.data.peerDependencies,
      ...manifest.data.devDependencies,
      ...manifest.data.dependencies,
    };
    for (const [packageName, version] of Object.entries(dependencies)) {
      const known = technologyPackages[packageName];
      if (!known) continue;
      const evidence = `${relative(rootPath, manifest.path) || "package.json"}: ${packageName}`;
      const existing = found.get(known.name);
      if (existing) existing.evidence.push(evidence);
      else {
        found.set(known.name, {
          name: known.name,
          packageName,
          version,
          category: known.category,
          confidence: 1,
          evidence: [evidence],
        });
      }
    }
  }
  return [...found.values()];
}

function commandFor(manager: string, script: string): string {
  return manager === "npm" ? `npm run ${script}` : `${manager} ${script}`;
}

export class FileSystemProjectDiscovery implements ProjectDiscoveryPort {
  async listFiles(rootPath: string): Promise<string[]> {
    const root = resolve(rootPath);
    const files: string[] = [];
    const visit = async (directory: string, depth: number): Promise<void> => {
      if (depth > 6 || files.length >= 20_000) return;
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await visit(path, depth + 1);
        else if (entry.isFile()) files.push(path);
      }
    };
    await visit(root, 0);
    return files.sort();
  }

  async createRef(rootPath: string): Promise<ProjectRef> {
    const root = resolve(rootPath);
    if (!(await exists(root))) throw new Error(`Project path does not exist: ${root}`);
    const repositoryRoot = (await git(root, ["rev-parse", "--show-toplevel"])) ?? root;
    const remoteHead = await git(root, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
    const currentBranch = await git(root, ["branch", "--show-current"]);
    return {
      id: basename(root).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: basename(root),
      rootPath: root,
      git: {
        repositoryRoot,
        defaultBranch: remoteHead?.replace(/^origin\//, "") || currentBranch || "main",
      },
    };
  }

  async discover(project: ProjectRef): Promise<ProjectProfile> {
    const files = await this.listFiles(project.rootPath);
    const manifests = await readManifests(project.rootPath, files);
    const relativeFiles = files.map((file) => relative(project.rootPath, file));
    const lock = relativeFiles
      .filter((file) => /(^|\/)(pnpm-lock\.yaml|yarn\.lock|package-lock\.json|bun\.lockb?)$/.test(file))
      .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))[0];
    const declaredManager = manifests.find((manifest) => manifest.data.packageManager)?.data.packageManager;
    const packageManagerName = declaredManager?.split("@")[0] ??
      (lock?.endsWith("pnpm-lock.yaml") ? "pnpm" : lock?.endsWith("yarn.lock") ? "yarn" : lock?.match(/bun\.lockb?$/) ? "bun" : "npm");
    const packageManagerVersion = declaredManager?.split("@")[1];
    const scripts: Record<string, string> = {};
    const capabilities: ProjectCapability[] = [];
    const capabilityNames = new Set(["lint", "typecheck", "test", "build", "e2e"]);

    for (const manifest of manifests) {
      const prefix = relative(project.rootPath, manifest.directory);
      const localLock = relativeFiles.find((file) => dirname(file) === prefix && /(?:pnpm-lock\.yaml|yarn\.lock|package-lock\.json|bun\.lockb?)$/.test(file));
      const manager = localLock?.endsWith("pnpm-lock.yaml") ? "pnpm" : localLock?.endsWith("yarn.lock") ? "yarn" : localLock?.match(/bun\.lockb?$/) ? "bun" : packageManagerName;
      for (const [name, command] of Object.entries(manifest.data.scripts ?? {})) {
        const key = prefix ? `${prefix}:${name}` : name;
        scripts[key] = command;
        if (capabilityNames.has(name)) {
          capabilities.push({ name, command: commandFor(manager, name), workingDirectory: manifest.directory });
        }
      }
    }

    const sourceDirectories = relativeFiles
      .filter((file) => /(^|\/)src\//.test(file))
      .map((file) => file.slice(0, file.indexOf("src/") + 3))
      .filter((value, index, all) => all.indexOf(value) === index);
    const architectureRoots = relativeFiles
      .filter((file) => /(^|\/)src\/(app|components|entities|features|pages|shared|views|widgets)\//.test(file))
      .map((file) => file.match(/^(.*?src\/(?:app|components|entities|features|pages|shared|views|widgets))/)?.[1])
      .filter((value): value is string => Boolean(value))
      .filter((value, index, all) => all.indexOf(value) === index);
    const featureSliced = ["entities", "features", "shared", "widgets"].every((layer) =>
      architectureRoots.some((root) => root.endsWith(`/src/${layer}`) || root === `src/${layer}`),
    );
    const configFiles = relativeFiles.filter(
      (file) => file.split("/").length <= 3 && configPattern.test(file),
    );
    const nodeVersion = manifests.find((manifest) => manifest.data.engines?.node)?.data.engines?.node;

    return {
      project,
      runtime: { name: "node", ...(nodeVersion ? { version: nodeVersion } : {}), evidence: nodeVersion ? ["package.json engines.node"] : ["package.json detected"] },
      packageManager: {
        name: packageManagerName,
        ...(packageManagerVersion ? { version: packageManagerVersion } : {}),
        evidence: [declaredManager ? "packageManager field" : lock ?? "package.json fallback"],
      },
      technologies: detectTechnologies(project.rootPath, manifests),
      scripts,
      paths: {
        root: project.rootPath,
        manifests: manifests.map((manifest) => relative(project.rootPath, manifest.path) || "package.json"),
        sourceDirectories,
        configFiles,
      },
      architecture: {
        style: featureSliced ? "feature-sliced" : manifests.some((manifest) => manifest.directory !== project.rootPath) ? "nested application" : "single application",
        roots: architectureRoots,
        evidence: architectureRoots,
      },
      conventions: [
        ...(configFiles.some((file) => file.endsWith("tsconfig.json"))
          ? [{ id: "typescript", description: "TypeScript configuration is present.", evidence: configFiles.filter((file) => file.endsWith("tsconfig.json")) }]
          : []),
        ...(sourceDirectories.length
          ? [{ id: "src-directory", description: "Source code is organized under src directories.", evidence: sourceDirectories }]
          : []),
      ],
      capabilities,
      constraints: manifests
        .filter((manifest) => manifest.data.private)
        .map((manifest) => ({ id: `private:${relative(project.rootPath, manifest.path) || "root"}`, description: "Package is private.", evidence: [relative(project.rootPath, manifest.path) || "package.json"] })),
    };
  }
}
