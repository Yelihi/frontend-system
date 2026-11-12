# FS 시각화 리팩터링 구현 계획

이번 작업의 목표는 사용자가 확정한 Echo 검토 화면을 FS의 실제 렌더링 경로에 이식하는 것이다. 새 UI를 다시 디자인하지 않는다. 화면 구성·정보 밀도·상호작용·색상·글꼴·상태 표시는 첨부 HTML을 기준으로 유지한다. 허용된 시각적 변경은 화살표 경로 개선과 그에 필요한 최소 여백 조정이다.

구현 대상은 frontend-system이다. Echo는 검증 fixture와 도메인 시나리오로 사용한다. 이번 단계에서 Echo 제품 코드를 수정하거나 Echo 테스트 통과를 선언하지 않는다.

## 1 전달 파일과 기준

| 파일 | 역할 |
|---|---|
| `reference/approved-echo.html` | 브라우저에서 여는 확정 화면. 다른 Codex가 직접 확인할 기준 |
| `reference/approved-echo.fragment.html` | 확정 화면의 원본 CSS·렌더링·상호작용 코드. 이식의 출발점 |
| `reference/echo-review-model.json` | 도메인 규칙·계약·9단계 흐름·7개 테스트 계획 데이터 |
| `reference/SHA256SUMS` | 기준 파일 무결성 확인 |
| `CODEX-PROMPT.md` | 작업을 시작할 때 전달하는 지시문 |

FS 분석 기준 커밋: `bfa3a02a5a63f1b1714cf762d9df348abfee274e`.
Echo 분석 기준 커밋: `172f5f28abd3eab30129d177c15422622454ba6a`.

실제 작업 checkout이 이 커밋과 다르면 관련 파일 차이를 먼저 확인한다. 오래된 분석에 맞추려고 사용자의 변경을 되돌리지 않는다. 이 문서의 파일명은 위 FS checkout에서 확인한 경로이며, 신규 파일은 별도 표시했다.

**확정 HTML은 화면 기준이며 FS의 운영 데이터 형식이 아니다.** `reviewExtension`과 기존 `flow`를 동시에 독립 편집하는 구조를 제품에 복사하지 않는다. 기존 JSON의 정규 모델에 필요한 정보를 통합하고, 렌더링 데이터는 그 모델에서 파생한다.

확정 프로토타입은 DOM 대역으로 주요 상태 전이와 팝업 로직을 검사했다. 실제 브라우저 전체 화면 검수와 screenshot baseline 생성은 아래 구현 단계에서 수행해야 한다. 확정 화면 안의 Echo 와이어프레임은 코드 기준 재구성이며 실제 앱 캡처가 아니다.

## 2 FS 전체 방향과 이번 범위

FS의 장기 목표는 프로젝트 이해와 필수 규칙 → 비즈니스 및 UI 흐름 설계 → 시각 검토 → 구현 계획 → 계획에 맞는 구현 → 통합 검증을 연결하는 것이다. 프로젝트 이해·기술환경·기능 설계·시각화는 반복 수정되며 기준 문서와 계획도 같은 버전으로 갱신된다. feature는 커밋이나 파일이 아니라 비즈니스 흐름 단위다.

사용자는 시각화로 흐름과 테스트 대상을 이해한다. AI는 모듈 책임·인터페이스·상태 소유권·테스트 초안을 먼저 제시한다. 사용자는 테스트 주제와 통과 조건을 명시적으로 확인한다. 계획 확인과 실제 실행 성공은 별개다. 라이브러리와 테스트 도구는 프로젝트마다 다르므로 Jest·Playwright·Zustand를 FS 전역 전제로 삼지 않는다.

| 구분 | 방향 | 이번 구현 |
|---|---|---|
| 시각화 | 실제 화면과 외부 store·API를 연결한 실행 흐름, 도메인·계약·의존성·테스트 계획 | 구현 |
| 필수 규칙과 계획 | 초기 프로젝트 논의로 규칙을 결정하고 RADIO 및 todo·테스트 계획에 연결 | 기존 구조 보존. 전면 개편은 다음 단계 |
| source 기반 자동 적용 | source→learned→코드 작성·자동 검토의 강제 연결 제거 | 시각화 화면의 필수 입력으로 추가하지 않음. 런타임 전체 삭제는 후속 작업 |
| PR 리뷰 | 전용 자동 리뷰 기능 제거 방향 | 이번 PR에서 삭제하지 않음 |
| 테스트 하네스 | 도구 선택, 격리, 실패 주입, 실행 증거, flaky 분석 | 이번에는 계획 데이터와 확인 UI만 구현. 실제 실행 엔진은 후속 |
| 자료와 결정 기록 | 수동 자료를 참조 문서로 정리하고 결정의 대안·이유를 docs에 저장 | 이후 별도 작업. 기존 decision 저장 기능 보존 |
| 배포·관측·실험 서버 | 필요할 때 실제 서버로 경계 검증 | 이번 범위 밖 |

