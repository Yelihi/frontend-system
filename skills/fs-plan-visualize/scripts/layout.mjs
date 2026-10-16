// Logical runtime regions, independent of OS/browser process allocation.
export function browserLayout(spec) {
 const columns=Math.min(spec.pages.length,2),pageWidth=600,gap=36,left=48,top=148;
 const sidebarX=left+columns*(pageWidth+gap)+12,sidebarWidth=288;
 const app=spec.nodes.filter(n=>n.environment==='app');
 const remote=spec.nodes.filter(n=>['backend','external'].includes(n.environment));
 const rows=Math.ceil(spec.pages.length/columns);
 const browserY=top,appColumns=columns*2,appY=top+rows*550+12;
 const appWidth=sidebarX-left-24,cardWidth=(appWidth-28-(appColumns-1)*14)/appColumns;
 const appHeight=app.length?52+Math.ceil(app.length/appColumns)*126:0;
 const height=Math.max(appY+appHeight+28,browserY+Math.max(180,70+(spec.browserApis?.length??0)*90),148+remote.length*126+36);
 const shellWidth=sidebarX+sidebarWidth+32,remoteX=shellWidth+48;
 return {width:remoteX+320,height:height+24,
  shell:{x:16,y:16,width:shellWidth-16,height:height-16},
  content:{x:18,y:110,width:sidebarX-18,height:height-112},
  appLane:{x:left,y:appY,width:appWidth,height:appHeight},
  sidebar:{x:sidebarX,y:110,width:sidebarWidth+30,height:height-112,browserY},
  remote:{x:remoteX,y:top,width:288,height:height-top-24},
  frames:spec.pages.map((page,index)=>({page:page.id,x:left+(index%columns)*(pageWidth+gap),y:top+Math.floor(index/columns)*550,width:pageWidth})),
  placements:Object.fromEntries([...app.map((n,i)=>[n.id,{x:left+14+(i%appColumns)*(cardWidth+14),y:appY+52+Math.floor(i/appColumns)*126,width:cardWidth}]),...remote.map((n,i)=>[n.id,{x:remoteX+14,y:top+52+i*126,width:260}])])};
}
