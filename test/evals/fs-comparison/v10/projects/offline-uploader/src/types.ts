export type Job={id:string;workspace:string;file:string;attempt:number};
export type Sender={uploadChunk(job:Job,token:string):Promise<{receipt:string}>};
export type Events={done(id:string,receipt:string):void;failed(id:string):void;pending(n:number):void};
