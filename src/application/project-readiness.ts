import {contextMetadata,projectSnapshot,projectDocumentStatus} from './project-snapshot.js';
import {readProjectView} from './project-visualization.js';
import {listProjectChanges} from './project-changes.js';
import {checkBaselineReuse} from './project-flows.js';
import {git} from './git-state.js';

/** Deterministic entry decision; the host performs semantic analysis, never a nested model. */
export async function projectAnalysisReadiness(root:string,systemRoot:string,baseRef?:string){
  const metadata=await contextMetadata(root);
  const snapshot=await projectSnapshot(root,baseRef??metadata?.baseRef??'main');
  const view=await readProjectView(root);
  const documentStatus=await projectDocumentStatus(root);
  const changedPaths=metadata?.analyzedCommit&&snapshot.commit
    ?(await git(root,['diff','--name-only','--no-renames','-z',metadata.analyzedCommit,snapshot.commit,'--','.'])).split('\0').filter(p=>p&&!p.startsWith('.frontend-system/')):snapshot.files;
  const checks=view&&snapshot.commit?await checkBaselineReuse(root,systemRoot,view.data.flows,{baseRef:snapshot.baseRef,expectedCommit:snapshot.commit}):[];
  const action=!snapshot.commit?'new-project':!view?'analyze-all':view.data.status!=='complete'?'resume':
    view.data.baseline.baseRef!==snapshot.baseRef||view.data.baseline.expectedCommit!==snapshot.commit||checks.some(c=>c.status==='stale')||['pending','failed'].includes(documentStatus.status)?'refresh':'reuse';
  return {action,baseline:{baseRef:snapshot.baseRef,commit:snapshot.commit},previousCommit:metadata?.analyzedCommit??null,
    analysisStatus:view?.data.status??'missing',viewHash:view?.hash??null,changedPaths:changedPaths.slice(0,200),changedPathCount:changedPaths.length,changesTruncated:changedPaths.length>200,workingChanges:snapshot.workingChanges,
    reusableFlows:checks.filter(c=>c.status==='current').map(c=>c.id),affectedFlows:checks.filter(c=>c.status==='stale'),
    issues:(await listProjectChanges(root)).map(({hash,data})=>({id:data.issueId,title:data.title,hash,
      status:data.reconciliation?.baselineHash===view?.hash?(data.reconciliation!.comparisons.every(c=>c.result==='matches')?'applied':'needs-review'):
        data.baseHash===view?.hash?'proposed':'needs-reconciliation'})),
    remoteChecked:false,indexPath:view?'.frontend-system/diagrams/index.html':null,
    next:action==='reuse'?'Reuse compact context; continue the requested design.':action==='new-project'?'Discuss the project brief; do not invent observed code.':
      'Run fs-project analysis procedure against this pinned baseline, preserve checkpoints, then resume the requested design. Reinspect shared consumers and unknown dependencies.',
  };
}
