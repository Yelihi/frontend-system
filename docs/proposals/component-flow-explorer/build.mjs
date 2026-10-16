import {fileURLToPath} from 'node:url';
process.argv[2]??=fileURLToPath(new URL('./spec.json',import.meta.url));
process.argv[3]??=fileURLToPath(new URL('../../../dist/component-flow-explorer/',import.meta.url));
await import('../../../skills/fs-plan-visualize/scripts/build.mjs');
