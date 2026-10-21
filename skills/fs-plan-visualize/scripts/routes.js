// Navigation is explicit; shared-state consumers are not route transitions.
let pinnedRoute=null,previewRoute=null,routeScope=[],routeCamera={x:0,y:0,scale:1},routePan=null;
function initRoutes(){
 const groups=new Map();
 for(const page of spec.pages){const domain=page.domain??page.route.split('/').filter(Boolean)[0]??'앱';if(!groups.has(domain))groups.set(domain,[]);groups.get(domain).push(page);}
 document.querySelector('.canvas').insertAdjacentHTML('beforebegin','<section id="routes" aria-label="도메인과 라우트 개요" hidden><div class="route-heading"><div><h2>Routes</h2><p>노드 선택 후 실행 흐름을 확인하세요.</p></div><span>'+spec.pages.length+'개 페이지 · '+(spec.navigation??[]).length+'개 연결</span></div><div class="route-stage"><div id="route-viewport" tabindex="0" role="region" aria-label="확대 가능한 라우트 지도"><div id="route-map">'+[...groups].map(([domain,pages])=>'<section class="route-domain"><h3>'+esc(domain)+'</h3>'+pages.map(p=>'<button class="route-node" data-route="'+esc(p.id)+'" aria-pressed="false"><span class="route-icon" aria-hidden="true">▤</span><span class="route-node-copy"><strong>'+esc(p.title??nodes.get(p.id).name)+'</strong><code>'+esc(p.route)+'</code><small>'+spec.scenarios.filter(s=>s.pages.includes(p.id)).length+'개 실행 흐름</small></span></button>').join('')+'</section>').join('')+'<svg id="route-edges" aria-hidden="true">'+(spec.navigation??[]).map(e=>'<g data-navigation="'+esc(e.id)+'"><path class="route-edge"/><path class="route-motion"/></g>').join('')+'</svg></div></div><div class="route-camera"><button id="route-minus" aria-label="라우트 축소">−</button><output id="route-zoom" aria-live="polite">100%</output><button id="route-plus" aria-label="라우트 확대">＋</button><button id="route-fit">전체 맞춤</button><span>휠로 확대 · 빈 영역 드래그</span></div></div><section class="route-detail" aria-label="라우트 실행 흐름" tabindex="0"><div id="route-detail-text"></div></section></section>');
 document.querySelector('#routes-toggle').onclick=showRoutes;
 for(const button of document.querySelectorAll('[data-route]')){
  button.onmouseenter=()=>previewRoutes(button.dataset.route);
  button.onmouseleave=()=>previewRoutes(document.activeElement?.dataset.route??pinnedRoute);
  button.onfocus=button.onmouseenter;button.onblur=()=>previewRoutes(pinnedRoute);
  button.onclick=()=>{pinnedRoute=button.dataset.route;previewRoutes(pinnedRoute);};
 }
 const viewport=document.querySelector('#route-viewport');
 viewport.addEventListener('wheel',event=>{event.preventDefault();const b=viewport.getBoundingClientRect();const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?b.height:1);zoomRoutes(routeCamera.scale*Math.exp(-Math.max(-500,Math.min(500,delta))*.002),event.clientX-b.left,event.clientY-b.top);},{passive:false});
 viewport.onpointerdown=event=>{if(event.button!==0||event.target.closest('button'))return;routePan={id:event.pointerId,x:event.clientX,y:event.clientY};viewport.setPointerCapture(event.pointerId);viewport.classList.add('panning');};
 viewport.onpointermove=event=>{if(!routePan||event.pointerId!==routePan.id)return;routeCamera.x+=event.clientX-routePan.x;routeCamera.y+=event.clientY-routePan.y;routePan.x=event.clientX;routePan.y=event.clientY;applyRouteCamera();};
 const endPan=()=>{routePan=null;viewport.classList.remove('panning');};
 viewport.onpointerup=endPan;viewport.onpointercancel=endPan;viewport.onlostpointercapture=endPan;
 viewport.onkeydown=event=>{if(event.target!==viewport)return;if(['+','=','-','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))event.preventDefault();if(event.key==='+'||event.key==='=')zoomRoutes(routeCamera.scale*1.2);if(event.key==='-')zoomRoutes(routeCamera.scale/1.2);if(event.key==='Home')fitRoutes();if(event.key.startsWith('Arrow')){routeCamera.x+=event.key==='ArrowLeft'?60:event.key==='ArrowRight'?-60:0;routeCamera.y+=event.key==='ArrowUp'?60:event.key==='ArrowDown'?-60:0;applyRouteCamera();}};
 document.querySelector('#route-minus').onclick=()=>zoomRoutes(routeCamera.scale/1.2);
 document.querySelector('#route-plus').onclick=()=>zoomRoutes(routeCamera.scale*1.2);
 document.querySelector('#route-fit').onclick=fitRoutes;
 new ResizeObserver(drawRoutes).observe(document.querySelector('#route-map'));
 showRoutes();
 if(spec.initialScenario&&scenario){routeScope=scenario.pages;updateRouteTabs();document.querySelector('#page-'+scenario.steps[0].page).click();}
}
function applyRouteCamera(){document.querySelector('#route-map').style.transform=`translate(${routeCamera.x}px,${routeCamera.y}px) scale(${routeCamera.scale})`;document.querySelector('#route-zoom').textContent=Math.round(routeCamera.scale*100)+'%';}
function zoomRoutes(scale,x,y){const viewport=document.querySelector('#route-viewport');x??=viewport.clientWidth/2;y??=viewport.clientHeight/2;const next=Math.max(.15,Math.min(3,scale)),ratio=next/routeCamera.scale;routeCamera.x=x-(x-routeCamera.x)*ratio;routeCamera.y=y-(y-routeCamera.y)*ratio;routeCamera.scale=next;applyRouteCamera();}
function fitRoutes(){const viewport=document.querySelector('#route-viewport'),map=document.querySelector('#route-map');routeCamera.scale=Math.max(.15,Math.min((viewport.clientWidth-40)/map.offsetWidth,(viewport.clientHeight-40)/map.offsetHeight,1));routeCamera.x=(viewport.clientWidth-map.offsetWidth*routeCamera.scale)/2;routeCamera.y=(viewport.clientHeight-map.offsetHeight*routeCamera.scale)/2;applyRouteCamera();}
function updateRouteTabs(){document.querySelector('#board-toggle').hidden=!routeScope.length;for(const page of spec.pages)document.querySelector('#page-'+page.id).hidden=!routeScope.includes(page.id);}
function toggleRoutes(open){
 const section=document.querySelector('#routes');if(!section)return;
 section.hidden=!open;document.querySelector('#routes-toggle').setAttribute('aria-pressed',String(open));
 document.querySelector('.workspace').classList.toggle('routes-open',open);
 document.querySelector('.toolbar').hidden=open;document.querySelector('.inspector').hidden=open;document.querySelector('.legend').hidden=open;document.querySelector('.trace').hidden=open||!scenario;
 if(open){document.querySelector('.canvas').hidden=true;document.querySelector('#board').hidden=true;document.querySelectorAll('.scene-head button').forEach(b=>b.setAttribute('aria-pressed',String(b.id==='routes-toggle')));document.querySelector('#scene-title').textContent='프로젝트 개요';document.querySelector('.badge').textContent=spec.basis==='observed'?'관측 기반':'설계 시안';}
 else document.querySelector('.badge').textContent=scenario?(scenario.basis==='observed'?'관측 흐름':'계획 흐름'):'기록된 흐름 없음';
 updateRouteTabs();
}
function showRoutes(){stop();setBoard(false);toggleRoutes(true);previewRoutes(pinnedRoute);drawRoutes();}
function previewRoutes(id){
 const changed=previewRoute!==id;previewRoute=id;
 const related=(spec.navigation??[]).filter(e=>e.from===id||e.to===id),neighbors=new Set(related.flatMap(e=>[e.from,e.to]));
 for(const button of document.querySelectorAll('[data-route]')){button.setAttribute('aria-pressed',String(button.dataset.route===pinnedRoute));button.classList.toggle('is-preview',button.dataset.route===id);button.classList.toggle('is-related',neighbors.has(button.dataset.route));}
 for(const group of document.querySelectorAll('#route-edges g'))group.classList.toggle('active',related.some(e=>e.id===group.dataset.navigation));
 // Keep paths and their animations mounted across hover; only classes change.
 const detail=document.querySelector('#route-detail-text');
 if(!id){detail.innerHTML='<p class="route-empty">노드를 선택하면 이동 조건과 실행 흐름이 표시됩니다.</p>';return;}
 if(!changed&&detail.dataset.route===id&&detail.dataset.pinned===String(id===pinnedRoute))return;
 detail.dataset.route=id;detail.dataset.pinned=String(id===pinnedRoute);
 const page=spec.pages.find(p=>p.id===id),flows=spec.scenarios.filter(s=>s.pages.includes(id));
 detail.innerHTML='<div class="route-detail-heading"><strong>'+esc(page.title??nodes.get(id).name)+'</strong><code>'+esc(page.route)+'</code><span>'+(id===pinnedRoute?'선택됨':'미리보기 · 클릭하여 고정')+'</span></div><div class="route-detail-columns"><div><h3>페이지 이동</h3>'+(related.length?'<ul class="route-links">'+related.map(e=>'<li><span class="route-basis">'+(e.basis==='observed'?'관측':'계획')+'</span><code>'+esc(spec.pages.find(p=>p.id===e.from).route)+' → '+esc(spec.pages.find(p=>p.id===e.to).route)+'</code><p>'+esc(e.label)+' · '+esc(e.condition)+'</p></li>').join('')+'</ul>':'<p class="route-empty">기록된 이동 없음</p>')+'</div><div><h3>실행 흐름 <span>'+flows.length+'</span></h3><div class="route-flows">'+flows.map(s=>'<button data-open-flow="'+esc(s.id)+'" '+(id!==pinnedRoute?'disabled':'')+'><span class="flow-kind">'+(s.category==='lifecycle'?'라이프사이클':'이벤트')+'</span><strong>'+esc(s.title)+'</strong><small>'+s.steps.length+'단계 · '+(s.basis==='observed'?'관측':'계획')+'</small></button>').join('')+(flows.length?'':'<p class="route-empty">기록된 흐름 없음</p>')+'</div></div></div>';
 if(!flows.length&&id===pinnedRoute){const open=document.createElement('button');open.textContent='화면 구조 보기';open.onclick=()=>{routeScope=[id];updateRouteTabs();document.querySelector('#page-'+id).click();};detail.append(open);}
 detail.querySelectorAll('[data-open-flow]').forEach(button=>button.onclick=()=>{scenario=spec.scenarios.find(s=>s.id===button.dataset.openFlow);stepIndex=0;routeScope=scenario.pages;updateRouteTabs();document.querySelector('#page-'+id).click();});
}
function drawRoutes(){
 const map=document.querySelector('#route-map');if(!map||document.querySelector('#routes').hidden)return;
 const box=map.getBoundingClientRect(),svg=document.querySelector('#route-edges');svg.setAttribute('viewBox','0 0 '+map.offsetWidth+' '+map.offsetHeight);
 const rect=id=>{const b=[...map.querySelectorAll('[data-route]')].find(b=>b.dataset.route===id).getBoundingClientRect();return {x:(b.left-box.left)/routeCamera.scale,y:(b.top-box.top)/routeCamera.scale,w:b.width/routeCamera.scale,h:b.height/routeCamera.scale};};
 for(const group of svg.querySelectorAll('g')){
  const e=spec.navigation.find(e=>e.id===group.dataset.navigation),a=rect(e.from),b=rect(e.to);let d;
  if(e.from===e.to){const x=a.x+a.w,y=a.y;d=`M${x},${y+20} C${x+38},${y-12} ${x+38},${y+85} ${x},${y+65}`;}
  else if(Math.abs(a.x-b.x)<10){const x=a.x+a.w,y1=a.y+a.h/2,y2=b.y+b.h/2;d=`M${x},${y1} C${x+30},${y1} ${x+30},${y2} ${x},${y2}`;}
  else{const forward=a.x<b.x,x1=forward?a.x+a.w:a.x,x2=forward?b.x:b.x+b.w,y1=a.y+a.h*.5+(forward?-8:8),y2=b.y+b.h*.5+(forward?-8:8),mid=(x1+x2)/2;d=`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;}
  group.querySelectorAll('path').forEach(path=>path.setAttribute('d',d));
 }
}
if(!params.has('capture'))initRoutes();
