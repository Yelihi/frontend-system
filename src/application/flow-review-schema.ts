import * as z from 'zod/v4';
import {localPath} from './policy.js';

const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/);
const text=z.string().min(1).max(4000);
export const changeKind=z.enum(['existing','modified','added','unknown']);
export const fieldValue=z.union([z.string().max(1600),z.number().finite(),z.boolean(),z.null(),z.object({status:z.enum(['unknown','absent'])}).strict()]);
const ids=z.array(id).max(80);
export const reviewStepSchema=z.object({id,title:text,code:text,edgeIds:ids.min(1),ruleIds:ids,testIds:ids,
  changes:z.array(z.object({fieldId:id,before:fieldValue,after:fieldValue,changeKind:z.enum(['changed','preserved']),basis:z.enum(['source','measured','proposed'])}).strict()).max(40),
}).strict();
export const reviewTestSchema=z.object({title:text,runner:text,layer:text,setup:z.array(text),mutation:text,limits:text,nodeIds:ids,ruleIds:ids,stepIds:ids}).strict();
export const reviewNodeSchema=z.object({changeKind,reason:text,contractIds:ids,
  flowCard:z.object({order:z.number().int().min(0),kind:text}).strict().optional(),
  graph:z.object({row:z.number().int().min(1).max(30),col:z.number().int().min(1).max(3),caption:text}).strict().optional(),
}).strict();
const block=z.object({id,role:z.enum(['progress','content','microphone','timer','feedback','player','actions']),
  nodeId:id,label:text,content:z.array(text).max(12),value:z.number().min(0).max(100).optional(),editId:id.optional(),
}).strict();
export const flowReviewSchema=z.object({version:z.literal(1),projectLabel:text,sourceCommit:z.string().regex(/^[a-f0-9]{40}$/),
  sourceBaseUrl:z.url().refine(v=>v.startsWith('https://'),'Source links require HTTPS').optional(),
  domain:z.object({name:text,scope:text,terms:z.array(z.object({term:text,meaning:text}).strict()),excluded:z.array(text)}).strict(),
  contracts:z.array(z.object({id,title:text,status:text,path:localPath,nodeIds:ids.min(1),signature:text,description:text,evidence:ids,changeKind}).strict()).max(80),
  fields:z.array(z.object({id,ownerNodeId:id,name:text,fieldKind:z.enum(['state','ref','db','result','unknown']),type:text,description:text,display:z.enum(['badge','table','both']).default('both'),initial:fieldValue,evidence:ids}).strict()).max(160),
  screens:z.array(z.object({sceneId:id,title:text,blocks:z.array(block).min(1).max(30)}).strict()).min(1).max(80),
  edits:z.array(z.object({id,title:text,initial:text,existing:text,maxLength:z.number().int().positive().max(1600),
    nodeIds:ids,contractIds:ids,testIds:ids,ruleIds:ids,signatureToken:text.optional()}).strict()).max(12),
  graphNote:text,dependencyEdgeIds:ids,
}).strict();
