(()=>{
const root=document.getElementById('fs-review'),app=root.querySelector('.review-app');
const M=JSON.parse(document.getElementById('fs-review-data').textContent),R=M.rules,I=M.contracts,T=M.tests;
const N=new Map(M.nodes.map(n=>[n.id,n])),F=new Map(M.fields.map(f=>[f.id,f]));
const FLOW_NODES=M.nodes.filter(n=>n.review?.flowCard).sort((a,b)=>a.review.flowCard.order-b.review.flowCard.order);
const G={nodes:M.nodes.filter(n=>n.review?.graph),edges:M.dependencies};
const draftKey=`fs-review:${M.flowHash}:v${M.version}`;
let s={tab:'screen',scenario:M.scenarios.some(v=>v.id===M.initialScenario)?M.initialScenario:M.scenarios[0].id,flowIndex:0,flowNode:FLOW_NODES[0]?.id,region:M.edits[0]?.nodeIds[0],test:T[0]?.id,rule:R[0]?.id,node:G.nodes[0]?.id,revision:1,confirmed:[],approved:0,editing:false,edits:Object.fromEntries(M.edits.map(e=>[e.id,e.initial])),reason:'',notice:''};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=path=>M.sourceBaseUrl?M.sourceBaseUrl+path.split('/').map(encodeURIComponent).join('/'):'#';
const display=v=>v===null?'null':typeof v==='object'?(v.status==='absent'?'아직 값 없음':'미확인'):String(v);
const steps=()=>M.scenarios.find(v=>v.id===s.scenario).steps;
function restore(v){
 if(!v||v.flowHash!==M.flowHash||v.version!==M.version)return;
 const t=v.state;if(!t||!Number.isSafeInteger(t.revision)||t.revision<1)return;
 if(!['screen','domain','graph','tests'].includes(t.tab)||!M.scenarios.some(v=>v.id===t.scenario))return;
 if(!Array.isArray(t.confirmed)||!t.confirmed.every(id=>T.some(v=>v.id===id)))return;
 if(!M.edits.every(e=>typeof t.edits?.[e.id]==='string'&&t.edits[e.id].trim()&&t.edits[e.id].length<=e.maxLength))return;
 s={...s,tab:t.tab,scenario:t.scenario,revision:t.revision,edits:t.edits,confirmed:[...new Set(t.confirmed)],approved:t.approved===t.revision&&t.confirmed.length===T.length?t.revision:0,flowIndex:Math.max(0,Math.min(M.scenarios.find(v=>v.id===t.scenario).steps.length-1,Number(t.flowIndex)||0)),reason:typeof t.reason==='string'?t.reason.slice(0,300):''};
 if(T.some(v=>v.id===t.test))s.test=t.test;return true;
}
try{restore(JSON.parse(localStorage.getItem(draftKey)));}catch{s.notice='로컬 검토 초안을 복원할 수 없습니다. JSON 내보내기를 사용할 수 있습니다.';}
function persist(){try{localStorage.setItem(draftKey,JSON.stringify({flowHash:M.flowHash,version:M.version,state:{...s,editing:false}}));}catch{s.notice='로컬 저장 실패 · 초안 JSON을 내보내 보관하세요.';const notice=root.querySelector('[data-storage-status]');if(notice)notice.textContent=s.notice;}}
function highlight(value){
 const input=String(value), tokens=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[A-Za-z_$][\w$]*\b|\b\d+(?:\.\d+)?\b/g;
 let result='',end=0;
 for(const match of input.matchAll(tokens)){
  const word=match[0],tail=input.slice(match.index+word.length);
  let kind='';
  if(word.startsWith('//')||word.startsWith('/*'))kind='comment';
  else if(/^["'`]/.test(word))kind='string';
  else if(/^(interface|type|export|import|from|const|let|return|await|async|throw|new|if|else|try|catch|extends|readonly|keyof|typeof)$/.test(word))kind='keyword';
  else if(/^(true|false|null|undefined)$/.test(word)||/^\d/.test(word))kind='literal';
  else if(/^(string|number|boolean|void|unknown|never|any)$/.test(word)||/^[A-Z]/.test(word))kind='type';
  else if(/^\s*\(/.test(tail))kind='function';
  else if(/^\s*\??:/.test(tail))kind='property';
  result+=esc(input.slice(end,match.index))+(kind?`<span class="tok-${kind}">${esc(word)}</span>`:esc(word));
  end=match.index+word.length;
 }
 return result+esc(input.slice(end));
}
function codeBlock(value){return `<pre class="code-block"><code>${highlight(value)}</code></pre>`;}


function signature(i){let result=i.signature;for(const e of M.edits.filter(e=>e.contractIds.includes(i.id))){result=e.signatureToken?result.replaceAll(e.signatureToken,JSON.stringify(s.edits[e.id])):result+`\n// 검토 제안 · ${e.title}: ${JSON.stringify(s.edits[e.id])}`;}return result;}
function effectiveTest(t){const edits=M.edits.filter(e=>e.testIds.includes(t.id));return {...t,then:[...edits.map(e=>`${e.title}: ${s.edits[e.id]}`),...t.then]};}
function rules(ids){return `<div class="rule-links">${ids.map(id=>`<button data-rule="${id}">${esc(id.toUpperCase())} · ${esc(R.find(r=>r.id===id).title)}</button>`).join('')}</div>`;}
function testLinks(ids){return `<div class="row">${ids.map(id=>`<button class="button" data-test="${id}">${esc(id)}</button>`).join('')}</div>`;}
function screenCard(proposed,linked=false){
 const screen=M.screens.find(v=>v.sceneId===flowStep().scene),active=new Set(flowStep().links.flatMap(e=>[e.from,e.to]));
 const capture=M.captureScreens?.[flowStep().scene];
 if(capture)return `<div><div class="compare-label"><h3>${esc(screen.title)}</h3><span class="small dim">${capture.kind==='capture'?'실제 화면 캡처':'설계 이미지'}</span></div><div class="capture-screen"><img src="${capture.image}" width="${capture.width}" height="${capture.height}" alt="${esc(screen.title)}">${capture.regions.filter(r=>r.nodeId).map(r=>`<button class="capture-region" data-flow-endpoint="${r.nodeId}" data-region="${r.nodeId}" aria-label="${esc(flowNodeName(r.nodeId))}" style="left:${r.x*100}%;top:${r.y*100}%;width:${r.width*100}%;height:${r.height*100}%"></button>`).join('')}</div></div>`;
 if(M.basis==='observed')return `<div class="selection"><h3>${esc(screen.title)}</h3><p>실제 화면 캡처 없음 · 코드 구조만 확인할 수 있습니다.</p></div>`;
 const block=b=>{
  const edit=M.edits.find(e=>e.id===b.editId),value=edit?(proposed?s.edits[edit.id]:edit.existing):b.content[0];
  const endpoint=linked?`data-flow-endpoint="${b.nodeId}" ${active.has(b.nodeId)?'data-flow-active="true"':''}`:'';
  const tag=edit&&proposed?`<span class="change-tag">${esc(edit.id.toUpperCase())} · ${esc(edit.title)}</span>`:'';
  const hotspot=content=>`<button class="hotspot ${edit&&proposed?'changed':''}" ${endpoint} data-region="${b.nodeId}" aria-pressed="${s.region===b.nodeId}">${tag}${content}</button>`;
  if(b.role==='progress')return `<div class="echo-top" ${endpoint}><span class="exit" aria-hidden="true">×</span><div class="progress"><span style="width:${b.value??0}%"></span></div><span>${esc(b.content[0])}</span></div>`;
  if(b.role==='content')return `<div class="partner"><small>${esc(b.label)}</small>${b.content.map(v=>`<p>${esc(v)}</p>`).join('')}</div>`;
  if(b.role==='microphone')return `<div class="orb" aria-label="${esc(b.label)}"><span>${esc(b.label)}</span></div>`;
  if(b.role==='timer')return `<span class="timer">${esc(b.content[0])}</span>`;
  if(b.role==='feedback')return hotspot(esc(value));
  if(b.role==='player')return hotspot(`<span class="audio-player"><span aria-hidden="true">▷</span><span>${esc(b.content[0])}</span><span class="audio-track"></span><span>${esc(b.content[1])}</span></span>`);
  return hotspot(`<span class="echo-actions"><span>${esc(b.content[0])}</span><span class="save">${esc(edit?value:b.content[1])}</span></span>`);
 };
 return `<div><div class="compare-label"><h3>${linked?esc(screen.title):proposed?'변경 제안':'기존 화면'}</h3><span class="${linked?'small dim':'badge '+(proposed?'warn':'')}">${linked?'제안 와이어프레임':proposed?M.edits.map(e=>esc(e.id.toUpperCase())).join(' · '):'코드 기준 재구성'}</span></div><div class="echo-screen">${screen.blocks.filter(b=>b.role==='progress').map(block).join('')}<div class="echo-inner">${screen.blocks.filter(b=>b.role!=='progress').map(block).join('')}</div></div></div>`;
}
function selectedRegion(){const target=s.region,node=N.get(target),contracts=I.filter(i=>i.nodeIds.includes(target)),rs=R.filter(r=>r.nodeIds.includes(target));return `<section class="selection"><div class="row spread"><h3>${esc(node?.label??'화면 영역')}</h3>${M.edits.length?'<button class="button" data-action="edit">변경안 편집</button>':''}</div><div class="selection-grid"><div><h4>도메인 규칙</h4>${rs.slice(0,2).map(r=>`<p><strong>${esc(r.id.toUpperCase())}</strong> ${esc(r.statement)}</p>`).join('')}${rules(rs.map(r=>r.id))}<h4 class="section-gap">연결 테스트</h4>${testLinks(T.filter(t=>t.nodeIds.includes(target)).map(t=>t.id))}</div><div><h4>연결 interface</h4>${contracts.slice(0,2).map(i=>`<p><span class="badge">${esc(i.status)}</span></p>${codeBlock(signature(i))}`).join('')}<button class="button" data-tab="domain">규칙·계약 전체</button></div></div></section>`;}
function edit(){return `<section class="editor"><div class="row spread"><h3>${M.edits.map(e=>esc(e.id.toUpperCase())).join(' · ')} 변경안</h3><button class="button" data-action="cancel">닫기</button></div>${M.edits.map(e=>`<label>${esc(e.title)}<textarea data-edit="${e.id}" maxlength="${e.maxLength}">${esc(s.edits[e.id])}</textarea></label>`).join('')}<label>결정 이유<textarea data-field="reason" maxlength="300">${esc(s.reason)}</textarea></label><p class="small dim">변경에 연결된 테스트 계획은 다시 확인해야 합니다.</p><button class="button primary" data-action="apply">반영</button><p data-error role="alert"></p></section>`;}
function originBadge(id){const kind=N.get(id)?.review?.changeKind??'unknown';return kind==='modified'?'<span class="origin existing">기존</span><span class="origin modified">수정 제안</span>':`<span class="origin ${kind}">${{existing:'기존',added:'신규 제안',unknown:'미확인'}[kind]}</span>`;}
function moduleInfo(id){const node=N.get(id);return {name:node?.label??id,description:node?.architecture?.responsibility??'',contracts:I.filter(i=>node?.review.contractIds.includes(i.id))};}
function stateBadge(key,value,changed=false){return `<span class="state-badge ${changed?'changed':''}"><span class="state-key">${esc(key)}</span><strong>${esc(display(value))}</strong></span>`;}
function fieldValues(){const values=new Map(M.fields.map(f=>[f.id,f.initial]));for(const st of steps().slice(0,s.flowIndex+1))for(const c of st.changes)values.set(c.fieldId,c.after);return values;}
function moduleStates(id){const values=fieldValues();if(!M.fields.some(f=>f.ownerNodeId===id))return `<span class="state-group">${(N.get(id)?.state??[]).map(v=>stateBadge('UNKNOWN',v)).join('')}</span>`;return `<span class="state-group">${M.fields.filter(f=>f.ownerNodeId===id&&f.display!=='table').map(f=>stateBadge(f.name,values.get(f.id),flowStep().changes.some(c=>c.fieldId===f.id&&c.changeKind==='changed'))).join('')}</span>`;}
function popupMarkup(id){const info=moduleInfo(id);return `<div class="popup-heading">${originBadge(id)}<span class="small dim">interface 발췌</span></div><h4><code class="symbol">${esc(info.name)}</code></h4><p>${esc(info.description)}</p>${info.contracts.slice(0,1).map(i=>`<div class="popup-contract"><span class="small dim">${esc(i.title)} · ${esc(i.status)}</span>${codeBlock(signature(i))}</div>`).join('')}<button class="button" data-tab="domain">도메인·계약 전체</button>`;}
let popupAnchor=null,popupTimer;
function closeFunctionPopup(){clearTimeout(popupTimer);const popup=root.querySelector('.function-popup');if(popup)popup.hidden=true;popupAnchor?.removeAttribute('aria-describedby');popupAnchor=null;}
function showFunctionPopup(anchor){
 clearTimeout(popupTimer);if(!anchor)return;
 const popup=root.querySelector('.function-popup');if(!popup)return;
 popupAnchor?.removeAttribute('aria-describedby');popupAnchor=anchor;
 popup.innerHTML=popupMarkup(anchor.dataset.function);popup.hidden=false;anchor.setAttribute('aria-describedby','fs-function-popup');
 const box=root.getBoundingClientRect(),target=anchor.getBoundingClientRect();
 popup.style.width=Math.min(460,box.width-24)+'px';
 const width=popup.getBoundingClientRect().width,height=popup.getBoundingClientRect().height;
 const left=target.left-box.left-width-12;
 popup.style.left=Math.max(12,Math.min(box.width-width-12,left>=12?left:target.left-box.left))+'px';
 const top=left>=12?target.top:target.bottom+8;popup.style.top=(Math.max(8,Math.min(innerHeight-height-8,top))-box.top)+'px';
}
root.addEventListener('pointerover',e=>{if(e.target.closest('.function-popup')){clearTimeout(popupTimer);return;}const anchor=e.target.closest('[data-function]');if(anchor&&anchor!==popupAnchor)showFunctionPopup(anchor);});
root.addEventListener('pointerout',e=>{if(e.target.closest('[data-function],.function-popup')&&!e.relatedTarget?.closest?.('[data-function],.function-popup'))popupTimer=setTimeout(closeFunctionPopup,220);});
root.addEventListener('focusin',e=>{const anchor=e.target.closest('[data-function]');if(anchor)showFunctionPopup(anchor);else if(!e.target.closest('.function-popup'))closeFunctionPopup();});
root.addEventListener('focusout',e=>{if(!e.relatedTarget?.closest?.('[data-function],.function-popup'))closeFunctionPopup();});
root.addEventListener('keydown',e=>{if(e.key==='Escape'){const anchor=popupAnchor;anchor?.focus();closeFunctionPopup();}});
root.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-function],.function-popup'))closeFunctionPopup();});


function flowStep(){return steps()[s.flowIndex];}
function flowNodeName(id){return N.get(id)?.label??id;}
function flowSelection(){const n=FLOW_NODES.find(n=>n.id===s.flowNode);if(!n)return selectedRegion();return `<details class="selection"><summary><code class="symbol">${esc(n.label)}</code> · 계약과 검증</summary>${rules(R.filter(r=>r.nodeIds.includes(n.id)).map(r=>r.id))}${moduleInfo(n.id).contracts.slice(0,1).map(i=>codeBlock(signature(i))).join('')}${testLinks(T.filter(t=>t.nodeIds.includes(n.id)).map(t=>t.id))}</details>`;}
function flowScreen(){const st=flowStep(),index=s.flowIndex,active=new Set(st.links.flatMap(e=>[e.from,e.to]));
 return `<div class="flow-heading row spread"><div><h3>${esc(M.scenarios.find(v=>v.id===s.scenario).title)}</h3><span class="small dim">${M.basis==='proposed'?'설계 시뮬레이션 · 실행 전':'코드 해석 · 실행 측정 아님'}</span></div><span class="row"><span class="origin existing">기존 함수 재사용</span><span class="origin added">신규 함수 ${M.nodes.filter(n=>n.review.changeKind==='added').length}</span><span class="badge">${index+1} / ${steps().length}</span></span></div>${M.scenarios.length>1?`<label>시나리오 <select data-scenario>${M.scenarios.map(v=>`<option value="${v.id}" ${v.id===s.scenario?'selected':''}>${esc(v.title)}</option>`).join('')}</select></label>`:''}<div class="flow-canvas"><div class="flow-view">${screenCard(true,true)}</div><aside class="flow-modules" aria-label="화면 외부 상태와 API">${FLOW_NODES.map(n=>`<button class="flow-module ${active.has(n.id)?'executing':''}" data-function="${n.id}" data-flow-inspect="${n.id}" data-flow-endpoint="${n.id}" aria-pressed="${s.flowNode===n.id}"><span class="module-meta">${originBadge(n.id)}<span class="small dim">${esc(n.review.flowCard.kind)}</span></span><code class="symbol">${esc(n.label)}</code><span class="module-description">${esc(moduleInfo(n.id).description)}</span>${moduleStates(n.id)}${active.has(n.id)?'<span class="flow-active-label">현재 단계</span>':''}</button>`).join('')}</aside><svg class="flow-overlay" role="img" aria-label="현재 단계의 화면·store·API 연결"><defs><marker id="fs-flow-arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" style="fill:var(--amber);stroke:none"/></marker></defs><g data-flow-paths></g></svg></div><p data-route-status class="small dim" role="status"></p><section class="flow-trace"><div class="row spread"><h3>${index+1}. ${esc(st.title)}</h3><div class="row"><button class="button" data-action="flow-prev" ${index===0?'disabled':''}>← 이전</button><button class="button primary" data-action="flow-next" ${index===steps().length-1?'disabled':''}>다음 →</button></div></div><div class="flow-track" aria-label="실행 단계">${steps().map((v,i)=>`<button data-flow-step="${i}" aria-label="${i+1}. ${esc(v.title)}" aria-pressed="${i===index}" class="${i<index?'visited':''}">${i+1}</button>`).join('')}</div>${codeBlock(st.code)}<div class="flow-path-list">${st.links.map((e,i)=>`<span><b>${i+1}</b><span>${esc(flowNodeName(e.from))} ${e.delivery==='lost'?'⇢ ×':'→'} ${esc(flowNodeName(e.to))}</span><small>${esc(e.label)}</small></span>`).join('')}</div><table class="flow-deltas"><thead><tr><th>소유자 · 상태</th><th>이전</th><th>이후</th></tr></thead><tbody>${st.changes.filter(c=>F.get(c.fieldId).display!=='badge').map(c=>{const f=F.get(c.fieldId);return `<tr><td><div class="field-owner"><code class="symbol">${esc(flowNodeName(f.ownerNodeId))}</code><span class="field-identity"><span class="field-kind">${f.fieldKind.toUpperCase()}</span><code>${esc(f.name)}</code></span></div></td><td>${stateBadge('이전',c.before)}</td><td>${stateBadge(c.changeKind==='preserved'?'유지':'변경',c.after,c.changeKind==='changed')}</td></tr>`;}).join('')}</tbody></table><div class="row spread section-gap">${rules(st.ruleIds)}${testLinks(st.testIds)}</div></section>${flowSelection()}${s.editing?edit():''}<details class="section-gap"><summary>기존 화면과 변경 제안 비교</summary><div class="compare" style="margin-top:15px">${screenCard(false)}<div class="compare-arrow" aria-hidden="true">→</div>${screenCard(true)}</div><p class="screen-note">코드 기준 재구성 · 실제 캡처 아님</p></details>`;
}
function domainView(){return `<h3>${esc(M.domain.name)}</h3><p class="section-gap">${esc(M.domain.scope)}</p><div class="term-list">${M.domain.terms.map(t=>`<section class="term"><h4>${esc(t.term)}</h4><p>${esc(t.meaning)}</p></section>`).join('')}</div><section class="section-gap"><h3>도메인 규칙</h3>${R.map(r=>`<article id="rule-${r.id}" class="rule-card ${s.rule===r.id?'selected':''}"><div class="row spread"><h4>${esc(r.id.toUpperCase())} · ${esc(r.title)}</h4><span class="badge">${esc(r.status)}</span></div><p>${esc(r.statement)}</p><div class="row spread section-gap">${testLinks(r.testIds)}<a class="source" href="${esc(source(r.source))}" target="_blank" rel="noreferrer">코드 근거 ↗</a></div></article>`).join('')}</section><section class="interface-list"><h3>Interface · 입출력과 경계</h3>${I.map(i=>`<details class="interface-item" ${i.changeKind==='modified'?'open':''}><summary>${esc(i.id.toUpperCase())} · ${esc(i.title)} <span class="badge ${i.changeKind==='modified'?'warn':''}">${esc(i.status)}</span></summary>${codeBlock(signature(i))}<p>${esc(i.description)}</p><a class="source" href="${esc(source(i.path))}" target="_blank" rel="noreferrer">${esc(i.path)}</a></details>`).join('')}</section><details class="section-gap"><summary>이번 검증 범위 밖</summary><ul>${M.domain.excluded.map(v=>`<li>${esc(v)}</li>`).join('')}</ul></details>`;}
function graphView(){const selected=N.get(s.node)||G.nodes[0];return `<div class="row spread" style="margin-bottom:15px"><h3>저장 호출과 상태 소유권</h3><span class="badge">기존 호출 구조 유지</span></div><div class="graph"><div class="graph-grid">${G.nodes.map(n=>`<button class="graph-node" data-function="${n.id}" data-graph-node="${n.id}" data-group="${n.architecture?.runtime==='server'?'server':'app'}" style="grid-column:${n.review.graph.col};grid-row:${n.review.graph.row}" aria-pressed="${s.node===n.id}">${originBadge(n.id)}<small>${esc(n.architecture?.runtime)} · ${esc(n.architecture?.layer)}</small><code class="symbol">${esc(n.label)}</code><small>${esc(n.review.graph.caption)}</small></button>`).join('')}<svg class="graph-lines" aria-label="호출·상태 관계" role="img"><defs><marker id="fs-arrow" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" style="fill:var(--dim);stroke:none"/></marker></defs><g data-graph-paths></g></svg></div></div><p data-route-status class="small dim" role="status"></p><div class="graph-legend"><span>실선 → 호출·상태 접근</span><span>점선 테두리: 서버 경계</span><span>${esc(M.graphNote)}</span></div><section class="selection"><h3><code class="symbol">${esc(selected?.label)}</code></h3><p>${esc(selected?.review.graph.caption)}</p>${rules(R.filter(r=>r.nodeIds.includes(selected?.id)).map(r=>r.id))}${moduleInfo(selected?.id).contracts.slice(0,1).map(i=>codeBlock(signature(i))).join('')}<details><summary>선택 노드의 연결</summary><ul>${G.edges.map((e,i)=>e.from===selected?.id||e.to===selected?.id?`<li>${i+1}. <code class="symbol">${esc(flowNodeName(e.from))}</code> → <code class="symbol">${esc(flowNodeName(e.to))}</code> · ${esc(e.label)}</li>`:'').join('')}</ul></details></section><p class="screen-note">호출·상태 관계 기준 · import / 레이어 규칙 검사 미연결</p>`;}
function testView(){const t=effectiveTest(T.find(t=>t.id===s.test)||T[0]),list=arr=>`<ul>${arr.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`;return `<div class="test-workspace"><nav class="test-nav" aria-label="테스트 시나리오">${[...new Set(T.map(t=>t.runner))].map(r=>`<h4>${esc(r)}</h4>${T.filter(t=>t.runner===r).map(t=>`<button data-test="${t.id}" aria-pressed="${s.test===t.id}"><small>${esc(t.id)} · ${s.confirmed.includes(t.id)?'계획 확인됨':'확인 대기'}</small>${esc(t.title)}</button>`).join('')}`).join('')}</nav><article class="test-detail"><div class="row spread"><span class="badge">${esc(t.runner)} · ${esc(t.layer)}</span><span class="badge warn">실행 전</span></div><h3 style="margin-top:13px">${esc(t.title)}</h3>${rules(t.ruleIds)}<section><h4>준비 조건 · Given</h4>${list(t.given)}</section><section><h4>장애 주입과 행동 · When</h4><ol>${t.when.map(v=>`<li>${esc(v)}</li>`).join('')}</ol></section><section><h4>통과 조건 · Then</h4><ul class="checks">${t.then.map(v=>`<li>${esc(v)}</li>`).join('')}</ul></section><section><h4>환경 · mock · 데이터 격리</h4>${list(t.setup)}</section><section><h4>반증 · 실패해야 하는 변경</h4><p>${esc(t.mutation)}</p></section><section><h4>검증 한계</h4><p>${esc(t.limits)}</p></section><label class="test-confirm"><input type="checkbox" data-confirm="${t.id}" ${s.confirmed.includes(t.id)?'checked':''}><span>규칙·통과 조건·검증 범위를 확인했습니다.<br><span class="small dim">테스트 계획 확인 · 실행 결과 아님</span></span></label></article></div>`;}
function render(){closeFunctionPopup();app.innerHTML=`<header class="header"><div class="brand"><b>fs</b> Frontend System <span class="dim small">/ ${esc(M.projectLabel)}</span></div><span class="small dim">${esc(M.sourceCommit.slice(0,7))} 기준 · ${M.basis==='proposed'?'설계 제안':'관측'}${M.freshness&&M.freshness!=='current'?' · '+esc(M.freshness):''} · 검토 v${s.revision}</span></header><div class="heading"><h2>${esc(M.title)}</h2></div><nav class="navigation" aria-label="설계 검토">${[['screen','흐름'],['domain','도메인·계약'],['graph','의존성'],['tests','테스트 계획']].map(([id,label])=>`<button data-tab="${id}" aria-pressed="${s.tab===id}">${label}</button>`).join('')}</nav><main class="content"><div data-storage-status class="${s.notice?'notice':''}" role="status">${esc(s.notice)}</div>${s.tab==='screen'?flowScreen():s.tab==='domain'?domainView():s.tab==='graph'?graphView():testView()}<details class="json-data"><summary class="small dim">기반 JSON</summary><pre>${esc(JSON.stringify(s.tab==='tests'?effectiveTest(T.find(t=>t.id===s.test)):s.tab==='graph'?G:s.tab==='domain'?{domain:M.domain,rules:R,contracts:I.map(i=>({...i,signature:signature(i)}))}:flowStep(),null,2))}</pre></details></main><footer class="footer"><span>검증 계획 ${s.confirmed.length} / ${T.length} 확인 · 실제 실행 0</span><span class="row"><button class="button" data-action="import">초안 불러오기</button><input hidden type="file" accept="application/json,.json" data-draft-file><button class="button" data-action="export">초안 JSON 내보내기</button><button class="button primary" data-action="approve" ${s.confirmed.length!==T.length||s.approved===s.revision?'disabled':''}>${s.approved===s.revision?'이 버전의 테스트 계획 확인됨':'테스트 계획 확인 완료'}</button></span></footer><aside class="function-popup" id="fs-function-popup" role="dialog" aria-label="함수 계약" hidden></aside>`;requestAnimationFrame(()=>s.tab==='graph'?drawGraph():s.tab==='screen'?drawFlow():null);}
function exportDraft(){const url=URL.createObjectURL(new Blob([JSON.stringify({flowHash:M.flowHash,version:M.version,state:{...s,editing:false}},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=M.flowId+'-review-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;let focus='';
 if(b.dataset.flowStep!==undefined){s.flowIndex=Number(b.dataset.flowStep);s.flowNode=flowStep().links.at(-1).to;focus=`[data-flow-step="${s.flowIndex}"]`;}
 else if(b.dataset.flowInspect){s.flowNode=b.dataset.flowInspect;focus=`[data-flow-inspect="${s.flowNode}"]`;}
 else if(b.dataset.tab){s.tab=b.dataset.tab;focus=`[data-tab="${s.tab}"]`;}
 else if(b.dataset.region){s.region=b.dataset.region;s.flowNode=null;focus=`[data-region="${s.region}"]`;}
 else if(b.dataset.rule){s.rule=b.dataset.rule;s.tab='domain';focus='[data-tab="domain"]';}
 else if(b.dataset.test){s.test=b.dataset.test;s.tab='tests';focus=`[data-test="${s.test}"]`;}
 else if(b.dataset.graphNode){s.node=b.dataset.graphNode;focus=`[data-graph-node="${s.node}"]`;}
 else{const a=b.dataset.action;
  if(a==='export'){exportDraft();return;}
  if(a==='import'){root.querySelector('[data-draft-file]').click();return;}
  if(a==='flow-next'||a==='flow-prev'){s.flowIndex=Math.max(0,Math.min(steps().length-1,s.flowIndex+(a==='flow-next'?1:-1)));s.flowNode=flowStep().links.at(-1).to;}
  if(a==='edit')s.editing=true;if(a==='cancel')s.editing=false;
  if(a==='approve'&&s.confirmed.length===T.length){s.approved=s.revision;s.notice=`v${s.revision} 테스트 계획 확인 완료. 로컬 검토 초안 · 실행 증거는 별도입니다.`;}
  if(a==='apply'){
   const values=Object.fromEntries(M.edits.map(v=>[v.id,root.querySelector(`[data-edit="${v.id}"]`).value.trim()])),reason=root.querySelector('[data-field="reason"]').value.trim();
   if(!reason||M.edits.some(v=>!values[v.id]||values[v.id].length>v.maxLength)){root.querySelector('[data-error]').textContent='문구·결정 이유와 입력 길이를 확인하세요.';return;}
   const changed=M.edits.filter(v=>values[v.id]!==s.edits[v.id]);if(!changed.length){root.querySelector('[data-error]').textContent='변경된 내용이 없습니다.';return;}
   const affected=new Set(changed.flatMap(v=>v.testIds));s.edits=values;s.reason=reason;s.revision++;s.confirmed=s.confirmed.filter(id=>!affected.has(id));s.approved=0;s.editing=false;s.notice=`v${s.revision} 변경 반영 · ${[...affected].join(', ')} 재확인 필요 · ${reason}`;
  }
  focus=(a==='flow-next'||a==='flow-prev')?`[data-flow-step="${s.flowIndex}"]`:s.editing?'[data-edit]':`[data-tab="${s.tab}"]`;
 }
 render();persist();root.querySelector(focus)?.focus();if(b.dataset.rule)root.querySelector(`[id="rule-${s.rule}"]`)?.scrollIntoView({block:'nearest'});
 // Touch/click opens the same contract as hover and keyboard focus.
 if(b.dataset.function){const anchor=root.querySelector(`[data-function="${b.dataset.function}"]`);showFunctionPopup(anchor);}
});
root.addEventListener('change',async e=>{if(e.target.matches('[data-draft-file]')){const file=e.target.files[0];if(!file)return;try{if(file.size>200000)throw new Error('초안 파일 크기가 너무 큽니다.');const draft=JSON.parse(await file.text());if(draft.flowHash!==M.flowHash||draft.version!==M.version)throw new Error('다른 흐름 또는 버전의 초안입니다.');if(!restore(draft))throw new Error('유효하지 않은 검토 초안입니다.');s.notice='로컬 검토 초안을 불러왔습니다. 실행 결과·서버 승인이 아닙니다.';render();persist();}catch(error){s.notice='초안 복원 실패: '+error.message;render();}return;}if(e.target.matches('[data-scenario]')){s.scenario=e.target.value;s.flowIndex=0;render();persist();return;}const id=e.target.dataset.confirm;if(!id||!T.some(t=>t.id===id))return;s.confirmed=e.target.checked?[...new Set([...s.confirmed,id])]:s.confirmed.filter(v=>v!==id);s.approved=0;render();persist();root.querySelector(`[data-confirm="${id}"]`)?.focus();});
function drawConnections(container,svgSelector,groupSelector,links,attribute,marker){
 const canvas=root.querySelector(container);if(!canvas)return;
 const svg=canvas.querySelector(svgSelector),group=canvas.querySelector(groupSelector),origin=canvas.getBoundingClientRect();
 const rect=element=>{const r=element.getBoundingClientRect();return {left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top,width:r.width,height:r.height};};
 const elements=[...canvas.querySelectorAll(`[${attribute}]`)];
 const obstacles=[...new Set([...elements,...canvas.querySelectorAll('.partner,.orb')])].filter(el=>el.getBoundingClientRect().width>0).map(rect);
 const missing=[],labels=[];
 const markup=links.map((edge,i)=>{
  const a=elements.find(el=>el.getAttribute(attribute)===edge.from),b=elements.find(el=>el.getAttribute(attribute)===edge.to);
  if(!a||!b){missing.push(edge.label);return '';}
  const route=reviewRoute(rect(a),rect(b),obstacles,i);
  if(!route){missing.push(edge.label);return '';}
  let label;
  const segments=route.points.slice(1).map((q,i)=>({p:route.points[i],q,length:Math.abs(q[0]-route.points[i][0])+Math.abs(q[1]-route.points[i][1])})).sort((a,b)=>b.length-a.length);
  for(const seg of segments){for(const t of [.5,.35,.65,.2,.8]){const p=[seg.p[0]+(seg.q[0]-seg.p[0])*t,seg.p[1]+(seg.q[1]-seg.p[1])*t];if(!obstacles.some(r=>p[0]>r.left-11&&p[0]<r.right+11&&p[1]>r.top-11&&p[1]<r.bottom+11)&&!labels.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<25)){label=p;break;}}if(label)break;}
  if(label)labels.push(label);
  const lost=edge.delivery==='lost';
  return `<g data-edge="${esc(edge.id)}" data-from="${edge.from}" data-to="${edge.to}" data-points="${esc(JSON.stringify(route.points))}"><title>${i+1}. ${esc(edge.label)}${lost?' · 응답 유실':''}</title><path class="${lost?'lost':''} ${edge.from===s.node||edge.to===s.node?'focus-edge':''}" d="${route.path}" ${lost?'':`marker-end="url(#${marker})"`}/>${label?`<circle cx="${label[0]}" cy="${label[1]}" r="10"/><text x="${label[0]}" y="${label[1]+4}" text-anchor="middle">${lost?'×':i+1}</text>`:''}</g>`;
 }).join('');
 group.innerHTML=markup;
 const bounds=group.getBBox(),pad=16;
 const left=Math.min(0,bounds.x-pad),top=Math.min(0,bounds.y-pad),right=Math.max(origin.width,bounds.x+bounds.width+pad),bottom=Math.max(origin.height,bounds.y+bounds.height+pad);
 svg.setAttribute('viewBox',`${left} ${top} ${right-left} ${bottom-top}`);
 Object.assign(svg.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
 const status=root.querySelector('[data-route-status]');if(status)status.textContent=missing.length?'연결 경로 확인 필요: '+missing.join(', '):'';
}
function drawFlow(){drawConnections('.flow-canvas','.flow-overlay','[data-flow-paths]',flowStep().links,'data-flow-endpoint','fs-flow-arrow');}
function drawGraph(){drawConnections('.graph-grid','.graph-lines','[data-graph-paths]',G.edges,'data-graph-node','fs-arrow');}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>requestAnimationFrame(()=>s.tab==='graph'?drawGraph():s.tab==='screen'?drawFlow():null)).observe(app);
window.addEventListener('resize',()=>{closeFunctionPopup();if(s.tab==='graph')drawGraph();if(s.tab==='screen')drawFlow();});
document.fonts?.ready.then(()=>{if(s.tab==='graph')drawGraph();if(s.tab==='screen')drawFlow();});
render();
})();