이번 작업에 source 저장소 정리, PR 도구 삭제, 새 프레임워크 도입, 전체 프로젝트 재분석, Echo API 구현, 배포를 묶지 않는다.

## 3 현재 호출 관계와 수정 위치

확인된 단일 흐름 HTML 경로:

```text
src/cli.ts: flow-render
src/mcp.ts: render_project_flow
  → src/application/render-project-flow.ts: renderProjectFlow
    → getProjectAnalysis + flowSchema + hash/freshness 검사
    → pages가 있고 한국어 HTML인 경우 prepareFlowExplorer
      → src/application/page-flow-view.ts: projectFlowView
      → 캡처 manifest/PNG/hash/영역 검증
      → skills/fs-plan-visualize/scripts/renderer.mjs: prepareExplorer
        → layout.mjs: browserLayout
        → viewer.html + board.js + routes.js 결합
        → HTML / model / captureInput 반환
    → 파일 원자적 저장
```

`projectView` 경로는 `project-changes.ts`의 `renderProjectVisualization`으로 분기한다. `project-visualization.ts`는 여러 flow를 합성하고 같은 renderer를 호출한다. 한국어 page explorer 외에는 `flow-view.ts`의 HTML 또는 Mermaid 경로가 남아 있다.

따라서 `viewer.html`만 바꾸면 완료가 아니다. 데이터가 `flow-schema → projectFlowView → renderer`를 통과하고, 기존 캡처·hash·프로젝트 합성 경로가 깨지지 않아야 한다.

| 파일 또는 영역 | 이번 처리 | 구체적 작업 |
|---|---|---|
| `src/application/flow-schema.ts` | 유지·확장 | 구조화 상태, 변경 구분, 도메인 규칙 연결, 상세 테스트, 검토 화면 버전 필드를 추가한다. 기존 필드의 의미는 보존 |
| `src/application/flow-contracts.ts` | 유지·확장 | 노드·상태·계약·규칙·테스트·단계 참조, ID 중복, 잘못된 owner 연결 검증 |
| `src/application/page-flow-view.ts` | 수정 | 새 필드를 누락 없이 projection. sourceId ↔ viewId를 유지. 근거·상태 변경 분류를 추측하지 않음 |
| `src/application/render-project-flow.ts` | 최소 수정 | 기존 CLI/MCP 입구와 output 계약 유지. 새 검토 모델을 renderer에 전달 |
| `skills/fs-plan-visualize/scripts/renderer.mjs` | 수정 | 새 검토 버전 입력의 검증과 전용 템플릿 선택. HTML escape와 안정적인 출력 유지 |
| `skills/fs-plan-visualize/scripts/review-viewer.html` | 신규 제안 | 확정 fragment를 이식한 4탭 화면. 기존 viewer와 혼합한 제3의 디자인 금지 |
| `skills/fs-plan-visualize/scripts/review-viewer.js` | 신규 제안 | 탭·선택 단계·팝업·편집·테스트 계획 확인 처리. Echo 전용 함수명 조건문 제거 |
| `skills/fs-plan-visualize/scripts/review-viewer.css` | 신규 제안 | 확정 CSS를 제품 범위로 이식. host CSS와 독립적으로 code padding·line-height 지정 |
| `skills/fs-plan-visualize/scripts/review-edges.js` | 신규 제안 | 흐름·의존성의 포트와 화살표 경로 계산. 순수 geometry 함수와 DOM 측정 분리 |
| `viewer.html`, `board.js`, `routes.js`, `layout.mjs`, `compose.mjs` | 호환 경로 유지 | 신규 화면이 선택된 경우 예전 inspector/board UI를 중복 노출하지 않는다. 기존 프로젝트·구형 모델의 렌더링은 유지 |
| `src/application/project-visualization.ts` | 호환 검증 | 여러 flow의 ID 충돌 방지. 새 optional 필드를 조용히 버리지 않음. 전역 overview 재디자인은 제외 |
| `src/application/project-flows.ts`, `flow-design.ts` | 보존 | 소스 근거, freshness, observed/proposed, 캡처 검증을 우회하지 않음 |
| `skills/fs-plan-visualize/SKILL.md`, `references/page-flow.md`, `references/workflows/design-flow-contract.md` | 수정 | 확정 UI·정규 JSON·검토와 실행 분리·동일 화면 유지 절차 명시 |
| `test/flow-explorer.test.ts`, `flow-contracts.test.ts`, `flow-design.test.ts`, `page-flow-cases.test.ts`, `project-visualization.test.ts` | 유지·추가 | 새 모델 및 기존 경로 회귀 검사 |
| `test/fixtures/flow-review/` | 신규 제안 | Echo와 작은 별도 프로젝트 fixture. 경로는 구현 시 기존 fixture 관례와 정합성 확인 |
| `scripts/check-flow-review.mjs` | 신규 제안 | 확정 화면 대비 브라우저·상호작용·화살표 검사 |
| `bundle/`, `dist/` | 수동 수정 금지 | 공식 빌드로 생성 |

