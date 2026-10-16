import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const modelHash=spec=>createHash('sha256').update(JSON.stringify(spec)).digest('hex');
// Additions remain proposals. Replacing an observed definition requires a new reviewed baseline.
export function addPlannedFlows(base,addition) {
 assert.equal(addition.baseHash,modelHash(base),'Plan baseline changed; review the addition again');
 assert.ok(typeof addition.id==='string' && addition.id.trim(),'Plan addition needs an ID');
 assert.ok(addition.scenarios?.length,'Plan addition needs scenarios');
 const result=structuredClone(base);
 for(const key of ['nodes','pages','instances','scenarios','navigation']) {
  result[key]??=[];
  const ids=new Set(result[key].map(item=>item.id));
  for(const item of addition[key]??[]) {
   assert.ok(item.id&&!ids.has(item.id),'Addition cannot replace an existing '+key+' ID');
   ids.add(item.id);
   result[key].push({...structuredClone(item),...(['nodes','scenarios','navigation'].includes(key)?{basis:'proposed',additionId:addition.id}:{})});
  }
 }
 result.planAddition={id:addition.id,baseHash:addition.baseHash,title:addition.title??addition.id};
 return result;
}
