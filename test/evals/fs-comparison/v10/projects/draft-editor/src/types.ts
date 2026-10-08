export type Doc={id:string;body:string;revision:number};
export type SaveResult={kind:'saved';document:Doc}|{kind:'conflict';remote:Doc};
export type Repository={load(id:string):Promise<Doc>;saveDraft(doc:Doc):Promise<SaveResult>};
export type View={body(value:string):void;status(value:string):void};
