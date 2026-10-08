// Independent structural oracle: does not import FS's public style checker.
const syntax = (await import(pathToFileURL(join(project, '../runtime/node_modules/typescript/lib/typescript.js')).href)).default;
const walk = (node, predicate) => {
  const found=[]; const visit=n=>{if(predicate(n))found.push(n);syntax.forEachChild(n,visit);};visit(node);return found;
};
const styleSources = new Map();
for (const file of STYLE_POLICY.files) {
  const source=syntax.createSourceFile(file,await readFile(join(project,file),'utf8'),syntax.ScriptTarget.Latest,true,syntax.ScriptKind.JSX);
  styleSources.set(file,source);
  await check('S-inline-'+file.split('/').pop().replace('.jsx',''),()=>{
    const maps=new Set(walk(source,n=>syntax.isVariableDeclaration(n) && n.initializer && syntax.isObjectLiteralExpression(n.initializer)).map(n=>n.name.getText(source)));
    for(const attr of walk(source,n=>syntax.isJsxAttribute(n)&&n.name.getText(source)==='className')) {
      const refs=walk(attr,n=>(syntax.isPropertyAccessExpression(n)||syntax.isElementAccessExpression(n))&&maps.has(n.expression.getText(source)));
      assert.equal(refs.length,0,'Static class map used by JSX');
    }
  });
}
for (const [name,spec] of Object.entries(STYLE_CONTRACT)) {
  const file='ui/'+name+'.jsx',source=styleSources.get(file);
  await check('S-cva-'+name,()=>{
    const options={allowJs:true,jsx:syntax.JsxEmit.Preserve,noLib:true,noResolve:true};
    const host=syntax.createCompilerHost(options);
    host.getSourceFile=path=>path===file?source:undefined;
    const binding=syntax.createProgram([file],options,host).getTypeChecker();
    const declarations=node=>binding.getSymbolAtLocation(node)?.declarations??[];
    const fromCva=node=>declarations(node).some(d=>syntax.isImportSpecifier(d)&&!d.isTypeOnly&&(d.propertyName??d.name).text==='cva'&&d.parent.parent.parent.moduleSpecifier?.text==='class-variance-authority');
    const defs=walk(source,n=>syntax.isVariableDeclaration(n)&&n.initializer&&syntax.isCallExpression(n.initializer)&&fromCva(n.initializer.expression));
    const valid=defs.filter(n=>{
      const object=n.initializer.arguments[1];if(!object||!syntax.isObjectLiteralExpression(object))return false;
      const prop=(obj,key)=>obj?.properties?.find(p=>p.name?.getText(source).replaceAll('"','').replaceAll("'",'')===key)?.initializer;
      return Object.keys(spec.axes).every(axis=>prop(prop(object,'variants'),axis)&&prop(prop(object,'defaultVariants'),axis));
    });
    const consumed=(node,seen=new Set())=>{
      if(seen.has(node))return false;seen.add(node);
      if(syntax.isCallExpression(node)&&declarations(node.expression).some(d=>valid.includes(d)))return true;
      if(syntax.isIdentifier(node)){
        const declaration=declarations(node).find(syntax.isVariableDeclaration);
        if(declaration?.initializer&&consumed(declaration.initializer,seen))return true;
      }
      return Boolean(syntax.forEachChild(node,child=>consumed(child,seen)||undefined));
    };
    const used=walk(source,n=>syntax.isJsxAttribute(n)&&n.name.getText(source)==='className').some(attr=>consumed(attr));
    assert.ok(used,'JSX must consume a real CVA definition with both axes and defaults');
  });
  await check('F-style-variants-'+name,async()=>{
    const axes=Object.keys(spec.axes);
    for(const a of Object.keys(spec.axes[axes[0]])) for(const b of Object.keys(spec.axes[axes[1]])) {
      const props={[axes[0]]:a,[axes[1]]:b,children:'Body',className:'outline-none'};
      const node=(await harness(file,props)).render();
      assert.equal(node.type,spec.tag);
      assert.deepEqual(node.props.className.split(/\s+/).filter(Boolean).sort(),[spec.base,spec.axes[axes[0]][a],spec.axes[axes[1]][b],'outline-none'].join(' ').split(/\s+/).sort());
      assert.equal(text(node),'Body');
    }
    const node=(await harness(file,{children:'default'})).render();
    assert.deepEqual(node.props.className.split(/\s+/).filter(Boolean).sort(),[spec.base,...axes.map(axis=>spec.axes[axis][spec.defaults[axis]])].join(' ').split(/\s+/).sort());
  });
}
await check('F-style-native-props',async()=>{
  const onClick=()=>{},attrs={onClick,disabled:true,type:'submit','aria-label':'Known action','data-id':'stable'};
  const node=(await harness('ui/ActionButton.jsx',attrs)).render();
  for(const [key,value] of Object.entries(attrs))assert.equal(node.props[key],value,key);
});
await check('S-complete-class-tokens',()=>{
  // Inspect class-producing expressions, not unrelated template strings or CVA selection labels.
  let currentBindings;
  const inspect=(node,seen=new Set())=>{
    if(!node||seen.has(node))return;seen.add(node);
    if(syntax.isIdentifier(node)){
      const declaration=(currentBindings.getSymbolAtLocation(node)?.declarations??[]).find(syntax.isVariableDeclaration);
      if(declaration?.initializer)inspect(declaration.initializer,seen);return;
    }
    if(syntax.isConditionalExpression(node)){inspect(node.whenTrue,seen);inspect(node.whenFalse,seen);return;}
    if(syntax.isBinaryExpression(node)&&node.operatorToken.kind===syntax.SyntaxKind.AmpersandAmpersandToken){inspect(node.right,seen);return;}
    if(syntax.isCallExpression(node))return; // Arbitrary helper semantics remain outside this static proof.
    if(syntax.isTemplateExpression(node)){
      const fragments=[node.head.text,...node.templateSpans.map(span=>span.literal.text)];
      assert.ok(!node.templateSpans.some((_,i)=>/\S$/.test(fragments[i])||/^\S/.test(fragments[i+1])),'Partial class interpolation');
    }
    syntax.forEachChild(node,child=>inspect(child,seen));
  };
  for(const [file,source] of styleSources){
    const options={allowJs:true,jsx:syntax.JsxEmit.Preserve,noLib:true,noResolve:true};
    const host=syntax.createCompilerHost(options);host.getSourceFile=path=>path===file?source:undefined;
    const bindings=syntax.createProgram([file],options,host).getTypeChecker();currentBindings=bindings;
    for(const attr of walk(source,n=>syntax.isJsxAttribute(n)&&n.name.getText(source)==='className'))inspect(attr.initializer);
    const isCva=node=>(bindings.getSymbolAtLocation(node)?.declarations??[]).some(d=>syntax.isImportSpecifier(d)&&!d.isTypeOnly&&(d.propertyName??d.name).text==='cva'&&d.parent.parent.parent.moduleSpecifier?.text==='class-variance-authority');
    const field=(node,key)=>node&&syntax.isObjectLiteralExpression(node)?node.properties.find(p=>syntax.isPropertyAssignment(p)&&p.name.getText(source).replaceAll('"','').replaceAll("'",'')===key)?.initializer:undefined;
    for(const call of walk(source,n=>syntax.isCallExpression(n)&&isCva(n.expression))){
      inspect(call.arguments[0]);
      const variants=field(call.arguments[1],'variants');
      if(variants&&syntax.isObjectLiteralExpression(variants))for(const axis of variants.properties){
        if(syntax.isPropertyAssignment(axis)&&syntax.isObjectLiteralExpression(axis.initializer))for(const value of axis.initializer.properties){
          if(syntax.isPropertyAssignment(value))inspect(value.initializer);
        }
      }
      const compound=field(call.arguments[1],'compoundVariants');
      if(compound&&syntax.isArrayLiteralExpression(compound))for(const entry of compound.elements){inspect(field(entry,'class'));inspect(field(entry,'className'));}
    }
  }
});
const theme=(await readFile(join(project,'theme.css'),'utf8')).replace(/\/\*[\s\S]*?\*\//g,'');
await check('Q-theme-strategy',()=>{
  assert.match(theme,/@theme\s+inline\s*\{/);
  assert.match(theme,/--color-action\s*:\s*var\(--color-blue-600\)/);
  assert.match(theme,/--color-on-action\s*:\s*var\(--color-white\)/);
  assert.doesNotMatch(theme,/@utility/,'Replace ad hoc theme utilities with the selected semantic tokens');
});
await check('Q-no-unapproved-dark-mode',()=>{
  assert.doesNotMatch(theme,/dark|prefers-color-scheme|#[0-9a-f]{3,8}\b/i);
  assert.deepEqual([...theme.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]).sort(),['--color-action','--color-on-action']);
});
await check('F-tailwind-generated-css',async()=>{
  const {compile}=await import(pathToFileURL(join(project,'../runtime/node_modules/@tailwindcss/node/dist/index.mjs')).href);
  const engine=await compile(theme,{base:project,onDependency(){}});
  const css=engine.build(['bg-action','text-on-action','border-action','px-3','disabled:opacity-50']);
  for(const selector of ['.bg-action','.text-on-action','.border-action','.px-3'])assert.ok(css.includes(selector),selector);
  assert.ok(css.includes('--color-blue-600'));assert.ok(css.includes('opacity: 50%')||css.includes('opacity: .5')||css.includes('opacity: 0.5'));
});
