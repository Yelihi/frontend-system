import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

test('routing can be the first ESM import without weakening persisted route validation', async () => {
  const routing = new URL('../src/application/knowledge/routing.js', import.meta.url).href;
  const evidence = new URL('../src/application/design-evidence.js', import.meta.url).href;
  const result = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', `
    const { routingInputSchema } = await import(${JSON.stringify(routing)});
    const { designEvidenceSchema } = await import(${JSON.stringify(evidence)});
    const route = designEvidenceSchema.shape.routes.element.options[0];
    const hash = 'a'.repeat(64);
    const valid = { input: { files: ['src/view.ts'], query: 'Inspect ownership' }, hash, judgments: [] };
    console.log(JSON.stringify({
      valid: route.safeParse(valid).success,
      emptyFiles: route.safeParse({ ...valid, input: { ...valid.input, files: [] } }).success,
      emptyQuery: route.safeParse({ ...valid, input: { ...valid.input, query: '' } }).success,
      sameDefaults: JSON.stringify(route.parse(valid).input) === JSON.stringify(routingInputSchema.parse(valid.input))
    }));
  `], { timeout: 10000 });
  assert.deepEqual(JSON.parse(result.stdout), { valid: true, emptyFiles: false, emptyQuery: false, sameDefaults: true });
});

test('project analysis payload can be the first ESM import and retains user-decision validation',async()=>{
  const path=new URL('../src/application/project-analysis-input.js',import.meta.url).href;
  const result=await promisify(execFile)(process.execPath,['--input-type=module','-e',`
    const {projectContextPayloadSchema}=await import(${JSON.stringify(path)});
    console.log(JSON.stringify({valid:projectContextPayloadSchema.safeParse({analysis:{summary:'Bounded source analysis'}}).success,
      malformed:projectContextPayloadSchema.safeParse({analysis:{summary:42}}).success,
      unknownTransport:projectContextPayloadSchema.safeParse({analysis:{summary:'x'},expectedHash:null}).success}));
  `],{timeout:10000});
  assert.deepEqual(JSON.parse(result.stdout),{valid:true,malformed:false,unknownTransport:false});
});
