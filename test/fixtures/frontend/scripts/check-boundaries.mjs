import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve('src/features');
const errors = [];
async function visit(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) { await visit(path); continue; }
    if (!/\.[cm]?[jt]sx?$/.test(path)) continue;
    const owner = relative(root, path).split('/')[0];
    const source = ts.createSourceFile(path, await readFile(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const inspect = node => {
      let specifier;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require')) specifier = node.arguments[0];
      if (specifier) {
        if (!ts.isStringLiteralLike(specifier)) errors.push(`UNRESOLVED_IMPORT ${relative(root, path)}: dynamic specifier requires review`);
        else {
          const name = specifier.text;
          // ponytail: fixture supports relative paths and @/; adopt project resolver for other aliases.
          const target = name.startsWith('@/') ? resolve('src', name.slice(2)) : name.startsWith('.') ? resolve(dirname(path), name) : undefined;
          if (target) {
            const targetPath = relative(root, target);
            const parts = targetPath.split('/');
            if (!targetPath.startsWith('..') && parts[0] !== owner && !(parts.length === 2 && /^index(?:\.[cm]?[jt]s)?$/.test(parts[1]))) errors.push(`FEATURE_BOUNDARY ${relative(root, path)} -> ${name}`);
          }
        }
      }
      ts.forEachChild(node, inspect);
    };
    inspect(source);
  }
}
await visit(root);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