**이번 삭제 범위:** 새 검토 화면에서 사용하지 않는 예전 툴바·중복 inspector·반복 설명, 이식 과정의 Echo 하드코딩, 동일 의미 데이터의 이중 관리만 제거한다. 기존 renderer 파일 전체나 지식·PR 모듈을 먼저 삭제하지 않는다. 모든 호출자가 이전되었다는 증거가 생긴 뒤의 실제 파일 삭제는 별도 변경으로 한다.

**후속 삭제 후보:** `src/application/knowledge/`의 source/learned 자동 적용 경로, `pr-readiness.ts`, `work-review.ts`, 관련 MCP·CLI·skill 입구. `reference-index.ts`의 contentHash, `routing.ts`의 설치 경로 처리처럼 다른 곳에서 쓰는 공통 기능은 먼저 분리한다. 지금 이 목록을 삭제 지시로 실행하지 않는다.

## 4 화면 구현 계약

### 공통

- 제목, 상단 FS/Echo 문맥, `흐름 / 도메인·계약 / 의존성 / 테스트 계획`의 4탭과 순서를 유지한다.
- desktop의 배치·카드·여백·선택 상태·와이어프레임 크기와 내부 구성은 확정 HTML을 따른다.
- 제목 24px, 섹션 19px, 소제목 15px, 본문 14px, 일반 코드 13px 등 최종 CSS 값을 출발점으로 삼는다. 코드 전체를 하나의 색으로 되돌리지 않는다.
- 함수·훅 이름은 보라색과 굵기, interface는 타입·키워드·문자열·주석을 구분한다. 밝은/어두운 배경 모두 읽혀야 한다.
- 함수명과 설명의 왼쪽 기준선을 맞춘다. 코드의 host 기본 padding/margin에 의존하지 않는다. 선택 테두리 변화로 내용이 좌우 이동하지 않게 한다.
- 설계 예상, 실제 캡처, 코드 근거, 테스트 계획 확인, 실행 결과를 구분한다. 반복 안내 문구는 추가하지 않는다.
- 별도 sidebar·대시보드·카드 체계·전체 Mermaid 화면으로 재해석하지 않는다.

### 흐름

- 실제 view와 유사한 Echo 와이어프레임이 왼쪽, 외부 훅/store/API 카드가 오른쪽이다.
- 아래에 단계 제목, 이전/다음, 1~9 단계 선택, 호출 코드, 연결 설명, 소유자·필드·이전·이후 표, 규칙/테스트 링크가 있다.
- 현재 단계의 화면·외부 노드·관계·상태가 함께 갱신된다. 전체 의존성을 한꺼번에 진하게 표시하지 않는다.
- 기존/변경 제안 비교는 접힌 상세 영역으로 유지한다. D1 오류 안내와 D2 저장 버튼 문구 편집을 유지한다.
- 사용자가 입력한 문구는 와이어프레임, interface 제안, p-ui 예상 조건에 함께 반영된다.
- 함수 클릭 후 계약과 검증 상세, 테스트/규칙으로의 이동 동작을 유지한다.

### 함수 출처와 팝업

- `existing / modified / added`를 명시적인 데이터로 관리한다. 근거가 부족한 경우 `unknown`을 표시하고 기존으로 단정하지 않는다.
- 화면 표시는 `기존`, `기존 + 수정 제안`, `신규 제안`이다. 신규가 실제 구현됐다는 의미로 표시하지 않는다.
- Echo 기준 신규 함수는 0개다. `RolePlayRecordingClient`, `RecordingPanel`에는 UI 계약 변경 제안이 연결된다. 저장 훅을 신규로 오표시하지 않는다.
- 함수명 호버와 키보드 포커스에서 설명·관련 interface 발췌 팝업을 연다. 터치에서는 탭으로 같은 내용에 접근한다.
- 팝업으로 포인터를 옮겨도 유지한다. Escape와 바깥 클릭으로 닫는다. 작은 화면에서 잘리거나 다른 조작을 영구적으로 막지 않는다.
- 긴 interface는 요약 발췌와 `도메인·계약`의 전체 계약으로 연결한다. 다른 모듈의 계약을 편의상 첫 번째 항목으로 보여주지 않는다. 함수 전체 시그니처가 아니라 관련 입출력 발췌라면 그렇게 표기한다.
- 코드 문자열은 text/escaped markup으로 렌더링한다. 설명이나 signature의 HTML을 실행하지 않는다.

