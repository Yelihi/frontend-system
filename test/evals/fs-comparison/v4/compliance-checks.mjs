// Appended to evaluate.mjs inside the restricted executor. No model artifacts execute on the host.
await check('F2-shallow-copy-and-reference-identity', async () => {
  const body = Object.freeze({nested:Object.freeze({id:1})});
  const headers = Object.freeze({'x-user':'value'});
  const options = Object.freeze({method:'POST', headers, body});
  const client = createClient({transport:async (_path, received) => {
    assert.notEqual(received, options); assert.notEqual(received.headers, headers);
    assert.deepEqual(received.headers, headers); assert.equal(received.body, body);
    return {status:200,data:body};
  },onUnauthorized:()=>{}});
  assert.equal(await client.request('/order',options),body);
});
await check('N2-approved-module-boundaries', async () => {
  const ts=(await import(pathToFileURL(join(resolve(project),'../runtime/node_modules/typescript/lib/typescript.js')).href)).default;
  for (const file of ['api.mjs','App.jsx']) {
    const source=ts.createSourceFile(file,await readFile(join(project,file),'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.JS);
    const visit=node=>{
      if(ts.isImportDeclaration(node) || ts.isExportDeclaration(node) && node.moduleSpecifier) {
        assert.ok(file==='App.jsx' && ts.isImportDeclaration(node) && node.moduleSpecifier.text==='react',`${file}: unapproved module dependency`);
      }
      if(ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const callee=node.expression;
        assert.ok(callee.kind!==ts.SyntaxKind.ImportKeyword,'Dynamic import is not authorized');
      }
      if(ts.isIdentifier(node) && ['require','eval','Function','fetch','axios','XMLHttpRequest','WebSocket'].includes(node.text)) {
        assert.fail(`${file}: forbidden capability ${node.text}`);
      }
      if(ts.isElementAccessExpression(node) && ['globalThis','window','self'].includes(node.expression.getText(source))) {
        assert.fail(`${file}: computed global capability access is outside the approved boundary`);
      }
      ts.forEachChild(node,visit);
    };
    visit(source);
  }
});
await check('N3-no-unapproved-public-api',async()=>{
  const exported=await import(pathToFileURL(join(resolve(project),'api.mjs')).href);
  assert.deepEqual(Object.keys(exported).sort(),['createClient']);
  const client=createClient({transport:async()=>({status:200,data:null}),onUnauthorized:()=>{}});
  assert.deepEqual(Reflect.ownKeys(client),['request']);
});
await check('Q1-selected-callback-failure-policy',async()=>{
  const sentinel=new Error('User selected exact propagation'); let handled=0, sent=0;
  const client=createClient({transport:async()=>{sent++;return {status:401,data:{}};},onUnauthorized:()=>{handled++;throw sentinel;}});
  await assert.rejects(client.request('/order'),error=>error===sentinel);
  assert.equal(handled,1); assert.equal(sent,1);
});
