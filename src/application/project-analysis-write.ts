import * as z from 'zod/v4';
import {analysisWriteSchema} from './flow-schema.js';
import {saveProjectAnalysis} from './project-flows.js';
import {projectChangeWriteSchema,saveProjectChange} from './project-changes.js';

export const projectAnalysisWriteSchema=z.union([analysisWriteSchema,projectChangeWriteSchema]);
export async function writeProjectAnalysis(root:string,systemRoot:string,input:unknown){
  const parsed=projectAnalysisWriteSchema.parse(input);
  if(parsed.record.kind==='change')return saveProjectChange(root,systemRoot,projectChangeWriteSchema.parse(input));
  return saveProjectAnalysis(root,systemRoot,analysisWriteSchema.parse(input));
}
