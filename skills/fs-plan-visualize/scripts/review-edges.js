// Deterministic orthogonal routes. All coordinates are CSS pixels relative to the canvas.
function reviewRoute(from,to,obstacles,lane=0) {
  const gap=8+(lane%4)*3;
  const sameColumn=Math.abs(from.left-to.left)<30;
  const side=sameColumn?'right':from.right<=to.left?'right':from.left>=to.right?'left':from.top<to.top?'bottom':'top';
  const targetSide=sameColumn?'right':side==='right'?'left':side==='left'?'right':side==='bottom'?'top':'bottom';
  const fraction=.35+(lane%4)*.1;
  const port=(r,s)=>s==='right'?[r.right,r.top+r.height*fraction]:s==='left'?[r.left,r.top+r.height*fraction]:s==='top'?[r.left+r.width*fraction,r.top]:[r.left+r.width*fraction,r.bottom];
  const offset=(p,s)=>[p[0]+(s==='right'?gap:s==='left'?-gap:0),p[1]+(s==='bottom'?gap:s==='top'?-gap:0)];
  const start=port(from,side),end=port(to,targetSide),a=offset(start,side),b=offset(end,targetSide);
  const boxes=obstacles.map(r=>({left:r.left-3,right:r.right+3,top:r.top-3,bottom:r.bottom+3}));
  const inside=(x,y)=>boxes.some(r=>x>r.left&&x<r.right&&y>r.top&&y<r.bottom);
  const clear=(p,q)=>!boxes.some(r=>p[0]===q[0]?p[0]>r.left&&p[0]<r.right&&Math.max(p[1],q[1])>r.top&&Math.min(p[1],q[1])<r.bottom:p[1]>r.top&&p[1]<r.bottom&&Math.max(p[0],q[0])>r.left&&Math.min(p[0],q[0])<r.right);
  const xs=[...new Set([a[0],b[0],...obstacles.flatMap(r=>[r.left-gap,r.right+gap])])].sort((a,b)=>a-b);
  const ys=[...new Set([a[1],b[1],...obstacles.flatMap(r=>[r.top-gap,r.bottom+gap])])].sort((a,b)=>a-b);
  const key=(x,y)=>x+','+y,goal=key(b[0],b[1]),first=key(a[0],a[1]);
  const queue=[{p:a,cost:0}],costs=new Map([[first,0]]),previous=new Map();
  while(queue.length){queue.sort((u,v)=>(v.cost+Math.abs(v.p[0]-b[0])+Math.abs(v.p[1]-b[1]))-(u.cost+Math.abs(u.p[0]-b[0])+Math.abs(u.p[1]-b[1])));const cur=queue.pop(),k=key(...cur.p);if(cur.cost!==costs.get(k))continue;if(k===goal)break;
    const ix=xs.indexOf(cur.p[0]),iy=ys.indexOf(cur.p[1]);
    for(const p of [[xs[ix-1],cur.p[1]],[xs[ix+1],cur.p[1]],[cur.p[0],ys[iy-1]],[cur.p[0],ys[iy+1]]]){
      if(p.includes(undefined)||inside(...p)||!clear(cur.p,p))continue;
      const next=key(...p),cost=cur.cost+Math.abs(p[0]-cur.p[0])+Math.abs(p[1]-cur.p[1])+1;
      if(cost<(costs.get(next)??Infinity)){costs.set(next,cost);previous.set(next,k);queue.push({p,cost});}
    }
  }
  if(!costs.has(goal))return null; // Never draw a knowingly obstructed fallback.
  const points=[b];let k=goal;while(k!==first){k=previous.get(k);if(!k)return null;points.push(k.split(',').map(Number));}points.reverse();points.unshift(start);points.push(end);
  const compact=points.filter((p,i)=>!i||i===points.length-1||!((points[i-1][0]===p[0]&&points[i+1][0]===p[0])||(points[i-1][1]===p[1]&&points[i+1][1]===p[1])));
  return {points:compact,path:compact.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ')};
}