### 상태와 데이터

- 카드에서 `이름 | 값` 배지를 사용하며 변경값을 강조한다. 배지 색만으로 변경 여부를 전달하지 않는다.
- 표의 첫 열은 **소유자 이름 → 분류 배지 + 필드 이름**이다. 두 줄의 바깥 왼쪽 기준선을 맞춘다.
- `RecordingSessionBaseStore` 아래의 `saving`, `saveFailed`, `currentStep`은 `STATE`다.
- `useRecordingSession`의 `recordedAudio`는 reducer가 소유한 `STATE`다.
- Blob별 ID 매핑은 `REF`, 서버 저장 행은 `DB`, 요청 결과는 `RESULT`로 구분한다. 모든 표시값을 React state라고 부르지 않는다.
- 이전/이후 값과 `변경`/`유지` 라벨을 유지한다. false·0·null·미확인·아직 값 없음은 각각 다른 값이다.
- owner나 필드 이름 문자열로 분류하지 않고 정규 데이터의 fieldKind와 ownerId를 사용한다.

### 도메인·계약

- 도메인 범위, 용어, R1~R6 규칙, 코드 근거, 테스트 링크, interface, 범위 밖 항목을 유지한다.
- 기존 계약과 변경 제안을 분리한다. 동일 계약을 섹션마다 따로 저장하지 않는다.
- 규칙 → 테스트, 함수 → 계약의 링크가 같은 ID를 따라 움직여야 한다.

### 의존성

- 현재 확정된 node-arrow 시각화와 노드 선택 상세를 유지한다.
- 프로젝트 레이어·runtime·책임·호출/읽기/쓰기/구독 관계를 데이터로 표시한다.
- 호출 관계 그림만으로 import 규칙 준수를 판정하지 않는다.
- Echo 저장 경로에 TanStack Query mutation/invalidation을 임의로 추가하지 않는다. 설치와 사용 경로는 별개다.

### 테스트 계획

- 왼쪽 도구별 목록, 오른쪽 선택 테스트의 상세 구성과 순서를 그대로 유지한다.
- 상세는 규칙, Given, 순서 있는 When, Then, mock·환경·격리, 반증, 검증 한계, 확인 체크다.
- 섹션 제목을 짧게 만드는 것은 허용하지만 준비·주입·단언·분모·격리·한계 내용을 생략하지 않는다.
- 테스트 runner와 layer는 데이터다. Echo fixture는 Jest/Playwright/수동 확인으로 표시하고 다른 프로젝트는 Vitest 등 실제 도구 이름을 표시한다.
- 확인 체크는 테스트 실행 성공이 아니다. 실행 자료가 없으면 `실행 전`으로 표시한다. 시간·실행 횟수·통과 기록을 생성하지 않는다.

## 5 화살표 수정 계약

이 절이 확정 화면에서 허용된 변경이다. 카드 배치 전체를 바꾸지 않고 연결선의 가독성을 고친다.

1. 노드 중심이 아니라 카드 테두리의 명시적 포트에서 시작하고 끝낸다. 대상 직전까지 선을 그리고 marker가 글자나 카드 안으로 들어오지 않게 한다.
2. 화면과 외부 카드 사이의 빈 통로를 사용한다. 같은 열의 연결은 바깥쪽 레일로 우회한다. 긴 대각선이 중간 카드를 관통하지 않게 한다.
3. 복수 연결은 별도의 레인으로 분리한다. 선·방향표·단계 번호가 겹치지 않게 한다. 필요한 경우 통로 여백만 최소한으로 늘린다.
4. 현재 단계의 선만 강조한다. 연결 순서는 원형 번호와 아래 설명으로 일치시킨다. 선 위의 긴 함수명 설명은 아래 목록에 둔다.
5. 응답 유실은 서버→요청자 방향의 중단된 점선과 ×로 표시한다. 성공 도착을 의미하는 대상 화살촉은 붙이지 않는다.
6. `call / return / read / write / subscribe / cleanup`의 방향을 모델 그대로 유지한다. 재시도도 같은 target으로 연결한다.
7. 탭 전환·단계 변경·폰트 로드·resize·와이어프레임 높이 변화 후 좌표를 다시 측정한다. 숨겨진 노드를 측정해 0,0으로 연결하지 않는다.
8. 모바일은 단일 열로 쌓고 오른쪽 통로를 확보한다. SVG 전체를 축소해 텍스트와 선을 함께 작게 만드는 방법은 사용하지 않는다.
9. 흐름 탭과 의존성 탭은 포트/충돌 계산을 공유할 수 있지만, 표시하는 관계 집합은 각각 유지한다.
10. 노드 bbox 내부 관통, 레이블과 선 겹침, marker 잘림, 수평 overflow를 검사한다. 교차를 피할 수 없다면 다른 관계인 것을 구분하는 레인을 사용하고 임의로 관계를 삭제하지 않는다.

