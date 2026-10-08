#!/usr/bin/env node
import { createRequire as __fsCreateRequire } from 'node:module'; import { fileURLToPath as __fsFileURLToPath } from 'node:url'; import { dirname as __fsDirname } from 'node:path'; const require = __fsCreateRequire(import.meta.url); const __filename = __fsFileURLToPath(import.meta.url); const __dirname = __fsDirname(__filename);
import {
  _enum,
  array,
  boolean,
  literal,
  projectFile,
  strictObject,
  string,
  toJSONSchema
} from "./chunks/chunk-6CLLSHCT.js";
import {
  require_typescript
} from "./chunks/chunk-RTYRLEKU.js";
import {
  __toESM
} from "./chunks/chunk-2R6PZYWP.js";

// src/style-check.ts
import { resolve as resolve2 } from "node:path";

// src/application/style-policy.ts
var import_typescript = __toESM(require_typescript(), 1);
import { resolve } from "node:path";
var stylePolicySchema = strictObject({
  version: literal(1),
  files: array(string().min(1)).min(1).max(40),
  inlineStaticClasses: boolean().default(false),
  completeClassTokens: boolean().default(true),
  variants: array(strictObject({
    file: string().min(1),
    axes: array(string().min(1)).min(2).refine((axes) => new Set(axes).size === axes.length, "Variant axes must be distinct"),
    defaults: _enum(["per-axis", "none"]).default("per-axis").describe("Choose from the approved contract: none forbids defaultVariants; per-axis retains the legacy requirement for a default on every listed axis. This does not verify public prop optionality.")
  })).default([])
});
async function checkStylePolicy(root2, input) {
  const policy = stylePolicySchema.parse(input);
  if (policy.variants.some((item) => !policy.files.includes(item.file))) throw new Error("Variant files must be in the checked scope");
  if (new Set(policy.variants.map((item) => item.file)).size !== policy.variants.length) throw new Error("Variant files must be distinct");
  const files = await Promise.all([...new Set(policy.files)].map(async (path) => ({ ...await projectFile(root2, path), path })));
  if (files.some((file) => !/\.[cm]?[jt]sx?$/.test(file.path))) throw new Error("Style policy supports JS/TS/JSX/TSX source files");
  const sources = new Map(files.map((file) => [resolve(file.absolute), import_typescript.default.createSourceFile(file.absolute, file.content, import_typescript.default.ScriptTarget.Latest, true)]));
  const options = { allowJs: true, jsx: import_typescript.default.JsxEmit.Preserve, noLib: true, noResolve: true };
  const host = import_typescript.default.createCompilerHost(options);
  host.getSourceFile = (name) => sources.get(resolve(name));
  host.writeFile = () => {
  };
  const program = import_typescript.default.createProgram([...sources.keys()], options, host), checker = program.getTypeChecker();
  const diagnostics = [];
  for (const file of files) {
    const source = sources.get(resolve(file.absolute));
    const add = (rule, node, message) => {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      if (!diagnostics.some((item) => item.path === file.path && item.rule === rule && item.line === position.line + 1))
        diagnostics.push({ rule, path: file.path, line: position.line + 1, column: position.character + 1, message });
    };
    if (program.getSyntacticDiagnostics(source).length) {
      add("parse", source, "Source could not be parsed");
      continue;
    }
    const declarations = (node) => checker.getSymbolAtLocation(node)?.declarations ?? [];
    const imported = (node, name, module = "class-variance-authority") => declarations(node).some((declaration) => {
      if (!import_typescript.default.isImportSpecifier(declaration) || declaration.isTypeOnly || (declaration.propertyName ?? declaration.name).text !== name) return false;
      const statement = declaration.parent.parent.parent;
      return import_typescript.default.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly && import_typescript.default.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === module;
    });
    const initializer = (node) => {
      const declaration = declarations(node).find(import_typescript.default.isVariableDeclaration);
      return declaration?.initializer;
    };
    const property = (object, name) => object && import_typescript.default.isObjectLiteralExpression(object) ? object.properties.find((item) => import_typescript.default.isPropertyAssignment(item) && item.name.getText(source).replace(/^['"]|['"]$/g, "") === name) : void 0;
    const unwrapped = (node) => import_typescript.default.isParenthesizedExpression(node) || import_typescript.default.isAsExpression(node) || import_typescript.default.isSatisfiesExpression(node) ? unwrapped(node.expression) : node;
    const configurations = [];
    const tokenEdge = (raw, edge) => {
      const node = unwrapped(raw);
      if (import_typescript.default.isStringLiteralLike(node)) return node.text;
      if (import_typescript.default.isTemplateExpression(node)) return edge === "start" ? node.head.text : node.templateSpans.at(-1)?.literal.text;
      if (import_typescript.default.isBinaryExpression(node) && node.operatorToken.kind === import_typescript.default.SyntaxKind.PlusToken)
        return tokenEdge(edge === "start" ? node.left : node.right, edge);
      return void 0;
    };
    const separated = (node) => {
      const left = tokenEdge(node.left, "end"), right = tokenEdge(node.right, "start");
      return left === "" || right === "" || /\s$/.test(left ?? "") || /^\s/.test(right ?? "");
    };
    const inspectCvaTokens = (node) => {
      if (import_typescript.default.isConditionalExpression(node)) {
        inspectCvaTokens(node.whenTrue);
        inspectCvaTokens(node.whenFalse);
        return;
      }
      if (import_typescript.default.isBinaryExpression(node) && node.operatorToken.kind === import_typescript.default.SyntaxKind.AmpersandAmpersandToken) {
        inspectCvaTokens(node.right);
        return;
      }
      if (policy.completeClassTokens && import_typescript.default.isTemplateExpression(node)) {
        const fragments = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
        if (node.templateSpans.some((_, index) => /\S$/.test(fragments[index]) || /^\S/.test(fragments[index + 1])))
          add("complete-class-tokens", node, "CVA constructs only part of a class token");
      }
      if (policy.completeClassTokens && import_typescript.default.isBinaryExpression(node) && node.operatorToken.kind === import_typescript.default.SyntaxKind.PlusToken && !separated(node))
        add("complete-class-tokens", node, "CVA class concatenation needs complete literal tokens");
      import_typescript.default.forEachChild(node, inspectCvaTokens);
    };
    const inspectCvaClasses = (call) => {
      if (call.arguments[0]) inspectCvaTokens(call.arguments[0]);
      const options2 = call.arguments[1];
      const variants = property(options2, "variants")?.initializer;
      if (variants && import_typescript.default.isObjectLiteralExpression(variants)) {
        for (const axis of variants.properties) {
          if (!import_typescript.default.isPropertyAssignment(axis) || !import_typescript.default.isObjectLiteralExpression(axis.initializer)) continue;
          for (const choice of axis.initializer.properties) {
            if (import_typescript.default.isPropertyAssignment(choice)) inspectCvaTokens(choice.initializer);
          }
        }
      }
      const compounds = property(options2, "compoundVariants")?.initializer;
      if (compounds && import_typescript.default.isArrayLiteralExpression(compounds)) {
        for (const compound of compounds.elements) for (const key of ["class", "className"]) {
          const value = property(compound, key)?.initializer;
          if (value) inspectCvaTokens(value);
        }
      }
    };
    const inspectExpression = (raw, seen = /* @__PURE__ */ new Set()) => {
      const node = unwrapped(raw);
      if (seen.has(node)) return;
      seen.add(node);
      if (import_typescript.default.isConditionalExpression(node)) {
        inspectExpression(node.whenTrue, seen);
        inspectExpression(node.whenFalse, seen);
        return;
      }
      if (import_typescript.default.isBinaryExpression(node) && node.operatorToken.kind === import_typescript.default.SyntaxKind.AmpersandAmpersandToken) {
        inspectExpression(node.right, seen);
        return;
      }
      if (import_typescript.default.isIdentifier(node)) {
        const value = initializer(node);
        if (value) inspectExpression(value, seen);
        return;
      }
      if (import_typescript.default.isCallExpression(node)) {
        const initial = import_typescript.default.isIdentifier(node.expression) ? initializer(node.expression) : void 0;
        const value = initial ? unwrapped(initial) : void 0;
        if (value && import_typescript.default.isCallExpression(value) && imported(value.expression, "cva")) {
          configurations.push(value);
          inspectCvaClasses(value);
          return;
        }
        if (policy.inlineStaticClasses && !imported(node.expression, "cx") && !imported(node.expression, "clsx", "clsx") && !imported(node.expression, "twMerge", "tailwind-merge"))
          add("unresolved-class-helper", node, "This class helper is outside the local checker proof; inspect it before accepting conformance");
        for (const argument of node.arguments) inspectExpression(argument, seen);
        return;
      }
      if (import_typescript.default.isPropertyAccessExpression(node) || import_typescript.default.isElementAccessExpression(node)) {
        const value = import_typescript.default.isIdentifier(node.expression) ? initializer(node.expression) : unwrapped(node.expression);
        if (policy.inlineStaticClasses && value && import_typescript.default.isObjectLiteralExpression(unwrapped(value)))
          add("inline-static-classes", node, "Move this class map to its JSX element; approved CVA variant definitions are exempt");
        if (value) inspectExpression(value, seen);
        return;
      }
      if (policy.completeClassTokens && import_typescript.default.isTemplateExpression(node)) {
        const fragments = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
        if (node.templateSpans.some((_, index) => /\S$/.test(fragments[index]) || /^\S/.test(fragments[index + 1])))
          add("complete-class-tokens", node, "Interpolation constructs only part of a class token");
      }
      if (policy.completeClassTokens && import_typescript.default.isBinaryExpression(node) && node.operatorToken.kind === import_typescript.default.SyntaxKind.PlusToken && !separated(node))
        add("complete-class-tokens", node, "Class concatenation needs complete literal tokens; use a class joiner for independent tokens");
      if (policy.inlineStaticClasses && import_typescript.default.isObjectLiteralExpression(node) && node.properties.some((item) => import_typescript.default.isPropertyAssignment(item) && import_typescript.default.isStringLiteralLike(item.initializer)))
        add("inline-static-classes", node, "An object of class strings hides static element styling");
      import_typescript.default.forEachChild(node, (child) => {
        if (import_typescript.default.isExpression(child)) inspectExpression(child, seen);
      });
    };
    const visit = (node) => {
      if (import_typescript.default.isJsxAttribute(node) && node.name.getText(source) === "className" && node.initializer && import_typescript.default.isJsxExpression(node.initializer) && node.initializer.expression)
        inspectExpression(node.initializer.expression);
      import_typescript.default.forEachChild(node, visit);
    };
    visit(source);
    const required = policy.variants.find((item) => item.file === file.path);
    if (required) {
      const valid = configurations.some((call) => {
        const defaults = property(call.arguments[1], "defaultVariants");
        return required.axes.every((axis) => property(property(call.arguments[1], "variants")?.initializer, axis)) && (required.defaults === "none" ? !defaults : required.axes.every((axis) => property(defaults?.initializer, axis)));
      });
      if (!valid) add("cva-variants", source, `The JSX must consume an imported CVA definition with variants for ${required.axes.join(", ")} and ${required.defaults === "none" ? "no defaultVariants (approved defaults:none)" : "defaultVariants for every listed axis (legacy/per-axis policy)"}`);
    }
  }
  return {
    status: diagnostics.length ? "failed" : "passed",
    diagnostics,
    scope: policy.files,
    authority: "Opt-in team policy. Static source checks do not prove visual equivalence or design quality.",
    limitations: ["Local class bindings and same-file CVA definitions only; cross-file helpers need separate review.", "Theme and product decisions are not selected or changed by this checker."]
  };
}
async function readStylePolicy(root2, path) {
  const file = await projectFile(root2, path);
  return stylePolicySchema.parse(JSON.parse(file.content));
}

// src/style-check.ts
var [root, policyPath] = process.argv.slice(2);
try {
  if (root === "--schema") {
    process.stdout.write(JSON.stringify(toJSONSchema(stylePolicySchema, { io: "input" })) + "\n");
  } else {
    if (!root || !policyPath) throw new Error("Usage: node <plugin>/bundle/style-check.js <project> <project-relative-policy.json>, or --schema");
    const report = await checkStylePolicy(resolve2(root), await readStylePolicy(resolve2(root), policyPath));
    process.stdout.write(JSON.stringify(report) + "\n");
    if (report.status !== "passed") process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(String(error) + "\n");
  process.exitCode = 1;
}
