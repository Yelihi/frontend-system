import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';

// The reviewed fixture commit predates this derived diagram; change it after source review.
const commit='40b264f39e0826d56cd748b68d9faf79ab316507';
const source='docs/examples/routed-order-app/';
const cite=(file,line,quote)=>[{path:source+file,line,quote}];
const node=(id,kind,name,parent,details={})=>({id,kind,name,parent,props:[],state:[],events:[],lifecycle:[],signature:'',intent:'',evidence:[],...details});
const order={id:'ORD-001',item:'Desk lamp',quantity:2};
const nodes=[
 node('order','page','OrderPage',null,{state:['route: /'],events:['View activity → /activity/'],intent:'주문을 입력하고 저장 결과를 보여준다.',evidence:cite('index.html',28,'<form id="order-form">')}),
 node('order-form','component','OrderForm','order',{props:['item: string','quantity: number'],state:['result: hidden | saved | error'],events:['submit → saveOrder(item, quantity)','View activity → /activity/'],signature:'saveOrder(item: string, quantity: number): Order',intent:'입력을 검증하고 저장 완료 링크를 표시한다.',evidence:cite('app.js',40,"document.querySelector('#order-form').addEventListener('submit'")}),
 node('activity','page','ActivityPage',null,{state:['route: /activity/'],lifecycle:['load → renderActivity()'],events:['Create another → /'],intent:'저장된 주문을 다시 읽어 보여준다.',evidence:cite('activity/index.html',28,'<div id="activity-list"')}),
 node('activity-list','component','ActivityList','activity',{state:['orders: Order[]'],lifecycle:['load → renderActivity()'],signature:'renderActivity(): void',intent:'브라우저에 저장된 주문 목록을 표시한다.',evidence:cite('app.js',27,'list.replaceChildren(...orders.map(order => {')}),
 node('order-store','module','orderStore',null,{environment:'app',state:['orders: Order[] in localStorage'],events:['saveOrder(item, quantity)','readOrders()'],signature:'readOrders(): Order[]\nsaveOrder(item: string, quantity: number): Order',intent:'두 페이지에서 같은 저장 기록을 읽고 쓴다.',evidence:cite('app.js',15,'localStorage.setItem(storageKey, JSON.stringify([...orders, order]));')}),
];
const navigation=[
 {id:'to-activity',from:'order',to:'activity',label:'View activity',condition:'메뉴 또는 저장 완료 링크 선택',basis:'observed',evidence:[...cite('index.html',17,'href="/activity/"'),...cite('app.js',55,"link.href = '/activity/';")]},
 {id:'to-order',from:'activity',to:'order',label:'Create another',condition:'메뉴 또는 새 주문 링크 선택',basis:'observed',evidence:cite('activity/index.html',16,'href="/"')},
];
const scenarios=[
 {id:'create-and-review',title:'주문 저장 → 활동 기록 확인',category:'event',basis:'observed',steps:[
  {id:'validate',fromNode:'order-form',toNode:'order-form',page:'order',scene:'idle',label:'onSubmit(event)',effect:'품목과 수량을 확인한다.',evidence:cite('app.js',45,'!Number.isInteger(quantity)')},
  {id:'write',fromNode:'order-form',toNode:'order-store',page:'order',scene:'idle',label:'saveOrder("Desk lamp", 2)',effect:'주문 ORD-001을 브라우저 저장소에 기록한다.',changes:[{ownerNode:'order-store',owner:'orderStore',field:'orders',before:[],after:[order]}],evidence:cite('app.js',15,'localStorage.setItem(storageKey, JSON.stringify([...orders, order]));')},
  {id:'confirm',fromNode:'order-store',toNode:'order-form',page:'order',scene:'saved',label:'result.append("Saved ORD-001")',effect:'저장 완료와 활동 기록 링크를 표시한다.',changes:[{ownerNode:'order-form',owner:'OrderForm',field:'result',before:'hidden',after:'Saved ORD-001'}],evidence:cite('app.js',53,'result.append(`Saved ${order.id}. `);')},
  {id:'navigate',fromNode:'order-form',toNode:'activity',page:'activity',scene:'populated',label:'href="/activity/"',effect:'활동 기록 페이지로 이동한다.',evidence:cite('app.js',55,"link.href = '/activity/';")},
  {id:'read',fromNode:'activity',toNode:'order-store',page:'activity',scene:'populated',label:'readOrders()',effect:'페이지 초기화 때 저장된 주문을 읽는다.',evidence:cite('app.js',20,'const orders = readOrders();')},
  {id:'render',fromNode:'order-store',toNode:'activity-list',page:'activity',scene:'populated',label:'renderActivity()',effect:'주문 1건을 목록과 건수에 표시한다.',changes:[{ownerNode:'activity-list',owner:'ActivityList',field:'visibleOrders',before:[],after:[order]}],evidence:cite('app.js',27,'list.replaceChildren(...orders.map(order => {')},
 ]},
 {id:'empty-activity',title:'기록이 없을 때',category:'lifecycle',basis:'observed',steps:[
  {id:'empty-read',fromNode:'activity',toNode:'order-store',page:'activity',scene:'empty',label:'readOrders()',effect:'새 브라우저에서는 저장된 주문이 없다.',evidence:cite('app.js',5,"localStorage.getItem(storageKey) ?? '[]'")},
  {id:'empty-render',fromNode:'order-store',toNode:'activity-list',page:'activity',scene:'empty',label:'renderActivity()',effect:'빈 목록 안내를 표시한다.',evidence:cite('app.js',24,"list.textContent = 'No orders yet. Create an order to see it here.';")},
 ]},
];
const flow={id:'routed-order-observed',sourceCommit:commit,navigation,scenarios};
const flowContent=JSON.stringify(flow,null,2)+'\n';
await writeFile(new URL('flow.json',import.meta.url),flowContent);
const spec={schemaVersion:'page-flow-1',title:'Northstar · 실제 주문 흐름',basis:'observed',baseline:{commit,flow:{id:flow.id,hash:createHash('sha256').update(flowContent).digest('hex')}},
 nodes,instances:[{id:'order-form',node:'order-form',page:'order'},{id:'activity-list',node:'activity-list',page:'activity'}],
 pages:[{id:'order',title:'주문 생성',route:'/',domain:'주문',scenes:['idle','saved']},{id:'activity',title:'활동 기록',route:'/activity/',domain:'주문',scenes:['empty','populated']}],
 navigation,scenarios,browserApis:[{name:'localStorage',ownerNode:'order-store',detail:'fs-routed-order-example-v1 · orders[]'}]};
await writeFile(new URL('view-model.json',import.meta.url),JSON.stringify(spec,null,2)+'\n');
console.log(JSON.stringify({commit,flowHash:spec.baseline.flow.hash,routes:spec.pages.map(page=>page.route),scenarios:scenarios.length}));