초기 구현은 이 화면에 필요한 결정적인 직교 경로 또는 완만한 곡선으로 충분하다. 별도 그래프 편집기·자동 레이아웃 프레임워크를 도입하지 않는다.

## 6 JSON과 저장 계약

기존 `flow-schema.ts`의 pages/nodes/edges/scenarios/contracts/invariants/testCases를 중심으로 확장한다. 아래 이름은 제안이며, 기존 의미를 중복하는 두 번째 graph를 만들지 않는 것이 우선이다.

| 정보 | 필요한 필드와 검증 |
|---|---|
| 검토 버전 | review schemaVersion. 구형 모델은 기존 renderer로 열리거나 명시적 migration을 거침 |
| 노드 변경 | changeKind, evidenceRefs, 변경 이유. observed/proposed와 별도 축 |
| 필드 정의 | fieldId, ownerNodeId, name, fieldKind(state/ref/db/result 등), type, 설명, 근거 |
| 상태 변경 | fieldId, before/after의 구조화 값, changeKind, basis(source/measured/proposed). 상태 없음을 null과 혼동하지 않는 표현 |
| 함수와 계약 | symbol ID, 이름, 설명, input/output signature, 관련 interface IDs, 근거와 변경 구분 |
| 도메인 규칙 | 기존 invariant ID를 재사용하고 node/contract/test 연결과 용어를 확장 |
| 실행 단계 | step ID, scene refs, ordered edge refs, stateChanges, ruleIds, testIds. 한 단계의 복수 호출과 유실 표시 지원 |
| UI 모습 | 기존/제안 scene, 화면 블록, 스타일 토큰, hotspot/region, 변경 ID. 임의 HTML 실행 대신 선언형 블록 또는 검증된 캡처 |
| 테스트 | runner, layer, given[], when[], then[], setup/mock/fixture/isolation, mutation, limits, ruleIds/stepIds |
| 검토 초안 | flowHash, reviewRevision, 선택 UI 상태, confirmedTestIds, draft edits, 결정 이유 |

**프로토타입 정규화의 주의점:** 첨부 JSON의 `flow.scenarios`는 큰 단위의 5단계, `reviewExtension.executionFlow`는 확정 화면의 세부 9단계다. 운영 구현에서 둘을 독립 관리하지 않는다. 하나의 정규 시나리오를 9단계로 정리하고 각 단계의 ordered edge refs를 모델에 넣는다. view에서 5단계를 함수명 조건문으로 9단계로 늘리지 않는다.

UI 구성은 Echo만 별도 renderer로 만드는 방식이 아니라 재사용 가능한 화면 블록으로 표현한다. 현재 보이는 녹음 화면의 상단 진행률, 상대 문장, MIC, 타이머, 오류 안내, 재생기, 저장/재녹음 버튼이 fixture 데이터로 재현되어야 한다. 다른 fixture에서도 같은 viewer가 동작해야 한다. 일반 화면 블록이 부족하면 필요한 최소 역할/표현만 추가한다.

입력 검증은 dangling refs, 중복 ID, 잘못된 owner, 빠진 계약, 모호한 changeKind, 유효하지 않은 test 링크를 찾는다. 기존 문자열 state는 호환 입력으로 읽되 정확한 분류를 알 수 없으면 `unknown`으로 표시한다. 알려지지 않은 신규 필드를 schema가 조용히 제거하지 않도록 round-trip 검사를 둔다.

정규 flow 저장은 기존 `save_project_analysis`와 expectedHash 경로를 유지한다. HTML 안의 편집/확인 상태는 **로컬 검토 초안**이다. 이번 단계에서는 파일 저장이나 서버 승인을 했다고 표시하지 않는다. 단독 HTML에서는 flowHash+reviewVersion으로 이름을 나눈 로컬 저장 또는 검토 JSON 내보내기로 복원할 수 있게 한다. 저장 실패·지원 불가는 표시하고 확인을 완료했다고 거짓 보고하지 않는다. 향후 FS 저장 도구는 이 초안을 검증 후 적용할 수 있다.

