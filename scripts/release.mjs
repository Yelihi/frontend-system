import {writeFile} from 'node:fs/promises';
import {createReleaseManifest, checkReleaseManifest, checkReleaseReadiness, setReleaseVersion} from '../dist/src/application/release-manifest.js';

const [command, version] = process.argv.slice(2);
const root = process.cwd();
if (command === 'version' && version) {
  await setReleaseVersion(root, version);
  console.log(`Prepared ${version}; build and review before manually releasing. Nothing was published.`);
} else if (command === 'manifest') {
  const manifest = await createReleaseManifest(root);
  await writeFile('release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Recorded ${manifest.pluginVersion}: ${manifest.knowledge.length} knowledge entries.`);
} else if (command === 'check' || command === 'ready') {
  const manifest = await (command === 'ready' ? checkReleaseReadiness : checkReleaseManifest)(root);
  if (version && version !== manifest.pluginVersion) throw new Error('Requested release version differs from the manifest');
  console.log(`Release ${command} passed: ${manifest.pluginVersion}`);
} else throw new Error('Usage: node scripts/release.mjs version <version> | manifest | check [version] | ready [version]');
