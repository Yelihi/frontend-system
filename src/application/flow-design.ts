import {createHash} from 'node:crypto';
import type {ProjectFlow} from './flow-schema.js';
import {projectFileBytes} from './source-file.js';

export function validateFlowDesign(flow: ProjectFlow) {
  const design = flow.design;
  if (!design) return;
  const nodes = new Map(flow.nodes.map(n => [n.id,n]));
  const ids = new Set<string>();
  for (const screen of design.screens) {
    if (ids.has(screen.id)) throw new Error('Duplicate design screen ID');
    ids.add(screen.id);
    if (nodes.get(screen.page)?.kind !== 'page') throw new Error('Design screen must reference a page');
    for (const asset of [screen.image, ...(screen.reference ? [screen.reference] : [])]) {
      if (!flow.scope.files.includes(asset.path)) throw new Error('Design image must be included in scope.files');
    }
    if (screen.confirmation && (!flow.evidence[screen.confirmation.evidence] || screen.confirmation.imageHash !== screen.image.hash)) {
      throw new Error('Design confirmation requires evidence and the exact image hash');
    }
    for (const region of screen.regions) {
      let node = nodes.get(region.node);
      if (node?.kind !== 'component') throw new Error('Design region must link a component');
      while (node && node.id !== screen.page) node = node.parent ? nodes.get(node.parent) : undefined;
      if (!node || region.x + region.width > 100 || region.y + region.height > 100) throw new Error('Design region must fit its image and belong to its page');
    }
  }
  if (design.stage === 'visual-review') {
    if (flow.edges.length || flow.scenarios.length || design.quality.length || design.screens.some(s => s.regions.length) ||
      flow.nodes.some(n => n.kind !== 'page' || n.contracts?.length || n.props.length || n.state.length || n.events.length || n.lifecycle.length)) {
      throw new Error('Visual review contains pages and mockups only; detailed design requires a subsequent request');
    }
  } else if (design.screens.some(s => !s.confirmation) || !design.detailRequest || !flow.evidence[design.detailRequest]) {
    throw new Error('Detailed design requires confirmed images and user request evidence');
  }
  for (const item of design.quality) if (item.nodes.some(id => !nodes.has(id))) throw new Error('Unknown quality requirement node');
}

/** Resolve only bounded local raster files. Image bytes never enter AI record JSON. */
export async function loadFlowDesignImages(root: string, flow: ProjectFlow) {
  const images: Record<string,string> = {};
  let bytes = 0;
  for (const screen of flow.design?.screens ?? []) for (const asset of [screen.image, ...(screen.reference ? [screen.reference] : [])]) {
    const data = await projectFileBytes(root, asset.path);
    if (createHash('sha256').update(data).digest('hex') !== asset.hash) throw new Error(`Design image hash changed: ${asset.path}`);
    bytes += data.length;
    if (bytes > 24 * 1024 * 1024) throw new Error('Design images exceed the 24 MiB total budget');
    if (images[asset.path]) continue;
    const mime = data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
      : data[0] === 255 && data[1] === 216 && data[2] === 255 ? 'image/jpeg'
      : data.toString('ascii',0,4) === 'RIFF' && data.toString('ascii',8,12) === 'WEBP' ? 'image/webp' : null;
    if (!mime) throw new Error('Design images must be PNG, JPEG or WebP raster files');
    images[asset.path] = `data:${mime};base64,${data.toString('base64')}`;
  }
  return images;
}
