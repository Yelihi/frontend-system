import {flowSchema} from '../src/application/flow-schema.js';

export function searchDesign() {
  return flowSchema.parse({id:'search-design', title:'자료 검색', basis:'proposed', designState:'ready',
    summary:'필터를 변경하면 새 결과를 조회하고 실패 시 입력을 보존한다.',
    scope:{files:['requirements.md'],discoveryRoots:['.']}, evidence:{request:{path:'requirements.md',quote:'Keep the selected filter on failure.'}},
    nodes:[
      {id:'page',kind:'page',label:'SearchPage',evidence:['request'], architecture:{layer:'presentation',runtime:'browser',responsibility:'검색 화면 조합'}},
      {id:'filter',kind:'component',parent:'page',label:'SearchFilter',props:['query: string'],state:[],events:['onQueryChange(query)'],evidence:[],
        architecture:{layer:'presentation',runtime:'browser',responsibility:'입력 전달'},
        contracts:[{kind:'interface',name:'SearchFilterProps',path:'src/SearchFilter.tsx',signature:'interface SearchFilterProps { query: string; onQueryChange(query: string): void }',evidence:[]}]},
      {id:'results',kind:'component',parent:'page',label:'SearchResults',state:['status: SearchStatus'],evidence:[]},
      {id:'search',kind:'service',label:'searchResources',state:['requestId: number'],evidence:[],
        architecture:{layer:'application',runtime:'browser',responsibility:'요청 결과의 소유권과 오류 처리'},
        contracts:[{kind:'function',name:'searchResources',path:'src/search.ts',signature:'searchResources(query: string): Promise<SearchResult>',evidence:[]}]},
    ],
    pages:[{node:'page',route:'/resources',domain:'자료 탐색',scenes:[
      {id:'idle',title:'검색 전',kind:'idle',description:'필터를 입력하세요',blocks:[{node:'filter',role:'input',label:'검색어'},{node:'results',role:'content',label:'검색할 자료를 입력하세요'}]},
      {id:'loading',title:'검색 중',kind:'loading',description:'선택한 필터는 유지하고 결과 영역에 로딩을 표시한다.',blocks:[{node:'filter',role:'input',label:'검색어'},{node:'results',role:'feedback',label:'검색 중…'}]},
      {id:'success',title:'검색 결과',kind:'success',description:'조회된 자료를 표시한다.',blocks:[{node:'filter',role:'input',label:'검색어'},{node:'results',role:'list',label:'자료',content:['자료 A','자료 B']}]},
      {id:'error',title:'검색 실패',kind:'error',description:'입력은 유지하고 재시도를 제공한다.',blocks:[{node:'filter',role:'input',label:'검색어'},{node:'results',role:'feedback',label:'검색하지 못했습니다. 다시 시도하세요.'}]},
    ]}],
    edges:[{id:'request',from:'filter',to:'search',kind:'call',label:'searchResources(query)',evidence:[]},
      {id:'resolve',from:'search',to:'results',kind:'return',label:'acceptResult(requestId, result)',evidence:[]}],
    scenarios:['success','error'].map(variant=>({id:variant,title:variant==='success'?'필터 변경 후 검색 성공':'필터 변경 후 검색 실패',entry:'filter',event:'onQueryChange(query)',variant,
      steps:[{edge:'request',effect:'현재 필터로 검색을 시작한다.',views:[{page:'page',scene:'loading'}],changes:[{ownerNode:'results',field:'status',before:'idle',after:'loading',basis:'proposed'}]},
        {edge:'resolve',effect:variant==='success'?'결과를 표시한다.':'입력을 보존하고 오류를 표시한다.',condition:variant==='success'?'latest request succeeds':'latest request fails',views:[{page:'page',scene:variant}],changes:[{ownerNode:'results',field:'status',before:'loading',after:variant,basis:'proposed'}]}],
      outcome:variant,limitations:[]})),
    testCases:['success','error'].map(id=>({id:'case-'+id,scenarioId:id,given:'A selected filter',when:id==='success'?'The latest request succeeds':'The latest request fails',then:id==='success'?'Show the matching result':'Keep the filter and show retry',method:'integration'})),
    checks:[{id:'preserve',requirement:'실패 시 필터를 보존한다.',nodes:['filter'],scenarios:['error'],testCaseIds:['case-error']}],
    limitations:['설계 예시이며 실행 결과가 아닙니다.'],
  });
}