D1/D2 문구 편집은 p-ui와 m-a11y 확인을 해제하고 revision을 올린다. 정렬·색상·화살표만 바뀌면 확인을 해제하지 않는다. 규칙·계약·state 전이·주입 조건·Then이 바뀌면 해당 참조의 테스트를 다시 확인한다. 참조를 추적할 수 없는 변경은 안전하게 전체 확인을 해제한다. 다른 flowHash의 승인/확인을 자동 승계하지 않는다.

## 7 구현 순서와 중간 완료 조건

큰 변경을 한 번에 합치지 않고 다음 순서로 진행한다. 아래 작업 단위는 시각화 전달 흐름 안의 구현 순서이며 FS의 feature 단위를 파일별로 바꾸라는 뜻이 아니다.

### 작업 1 기준 고정과 현재 경로 확인

- checkout·작업 트리·AGENTS.md·관련 skill을 확인한다. 사용자 변경을 보존한다.
- 전달 패키지의 hash를 확인하고 reference를 repo의 검토용 fixture 위치에 복사한다.
- 확정 HTML을 동일 viewport에서 열어 4탭과 상태 1/3/4/5/7/9를 확인한다.
- 구현 baseline screenshot을 만든다. 초기 baseline은 확정 HTML에서 생성해야 하며 새 구현 결과를 정답으로 덮어쓰지 않는다.
- 로컬 서버가 필요하면 loopback으로 제공한다. 실행 환경 정책상 브라우저 접근이 차단되면 우회하지 않고 미확인 상태를 기록한다.
- 완료 조건: 기존 호출 경로와 손댈 파일, 실행 가능한 checks, 화면 baseline이 식별됨.

### 작업 2 정규 모델과 Echo fixture

- 추가 필드를 schema와 참조 검증에 반영하고 `projectFlowView`로 전달한다.
- Echo fixture를 단일 9단계 모델로 옮긴다. R1~R6, I1~I5, 테스트 7개를 빠뜨리지 않는다.
- 변경 구분, state/ref/db/result, 검토 상태를 명시적으로 분리한다.
- 완료 조건: parse→save→read→projection에서 정보가 유지되고 잘못된 참조가 실패함. 구형 fixture도 읽힘.

### 작업 3 확정 화면 이식

- fragment의 CSS/markup부터 옮기고 데이터 접근만 정규 모델로 치환한다.
- 4탭, 와이어프레임, 외부 카드, 상태 배지, 단계 설명, 도메인/계약, 의존성, 상세 테스트를 재현한다.
- 프레임워크 전환 없이 현재의 standalone HTML 전달 방식을 유지한다.
- 완료 조건: 화살표를 제외한 화면이 기준과 같고 Echo 이름을 바꾼 별도 fixture에서도 작동함.

### 작업 4 상호작용과 검토 초안

- 단계 이동, 노드 선택, popup, tab, 규칙/테스트 링크, D1/D2 편집, 확인/무효화를 연결한다.
- 팝업 keyboard/touch 접근, Escape, focus 복귀, tooltip clipping을 검수한다.
- 완료 조건: 문구 변경이 화면·계약·테스트에 동시에 반영되고 영향받는 확인만 해제됨. 실행 성공 기록을 만들지 않음.

### 작업 5 화살표

- 순수 geometry 계산과 실제 DOM 측정을 분리하여 5절의 규칙을 적용한다.
- 단계별 방향, 유실 표시, 카드/텍스트 회피, resize 재계산을 점검한다.
- 완료 조건: 9단계와 의존성 탭의 주요 edge가 올바른 포트에 연결되고 선이 카드 내부를 관통하지 않음.

### 작업 6 FS 입구 연결과 회귀

- `render_project_flow`와 `flow-render`에서 같은 결과가 생성되게 한다.
- 새 reviewVersion이 있는 입력은 새 검토 화면, 기존 기록은 기존 호환 경로로 처리한다. 지원하지 않는 버전은 명확히 오류를 반환한다.
- 프로젝트 index와 개별 흐름 링크, 다중 flow 합성, no-pages와 Mermaid fallback, 캡처 검증을 회귀 확인한다.
- 완료 조건: 별도 demo 명령만 동작하는 상태가 아니라 실제 FS render 경로로 동일 화면을 얻음.

### 작업 7 시각 검수와 전달

- 1024px 기준 desktop, 1440px 창, 390px·320px 모바일, light/dark, 확대 200%에서 확인한다.
- 같은 브라우저·폰트·viewport로 reference와 구현 screenshot을 비교한다. 화살표 변경 영역만 허용하며 전체 화면 마스킹은 금지한다.
- 함수명과 field 표시의 컨테이너 왼쪽 좌표 차이는 1 CSS px 이내. 코드 자체의 padding/margin은 0으로 고정한다. 배지 내부 padding은 의도된 값으로 별도 확인한다.
- 기능 검사 후 official build/check를 수행하고 브라우저 evidence와 남은 한계를 전달한다.
- 완료 조건: UI를 새로 해석한 부분이 없고, 오류 없는 browser 실행 증거와 불일치 목록이 있음. browser 검수 불가 시 시각 완료로 표시하지 않음.

