import { realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type ts from "typescript";
import { parameterDispatch, relationCollector } from "./code-relations.js";
import { contentHash } from "./reference-index.js";
import { projectSnapshot } from "../project-snapshot.js";
import { git } from "../git-state.js";

export interface CodeSnapshot { baseRef: string; expectedCommit: string }

export interface CodeSignal {
  kind: "call" | "import" | "path" | "jsx-element" | "jsx-attribute" | "semantic" | "syntax";
  value: string;
  path: string;
  line: number;
  column: number;
  evidence: string;
  origin: "static" | "host";
}

export { projectFile } from "../source-file.js";
import { projectFile, assertProjectSourceSize } from "../source-file.js";

export async function inspectCode(root: string, paths: string[], snapshot?: CodeSnapshot, includeRelations = false) {
  // ponytail: bounded syntax/binding only; no full type graph or recursive barrel tracing.
  const compiler = (await import("typescript")).default;
  const base = await realpath(root);
  const pinned = snapshot ? await projectSnapshot(root, snapshot.baseRef) : undefined;
  if (pinned && pinned.commit !== snapshot!.expectedCommit) throw new Error("Main changed; refresh code snapshot");
  const snapshotContents = new Map<string, string>();
  if (pinned) {
    for (const path of [...new Set([...paths, ...pinned.files.filter((path) => /(^|\/)(?:tsconfig|jsconfig)(?:\.[^/]+)?\.json$/.test(path))])]) {
      if (!pinned.files.includes(path) || path.split('/').some((part) => ['node_modules', '.git', '.frontend-system'].includes(part))) throw new Error("Select a source file from the pinned snapshot");
      const content = await git(root, ['show', `${pinned.commit}:./${path}`]);
      assertProjectSourceSize(Buffer.byteLength(content), path);
      snapshotContents.set(resolve(base, path), content);
    }
  }
  const files = await Promise.all([...new Set(paths)].sort().map(async (path) => pinned
    ? { absolute: resolve(base, path), path, content: snapshotContents.get(resolve(base, path))! }
    : projectFile(root, path)));
  const snapshotPaths = new Set(pinned?.files.map((path) => resolve(base, path)));
  const system = pinned ? { ...compiler.sys,
    fileExists: (path: string) => snapshotPaths.has(resolve(path)),
    readFile: (path: string) => snapshotContents.get(resolve(path)),
    directoryExists: (path: string) => [...snapshotPaths].some((file) => file.startsWith(resolve(path) + '/')),
    realpath: (path: string) => path,
  } : compiler.sys;
  const sources = new Map<string, ts.SourceFile>();
  const signals: CodeSignal[] = [];
  const warnings: string[] = [];
  const imports: Array<{ path: string; line: number; specifier: string; resolvedPath: string | null }> = [];
  const hashes: Record<string, string> = {};
  const configHashes: Record<string, string> = {};
  const configCache = new Map<string, ts.CompilerOptions>();
  const options: ts.CompilerOptions = { allowJs: true, jsx: compiler.JsxEmit.Preserve, noLib: true, noResolve: true };
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
  host.writeFile = () => {};
  const program = compiler.createProgram([...sources.keys()], options, host);
  const checker = program.getTypeChecker();
  const relations = includeRelations ? relationCollector(compiler, checker, new Map(files.map(file => [file.absolute.replaceAll("\\", "/"), file.path]))) : undefined;
  function moduleOptions(file: string): ts.CompilerOptions {
    let directory = dirname(file);
    let config: string | undefined;
    while (!relative(base, directory).startsWith("..") && !isAbsolute(relative(base, directory))) {
      config = ["tsconfig.json", "jsconfig.json"].map((name) => resolve(directory, name)).find(system.fileExists);
      if (config || directory === base) break;
      directory = dirname(directory);
    }
    if (!config) return { moduleResolution: compiler.ModuleResolutionKind.Bundler, allowJs: true };
    const cached = configCache.get(config);
    if (cached) return cached;
    const read = (path: string) => {
      const body = system.readFile(path);
      if (body !== undefined) configHashes[relative(base, path).replaceAll("\\", "/")] = contentHash(body);
      return body;
    };
    const raw = compiler.readConfigFile(config, read);
    const parsed = compiler.parseJsonConfigFileContent(raw.config ?? {}, { ...system, readFile: read, readDirectory: () => [] }, dirname(config));
    for (const error of [raw.error, ...parsed.errors].filter((error) => error && error.code !== 18003)) {
      warnings.push(`${relative(base, config)}: ${compiler.flattenDiagnosticMessageText(error!.messageText, " ")}`);
    }
    const resolvedOptions = { ...parsed.options, allowJs: true };
    configCache.set(config, resolvedOptions);
    return resolvedOptions;
  }
  for (const file of files) {
    const source = sources.get(file.absolute.replaceAll("\\", "/"));
    if (!source) continue;
    const errors = program.getSyntacticDiagnostics(source);
    if (errors.length) {
      warnings.push(`${file.path}: parse failed; calls/imports not extracted`);
      continue;
    }
    const add = (kind: CodeSignal["kind"], value: string, node: ts.Node) => {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      signals.push({ kind, value, path: file.path, line: position.line + 1, column: position.character + 1,
        evidence: node.getText(source).slice(0, 300), origin: "static" });
    };
    const visit = (node: ts.Node) => {
      relations?.visit(node);
      const dispatch = parameterDispatch(compiler, checker, node);
      if (dispatch) add("syntax", "parameter-dispatch", dispatch.selector);
      if (compiler.isJsxOpeningElement(node) || compiler.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        // Intrinsic JSX only: a component's props do not prove its rendered DOM.
        if (/^[a-z]/.test(tag) && !tag.includes(".")) {
          add("jsx-element", tag, node.tagName);
          for (const attribute of node.attributes.properties) {
            if (compiler.isJsxAttribute(attribute)) add("jsx-attribute", attribute.name.getText(source), attribute);
          }
        }
      }
      if ((compiler.isImportDeclaration(node) || compiler.isExportDeclaration(node)) && node.moduleSpecifier && compiler.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        add("import", specifier, node);
        const resolved = compiler.resolveModuleName(specifier, file.absolute, moduleOptions(file.absolute), system).resolvedModule;
        const target = resolved?.resolvedFileName;
        imports.push({ path: file.path, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, specifier,
          resolvedPath: target ? relative(base, target).replaceAll("\\", "/") : null });
        if (!target) warnings.push(`${file.path}: unresolved import ${specifier}`);
        if (compiler.isExportDeclaration(node)) warnings.push(`${file.path}: re-export ${specifier}; follow source before interpreting calls`);
      }
      if (compiler.isCallExpression(node)) {
        const callee = node.expression;
        const identifier = compiler.isIdentifier(callee) ? callee : compiler.isPropertyAccessExpression(callee) && compiler.isIdentifier(callee.expression) ? callee.expression : undefined;
        const declarations = identifier ? checker.getSymbolAtLocation(identifier)?.declarations ?? [] : [];
        if (compiler.isIdentifier(callee) && callee.text === 'fetch' && declarations.length === 0) add('call', 'global#fetch', callee);
        if (compiler.isPropertyAccessExpression(callee) && compiler.isIdentifier(callee.expression) &&
          ['window', 'globalThis'].includes(callee.expression.text) && callee.name.text === 'fetch' && declarations.length === 0) add('call', 'global#fetch', callee);
        for (const declaration of declarations) {
          let symbol: string | undefined;
          let current: ts.Node | undefined = declaration;
          if (compiler.isImportSpecifier(declaration) && compiler.isIdentifier(callee) && !declaration.isTypeOnly) symbol = (declaration.propertyName ?? declaration.name).text;
          if (compiler.isImportClause(declaration) && compiler.isIdentifier(callee)) symbol = 'default';
          if ((compiler.isNamespaceImport(declaration) || compiler.isImportClause(declaration)) && compiler.isPropertyAccessExpression(callee)) symbol = callee.name.text;
          while (current && !compiler.isImportDeclaration(current)) current = current.parent;
          if (symbol && current && compiler.isImportDeclaration(current) && !current.importClause?.isTypeOnly &&
            compiler.isStringLiteral(current.moduleSpecifier)) {
            add("call", `${current.moduleSpecifier.text}#${symbol}`, callee);
          }
        }
        if (callee.kind === compiler.SyntaxKind.ImportKeyword || (compiler.isIdentifier(callee) && callee.text === "require")) {
          warnings.push(`${file.path}: dynamic/CommonJS import requires host review`);
        }
      }
      compiler.forEachChild(node, visit);
    };
    visit(source);
  }
  if (pinned && (await projectSnapshot(root, snapshot!.baseRef)).commit !== pinned.commit) throw new Error('Main changed during inspection');
  return { signals, imports, hashes, configHashes, ...(relations ? {relations: relations.result()} : {}), warnings: [...new Set(warnings)],
    snapshot: snapshot ?? null,
    scope: "Selected files only; syntax facts are not domain/runtime judgments. Re-exports, dynamic imports and bundler-only aliases need host review." };
}
