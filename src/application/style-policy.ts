import { resolve } from 'node:path';
import ts from 'typescript';
import * as z from 'zod/v4';
import { projectFile } from './source-file.js';

export const stylePolicySchema = z.strictObject({
  version: z.literal(1),
  files: z.array(z.string().min(1)).min(1).max(40),
  inlineStaticClasses: z.boolean().default(false),
  completeClassTokens: z.boolean().default(true),
  variants: z.array(z.strictObject({file: z.string().min(1), axes: z.array(z.string().min(1)).min(2).refine(axes => new Set(axes).size === axes.length, 'Variant axes must be distinct'),
    defaults: z.enum(['per-axis', 'none']).default('per-axis').describe('Choose from the approved contract: none forbids defaultVariants; per-axis retains the legacy requirement for a default on every listed axis. This does not verify public prop optionality.'),
  })).default([]),
});
export type StylePolicy = z.input<typeof stylePolicySchema>;

// An opt-in team convention checker, not a universal Tailwind style guide.
// Only local bindings are followed. Imported helpers require a scoped human/model review.
export async function checkStylePolicy(root: string, input: StylePolicy) {
  const policy = stylePolicySchema.parse(input);
  if (policy.variants.some(item => !policy.files.includes(item.file))) throw new Error('Variant files must be in the checked scope');
  if (new Set(policy.variants.map(item => item.file)).size !== policy.variants.length) throw new Error('Variant files must be distinct');
  const files = await Promise.all([...new Set(policy.files)].map(async path => ({...await projectFile(root, path), path})));
  if (files.some(file => !/\.[cm]?[jt]sx?$/.test(file.path))) throw new Error('Style policy supports JS/TS/JSX/TSX source files');
  const sources = new Map(files.map(file => [resolve(file.absolute), ts.createSourceFile(file.absolute, file.content, ts.ScriptTarget.Latest, true)]));
  const options = {allowJs: true, jsx: ts.JsxEmit.Preserve, noLib: true, noResolve: true};
  const host = ts.createCompilerHost(options);
  host.getSourceFile = name => sources.get(resolve(name));
  host.writeFile = () => {};
  const program = ts.createProgram([...sources.keys()], options, host), checker = program.getTypeChecker();
  const diagnostics: Array<{rule: string; path: string; line: number; column: number; message: string}> = [];
  for (const file of files) {
    const source = sources.get(resolve(file.absolute))!;
    const add = (rule: string, node: ts.Node, message: string) => {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      if (!diagnostics.some(item => item.path === file.path && item.rule === rule && item.line === position.line + 1))
        diagnostics.push({rule, path: file.path, line: position.line + 1, column: position.character + 1, message});
    };
    if (program.getSyntacticDiagnostics(source).length) {add('parse', source, 'Source could not be parsed'); continue;}
    const declarations = (node: ts.Node) => checker.getSymbolAtLocation(node)?.declarations ?? [];
    const imported = (node: ts.Node, name: string, module = 'class-variance-authority') => declarations(node).some(declaration => {
      if (!ts.isImportSpecifier(declaration) || declaration.isTypeOnly || (declaration.propertyName ?? declaration.name).text !== name) return false;
      const statement = declaration.parent.parent.parent;
      return ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === module;
    });
    const initializer = (node: ts.Node): ts.Expression | undefined => {
      const declaration = declarations(node).find(ts.isVariableDeclaration);
      return declaration?.initializer;
    };
    const property = (object: ts.Node | undefined, name: string) => object && ts.isObjectLiteralExpression(object)
      ? object.properties.find(item => ts.isPropertyAssignment(item) && item.name.getText(source).replace(/^['"]|['"]$/g, '') === name) as ts.PropertyAssignment | undefined : undefined;
    const unwrapped = (node: ts.Expression): ts.Expression => ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) ? unwrapped(node.expression) : node;
    const configurations: ts.CallExpression[] = [];
    const tokenEdge = (raw: ts.Expression, edge: 'start' | 'end'): string | undefined => {
      const node = unwrapped(raw);
      if (ts.isStringLiteralLike(node)) return node.text;
      if (ts.isTemplateExpression(node)) return edge === 'start' ? node.head.text : node.templateSpans.at(-1)?.literal.text;
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken)
        return tokenEdge(edge === 'start' ? node.left : node.right, edge);
      return undefined;
    };
    const separated = (node: ts.BinaryExpression) => {
      const left = tokenEdge(node.left, 'end'), right = tokenEdge(node.right, 'start');
      return left === '' || right === '' || /\s$/.test(left ?? '') || /^\s/.test(right ?? '');
    };
    const inspectCvaTokens = (node: ts.Node) => {
      if (ts.isConditionalExpression(node)) {inspectCvaTokens(node.whenTrue); inspectCvaTokens(node.whenFalse); return;}
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {inspectCvaTokens(node.right); return;}
      if (policy.completeClassTokens && ts.isTemplateExpression(node)) {
        const fragments = [node.head.text, ...node.templateSpans.map(span => span.literal.text)];
        if (node.templateSpans.some((_, index) => /\S$/.test(fragments[index]!) || /^\S/.test(fragments[index + 1]!)))
          add('complete-class-tokens', node, 'CVA constructs only part of a class token');
      }
      if (policy.completeClassTokens && ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken && !separated(node))
        add('complete-class-tokens', node, 'CVA class concatenation needs complete literal tokens');
      ts.forEachChild(node, inspectCvaTokens);
    };
    const inspectCvaClasses = (call: ts.CallExpression) => {
      if (call.arguments[0]) inspectCvaTokens(call.arguments[0]);
      const options = call.arguments[1];
      const variants = property(options, 'variants')?.initializer;
      if (variants && ts.isObjectLiteralExpression(variants)) {
        for (const axis of variants.properties) {
          if (!ts.isPropertyAssignment(axis) || !ts.isObjectLiteralExpression(axis.initializer)) continue;
          // Axis/case keys and defaultVariants are selection data, not class text.
          for (const choice of axis.initializer.properties) {
            if (ts.isPropertyAssignment(choice)) inspectCvaTokens(choice.initializer);
          }
        }
      }
      const compounds = property(options, 'compoundVariants')?.initializer;
      if (compounds && ts.isArrayLiteralExpression(compounds)) {
        for (const compound of compounds.elements) for (const key of ['class', 'className']) {
          const value = property(compound, key)?.initializer;
          if (value) inspectCvaTokens(value);
        }
      }
    };
    const inspectExpression = (raw: ts.Expression, seen = new Set<ts.Node>()) => {
      const node = unwrapped(raw);
      if (seen.has(node)) return;
      seen.add(node);
      // A condition computes a choice, not class text. Do not diagnose its data or predicate helpers.
      if (ts.isConditionalExpression(node)) {inspectExpression(node.whenTrue, seen); inspectExpression(node.whenFalse, seen); return;}
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {inspectExpression(node.right, seen); return;}
      if (ts.isIdentifier(node)) {const value = initializer(node); if (value) inspectExpression(value, seen); return;}
      if (ts.isCallExpression(node)) {
        const initial = ts.isIdentifier(node.expression) ? initializer(node.expression) : undefined;
        const value = initial ? unwrapped(initial) : undefined;
        if (value && ts.isCallExpression(value) && imported(value.expression, 'cva')) {configurations.push(value); inspectCvaClasses(value); return;}
        if (policy.inlineStaticClasses && !imported(node.expression, 'cx') && !imported(node.expression, 'clsx', 'clsx') && !imported(node.expression, 'twMerge', 'tailwind-merge'))
          add('unresolved-class-helper', node, 'This class helper is outside the local checker proof; inspect it before accepting conformance');
        // Recognized class joiners still need their arguments inspected.
        for (const argument of node.arguments) inspectExpression(argument, seen);
        return;
      }
      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
        const value = ts.isIdentifier(node.expression) ? initializer(node.expression) : unwrapped(node.expression);
        if (policy.inlineStaticClasses && value && ts.isObjectLiteralExpression(unwrapped(value)))
          add('inline-static-classes', node, 'Move this class map to its JSX element; approved CVA variant definitions are exempt');
        if (value) inspectExpression(value, seen);
        return;
      }
      if (policy.completeClassTokens && ts.isTemplateExpression(node)) {
        const fragments = [node.head.text, ...node.templateSpans.map(span => span.literal.text)];
        if (node.templateSpans.some((_, index) => /\S$/.test(fragments[index]!) || /^\S/.test(fragments[index + 1]!)))
          add('complete-class-tokens', node, 'Interpolation constructs only part of a class token');
      }
      if (policy.completeClassTokens && ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken && !separated(node))
        add('complete-class-tokens', node, 'Class concatenation needs complete literal tokens; use a class joiner for independent tokens');
      if (policy.inlineStaticClasses && ts.isObjectLiteralExpression(node) && node.properties.some(item => ts.isPropertyAssignment(item) && ts.isStringLiteralLike(item.initializer)))
        add('inline-static-classes', node, 'An object of class strings hides static element styling');
      ts.forEachChild(node, child => {if (ts.isExpression(child)) inspectExpression(child, seen);});
    };
    const visit = (node: ts.Node) => {
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'className' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression)
        inspectExpression(node.initializer.expression);
      ts.forEachChild(node, visit);
    };
    visit(source);
    const required = policy.variants.find(item => item.file === file.path);
    if (required) {
      const valid = configurations.some(call => {
        const defaults = property(call.arguments[1], 'defaultVariants');
        return required.axes.every(axis => property(property(call.arguments[1], 'variants')?.initializer, axis))
          && (required.defaults === 'none' ? !defaults : required.axes.every(axis => property(defaults?.initializer, axis)));
      });
      if (!valid) add('cva-variants', source, `The JSX must consume an imported CVA definition with variants for ${required.axes.join(', ')} and ${required.defaults === 'none' ? 'no defaultVariants (approved defaults:none)' : 'defaultVariants for every listed axis (legacy/per-axis policy)'}`);
    }
  }
  return {status: diagnostics.length ? 'failed' : 'passed', diagnostics,
    scope: policy.files, authority: 'Opt-in team policy. Static source checks do not prove visual equivalence or design quality.',
    limitations: ['Local class bindings and same-file CVA definitions only; cross-file helpers need separate review.', 'Theme and product decisions are not selected or changed by this checker.']};
}

export async function readStylePolicy(root: string, path: string) {
  const file = await projectFile(root, path);
  return stylePolicySchema.parse(JSON.parse(file.content));
}
