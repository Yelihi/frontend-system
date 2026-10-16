// Discussion viewer only. Effects describe causality, not measured render timing.
function stepEffects(step){return step?(step.effects??[step]):[];}
let boardOpen=false, camera={x:0,y:0,scale:1}, pan=null;
function sceneAt(page){
 let result=spec.pages.find(p=>p.id===page).scenes[0];
 for(const step of (scenario?.steps??[]).slice(0,stepIndex+1))for(const effect of stepEffects(step))if(effect.page===page)result=effect.scene;
 return result;
}
function initBoard(){
 const canvas=document.querySelector('.canvas');
 canvas.insertAdjacentHTML('afterend','<section id="board" hidden><div class="board-tools"><strong>전체 영향 지도</strong><span>빈 영역 드래그 · 휠 이동 · Ctrl/⌘+휠 확대</span><button id="zoom-out" aria-label="지도 축소">−</button><output id="zoom-level" aria-live="polite">100%</output><button id="zoom-in" aria-label="지도 확대">＋</button><button id="zoom-fit">전체 맞춤</button></div><div id="board-viewport" tabindex="0" role="region" aria-label="확대 가능한 페이지 영향 지도"><div id="board-world"></div></div></section>');
 const viewport=document.querySelector('#board-viewport');
 document.querySelector('#board-toggle').onclick=()=>{viewPage=null;refreshScenarios();syncStep();setBoard(true);};
 document.querySelector('#zoom-fit').onclick=fitBoard;
 document.querySelector('#zoom-in').onclick=()=>zoomBoard(camera.scale*1.25);
 document.querySelector('#zoom-out').onclick=()=>zoomBoard(camera.scale/1.25);
 viewport.addEventListener('wheel',event=>{
  event.preventDefault();
  if(event.ctrlKey||event.metaKey){const b=viewport.getBoundingClientRect();zoomBoard(camera.scale*Math.exp(-event.deltaY*.008),event.clientX-b.left,event.clientY-b.top);}
  else{camera.x-=event.deltaX;camera.y-=event.deltaY;applyCamera();}
 },{passive:false});
 viewport.onpointerdown=event=>{if(event.button!==0||event.target.closest('button'))return;pan={id:event.pointerId,x:event.clientX,y:event.clientY};viewport.setPointerCapture(event.pointerId);viewport.classList.add('panning');};
 viewport.onpointermove=event=>{if(!pan||event.pointerId!==pan.id)return;camera.x+=event.clientX-pan.x;camera.y+=event.clientY-pan.y;pan.x=event.clientX;pan.y=event.clientY;applyCamera();};
 const endPan=()=>{pan=null;viewport.classList.remove('panning');};
 viewport.onpointerup=endPan;viewport.onpointercancel=endPan;viewport.onlostpointercapture=endPan;
 viewport.onkeydown=event=>{
  if(event.target!==viewport)return;
  if(['+','=','-','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))event.preventDefault();
  if(event.key==='+'||event.key==='=')zoomBoard(camera.scale*1.25);
  if(event.key==='-')zoomBoard(camera.scale/1.25);
  if(event.key==='Home')fitBoard();
  if(event.key.startsWith('Arrow')){camera.x+=event.key==='ArrowLeft'?70:event.key==='ArrowRight'?-70:0;camera.y+=event.key==='ArrowUp'?70:event.key==='ArrowDown'?-70:0;applyCamera();}
 };
 new ResizeObserver(()=>{if(boardOpen)drawBoardEdges();}).observe(viewport);
}
function setBoard(open){
 stop();toggleRoutes(false);boardOpen=open;document.querySelector('#board').hidden=!open;document.querySelector('.canvas').hidden=open;
 document.querySelector('#board-toggle').setAttribute('aria-pressed',String(open));
 for(const page of spec.pages)document.querySelector('#page-'+page.id).setAttribute('aria-pressed',String(!open&&pageId===page.id));
 if(open){renderBoard();fitBoard();}else{renderScreen();drawTrace();}
}
function applyCamera(){
 document.querySelector('#board-world').style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`;
 document.querySelector('#zoom-level').textContent=Math.round(camera.scale*100)+'%';
}
function zoomBoard(scale,x,y){
 const viewport=document.querySelector('#board-viewport');x??=viewport.clientWidth/2;y??=viewport.clientHeight/2;
 const next=Math.max(.12,Math.min(2.5,scale)),ratio=next/camera.scale;
 camera.x=x-(x-camera.x)*ratio;camera.y=y-(y-camera.y)*ratio;camera.scale=next;applyCamera();
}
function fitBoard(){
 const viewport=document.querySelector('#board-viewport'),b=spec.board;
 camera.scale=Math.max(.12,Math.min((viewport.clientWidth-32)/b.width,(viewport.clientHeight-32)/b.height,1));
 camera.x=(viewport.clientWidth-b.width*camera.scale)/2;camera.y=(viewport.clientHeight-b.height*camera.scale)/2;applyCamera();drawBoardEdges();
}
function renderBoard(){
 if(!boardOpen)return;
 const world=document.querySelector('#board-world'),layout=spec.board;
 world.style.width=layout.width+'px';world.style.height=layout.height+'px';
 const shell=layout.shell,side=layout.sidebar,remote=layout.remote;
 const rect=r=>`left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px`;
 world.innerHTML=`<section class="browser-shell" aria-label="웹 브라우저 실행 영역" style="${rect(shell)}"><div class="browser-chrome"><i></i><i></i><i></i><strong>Application</strong><span>페이지 · 실행 맥락</span></div><div class="browser-address"><span>← &nbsp; → &nbsp; ↻</span><code>${esc(spec.basis==='observed'?'localhost · '+spec.title:'folio · application')}</code></div></section><section class="browser-content" aria-label="페이지 콘텐츠 영역" style="${rect(layout.content)}"><span>PAGE CONTENT</span></section><section class="runtime-lane" aria-label="브라우저 기능 측면 영역" style="${rect(side)}"></section>${layout.appLane.height?`<section class="app-lane" aria-label="앱 상태와 모듈" style="${rect(layout.appLane)}"><h3>앱 상태 · 모듈</h3></section>`:''}<section class="remote-lane" aria-label="백엔드와 외부 서비스" style="${rect(remote)}"><h3>백엔드 · 외부 서비스</h3></section><section class="browser-resources" aria-label="브라우저 기능" style="left:${side.x+14}px;top:${side.browserY}px;width:${side.width-28}px"><h3>브라우저 기능</h3><p>Web APIs · IndexedDB · Storage · Events</p>${(spec.browserApis??[]).map(api=>`<div><code>${esc(api.name)}</code><span>${esc(api.detail)}</span></div>`).join('')||'<span>등록된 연결 없음</span>'}</section>`;
 world.insertAdjacentHTML('beforeend',layout.frames.map(frame=>{
  const state=sceneAt(frame.page),asset=assets[frame.page+':'+state],page=spec.pages.find(p=>p.id===frame.page);
  return `<article class="board-frame" style="left:${frame.x}px;top:${frame.y}px;width:${frame.width}px"><div class="board-frame-title"><strong>${esc(nodes.get(frame.page).name)}</strong><span>${esc(page.route)} · ${esc(state)}${spec.basis==='observed'&&scenario?.basis==='proposed'?' · 기준 화면':''}</span></div><div class="screen-port" data-node="${frame.page}" style="aspect-ratio:${asset?asset.width+'/'+asset.height:'760/570'}">`+
   (asset?`<img class="screen-image" draggable="false" src="${asset.image}" alt="${esc(nodes.get(frame.page).name)}의 ${esc(state)} 상태">`+asset.regions.map(region=>{const instance=instances.get(region.instance),node=nodes.get(instance.node);return `<button class="hotspot" data-node="${node.id}" data-instance="${instance.id}" aria-label="지도 ${esc(node.name)} · ${instance.id}" style="left:${region.x*100}%;top:${region.y*100}%;width:${region.width*100}%;height:${region.height*100}%"><span class="tip">${esc(node.name)}</span></button>`;}).join(''):'<p>이 상태의 캡처가 없습니다. 개별 페이지 보기에서 구조를 확인하세요.</p>')+'</div></article>';
 }).join(''));
 const externalIds=spec.nodes.filter(n=>!['page','component'].includes(n.kind)).map(n=>n.id);
 world.insertAdjacentHTML('beforeend',externalIds.map(id=>{const n=nodes.get(id),position=layout.placements[id];return `<button class="board-node" data-node="${id}" style="left:${position.x}px;top:${position.y}px;width:${position.width}px"><small>${esc(n.kind)}</small><code>${esc(n.name)}</code><span>${esc(n.state[0]??n.events[0])}</span></button>`;}).join('')+`<svg class="board-edges" viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true"><defs><marker id="board-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#ba771c"/></marker></defs><g id="board-traces"></g></svg>`);
 world.querySelectorAll('button[data-node]').forEach(button=>{
  button.onmouseenter=()=>renderInspector(button.dataset.node,button.dataset.instance??null);
  button.onmouseleave=()=>renderInspector();button.onfocus=button.onmouseenter;button.onblur=button.onmouseleave;
  button.onclick=()=>{selected=button.dataset.node;selectedInstance=button.dataset.instance??null;renderInspector();highlight();};
 });
 highlight();applyCamera();requestAnimationFrame(drawBoardEdges);
}
function drawBoardEdges(){
 if(!boardOpen)return;
 const world=document.querySelector('#board-world'),origin=world.getBoundingClientRect();
 const find=(id,instance)=>[...world.querySelectorAll('[data-node]')].find(el=>instance?el.dataset.instance===instance:el.dataset.node===id);
 const position=el=>{const r=el.getBoundingClientRect();return {x:(r.left-origin.left)/camera.scale,y:(r.top-origin.top)/camera.scale,w:r.width/camera.scale,h:r.height/camera.scale};};
 document.querySelector('#board-traces').innerHTML=stepEffects(current()).map(effect=>{
  const from=find(effect.fromNode,effect.fromInstance),to=find(effect.toNode,effect.toInstance);if(!from||!to)return '';
  const a=position(from),b=position(to),right=a.x<b.x;
  const x1=right?a.x+a.w:a.x,x2=right?b.x:b.x+b.w,y1=a.y+a.h/2,y2=b.y+b.h/2,mid=(x1+x2)/2;
  return `<path class="board-edge" d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}" marker-end="url(#board-arrow)"/><circle cx="${x1}" cy="${y1}" r="4" fill="#ba771c"/>`;
 }).join('');
}
if(!params.has('capture'))initBoard();
