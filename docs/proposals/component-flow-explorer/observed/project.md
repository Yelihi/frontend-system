<!-- frontend-system-context {"baseRef":"main","analyzedCommit":"154c7e359c1b823e9253568961a0f73f5844e645","sourceHash":"e6360600d0634300495d050307d2517f4a6a2a5f60c3f4ff143927cc8e7fb1a4","updatedAt":"2026-10-12T15:04:41.306Z","analysisStatus":"complete"} -->

# observed-order-project Frontend Context


> Generated from 154c7e359c1b823e9253568961a0f73f5844e645. Verify evidence before changing approved decisions.


주문 예제 전체 정적 분석: 24개 추적 파일 중 23개 본문 검토, 생성 lockfile 1개 제외. 1개 페이지와 주문·재고 이벤트를 추적했다.

## Observed

- None

## Domains and routes

- None

## Events and calls

- None

## Architecture

- None

## State and data fetching

- None

## Styles

- None

## Tests and evidence

- None

## Conventions

- None

## Decisions

- None

## Quality Gates

- None

## Assumptions

- None

## Open Questions

- None



<!-- fs-project-context db1b68ae11a9f2533764d0dcfad58b62f337003162c9aba3b57033ecf5d38be2 -->

## Analysis delivery

Status: **complete**. This is static analysis, not runtime verification.

[AI context](evidence/context-db1b68ae11a9f2533764d0dcfad58b62f337003162c9aba3b57033ecf5d38be2.json) · Read selected records by ID; diagrams are human projections.

## Detailed project analysis

### environment

Status: reviewed

Next.js 16.3.5 / React 19.3.0. 배포 서비스 설정은 없다.

- **environment** (fact): Next.js 16.3.5 / React 19.3.0. 배포 서비스 설정은 없다.
  Evidence: `package.json:16`


Flow: 설정 또는 비연결 모듈. 주문 이벤트는 orders 영역에서 추적.


Knowledge review: 이 영역은 환경/구조 관찰이며 요청 공유 정책 규칙을 강제할 대상이 아님.

### architecture

Status: reviewed

Page가 서버 문자열을 children으로 전달하고 OrderForm은 client 경계를 선언한다.

- **architecture** (fact): Page가 서버 문자열을 children으로 전달하고 OrderForm은 client 경계를 선언한다.
  Evidence: `app/page.jsx:5`


Flow: 설정 또는 비연결 모듈. 주문 이벤트는 orders 영역에서 추적.


Knowledge review: 이 영역은 환경/구조 관찰이며 요청 공유 정책 규칙을 강제할 대상이 아님.

### orders

Status: reviewed

상태 콜백과 pending 클로저 잠금이 분리되어 있으며 finally에서 잠금 해제한다.

- **orders** (fact): 상태 콜백과 pending 클로저 잠금이 분리되어 있으며 finally에서 잠금 해제한다.
  Evidence: `src/domain/orders.js:19`


#### 주문 제출의 실제 상태 흐름

OrderForm → createOrderSubmitter → send → POST. 상태 콜백과 클로저 잠금을 구별한다.

[Interactive flow](diagrams/project-2b9b60500b6aeb17403248fc214249acb4d672545905553cca71a77e214010c1.html) · [Structured record](analysis/history/2b9b60500b6aeb17403248fc214249acb4d672545905553cca71a77e214010c1.json)

- **Page** (page): See cited relationships.

- **OrderForm** (component, parent: page): props: children: server-rendered React content; state: status.pending: boolean, status.error: string, status.submitted: boolean, submit: stable callback; events: onSubmit(event) → preventDefault(); submit(1), onClick → statusAction(); lifecycle: mount: useState initializes status and submit

  - function **OrderForm** (app/order-form.jsx): OrderForm({ children })

- **createOrderSubmitter** (module): state: pending: boolean (closure; separate from status.pending); events: submit(quantity) → Promise<boolean>

  - function **createOrderSubmitter** (src/domain/orders.js): createOrderSubmitter(send, changed)

- **send(quantity) / fetch** (service): events: POST /api/orders, non-ok → throw Error

- **POST /api/orders** (service): events: Response.json({ accepted: true })

- **statusAction** (service): events: return 'available'

- **serverLabel** (module): events: return 'Server-rendered catalogue'


**초기 화면** — route /

1. page → catalog: serverLabel(); 서버에서 catalogue 문자열 생성

2. page → form: children = <p>{serverLabel()}</p>; children을 클라이언트 OrderForm에 전달

Outcome: 초기 status는 pending=false, error="", submitted=false

Limits: See flow limitations.


**주문 성공** — submit(1)

1. form → submitter: submit(1); 클로저의 pending 검사 후 양의 정수 확인

