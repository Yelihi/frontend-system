import type ts from 'typescript';

type Compiler = typeof ts;
type Unit = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration;
const isUnit = (c: Compiler, node: ts.Node): node is Unit => c.isFunctionDeclaration(node) || c.isFunctionExpression(node) || c.isArrowFunction(node) || c.isMethodDeclaration(node);
function owner(c: Compiler, node: ts.Node): Unit | undefined {
  for (let current = node.parent; current; current = current.parent) if (isUnit(c, current)) return current;
  return undefined;
}
function unwrapped(c: Compiler, node: ts.Expression): ts.Expression {
  return c.isParenthesizedExpression(node) ? unwrapped(c, node.expression) : node;
}

// A syntax seed, not a defect: only a real enclosing parameter binding qualifies.
// Same-named locals and nested functions do not inherit the outer function's fact.
export function parameterDispatch(c: Compiler, checker: ts.TypeChecker, node: ts.Node) {
  let expression: ts.Expression | undefined;
  if (c.isSwitchStatement(node)) expression = node.expression;
  if (c.isIfStatement(node)) {
    const condition = unwrapped(c, node.expression);
    if (c.isBinaryExpression(condition) && [c.SyntaxKind.EqualsEqualsEqualsToken, c.SyntaxKind.EqualsEqualsToken,
      c.SyntaxKind.ExclamationEqualsEqualsToken, c.SyntaxKind.ExclamationEqualsToken].includes(condition.operatorToken.kind)) {
      const literal = (n: ts.Node) => c.isStringLiteral(n) || c.isNumericLiteral(n) || n.kind === c.SyntaxKind.TrueKeyword || n.kind === c.SyntaxKind.FalseKeyword;
      expression = literal(condition.right) ? condition.left : literal(condition.left) ? condition.right : undefined;
    }
  }
  if (!expression) return;
  const selector = expression;
  expression = unwrapped(c, expression);
  while (c.isPropertyAccessExpression(expression) || (c.isElementAccessExpression(expression) && expression.argumentExpression && c.isStringLiteral(expression.argumentExpression)))
    expression = unwrapped(c, expression.expression);
  if (!c.isIdentifier(expression)) return;
  const unit = owner(c, node);
  const declarations = checker.getSymbolAtLocation(expression)?.declarations ?? [];
  if (!unit || !declarations.some(d => c.isParameter(d) && d.parent === unit)) return;
  return { unit, selector };
}

export function relationCollector(c: Compiler, checker: ts.TypeChecker, paths: Map<string, string>, limit = 200) {
  const facts: Array<Record<string, unknown>> = [];
  let omitted = 0;
  const short = (node: ts.Node) => node.getText().slice(0, 180);
  const location = (node: ts.Node) => {
    const source = node.getSourceFile();
    const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
    return { path: paths.get(source.fileName)!, line: pos.line + 1, column: pos.character + 1 };
  };
  const unitId = (node: ts.Node) => `${location(node).path}:${node.getStart()}`;
  function target(expression: ts.Expression): string | null {
    let symbol = checker.getSymbolAtLocation(expression);
    if (symbol && symbol.flags & c.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const declaration = symbol?.declarations?.[0];
    const unit = declaration && (isUnit(c, declaration) ? declaration
      : c.isVariableDeclaration(declaration) && declaration.initializer && isUnit(c, declaration.initializer) ? declaration.initializer : undefined);
    // Method access can be dynamically overridden. Retain it as an unresolved edge.
    return unit && !c.isMethodDeclaration(unit) && paths.has(unit.getSourceFile().fileName) ? unitId(unit) : null;
  }
  const argument = (node: ts.Expression): Record<string, unknown> => {
    if (c.isStringLiteral(node) || c.isNumericLiteral(node) || [c.SyntaxKind.TrueKeyword, c.SyntaxKind.FalseKeyword, c.SyntaxKind.NullKeyword].includes(node.kind))
      return { kind: 'literal', value: short(node) };
    if (c.isObjectLiteralExpression(node)) return { kind: 'object', fields: node.properties.slice(0, 8).map(p => ({
      name: 'name' in p && p.name ? short(p.name) : 'spread',
      value: c.isPropertyAssignment(p) ? short(p.initializer) : short(p),
      literal: c.isPropertyAssignment(p) && (c.isStringLiteral(p.initializer) || c.isNumericLiteral(p.initializer) || [c.SyntaxKind.TrueKeyword, c.SyntaxKind.FalseKeyword, c.SyntaxKind.NullKeyword].includes(p.initializer.kind)),
    })), truncated: node.properties.length > 8 };
    const callbackTarget = isUnit(c, node) ? unitId(node) : c.isIdentifier(node) ? target(node) : null;
    return { kind: isUnit(c, node) ? 'callback' : c.isIdentifier(node) ? 'identifier' : 'expression', expression: short(node),
      ...(callbackTarget ? { target: callbackTarget } : {}) };
  };
  function add(node: ts.Node, fact: Record<string, unknown>) {
    if (facts.length >= limit) { omitted++; return; }
    const enclosing = owner(c, node);
    facts.push({ ...location(node), owner: enclosing ? unitId(enclosing) : null, evidence: short(node), ...fact });
  }
  function visit(node: ts.Node) {
    if (isUnit(c, node)) add(node, { kind: 'function', id: unitId(node),
      name: node.name ? short(node.name) : c.isVariableDeclaration(node.parent) ? short(node.parent.name) : '<callback>',
      parameters: node.parameters.slice(0, 8).map(p => ({ name: short(p.name), type: p.type ? short(p.type) : null })),
      truncated: node.parameters.length > 8 });
    if (c.isCallExpression(node)) add(node, { kind: 'call', callee: short(node.expression), target: target(node.expression),
      arguments: node.arguments.slice(0, 8).map(argument), truncated: node.arguments.length > 8 });
    if (c.isJsxAttribute(node) && node.initializer && c.isJsxExpression(node.initializer) && node.initializer.expression) {
      const expression = node.initializer.expression;
      if (isUnit(c, expression) || c.isIdentifier(expression)) add(node, { kind: 'callback-binding',
        site: `jsx:${short(node.name)}`, target: isUnit(c, expression) ? unitId(expression) : target(expression),
        meaning: 'JSX value binding only; custom props do not prove a DOM event' });
    }
    const dispatch = parameterDispatch(c, checker, node);
    if (dispatch) add(node, { kind: 'parameter-dispatch', selector: short(dispatch.selector), function: unitId(dispatch.unit) });
    if (c.isReturnStatement(node)) add(node, { kind: 'return', expression: node.expression ? short(node.expression) : null });
    if (c.isBinaryExpression(node) && node.operatorToken.kind >= c.SyntaxKind.FirstAssignment && node.operatorToken.kind <= c.SyntaxKind.LastAssignment)
      add(node, { kind: 'write', target: short(node.left), operator: short(node.operatorToken), value: short(node.right), meaning: 'Assignment syntax, not proof of ownership or mutation of caller data' });
  }
  return { visit, result: () => ({ facts, omitted, truncated: omitted > 0, limit,
    authority: 'Bounded syntax/binding facts from selected files only. Null call targets, dynamic registration, method dispatch, aliases and unselected callees require host inspection. No runtime execution, complete call graph or absence proof.' }) };
}
