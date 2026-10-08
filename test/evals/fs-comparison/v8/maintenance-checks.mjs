// Additional independent assertions for one supplied axis and explicit undefined defaults.
for (const [name,spec] of Object.entries(STYLE_CONTRACT)) {
  await check('F-maintenance-partial-defaults-'+name,async()=>{
    const axes=Object.keys(spec.axes);
    for (const supplied of axes) for (const value of Object.keys(spec.axes[supplied])) {
      const other=axes.find(axis=>axis!==supplied);
      for (const props of [{[supplied]:value}, {[supplied]:value,[other]:undefined}]) {
        const node=(await harness('ui/'+name+'.jsx',{...props,children:'Partial',className:'outline-none'})).render();
        const expected=[spec.base,spec.axes[supplied][value],spec.axes[other][spec.defaults[other]],'outline-none'];
        assert.deepEqual(node.props.className.split(/\s+/).filter(Boolean).sort(),expected.join(' ').split(/\s+/).sort());
        assert.equal(text(node),'Partial');
      }
    }
  });
}
await check('F-maintenance-css-variants',async()=>{
  const {compile}=await import(pathToFileURL(join(project,'../runtime/node_modules/@tailwindcss/node/dist/index.mjs')).href);
  const engine=await compile(theme,{base:project,onDependency(){}});
  const css=engine.build(['bg-red-100','text-red-900','bg-amber-100','text-amber-900','p-6']);
  for(const selector of ['.bg-red-100','.text-red-900','.bg-amber-100','.text-amber-900','.p-6'])assert.ok(css.includes(selector),selector);
});