2. submitter → form: changed({ pending:true, error:"", submitted:false }); pending=true, status pending=true로 콜백 호출

3. submitter → send: await send(quantity); send(1) 대기

4. send → api: fetch POST JSON quantity; POST는 accepted:true를 반환

5. submitter → form: changed({ pending:false, error:"", submitted:true }); status.submitted=true; 클로저 pending은 finally 전까지 true

6. submitter → submitter: finally: pending = false; 클로저 pending=false; promise true 반환

Outcome: Order received 표시

Limits: See flow limitations.


**요청 실패** — non-ok response 또는 fetch rejection

1. form → submitter: submit(1); submit(1)

2. submitter → form: changed({ pending:true, error:"", submitted:false }); 이전 error를 비우고 pending=true

3. submitter → send: await send(quantity); 실패하는 send(1)

4. submitter → form: changed({ pending:false, error:message, submitted:false }); 오류 문자열을 status.error에 전달

5. submitter → submitter: finally: pending = false; pending=false; promise false 반환

Outcome: 오류를 표시하고 재시도 가능

Limits: See flow limitations.


**중복 제출** — in-flight submit(1)

1. form → submitter: submit(1); 두 번째 submit(1)

2. submitter → form: duplicate → false, no callback or request; pending이 true라 추가 send와 changed 없이 false 반환

Outcome: 기존 요청 유지

Limits: See flow limitations.


**잘못된 수량** — submit(0)

1. submitter → form: invalid quantity → rejected promise; pending=false일 때 정수/양수 검증 실패

Outcome: 요청과 상태 변경 없이 reject; UI는 1만 전달

Limits: See flow limitations.


**재고 확인** — Check availability click

1. form → action: void statusAction(); server action 결과는 소비하지 않음

Outcome: 화면 상태 변경 없음

Limits: See flow limitations.


Flow limitations: POST는 검증·저장 없는 테스트 응답이다. 실제 주문 DB는 없다.; 실제 코드에는 외부 store/cache와 구독이 없다.; 성공/실패 콜백 호출과 React commit은 같은 시각임을 보장하지 않는다.; availability 오류 처리 및 unmount 취소 처리는 구현되어 있지 않다.


Knowledge review: request-policy-boundaries를 읽고 UI→send→오류 소비자를 확인. 독립 요청 하나이므로 공통 요청 계층 추가를 요구하지 않는다. POST의 무검증 성공은 fixture 동작으로 기록.

### shared

Status: reviewed

checkout은 cart의 공개 index를 통해 price를 가져오며 이 경로는 현재 페이지에 연결되지 않았다.

- **shared** (fact): checkout은 cart의 공개 index를 통해 price를 가져오며 이 경로는 현재 페이지에 연결되지 않았다.
  Evidence: `src/features/checkout/index.js:1`


Flow: 설정 또는 비연결 모듈. 주문 이벤트는 orders 영역에서 추적.


Knowledge review: 이 영역은 환경/구조 관찰이며 요청 공유 정책 규칙을 강제할 대상이 아님.

### delivery

Status: reviewed

단위 테스트와 e2e 정의가 있고 typecheck 범위는 domain/orders.js로 제한된다.

- **delivery** (fact): 단위 테스트와 e2e 정의가 있고 typecheck 범위는 domain/orders.js로 제한된다.
  Evidence: `tsconfig.check.json:7`


Flow: 설정 또는 비연결 모듈. 주문 이벤트는 orders 영역에서 추적.


Knowledge review: 이 영역은 환경/구조 관찰이며 요청 공유 정책 규칙을 강제할 대상이 아님.

<!-- fs-project-evidence 12eca1d81f7f0f53dbef936bae1749107766ee28d2133de9d127143a6d7035b4 -->

## Evidence and coverage

Coverage: accounted. Citations are checked; semantic accuracy is a host judgment.

Detailed statements and file coverage: [evidence](evidence/project-12eca1d81f7f0f53dbef936bae1749107766ee28d2133de9d127143a6d7035b4.json). Read only the relevant statements/flows for a task.

Statements: 5; pending/blocked files: 0.

Tracked files: 24. Page get_project_snapshot for the complete baseline inventory.

Package manifests: package.json. Read selected manifests from the baseline snapshot.

## Flow and improvement index

[Flow/finding index](analysis/index.md). Query get_project_analysis for working-tree freshness; the baseline report pins its own observed versions.

Base: main @ 154c7e359c1b823e9253568961a0f73f5844e645. Check current status with get_project_snapshot; local edits are not main facts.

Previous inspection preserved: [init.md](init.md). Reconcile its decisions explicitly.

Previous context preserved: [history](project-history/74f8313538bf11b73e7e507f44833eb3100710a01316dca008877f70ff166ab9.md).