## 8 FS 자체 검증

FS 저장소는 현재 `node:test`를 사용한다. Echo가 Jest를 쓴다는 이유로 FS 테스트 러너를 Jest로 바꾸지 않는다. 기존 browser scripts는 `test/fixtures/frontend/node_modules/playwright/index.mjs`를 사용하므로 설치 방식과 패키지 스크립트를 확인하고 재사용한다.

| 검증 | 필요한 단언 |
|---|---|
| 데이터 | 불명확/중복 ID, 없는 field owner·contract·test refs 거부. 신규 필드 round-trip 보존 |
| 9단계 | 단계 번호, scene, 강조 노드, 호출 방향, 상태 값, 규칙/테스트 링크가 함께 갱신 |
| 상태 | saving/saveFailed는 STATE, ID 매핑은 REF, 저장 행은 DB. false/0/null 손실 없음 |
| 출처 | 기존/수정/신규 제안의 표시, Echo 신규 0, unknown 처리. 일반 fixture로 신규 표시 검사 |
| 팝업 | hover/focus/touch, 관련 계약, Escape, popup 이동 유지, 화면 경계 대응 |
| 편집 | D1/D2 반영, revision 변경, p-ui/m-a11y 재확인, 다른 확인 유지 |
| 실행 구분 | 7개 확인을 해도 실행 결과가 성공으로 바뀌지 않음 |
| 화살표 | 각 단계의 from/to, 유실 marker, bbox 충돌, resize, hidden→visible 전환 |
| 일반화 | 이름·노드 수·테스트 runner·규칙이 다른 작은 fixture. Echo 하드코딩 검출 |
| 호환 | 기존 page-flow, 다중 페이지 shared store, draft/no-scenario, observed capture, Mermaid |
| 안전한 렌더 | signature의 `<script>`, 따옴표, `</script>` 등 입력이 텍스트로 표시됨 |

권장 검증 순서는 관련 unit tests → browser interaction/geometry/screenshot → `npm run check`다. `npm run check`가 build를 포함하므로 이유 없는 전체 테스트 반복은 피한다. 배포 산출물에 새 viewer 파일이 포함되는지 `npm run test:package`를 확인한다. 새 브라우저 script는 package script에 등록하고 실행 명령·결과를 기록한다. release publish는 이번 작업에 포함하지 않는다.

## 9 Echo 저장 응답 유실로 확인할 내용

이번 단계에서는 아래 내용을 **시각화와 테스트 계획이 정확히 표현하는지** 검사한다. 실제 Echo 구현의 Jest/Playwright 실행은 다음 하네스 단계에서 수행한다.

### 규칙

- R1: 오류 시 Blob과 현재 문장/단계를 유지한다.
- R2: 서버 저장 완료와 브라우저의 성공 응답 확인을 구분한다.
- R3: 같은 Blob의 재시도는 동일 recordingId를 사용한다. 충돌 판정은 실제 서버 코드의 조건을 확인하며 요청 수만으로 중복 저장 방지를 추론하지 않는다.
- R4: pending 중 중복 저장을 막고 성공 확인 뒤 한 번만 진행한다.
- R5: 저장 재시도는 `actions.save`, 다시 녹음은 `actions.retry`다.
- R6: 오류를 인지하고 키보드로 재시도할 수 있으며 포커스가 유실되지 않는다.

### 확정 흐름

| 단계 | 발생 일 | 화면 및 데이터 |
|---|---|---|
| 1 | 저장 클릭 → turn → store | saving=true, 현재 단계 2 |
| 2 | audio 읽기 → persistence 준비 | 동일 Blob A, ID A 배정. 아직 API 요청 전 |
| 3 | 첫 API 요청 및 서버 commit | 요청 1회, 저장 행 0→1, 브라우저는 성공 미확인 |
| 4 | 응답 유실 | 서버 저장 행 1, 브라우저 pending 유지 |
| 5 | 요청 실패가 브라우저에 전달 | saving=false, saveFailed=true, 단계 2/Blob A 유지 |
| 6 | 같은 녹음 저장 재시도 클릭 | saving=true, saveFailed=false |
| 7 | 같은 ID로 두 번째 요청 | 요청 2회, ID A 재사용, 저장 행 1 유지 |
| 8 | 서버가 기존 저장 결과 반환 | 200 확인, 중복 행 없음 |
| 9 | 성공 후 정리와 진행 | recordedAudio=null, saving=false, 단계 2→3 |

