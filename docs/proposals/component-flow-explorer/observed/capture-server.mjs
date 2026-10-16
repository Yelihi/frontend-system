import http from 'node:http';
import net from 'node:net';
// Local fault-injection proxy: app code stays unchanged. Screens record this test environment.
let mode='pending-error',release;
const server=http.createServer(async(req,res)=>{
 if(req.url==='/__capture/release'){release?.();res.end('released');return;}
 if(req.url==='/__capture/success'){mode='success';res.end('success');return;}
 if(req.url==='/api/orders'&&mode==='pending-error'){
  await new Promise(resolve=>{release=resolve;res.on('close',resolve);});
  res.writeHead(500,{'content-type':'application/json'});res.end('{}');return;
 }
 const upstream=http.request({hostname:'127.0.0.1',port:3217,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:3217'}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
 upstream.on('error',()=>{res.writeHead(502);res.end('upstream unavailable');});req.pipe(upstream);
});
server.on('upgrade',(req,socket,head)=>{
 const upstream=net.connect(3217,'127.0.0.1',()=>{
 upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`+Object.entries(req.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')+'\r\n\r\n');
 if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);
 });upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());
});
server.listen(3218,'127.0.0.1',()=>console.log('Capture proxy http://127.0.0.1:3218'));