응답이 사라졌다는 사실만으로 즉시 오류 UI가 되는 것은 아니다. 4→5는 transport rejection 또는 명시적으로 구현된 timeout이 발생하는 시점이다. 실제 Echo에 없는 timeout을 UI 시뮬레이션이 구현 사실처럼 표시하지 않는다.

### 사용자에게 보여줄 테스트 계획

| ID | 환경과 재현 | 핵심 단언 | 반증과 한계 |
|---|---|---|---|
| j-state | Jest, 고정 Blob·단계 2, 저장 Promise reject | Blob 보존, 단계 유지, saving false/saveFailed true | catch에서 reset하면 실패. 실제 서버 저장은 미검증 |
| j-id | Jest, 동일 Blob 두 번 저장, fetch 경계 관찰 | 두 FormData의 recordingId·file bytes 동일 | 재시도마다 ID 생성하면 실패. 서버 dedupe는 별도 |
| j-lock | Jest, deferred Promise를 resolve 전까지 유지, 연속 저장 | pending 호출은 1회, 성공 후 reset/진행 각 1회 | lock 제거나 이중 advance 시 실패. 실제 멀티탭 동시성은 제외 |
| j-conflict | 현재 서버 테스트 경로, 저장 fixture와 같은 ID의 충돌 입력 | 실제 계약의 충돌 조건에서 409, 기존 데이터 보존 | conflict guard를 없애면 실패. Blob ID 재사용과 별도 검증 |
| p-ui | Playwright+mock: 첫 요청 network error, 두 번째 성공 | 오류 문구·녹음 보존·다시 저장 버튼·같은 ID 재시도·성공 후 이동 | retry를 다시 녹음에 연결하면 실패. DB 저장/네트워크 유실은 증명하지 못함 |
| p-db | Playwright+실제 테스트 서버/DB, commit 뒤 첫 응답 차단 | 재시도 전 저장 행 1, 요청 총 2, 재시도 뒤도 1, 화면 한 번 진행 | ID 재생성/dedupe 제거/조기 진행을 잡아야 함. 재마운트·새로고침은 별도 |
| m-a11y | 실제 화면에서 keyboard, 오류 안내, focus, 작은 화면·확대 | 오류 인지, 재시도 도달, 성공 후 합리적인 focus | 안내 제거/포커스 유실 시 실패. 자동 accessibility 검사만으로 대체하지 않음 |

p-db는 `route.abort()`만 먼저 호출해서는 충분하지 않다. 실제 API가 commit을 끝냈다는 서버/DB 증거를 확보한 다음 브라우저로 전달되는 첫 응답만 차단한다. 예컨대 실제 요청을 서버로 전달하고 완료를 확인한 뒤 차단하는 proxy/Playwright 경계를 검토한다. Service Worker가 있다면 interception 범위도 명확히 한다. MSW 인메모리 저장은 서버 모델의 시뮬레이션이며 실제 DB의 멱등성 증거가 아니다.

테스트별 session/user/recording namespace를 격리하고 beforeEach/afterEach에서 mock·store·ID map·DB fixture를 초기화한다. 운영 데이터를 사용하지 않는다. 동시 worker가 같은 ID를 공유하지 않는다. 실패 로그에는 caseId, 시도 순서, 상태 전이, 상태코드, row count를 남기되 실제 음성과 개인 식별 정보는 기록하지 않는다.

검증 분모를 혼동하지 않는다. 이 시나리오는 사용자 저장 의도 1건, HTTP 시도 2회, transport 실패 1회, 사용자 재시도 1회와 성공 1회, 최종 저장 행 1개다. 1개 fixture 결과를 운영 실패율로 일반화하지 않는다.

## 10 완료 보고 형식

구현 Codex는 다음을 함께 제출한다.

1. 변경 파일과 기존/신규 경로, 실제 FS에서 화면을 여는 명령과 출력 경로.
2. 정규 Echo fixture, schema 검증 및 기존 모델 호환 결과.
3. 4탭·주요 단계·light/dark·작은 화면 screenshot. 화살표 이외의 기준 차이와 이유.
4. node tests, browser checks, build/package checks의 실제 결과. 미실행은 별도로 표시.
5. 상태 분류·팝업·검토 무효화·화살표 충돌에 대한 증거.
6. 다음 단계로 미룬 source/PR 정리와 실제 Echo 하네스 실행 범위.

사용자가 이미 확정한 화면 방향을 다시 선택하도록 요구하지 않는다. 기능 의미가 바뀌는 충돌이 생긴 경우에만 구체적인 차이를 설명한다. 작은 디자인 개선이라는 이유로 화면을 변경하지 않는다.
