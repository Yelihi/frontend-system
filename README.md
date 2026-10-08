# frontend-system

`frontend-system`은 쌓아 둔 프론트엔드 지식을 현재 코드의 근거와 연결하여, 개발자가 설계의 선택지와 트레이드오프를 판단하고 그 결정을 구현 계약으로 남기도록 돕는 플러그인입니다. 현재 실행 중인 Codex 또는 Claude Code 모델에 조건부 지식 검색, 질문·결정 기록, 승인된 계획과 검증을 결합합니다. 적합한 기존 구조를 유지하거나 지식의 적용을 제외하는 것도 올바른 결과입니다. 효과는 규칙 수나 문서 길이보다 **어떤 근거가 질문과 결정의 차이를 만들었는지**, 이후 구현이 그 결정을 지켰는지로 확인합니다.

내장 도구는 별도의 AI 프로세스를 실행하거나 모델을 선택하지 않으며, LangGraph를 사용하거나 대상 애플리케이션에 에이전트 의존성을 추가하지 않습니다. 사용자가 명시적으로 요청한 OpenDesign 생성은 OpenDesign 자체 실행 절차를 따릅니다.

## 문서 안내

- [현재 구현된 기능](#현재-구현된-기능)
- [저장소 폴더와 파일의 역할](#저장소-폴더와-파일의-역할)
- [Codex 설치와 업데이트](#codex에-설치하기)
- [사용 흐름과 다섯 가지 스킬](#작업-흐름--사용자-명령-5개)
- [프로젝트 기록과 검증](#프로젝트별-저장-정보)
- [지식 추가와 반영](#지식-관리-흐름)
- [CLI](#ai-분석-없이-실행하는-cli)
- [FS 자체 검증과 CI/CD](#fs-자체-검증)
- [일반 AI와 FS의 정량 비교](#일반-ai와-fs의-정량-비교)

## 현재 구현된 기능

패키지와 플러그인 버전은 `0.2.0`입니다. 아래는 현재 소스에 구현된 기능이며, 방향 초안의 버전이나 향후 구상과 구분합니다.

| 영역 | 현재 동작 |
| --- | --- |
| 작업 진입점 | `fs-plan`, `fs-plan-visualize`, `fs-work`, `fs-review`, `fs-knowledge` 다섯 스킬과 공통 MCP 서버 |
| 프로젝트 발견 | 파일·패키지·프레임워크·검사 스크립트·프로젝트 제약·디자인 시스템 근거 수집 |
| 현재 맥락 | 로컬 main 기준 `project.md`, 이전 문서 보존, 최신성 및 갱신 실패 표시, 작업 브랜치 변경 분리 |
| 요청별 계획 | `plans/<plan-id>/`에 설계·이슈 계약·정책·승인 버전 저장, 의존 관계와 검사 연결 확인 |
| 실행과 재개 | 체크포인트·소스 해시·이슈별 시도 기록·진행표 저장, 변경되거나 오래된 승인·검증 구분 |
| 검증 | baseline → issue → delivery 단계, 프로젝트 스크립트 실행, 의미 검토 기록, 필수 근거가 없으면 완료 거부 |
| 지식 | 링크·직접 작성 자료 등록, sync 검토, 조건부 검색, 코드·AI 해석 트리거와 체크리스트, 공용 규칙 후보 승인 |
| 근거 기반 설계 | 코드 인용·조사 범위를 갖춘 프로젝트 설명, 실행된 라우팅, 선택지·결정·규칙·이슈 연결, 새 계획의 승인 검증 |
| 지식의 판단 연결 조회 | `get_revision(detail:influence)`로 원문 해시·조건·제외 조건 → 저장된 판단 → 결정·규칙·이슈 조회. 변경된 메타데이터는 과거 근거로 대체하지 않으며, 조회 자체는 판단의 정확성이나 비교 우위를 입증하지 않음 |
| 배포 | release 브랜치 기반 설치, 독립 MCP 번들, 관리자 수동 GitHub Release와 검증된 `.tgz` 제공 |

자동 크롤링·벡터 DB·AI 문서 갱신 bot·이슈별 PR/병합 자동화·npm 레지스트리 게시·설치된 플러그인의 주기적 자동 업데이트는 현재 구현에 포함하지 않습니다. 후속 논의는 [방향 초안](docs/fs-direction-draft.md), 구현 확인 기록은 [main 맥락·요청별 계획 검증 기록](.frontend-system/evidence/fs-project-plans-2026-09-30.md)을 참고하세요.

### 지식별 조사 기준과 코드 관계 — 2026-10-06

지식에 권고뿐 아니라 **어떻게 근거를 찾는가**를 기록하도록 확장했습니다.
[작성 템플릿](knowledge/source/template.md)에 호출부·입력 전달·상태 수명·공통 검증,
적용/제외 질문·대안·보존 계약·미확인 사항을 자연어로 작성합니다. 새 MCP sync는
선택한 원문의 direct 참조에 `investigation` 명세가 있는지 검사합니다.

`get_work_context`는 실제 매개변수 분기를 작은 `parameter-dispatch` 신호로 추출하고,
직접 트리거 또는 구조 검색으로 후보 지식을 찾습니다. 이는 결함 판정이 아닙니다.
추가 관계가 필요할 때만 `includeRelations:true`로 함수·인자·호출·콜백·분기·대입·반환
사실을 최대 200개 조회합니다. 미해결 호출과 잘린 결과를 완전한 호출 그래프로 취급하지 않습니다.

계획 및 체크리스트 판단은 조사 질문별 사실/해석/사용자 근거/미확인을 기록합니다.
조사 명세가 있는 지식은 적용 조건 미충족·제외 조건 충족·미확인이 남으면 `apply`를
거부하고, 호출부와 계약을 포함한 인용·해시를 확인합니다. 이미 정해진 계약 안의 수정은
재질문하지 않으며, 새로운 중요한 선택만 질문합니다. `repair` 기록은 기존 승인·실행
권한을 대체하지 않습니다.

기존 지식 전체를 자동 이전하지는 않았습니다. 명세 없는 자료는 `legacy-checklist`,
상태 조회에서는 `withoutInvestigation`으로 구분하고 선택한 원문의 다음 sync에서 보완합니다.
[상세 절차](references/workflows/knowledge-investigation.md) ·
[구현·회귀 검증과 한계](test/evals/2026-10-06-knowledge-investigation.md).
후속 [v11 실제 모델 12회 비교](test/evals/fs-comparison/v11/README.md)에서 FS 네 사례의
트리거 연결·본문 전달·근거 저장을 확인했습니다. 다만 핵심 설계 판단은 일반/원문 AI도
수행했고, FS는 일반 AI 대비 총 토큰 4.07배·비캐시 입력+출력 2.73배를 사용했습니다.
조사 기록 저장을 포함한 비용이며, 판단 우위나 토큰 절감은 입증하지 못했습니다.

### 근거 기반 설계 흐름 — 2026-10-03

`코드 근거 → 관련 지식 → 선택지와 사용자 결정 → 승인된 계획 → 구현·검증`을 기존 스킬과 MCP에 연결했습니다. 첫 설계 사례는 **요청·인증·오류 처리의 책임 경계**입니다. 모든 프로젝트에 axios·새 계층·특정 디자인 패턴을 강제하지 않습니다.

1. `fs-plan`이 기준 브랜치의 코드를 조사하여 `project.md`를 저장합니다. 사실·해석·사용자 결정·미확인을 구분하고, 파일별 조사 상태와 코드 인용·해시를 함께 기록합니다. 전체 목록을 분류했다는 사실과 전체 코드를 이해했다는 판단은 구분합니다.
2. `get_work_context(files: ...)`가 코드 트리거와 요청 검색을 실제로 실행합니다. 모델은 후보 지식의 적용 조건·제외 조건을 읽고 적용·유지·제외·추가 조사 여부를 판단합니다. 간접 호출의 업무 의미는 모델이 근거를 붙여 해석합니다.
3. 코드에서 확인할 수 없는 중요한 선택만 질문합니다. 기존 구조 유지도 선택지이며, 이미 받은 답변을 다시 요구하지 않습니다. 자연어로 이유를 설명하고 구조화된 결정으로 규칙·이슈·검사를 연결합니다.
4. 새 이름 있는 계획은 프로젝트 근거·라우팅 판단·연결된 결정이 없거나 중요한 결정이 미해결이면 승인되지 않습니다. 승인 후 최초 작업 시작 전에 분석 대상의 변경도 확인합니다. 정상적인 구현 변경은 승인 자체를 취소하지 않으며, 완료에는 현재 코드의 검사·필수 검토가 필요합니다.

라우팅은 [knowledge/routing.ts](src/application/knowledge/routing.ts), 구문 사실 추출은 [code-triggers.ts](src/application/knowledge/code-triggers.ts), 근거 연결·최신성 검증은 [design-evidence.ts](src/application/design-evidence.ts), 승인·완료 조건은 [workflow-store.ts](src/application/workflow-store.ts)에 있습니다. [정확한 입력 형식과 절차](references/workflows/evidence-led-design.md)를 스킬에서 참조합니다.

실제 비교의 준비 단계 실패를 반영해 입력·응답을 단순화했습니다. `get_work_context`의 `contextId`로 분석을 재사용하고, 결정에는 코드 인용과 판단만 전달합니다. 해시·라우팅 입력은 FS가 연결하고 다시 검증합니다. 요구사항 문서는 `requirements`로 별도 고정하여 코드 트리거 없이 인용할 수 있습니다. 정책의 근거 문자열은 연결된 결정에서 생성하며 사용자 선택·필수 여부·검증 방법은 명시적으로 입력합니다. 기본 응답은 요약이며 상세 분석은 `detail: full`로 조회합니다. 참조 ID는 MCP 프로세스 안의 최근 32개 분석에 한정되고, 저장된 계획에는 전체 근거가 남아 서버 재시작 후에도 유지됩니다.

기존 계획은 유지하며, 근거를 추가할 때 새 계약으로 전환합니다. 새 지식은 자연어 원문으로 작성한 뒤 검토·sync할 수 있습니다. 이번에는 [요청 경계 원문](knowledge/source/manual/fs-request-boundaries.md)과 [조건부 지식](references/learned/request-policy-boundaries.md)을 추가했고, 기존 원문 전체를 일괄 승인하지 않았습니다. 기록의 연결·코드 인용은 검사하지만, 모델의 해석이나 사용자를 대신해 기록한 답변의 진실성까지 자동 증명하지는 않습니다.

## 신뢰성 보완 및 새 세션 검증 — 2026-10-07

- 탐색 범위의 **기존 파일 내용 변경**도 분석을 stale로 만듭니다. 기존 파일이 새 호출부가
  되는 경우를 놓치던 문제를 수정했습니다. 이전 형식은 재분석 전까지 재사용하지 않습니다.
- 묶음 조회는 요청 안에서 목록·해시를 공유합니다. 12개 기록/32개 파일 측정에서
  개별 조회 384회 → 묶음 조회 32회 읽기였습니다. 같은 정확성 조건의 파일 I/O 비교이며
  모델 토큰 절감 수치는 아닙니다. [측정 원본](docs/reliability/read-benchmark.json).
- 원문을 검토한 Effect 지식 1개에 실제 호출부·소유권·제외 조건의 조사 명세를 추가했습니다.
  명세는 총 71개 참조 중 3개(직접 참조 66개 중 3개)입니다. 나머지 63개 직접 참조를
  근거 없이 일괄 승인하지 않았습니다. [sync 검증](docs/reliability/knowledge-sync.json).
- HTML은 한국어/영어 옵션으로 출력하고 인용은 보존합니다. 최초 계획의 기준 문서 생성과
  기존 `project.md`의 수동 갱신도 구분했습니다.

새 모델 세션의 실제 소스 분석 → 기존 파일의 새 호출부 → 계획 작성까지 수행했습니다.
**파일 생성 성공과 FS 계약 저장 성공을 구분**하며, 발견한 실패와 수정 후 재실행,
전체 토큰·비캐시 입력/출력·시간을 [v13 검증 보고서](test/evals/fs-comparison/v13/README.md)에 기록합니다. 수정 후 FS 두 단계는
HTML 해시·근거 연결된 미승인 계획 저장까지 완료했습니다. 124개 회귀 테스트와 패키지
검사도 통과했습니다. 다만 수정 후 FS는 2,274,713토큰, 일반 AI는 322,553토큰으로
총 처리량 7.05배였고 비캐시 입력+출력도 2.98배였습니다. **동작 보완 성공이며 비용·설계
우위 입증은 아닙니다.** 최초 실패 2회와 재실행 비용도 보고서에 포함했습니다.
지침 준수·인용·최신성 개선이 일반 AI 대비 설계 품질이나 토큰 우위를 자동으로 뜻하지는 않습니다.

## 흐름 분석과 계획 연결 (2026-10-06)

분석 순서를 환경·설정 → 실제 의존 경계 → 이벤트·상태·오류 흐름 → 지식 조사 →
개선 항목으로 정했습니다. 분석은 호스트 AI가 수행하고 서버는 인용·연결·변경을
검사합니다. AST만으로 도메인 의도나 완전한 실행 그래프를 알아냈다고 주장하지 않습니다.

| 기록 / 도구 | 역할 |
| --- | --- |
| `save_project_analysis` | 지식 등록과 독립적인 flow/finding 저장, 정확한 인용·CAS 확인 |
| `get_project_analysis` | 관련 요약·최대 3건의 상세 조회, 분량 제한·변경된 호출부·설정·새 파일 범위 감지 |
| `analysis/index.md` | 작업 중 흐름·개선 항목 색인. main 기준 사실과 구분 |
| `project.md` | 수동 갱신하는 main 설명서. 상세 근거·파일 목록은 참조 |
| `evidence.analysisRefs` | 계획 이슈가 사용한 흐름·개선 항목의 정확한 버전 고정 |
| `render_project_flow` | 같은 흐름을 중첩 HTML 또는 Mermaid로 투영 |

계획 승인·시작 전에 분석이 오래됐으면 거부합니다. 정상 구현 중에는 과거 분석을
보존하며, 구현 검사는 별도로 수행합니다. 해결·제외된 개선 항목은 근거와 재검토
조건을 남기고 이력을 보존합니다. 새 기능도 도메인 요구와 제안 흐름 → 사용자 선택 →
기존 계획 계약으로 이어집니다. 기존 분석에 없는 새 요구는 필요한 범위를 추가 분석합니다.

[구현 계약](docs/fs-flow-analysis-plan.md) · [분석/계획 사용 절차](references/workflows/project-flow-analysis.md)

**실제 테스트 프로젝트 시각화 (2026-10-07):**
[주문 입력·저장·실패·구독 해제](docs/flows/order-workspace.html) ·
[React 티켓 선택과 외부 store](docs/flows/ticket-selection.html) ·
[내 프로젝트에서 사용하는 가이드](docs/project-flow-guide.md).

v12의 실제 소스를 분석해 2개 흐름, 10개 시나리오와 36개 코드 인용을 연결했습니다.
상태/props/event/lifecycle, 외부 store/cache/module과 단계별 영향 블록을 표현하고,
선택한 관계의 파일·줄·코드 근거를 표시합니다. 원본 프로젝트 경로·분석 버전·생성 시각과
대상 파일도 확인할 수 있습니다. 현재 코드의 결함도 그대로 기록하며 제안 구조와 섞지 않습니다.
기존 [가상 주문 편집 예제](docs/examples/frontend-flow.html)는 표현 방식 시연용입니다.

`render_project_flow`는 기본적으로 원본과 일치하는 observed 기록만 출력합니다.
오래된 분석은 재분석해야 하며, 명시적 제안/과거 미리보기만 `allowUnverified`로 허용합니다.
분석은 AI, 인용/버전 검사와 HTML 생성은 FS가 담당합니다. 정적 해석을 실제 렌더/DOM
커밋 측정으로 해석하지 않습니다. 오프라인 HTML은 생성 시점의 상태이므로 코드 변경 후
다시 생성해야 합니다. 링크가 안 열리면 다음을 실행하세요.

```sh
open docs/flows/order-workspace.html
open docs/flows/ticket-selection.html
```

재현은 `npm run build` 후 `node scripts/render-observed-flows.mjs`입니다.
실제 모듈 실행으로 저장/복구/구독 해제와 새 입력 dirty 문제를 확인하며, HTTP는 mock이고
React 렌더 타이밍은 검증 범위 밖입니다. 상세 근거는 [가이드](docs/project-flow-guide.md)에 있습니다.

요청 경계·Tailwind 팀 정책 2개 지식의 원문 근거를 검토해 `investigation`을 실제 이전하고
엄격한 sync를 완료했습니다. 현재 71개 참조 중 직접 라우팅 66개, 그중 조사 명세 2개,
기존 체크리스트 64개입니다. 이전 완료를 전체 코퍼스의 의미 검증 완료로 해석하지 않습니다.
사용자는 [자연어 템플릿](knowledge/source/template.md)에 적용 조건·반례·실제 관측을
추가하면 됩니다. 코드를 따라갈 질문과 기계용 기록 변환은 FS 호스트가 담당합니다.

실제 사용 효과는 [v12 흐름 재사용·계획 비교](test/evals/fs-comparison/v12/README.md)에
기록했습니다. DOM 요청·캐시와 React/Tailwind 두 예제에서 초기 분석 → 새 호출자·
사용자 답변 → 문맥을 초기화한 계획을 비교했습니다. 일반 AI와 동일 지식 AI를 포함해
20회 실행했으며 실패·복구 비용도 모두 보존합니다.

| 조건 / 버전 | 초기 분석+변경 계획 호출 | 총 토큰 | 비캐시 입력+출력 | MCP 오류 |
| --- | ---: | ---: | ---: | ---: |
| 일반 AI | 4 | 452,694 | 103,638 | 0 |
| 동일 지식 AI | 4 | 849,065 | 131,369 | 0 |
| 최초 FS | 4 | 5,728,903 | 315,271 | 21 |
| 첫 보완 FS | 4 | 5,790,640 | 346,032 | 8 |
| 전달량 보완 FS | 4 | 4,808,375 | 343,223 | 6 |

총 토큰에는 도구 호출마다 재입력된 캐시가 포함됩니다. FS 자체의 첫/마지막 실행에서
총 토큰은 16.1% 줄었으나 비캐시 입력+출력은 8.9% 늘었습니다. **일반 AI보다 판단이
우월하거나 비용이 낮다는 결과는 아닙니다.** 새 호출자에 따른 stale 감지·흐름 갱신·
계획 버전 연결은 확인했지만, 마지막 FS도 수량 도메인을 임의로 확대했습니다.

이 실패를 반영해 필수 domain 규칙의 사용자/기존 계약 권한 검증을 추가했습니다.
또한 검사기가 불필요한 CVA defaultVariants를 요구하던 문제에 `defaults:none`을
지원하고, 직접 npm 자기 호출 검사 명령의 승인/사용을 차단했습니다. 실제 실패 계획을
새 검증에 넣어 차단했고 **116개 회귀·패키지·시각화 브라우저 검사**를 확인했습니다.
마지막 권한/검사기 보완 뒤 모델 전체 비교는 재실행하지 않았으므로 새 생성 품질이나
추가 토큰 절감은 주장하지 않습니다. 해석·분류의 의미 정확성은 여전히 검토 대상입니다.
설치된 플러그인 캐시를 자동 덮어쓰지는 않았습니다.

## 현재 버전의 집중 범위

FS는 프론트엔드 시스템을 이해하고, 레이어 책임·상태 소유권·의존 방향·실패 처리가 설명 가능한 코드를 만드는 데 집중합니다. 프로젝트 맥락과 누적된 학습을 활용해 반복 프롬프팅을 줄이며, 구현·리뷰·리팩터링·디버깅에서 위험과 트레이드오프를 판단합니다.

브라우저 전체 조합 검사, 정교한 시각 회귀, 성능 대시보드는 현재 핵심 범위에서 제외합니다. 향후 독립 서비스로 검토할 수 있지만, 지금 FS에 외부 검증 서비스나 MCP 연동을 추가하지 않습니다. 기존 테스트와 필요한 최소 검증을 사용하고, 사람이 확인해야 하는 범위와 미검증 상태를 명확히 보고합니다. 보안·안전성·접근성 책임은 유지합니다.

## 동작 구조

```text
Codex 또는 Claude Code 사용자
        │ fs-* 스킬 호출
        ▼
현재 최상위 모델 ── 중요한 질문과 엔지니어링 판단 수행
        │
        ├── frontend-system MCP ── 매니페스트, 파일, 해시, Git 맥락, 검증
        ├── 프로젝트 맥락 ──────── <project>/.frontend-system/
        └── 지식 참조 문서 ─────── 플러그인과 함께 배포하는 간결한 지침
```

MCP는 사실 정보를 반환하고 정해진 범위의 작업을 수행합니다. 스킬은 작업 절차를 정의합니다. 따라서 Codex나 Claude 모델이 발전하면 이를 사용하는 시스템의 판단 능력도 함께 발전합니다.

FS의 완료 확답은 승인된 규칙과 현재 소스에 한정합니다. 필수 검사와 검토가
통과한 정책만 `verified`로 표시하며, 진행 기록 저장으로 오래된 검증을 새 검증으로
바꾸지 않습니다. 필수 자동 검사는 테스트·설정의 해시 보호 또는 해당 규칙의 최신
의미 검토가 필요합니다. 응답에는 소스/정책 해시, 검사·규칙·검토 ID가 포함됩니다.
미검증·오래된 검증·차단·legacy 상태를 구분하며, 모든 오류가 없다는 보장은 하지
않습니다. [보장 범위와 정책](references/workflow-policy.md)을 참고하세요.

`npm run test:eval`은 주문 예제의 세 계약을 각각 세 번 실행해 오류 탐지,
잘못된 완료의 거부, 수정 후 통과를 검증합니다. 실제 프로젝트 결과와 호스트 모델의
판단 평가는 [별도 기록](test/evals/README.md)으로 구분합니다.

## 저장소 폴더와 파일의 역할

이 저장소는 **FS 자체를 개발하고 지식을 관리하는 원본 저장소**입니다. FS를 사용하는 애플리케이션에는 프로젝트별 `.frontend-system/` 기록을 만들며, 아래 소스와 공통 스킬 전체를 복사하지 않습니다. 반복되는 지식 문서·검사 결과·이미지 파일은 개별 이름 대신 같은 역할의 묶음으로 설명합니다.

```text
frontend-system/
├── src/                    # MCP·CLI와 실제 처리 로직
│   ├── application/        # 맥락·계획·정책·검증·지식 처리
│   ├── domain/             # 공유 데이터 타입
│   ├── ports/              # 프로젝트 탐색 계약
│   └── adapters/filesystem/ # 파일 시스템 기반 탐색 구현
├── skills/                 # 사용자가 호출하는 다섯 가지 작업 절차
├── references/             # 스킬이 필요할 때 읽는 상세 절차
│   ├── workflows/          # 분석·설계·구현·검증 등 세부 절차
│   └── learned/            # 검토 후 배포하는 지식과 검색 인덱스
├── mandatory-rules/        # 공통·프레임워크별 기본 검토 규칙
├── knowledge/              # 학습 원본·출처·등록 목록
│   └── source/             # manual / imported / attachments
├── test/                   # FS 로직 테스트·실제 프론트엔드 예제·모델 평가
├── scripts/                # 패키지 독립 실행 검증
├── bundle/                 # Git 플러그인이 실행하는 MCP 번들
├── docs/                   # 방향 논의와 설계 미리보기
├── .frontend-system/       # FS 자체 개발의 계획·결정·검증 기록
├── .agents/plugins/        # Codex 마켓플레이스 등록 정보
├── .codex-plugin/          # Codex 플러그인 정의
├── .claude-plugin/         # Claude Code 플러그인 정의
└── .github/workflows/      # FS 자체 CI와 패키지 전달
```

### 실행 코드: src/

진입점은 `mcp.ts`와 `cli.ts`이며 둘 다 `application/`의 기능을 호출합니다. `domain/`은 데이터를 정의하고, `ports/`와 `adapters/`는 프로젝트를 탐색하는 계약과 구현을 나눕니다. 도메인 해석과 코드 작성은 호스트 모델이 수행합니다.

| 파일 | 역할 |
| --- | --- |
| [src/mcp.ts](src/mcp.ts) | MCP 도구 등록·입력 검증·stdio 서버. 호스트가 맥락, 계획, 지식, 검사 기록을 다루는 진입점 |
| [src/cli.ts](src/cli.ts) | `fs` 명령어·옵션 처리와 JSON 출력. 같은 기능을 터미널에서 확인하는 진입점 |
| [src/index.ts](src/index.ts) | 타입과 내부 기능을 코드에서 가져올 수 있도록 재내보내는 모듈 |
| [domain/types.ts](src/domain/types.ts) | 프로젝트, 기술, 규칙, 작업 요청, 분석, 리뷰, 검증 결과의 공유 타입 |
| [ports/project-discovery.port.ts](src/ports/project-discovery.port.ts) | 프로젝트 참조 생성·탐색·파일 목록 조회 계약 |
| [adapters/filesystem/project-discovery.ts](src/adapters/filesystem/project-discovery.ts) | 실제 파일·Git·매니페스트에서 기술, 스크립트, 제약과 디자인 관련 근거 수집 |
| [application/task-context.ts](src/application/task-context.ts) | 프로젝트 정보·지식·규칙·문서 최신성·선택한 계획을 하나의 작업 맥락으로 결합 |
| [application/analysis-receipts.ts](src/application/analysis-receipts.ts) | 프로젝트별 분석 참조 ID를 프로세스 내 최근 32개까지 보관. 저장된 계획은 이 임시 보관소에 의존하지 않음 |
| [application/design-evidence.ts](src/application/design-evidence.ts) | 코드·요구사항 인용, 후보 판단, 결정·규칙 연결과 최신성을 검증. 참조 ID를 영구 계획 근거로 확장 |
| [application/context/build-work-context.ts](src/application/context/build-work-context.ts) | 요청과 관련된 파일 후보·기술·모듈·규칙 구성. 후보 선정은 전체 코드 분석 완료를 뜻하지 않음 |
| [application/project-snapshot.ts](src/application/project-snapshot.ts) | 로컬 main의 Git 객체 읽기, 기준 커밋 확인, 문서 최신성 및 pending/failed 상태 관리 |
| [application/project-store.ts](src/application/project-store.ts) | `project.md`·이전 문서·설정·분석 상태·보고서 저장과 `init.md` fallback 읽기 |
| [application/git-state.ts](src/application/git-state.ts) | 변경 파일·리뷰 기준 ref·diff 통계 조회. 이름 변경과 미추적 파일도 처리 |
| [application/workflow-store.ts](src/application/workflow-store.ts) | 계획·승인·이슈·실행·시도·검사·의미 검토·근거 기록 저장. 잠금·해시·완료 조건 검증 |
| [application/policy.ts](src/application/policy.ts) | 규칙·필수 검사·예외·검사 보호 정책의 스키마와 누락·변경 판정 |
| [application/run-capabilities.ts](src/application/run-capabilities.ts) | baseline/issue/delivery별 스크립트 선택·실행, 로그 및 소스 해시 기록, 기준 결과와 비교 |
| [application/rules/rule-resolver.ts](src/application/rules/rule-resolver.ts) | 사용자 제약·기본 규칙·프로젝트 제약·조건부 지식을 출처별로 구성하고 읽기 순서 지정 |
| [application/knowledge/catalog.ts](src/application/knowledge/catalog.ts) | 학습 원본 목록·요약·해시·중복·변경, 근거를 기록한 원문 검토와 sync 상태 관리 |
| [application/knowledge/knowledge-resolver.ts](src/application/knowledge/knowledge-resolver.ts) | 작업에 관련된 배포 지식을 찾고 지식 공백을 반환. 이전 인덱스 없는 자료도 지원 |
| [application/knowledge/reference-index.ts](src/application/knowledge/reference-index.ts) | 배포 인덱스 검증, 단어·별칭·기술 조건 검색, 해시 확인과 제한된 본문 읽기 |
| [application/knowledge/code-triggers.ts](src/application/knowledge/code-triggers.ts) | 선택한 JS/TS 파일의 import·호출·경로 근거 추출. 이름 별칭·스코프 가림 확인, 미해결 관계 보고 |
| [application/knowledge/routing.ts](src/application/knowledge/routing.ts) | 코드 트리거·요청 검색·의미 트리거 탐색을 결합하고 요구사항 문서를 별도 고정 |
| [application/knowledge/trigger-review.ts](src/application/knowledge/trigger-review.ts) | AI 해석과 코드 트리거를 지식 체크리스트에 연결하고, 해시·인용·체크 누락을 검증해 판단 기록 |
| [application/knowledge/sources.ts](src/application/knowledge/sources.ts) | URL 등록, 공개 텍스트 변경 확인·캐시·차이 조회·검토 완료 기록 |
| [application/knowledge/rule-proposals.ts](src/application/knowledge/rule-proposals.ts) | 새 공용 규칙 후보와 정확한 내용에 대한 승인 저장. 원본·후보 변경 시 승인 유효성 확인 |

### 스킬·절차·규칙: skills/, references/, mandatory-rules/

| 경로 | 역할 |
| --- | --- |
| [skills/fs-plan/SKILL.md](skills/fs-plan/SKILL.md) | 프로젝트 분석·도메인 논의·main 맥락 갱신·요청별 계획 작성 |
| [skills/fs-plan-visualize/SKILL.md](skills/fs-plan-visualize/SKILL.md) | 실제 코드의 페이지·이벤트·상태 흐름 분석·갱신과 근거 기반 HTML 생성 |
| [skills/fs-work/SKILL.md](skills/fs-work/SKILL.md) | 승인한 계획의 구현·리팩터링·검증·중단 작업 재개 |
| [skills/fs-review/SKILL.md](skills/fs-review/SKILL.md) | 코드와 프로젝트 메모를 수정하지 않는 검토·원인 조사 |
| [skills/fs-knowledge/SKILL.md](skills/fs-knowledge/SKILL.md) | 학습 자료 등록·공식 자료 조사·변경 확인·sync |
| [references/decision-workflow.md](references/decision-workflow.md) | 질문·대안·결정·구현·실제 결과를 연결하는 공통 판단 절차 |
| [references/project-plans.md](references/project-plans.md) | main 문서, 계획 ID, 이슈 계약, 승인 및 단계별 검사 사용법 |
| [references/workflow-policy.md](references/workflow-policy.md) | 승인 정책, 필수 근거, 시도 한도, 완료 판정과 반복 오류의 검사 연결 |
| [references/frontend-quality.md](references/frontend-quality.md) | 구조·상태·프레임워크·UI 품질을 검토하는 기준 |
| [references/testing-and-transition.md](references/testing-and-transition.md), [verification-tools.md](references/verification-tools.md) | 테스트 보장 유지·전환·재현 절차와 프로젝트 검사 도구의 설치·실행·CI 소유권 |
| [references/debugging.md](references/debugging.md) | 증상·재현·가설·원인 수정·해결 경험 기록 절차 |
| [references/linked-knowledge.md](references/linked-knowledge.md), [knowledge-indexing.md](references/knowledge-indexing.md), [source-updates.md](references/source-updates.md) | 링크 수집과 보존 범위, 지식 검토·검색 인덱싱, 출처 변경 확인 절차 |
| [references/open-design.md](references/open-design.md) | 선택적 OpenDesign 연결·인증·생성·기존 코드 적용 절차 |
| `references/workflows/fs-init.md`, `fs-inspect.md`, `fs-revise.md` | 초기 설정·현재 상태 분석·목표 설계의 세부 절차 |
| `references/workflows/fs-implement.md`, `fs-refactor.md`, `fs-verify.md`, `fs-review.md` | 구현·전환·검증·리뷰의 세부 절차 |
| `references/workflows/fs-knowledge-add.md`, `fs-knowledge-review.md`, `fs-knowledge-sync.md`, `fs-feedback.md` | 자료 추가·검토 배포와 명시적으로 요청한 외부 피드백 절차 |
| [references/learned/README.md](references/learned/README.md), [index.json](references/learned/index.json), 주제별 `*.md` | 검토한 개념·조건부 판단과 검색 메타데이터. 개별 문서는 적용 조건·반례·출처를 보관 |
| [mandatory-rules/common/review.md](mandatory-rules/common/review.md) | 보안·접근성·상태 소유권·비동기 처리·검증 등 공통 기본 검토 규칙 |
| `mandatory-rules/react/core.md`, `nextjs/core.md`, `vue/core.md` | 감지한 프레임워크의 렌더링·Hooks·서버/클라이언트 경계·반응성 규칙 |

`references/workflows/`의 파일명은 내부 절차 이름입니다. 사용자가 호출하는 스킬은 다섯 개이며, 각 세부 절차가 별도 명령어인 것은 아닙니다. 기본 검토 규칙과 프로젝트가 승인한 실행 가능한 검증 정책도 구분합니다.

### 지식 원본: knowledge/

| 경로 | 역할 |
| --- | --- |
| [knowledge/README.md](knowledge/README.md) | 자료 작성·등록·분야별 sync 안내 |
| [knowledge/source/template.md](knowledge/source/template.md), [knowledge/template.md](knowledge/template.md) | 실제 작성 양식과 이전 경로의 안내 문서 |
| `knowledge/source/manual/` | 직접 정리한 학습·경험 Markdown. 현재 React 렌더링과 Fiber 자료 포함 |
| `knowledge/source/imported/` | 외부 글의 출처·확인 범위·요약과 보존이 허용된 본문 |
| `knowledge/source/attachments/` | 보존이 허용된 첨부 자료. `.gitkeep`은 빈 폴더 유지용 |
| [knowledge/catalog.json](knowledge/catalog.json) | 원본 자료의 ID·분류·요약·해시·배포 상태 |
| [knowledge/sources.json](knowledge/sources.json) | sync에서 변경을 확인할 공개 문서의 ID → URL 목록 |
| `knowledge/proposals/` | 공용 규칙 후보를 저장할 때 생성하는 후보·승인 기록 |
| `knowledge/.cache/` | 출처 변경 비교용 로컬 캐시. 사용 시 생성하며 Git과 npm 배포에서 제외 |

`knowledge/`는 원본, `references/learned/`는 검토 후 작업에 사용하는 지식입니다. 원본 등록만으로 검색용 배포 지식이 완성되지는 않습니다. npm 패키지는 `knowledge/`를 제외하지만, Git 저장소에 커밋한 원본은 Git으로 공유됩니다.

### 테스트·설계·개발 기록

| 경로 | 역할 |
| --- | --- |
| [test/system.test.ts](test/system.test.ts) | 프로젝트 발견·설정·맥락·프레임워크 규칙·지식 목록의 기본 동작 |
| [test/workflow.test.ts](test/workflow.test.ts) | 파일 목록·승인·안전한 기록 경로·전환·재개·MCP 인터페이스 |
| [test/plans-project.test.ts](test/plans-project.test.ts) | 요청별 계획 격리·이슈 계약·단계별 검사·main 맥락·기존 문서 호환 |
| [test/policy-workflow.test.ts](test/policy-workflow.test.ts) | 승인 정책·필수 검사 보호·시도 한도·의미 검토·완료 거부와 복구 |
| [test/reliability-eval.test.ts](test/reliability-eval.test.ts) | 주문 계약 위반·오래된 근거·약화된 검사의 거부를 반복하는 자동 평가 |
| [test/git-state.test.ts](test/git-state.test.ts) | 특수 파일명·이름 변경·미추적 파일의 Git 변경 경로 처리 |
| [test/knowledge-index.test.ts](test/knowledge-index.test.ts) | 검색·기술 조건·개념/판단 구분·원본 정정·삭제·제한된 읽기 |
| [test/source-updates.test.ts](test/source-updates.test.ts), [test/rule-proposals.test.ts](test/rule-proposals.test.ts) | 원격 자료 변경·확인 실패 처리와 공용 규칙 후보의 승인 무효화 |
| [test/fixtures/frontend/](test/fixtures/frontend/) | 실제 Next.js 주문 예제. `app/`은 UI·서버 진입점, `src/`는 도메인·서버·기능 경계, `tests/`는 주문 계약, `e2e/`는 브라우저 흐름 |
| `test/fixtures/frontend/scripts/` 및 설정 파일 | `acceptance.mjs`는 정상·위반 사례 검증, `check-boundaries.mjs`는 경계 검사. 패키지·lockfile, ESLint·Next·Playwright·JS/TS 설정은 예제의 실행 환경, `AGENTS.md`·`CLAUDE.md`는 예제 제약 |
| [test/evals/](test/evals/) | 호스트 모델 평가 시나리오·판정 기준·응답·날짜별 결과. `npm test` 자동 평가와 별개 |
| [test/evals/fs-comparison/](test/evals/fs-comparison/) | 같은 과제를 일반/FS 조건에서 새 세션·새 프로젝트로 반복하는 모델 실험. `prompt.md`는 고정 요구사항, `run.py`는 실행·사용량 수집, `score.mjs`는 외부 채점, `report.py`는 표 집계, `results/`는 원문·diff·검사 결과 |
| [docs/fs-direction-draft.md](docs/fs-direction-draft.md) | FS 방향과 합의·미구현 범위를 논의하는 초안 |
| [docs/previews/](docs/previews/) | 가격 화면의 설계·구조·이벤트 예시. HTML은 도식, JSON은 도식/전달/확인 자료, PNG는 시각 확인 결과, `price-screen.plan.md`는 예시 계획 |
| [FS-DISCUSSION-HANDOFF.md](FS-DISCUSSION-HANDOFF.md) | 이전 논의를 재개하기 위한 인계 메모. 당시 미승인 제안도 포함 |
| [.frontend-system/](.frontend-system/) | FS 자체를 개발하며 남긴 결정·근거·계획·검증 이력. 소비 프로젝트용 기본 데이터가 아님 |

### 설치·빌드·배포 파일

| 경로 | 역할 |
| --- | --- |
| [package.json](package.json), [package-lock.json](package-lock.json) | 버전·의존성·CLI 실행점·빌드/검사 스크립트·npm 패키지 포함 범위와 의존성 고정 |
| [tsconfig.json](tsconfig.json), [eslint.config.js](eslint.config.js) | FS TypeScript 빌드·타입 검사와 린트 설정. 프론트엔드 예제 설정은 별도로 관리 |
| [bundle/mcp.js](bundle/mcp.js), `bundle/chunks/` | MCP와 의존성의 배포 산출물. TypeScript 분석기는 트리거 호출 때 로드. `npm run build`로 함께 갱신하며 Git 추적 |
| `dist/`, `node_modules/` | 로컬 빌드 결과·설치 의존성. Git 추적 제외. `dist/src/`는 npm 패키지 포함 대상 |
| [.codex-plugin/plugin.json](.codex-plugin/plugin.json) | Codex 플러그인 정보, 스킬 위치와 MCP 실행 명령 |
| [.claude-plugin/plugin.json](.claude-plugin/plugin.json), [.mcp.json](.mcp.json) | Claude Code 플러그인 정보와 플러그인 루트 기준 MCP 실행 명령 |
| [.agents/plugins/marketplace.json](.agents/plugins/marketplace.json) | Codex 마켓플레이스에서 설치할 플러그인과 Git 저장소의 `release` 지정 |
| [scripts/check-package.mjs](scripts/check-package.mjs) | 패키지를 임시 폴더에 풀어 MCP 독립 실행·도구·원본 지식 제외 확인. `--output-dir` 지정 시 통과한 `.tgz` 보관 |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | `core`·`frontend` 검사와 수동 배포 시에만 태그·GitHub Release·release 브랜치 갱신. 설치본 업데이트는 사용자 실행 |
| [.gitignore](.gitignore), [.frontend-system/.gitignore](.frontend-system/.gitignore) | 의존성·빌드·캐시·브라우저 보고서, 프로젝트 로컬 상태·보고서·잠금의 Git 제외 |
| `README.md`, `.git/` | 현재 사용법과 구조 안내, Git 자체의 버전 관리 메타데이터 |

수정할 위치는 목적에 따라 고릅니다. 작업 절차는 `skills/`와 `references/`, 도구 동작은 `src/`, 새 학습 자료는 `knowledge/source/`, 특정 프로젝트의 판단은 그 프로젝트의 `.frontend-system/`에 둡니다. 실행 코드 수정 후에는 번들을 재생성하고 관련 검사를 실행합니다.

## Codex에 설치하기

Node.js 18 이상과 Git이 필요합니다.

현재 Codex 사용자 계정에 GitHub 저장소를 한 번 등록합니다. 아래 명령어는 어느 디렉터리에서든 실행할 수 있습니다.

```bash
codex plugin marketplace add Yelihi/frontend-system
codex plugin add frontend-system@frontend-system
```

대상 프로젝트에서 새 Codex 세션을 시작하고 `$fs-plan`을 호출합니다. 마켓플레이스 등록과 플러그인 설치는 사용자 단위이므로 프로젝트마다 반복하지 않습니다. 각 프로젝트에는 해당 프로젝트의 `.frontend-system/` 맥락만 보관합니다.

새 코드나 sync한 지식을 설치본에 반영할 때 마켓플레이스를 갱신합니다. 매 작업마다 실행할 필요는 없으며, 일반 터미널에서 실행하거나 Codex에 업데이트와 설치본 확인을 요청할 수 있습니다.

```bash
codex plugin marketplace upgrade frontend-system
```

갱신 후 설치된 플러그인에도 변경이 반영됐는지 확인하고 Codex 앱을 재시작해 새 세션에서 사용하세요. 마켓플레이스 갱신 성공 메시지만으로 기존 세션의 MCP까지 새 코드로 실행된다고 판단하지 않습니다. 설치본이 계속 이전 내용이라면 다음과 같이 재설치합니다.

```bash
codex plugin remove frontend-system@frontend-system
codex plugin add frontend-system@frontend-system
```

GitHub push는 원본 저장소를 갱신하고, Actions는 검사와 패키지 artifact를 만듭니다. 사용자 기기의 설치본 갱신은 Codex에서 처리합니다. 이 Git 기반 설치 흐름에는 npm 레지스트리 게시가 필요하지 않습니다.

## 개발 환경 설정

```bash
npm ci
npm run build
```

빌드하면 TypeScript CLI 산출물과 `bundle/mcp.js`, `bundle/chunks/`가 생성됩니다. MCP 번들과 분석기 청크를 함께 포함하므로 Git 기반 플러그인은 대상 프로젝트에 패키지 의존성을 설치하지 않고 실행할 수 있습니다. 분석기 청크는 첫 트리거 조회 때 로드하며 배포 크기에는 포함됩니다.

MCP만 사용하려면 npm으로 제공하는 진입점을 사용할 수 있습니다.

```bash
npm link
frontend-system-mcp
fs --help
```

`frontend-system-mcp`는 stdio로 통신합니다. Codex 매니페스트와 함께 제공되는 Claude Code의 `.mcp.json`은 각 플러그인 루트를 기준으로 이 서버를 연결합니다.

## 작업 흐름 — 사용자 명령 5개

| 명령 | 역할 |
| --- | --- |
| `fs-plan` | 전체 분석·재분석, 도메인 논의, 목표 설계와 작업 계획 |
| `fs-plan-visualize` | 실제 프로젝트 흐름 분석·갱신과 코드 근거가 연결된 HTML 생성 |
| `fs-work` | 승인한 초기 구축·기능 구현·리팩터링·테스트·검증·재개 |
| `fs-review` | 코드를 바꾸지 않는 검토와 진단; 필요한 기존 검사 실행 |
| `fs-knowledge` | 자료 등록·공식 자료 조사·변경 확인·원문 `review`·`sync` |

Codex/Claude의 대화창에서 사용합니다. 세부 실행은 내부 절차로 관리하므로
사용자가 implement/refactor/verify를 별도로 외울 필요가 없습니다.

```text
$fs-plan 이 프로젝트의 도메인 규칙과 구조를 분석하고 개선안을 논의해 주세요.
$fs-plan-visualize 주문 편집과 목록 화면의 실제 이벤트·상태 흐름을 HTML로 보여주세요.
$fs-plan-visualize 주문 저장 코드 변경을 반영해 기존 흐름 그림을 갱신해주세요.
$fs-work 합의한 계획대로 구현하고 테스트·검증까지 진행해 주세요.
$fs-work 중단한 작업을 현재 코드와 대조해서 재개해 주세요.
$fs-review 주문 기능의 위험을 검토만 해 주세요.
$fs-knowledge React 공식 규칙과 사용할 수 있는 ESLint 검사를 조사해 주세요.
$fs-knowledge sync
```

`fs-plan-visualize`는 대화에서 호출하는 스킬입니다. 기본으로 현재 구현을 분석하고
분석 기록과 HTML만 생성하며, 계획 작성·제품 코드 변경·project.md 갱신까지 자동으로
진행하지 않습니다. 기존 분석이 있으면 먼저 재사용 여부를 확인합니다.
[실제 사용 가이드](docs/project-flow-guide.md)를 참고하세요.

일반적인 사용 순서는 다음과 같습니다. 파일명과 도구 인자를 직접 관리하기보다 대화에서 대상 기능과 원하는 결과를 전달하면 됩니다.

1. **분석·논의:** `fs-plan`으로 프로젝트의 현재 구조와 요구사항을 확인합니다. 기존 프로젝트는 로컬 main의 사실을 `project.md`에 정리합니다.
2. **계획 확정:** 요청별 `plan.md`에 변경 범위·이슈·의존 관계·완료 조건·검증 정책을 정리하고 구체적인 내용을 승인합니다. 여기서 이슈는 로컬 작업 단위이며 GitHub Issue가 아닙니다.
3. **구현·검증:** `fs-work`에 해당 계획의 실행을 요청합니다. 변경 전 baseline을 확인하고, 이슈별 구현·검사·의미 검토 후 최종 delivery 검사를 수행합니다.
4. **재개·리뷰:** 중단됐다면 `fs-work`에 계획 ID나 기능명을 알려 재개합니다. 원인 조사나 검토만 필요하면 `fs-review`를 사용합니다.
5. **main 반영 후 맥락 갱신:** 승인된 커밋·PR·병합 작업 이후 새 main을 기준으로 `project.md`를 갱신합니다. FS가 원격 main을 자동 fetch하거나 문서 갱신 bot을 실행하지는 않습니다.
6. **지식 축적:** 재사용할 글이나 해결 경험은 `fs-knowledge`로 원본 FS 저장소에 등록하고 sync합니다. 다른 프로젝트의 설치본에서 쓰려면 저장소 공유와 플러그인 업데이트까지 진행합니다.

새 프로젝트는 도메인 논의와 설계를 먼저 하고, 합의 후 초기 환경과 보호 검사를
구축합니다. 기존 프로젝트는 전체 영역의 근거를 남기고 이후에는 변경 영역과
영향받는 호출자·의존성을 갱신합니다. 관찰한 함수 동작을 제품 요구사항으로
자동 승격하지 않습니다. 별도 백엔드·DB·배포 자동화는 범위에 포함하지 않습니다.

이전 init/inspect/revise는 plan으로, implement/refactor/verify는 work로,
knowledge-add/knowledge-sync는 knowledge의 자료 추가/sync로 통합했습니다.
외부 이슈 생성은 독립 사용자 명령에서 제외하며 명시적 요청이 있을 때만
[기존 피드백 절차](references/workflows/fs-feedback.md)를 따릅니다.

구현 요청에는 필요한 테스트와 검증이 포함됩니다. UI 작업은 기존 디자인,
접근성, 반응형 상태와 실패 동작을 확인합니다. 기존 테스트 배치는 유지하며
Storybook·OpenDesign은 선택 사항입니다. 명시적 읽기 전용 요청은 메모 갱신도
하지 않습니다. 승인한 범위 안의 작업에 재승인을 반복하지 않습니다.

## 디버깅과 해결 경험 축적

새 명령어 없이 `fs-review`에 증상과 원하는 작업을 전달합니다.

```text
$fs-review 메시지를 전송하면 가끔 이전 대화가 표시됩니다. 원인만 조사해 주세요.
$fs-work 확인한 원인을 수정하고, 수정 전후 재현 결과와 해결 과정을 기록해 주세요.
```

기대·실제 동작 확인 → 재현과 가설 검증 → 원인에 대한 최소 수정 → 영향 범위 검증 → 프로젝트 기록 순으로 진행합니다. 브랜치는 요청했거나 진단 변경을 격리할 필요가 있을 때만 만들며 기존 미커밋 변경을 보존합니다. 원인 조사만 요청하면 코드와 기록을 변경하지 않습니다. 재현하지 못한 문제를 해결했다고 선언하지 않습니다.

허용된 수정 작업의 결과는 `.frontend-system/evidence/`에 발생 조건, 원인, 배제한 가설, 수정 이유, 검증 결과와 남은 한계로 기록합니다. 요청 수·처리 시간 등은 실제 측정 조건과 함께 제시하고, 측정하지 않은 개선에 임의 점수를 붙이지 않습니다.

해결 기록은 자동으로 공통 규칙이 되지 않습니다. 사용자가 승격을 요청하거나 승인하면 민감 정보를 제거한 자료를 `fs-knowledge`로 등록하고, `fs-knowledge sync`로 관련 참조를 보강합니다. 같은 증상이라도 원인은 다를 수 있으므로 적용 조건과 반례를 유지합니다. 자세한 절차는 [디버깅 안내](references/debugging.md)를 참고하세요.

## 프로젝트별 저장 정보

현재 사실, 목표 설계, 판단 근거를 구분해 저장합니다.

```text
<project>/.frontend-system/
├── config.json    # 선택한 외부 도구 연결 설정
├── project.md      # main 기준 현재 사실, 도메인/이벤트/테스트 근거
├── project-history/ # 이전 project.md 보존
├── init.md         # 기존 검사 문서가 있을 때 보존하는 fallback
├── evidence/       # 조사 범위, 도메인 보장 사항, 분석 근거
├── decisions/      # 범위별 선택, 이유, 대안, 결과
├── plans/<plan-id>/
│   ├── plan.md     # 요청별 설계와 승인 대상 이슈 계약
│   ├── revision.json / revisions/ # 버전·승인·변경 이력
│   ├── execution.json / progress.md # 실행 상태와 사람이 읽는 진행표
│   ├── history/    # 이전 진행표 보존
│   └── checks/ / attempts/ / reviews/ # 해당 계획의 검증 기록
├── project-refresh.json # main 문서 생성의 pending/failed 상태
├── state.json      # 로컬 분석 상태; Git 추적 제외
└── reports/        # 임시 결과물; Git 추적 제외
```

기존 루트 revision/execution/checks는 보존하며 planId를 생략한 도구 호출로 읽습니다.
새 요청은 계획 ID별로 저장하고, 승인 버전·이슈 계약·검사·시도 기록을 분리합니다.
계획을 직접 수정하면 승인이 무효화되고, 진행 상태는 별도 progress.md로 관리합니다.

위 구조는 기능을 사용할 때 생성하는 저장 형식입니다. 이 FS 저장소에 남아 있는 `init.md`, 루트의 `revision.md`·`revision.json`·`revisions/`·`execution.json`·`refactoring.md`·`checks/`·`attempts/`·`reviews/`, `plans/<hash>.md`는 이전 방식의 실제 개발 기록입니다. 새 형식이 구현됐다는 이유로 과거 기록을 일괄 이전하지 않습니다. `evidence/`의 Markdown·로그·실험 파일은 확인 근거이고, `decisions/`는 선택과 이유를 담습니다.

project.md는 로컬 main의 파일을 체크아웃 없이 읽어 작성합니다. 분석 기준 커밋,
문서 해시, main의 변경을 확인하며 작업 브랜치의 미병합 사실과 구분합니다.
문서 생성물만 변경되면 다시 분석할 필요가 없고, 생성이 실패해도 마지막 문서를
유지합니다. 원격 main 자동 fetch나 AI 문서 bot은 설치하지 않습니다.
[실행 절차와 도구 입력](references/project-plans.md)을 참고하세요.

공통 스킬은 프로젝트마다 복사하지 않습니다. 명시적 요청과 팀 제약은 코드에서 관찰한 습관, 조건부 지식, 선호, 가설과 구분합니다. 규칙의 순서는 읽기 우선순위이며, 서로 충돌하는 출처도 유지해 모델이 의미를 판단하도록 합니다. 사용자의 선택은 해당 프로젝트에 보관하고, 공통 지식으로 승격하려면 확인을 받습니다. 사용자가 쌓은 지식이 부족하더라도 모델 지식, 공식 자료 조사, 관련 측정 결과를 활용해 작업을 진행합니다.

### 검증과 작업 재개

| 단계 | 실행 범위 | 결과의 의미 |
| --- | --- | --- |
| `baseline` | 발견한 lint·typecheck·unit/integration. 같은 패키지에 unit/integration이 없으면 `test` 사용 | 변경 전 상태를 확인하는 근거. 이 결과만으로 구현 완료 처리 불가 |
| `issue` | 승인된 해당 이슈의 `requiredCheckIds`에 연결된 스크립트 | 이슈 범위의 검증 근거. 현재 소스의 의미 검토와 함께 사용 |
| `delivery` | 승인 정책의 모든 필수 자동 검사 | 계획 전체의 최종 자동 검사. 필요한 build·E2E는 정책에 포함되어 있어야 실행 |

검사는 기술 검사 → 경계 검사 → 동작 테스트 → 브라우저/Storybook → 빌드 순으로 정렬합니다. 실제 비용과 중복은 스크립트 정의에 따라 달라지므로, 통합 스크립트와 그 하위 스크립트를 동시에 선택하지 않도록 계획에서 정합니다. 설계 문서 작성만으로 제품 전체 테스트를 반복하지 않습니다.

검증 도구는 [설치·실행·CI 연결 절차](references/verification-tools.md)에 따라 기존 프로젝트 도구부터 재사용합니다. FS는 지식·규칙·실행 절차를 제공하고, 대상 프로젝트 또는 워크스페이스가 검사 도구의 개발 의존성·lockfile·설정·테스트를 소유합니다. 브라우저 바이너리와 OS 의존성은 실행 환경에 준비하며, 로컬과 CI는 같은 프로젝트 스크립트를 실행합니다. 부족한 도구만 승인된 작업 범위에서 설치하고, 설치 성공·검사 통과·원격 CI 통과는 구분합니다. CI의 필수 검사 설정과 배포 권한도 별도로 확인합니다.

사용자가 대표 프로젝트와 기능을 정해 FS를 평가할 때는 [실제 작업 결과로 다음 범위를 판단하는 절차](references/decision-workflow.md#learn-from-real-project-outcomes)를 사용합니다. 기존 evidence에 검증 결과·잘못된 제안·사용자 수정·후속 관찰을 남기고, 비슷한 작업의 근거로 다음에 맡길 범위를 제안합니다. 실제 범위 선택만 decisions에 기록하며, 성공 기록이 권한이나 완료 기준을 자동으로 바꾸지 않습니다. 후속 관찰이 없으면 재발 여부는 미확인으로 남깁니다.

최종 답변은 중요한 결론에 [확인한 근거와 검증 한계](references/decision-workflow.md#report-evidence-and-limits)를 연결합니다. 실제 실행한 검사와 전달받은 결과를 구분하고, 통과한 검사가 보장하는 범위와 남은 미확인 사항을 짧게 밝힙니다. 고정된 보고서 형식이나 신뢰도 점수를 요구하지 않으며, 기존 승인·완료 기준을 추가하지 않습니다.

권한·데이터 손실·복잡한 경합처럼 영향이 큰 변경에는 [별도 검토자 검토](references/workflows/fs-verify.md#selective-independent-review)를 선택적으로 적용합니다. 검토자는 요구사항·코드·테스트를 읽고 실패 조건을 찾으며 직접 수정하지 않습니다. 호스트가 근거를 대조하고 검토자·검토 소스·한계를 기존 기록에 남깁니다. AI 간 동의는 실행 증거를 대체하지 않으며, 별도 검토가 불가능하면 그 사실과 기존 정책상 남은 요건을 보고합니다. 모든 작업에 추가 검토를 의무화하거나 완료 기준을 바꾸지는 않습니다.

변경한 사용자 흐름이나 재현한 버그는 기존 evidence에 [기능별 검증 안내](references/testing-and-transition.md#reusable-feature-verification-notes)를 남겨 다음 작업에서 재사용합니다. 실행·사전 조건, 화면 진입·조작, 기대 결과, 기존 검사와 증거 위치를 필요한 만큼 기록하고, 절차와 마지막 실행 결과를 구분합니다. 기존 테스트·재현 문서는 링크로 재사용하며 전체 기능 목록을 의무적으로 만들지 않습니다. 리뷰 전용 작업은 누락된 안내를 제안만 하고, 이전 성공 기록이나 안내 작성 자체를 현재 검증 통과로 취급하지 않습니다. 기존 승인·필수 검사·완료 기준은 그대로 유지합니다.

기존 테스트 위치를 기본적으로 유지합니다. 이동이 필요한 전환만 계획에 포함하고,
픽스처·스냅샷·도메인 보장이 전후에 유지되는지 검증합니다. API 변경으로 발생한
실패와 실제 도메인 회귀를 구분합니다.

변경 전 기준 검증에서 발생한 실패는 영향에 따라 진단합니다. 관련 없는 실패는 기록하고 독립적인 작업을 계속할 수 있습니다. 코드 전환 완료와 검증 완료는 구분해 보고합니다. 성공한 것처럼 보이도록 새로운 목표의 테스트 케이스를 임의로 생략하지 않습니다.

revision을 저장하거나 내용을 수동으로 변경하면 기존 승인이 무효화됩니다. 실행 체크포인트는 정확히 승인한 내용과 실제 소스 해시에 연결됩니다. 작업을 재개할 때 추가·변경·삭제된 파일과 목표 변경 여부를 보고합니다. 새로운 단계를 완료 처리하려면 현재 코드에 대한 검증 통과 기록이 필요합니다. 최종 완료에는 검증 도중 소스가 바뀌지 않은 상태에서 테스트를 포함한 전체 검증이 통과해야 합니다. 관련 없는 실패가 남았다면 완전히 검증된 프로젝트라고 선언하지 않고 코드 완료와 검증 미완료를 구분해 보고합니다. 과거의 단계 완료 기록만으로 새로 수정한 코드가 검증되지는 않습니다. 자동 reset이나 커밋은 수행하지 않습니다.

정책 입력에서는 검사 `command`와 guard `hash`를 생략하면 서버가 실제 스크립트 본문과 파일 해시를 고정합니다. 승인 시 이 값의 변경을 확인합니다. 실행 단계의 제목·파일·의존성·필수 검사 목록도 생략하여 승인된 이슈 계약을 재사용할 수 있습니다. 검사 응답의 `coverage`는 필수 스크립트 충족 여부이며, delivery의 기존 `full:false`만을 이유로 다시 실행할 필요는 없습니다. 현재 소스·정책·시도가 일치하면 같은 검사 ID를 단계 검사와 최종 검사에 연결할 수 있습니다. 의미 리뷰와 완료 검증은 계속 적용됩니다. [1차 개선 기록](test/evals/fs-comparison/v2/README.md#1차-수정--정책-입력과-완료-연결)에 수정 범위와 실측 한계를 정리했습니다.

저장소는 `.workflow-lock`으로 프로젝트 쓰기를 순차 처리합니다. 다른 작업이 잠금을 사용 중이면 상태를 다시 읽고 재시도합니다. 비정상 종료 뒤 남은 잠금은 쓰기 작업이 종료되었는지 확인한 후 제거합니다. 현재 스냅샷은 정확성을 위해 발견한 모든 파일의 해시를 계산하므로 매우 큰 프로젝트에서는 추가 I/O 비용이 발생합니다. 생성물·외부 라이브러리의 제외 내역과 따라가지 않은 링크를 보고합니다. 의존 관계의 의미와 도메인 분석 범위는 호스트 모델이 판단하며, 파일 목록이나 디렉터리 이름만으로 입증되었다고 간주하지 않습니다.

### MCP 작업 인터페이스

도구 입력이 불확실하면 `node bundle/tool-help.mjs save_revision`처럼 필요한 규격만
조회할 수 있습니다. 설치된 플러그인에서는 해당 플러그인 루트의 경로를 사용합니다.
[export-tool-schemas.mjs](scripts/export-tool-schemas.mjs)가 빌드한 실제 MCP의 규격을
[tool-schemas.json](bundle/tool-schemas.json)으로 추출하고,
[tool-help.mjs](scripts/tool-help.mjs)는 선택한 도구만 읽어 출력합니다.
프로젝트를 수정하거나 모델을 호출하지 않습니다. 스킬도 빈 저장 호출로 형식을
추측하기 전에 이 도움말을 사용하도록 안내합니다.

| 도구 | 입력 및 결과 |
| --- | --- |
| `get_project_snapshot`, `read_project_source`, `get_project_document` | main 사실·선택한 소스·문서의 페이지 단위 읽기와 최신 상태 |
| `record_project_refresh`, `save_project_context` | pending/failed 기록과 기준 커밋·문서 해시를 확인한 project.md 저장 |
| `list_plans` | 요청별 계획 ID·버전·승인 상태 |
| `list_project_files` | 해시, 전체 개수, 다음 오프셋, 제외 내역과 경고를 포함한 페이지 단위 파일 목록 |
| `get_work_context` | `review`·`refactor` 모드, 분석 최신 여부, 작업 맥락 제공 |
| `get_workflow_context`, `get_revision` | 승인과 변경 여부, 체크포인트 이후 변경, 기록 목록, 범위를 제한한 목표 내용 읽기 |
| `save_revision`, `approve_revision` | 내용 해시로 동시 변경 확인; 초안에는 항상 명시적 승인 필요 |
| `save_project_record`, `get_project_record` | 안전한 ID, 해시, 읽기 범위 제한을 적용한 범위별 Markdown 근거·결정 기록 |
| `run_project_checks`, `get_check_record` | planId 및 baseline/issue/delivery 단계, 검증 항목 선택, 변경 전 기준 기록과 비교, 검증 근거 저장 |
| `save_execution` | 승인된 revision 해시, 예상 체크포인트 해시, 단계, 검증 기록 ID |
| `start_work` | 이미 승인된 새 계획의 `planId/revisionHash/stepId/kind`로 실행 초기화·시도 발급·baseline 검사를 함께 수행. 기존 실행은 재초기화하지 않음 |
| `complete_work` | 단일 issue의 최종 검사·명시적 호스트 검토·완료 기록을 기존 guard로 처리. `status:complete`일 때만 완료 |

`start_work`는 사용자 승인과 최종 검증을 대신하지 않습니다. 기존 저장·시도·검사 함수를 순서대로 실행하므로 각 함수의 최신성/선행 조건/시도 횟수 제한을 유지합니다. `attempt-error` 또는 `baseline-error`면 이미 저장된 기록과 재개 방법을 반환합니다. 반환된 ID를 이용해 이어가며 다시 초기화하지 않습니다. 기준 검사가 실패한 채 `started`를 반환할 수도 있으므로 `baseline.results`를 확인해야 합니다. 별도 baseline 선택이나 기존 실행 재개에는 기존 개별 도구를 사용합니다.

`complete_work`에도 모든 승인된 의미 검토의 실제 판단을 전달해야 합니다. 검사를 통과해도 검토가 빠지거나 근거가 오래됐으면 완료되지 않습니다. 여러 issue를 다루거나 이미 통과한 최종 검사 기록을 재사용할 때는 개별 도구를 사용합니다. 이 두 도구는 모델의 판단을 생략하는 대신 기록 사이의 왕복 호출을 줄입니다.

`run_project_checks`는 프로젝트만 전달하면 발견한 모든 검증을 실행하는 기존 호출도 지원합니다. 응답에는 `results`와 함께 ID, 소스 해시, 실행 중 소스 변경 여부, 전체·선택 검증 범위, 비교 참고 정보가 포함됩니다. 라이브러리 헬퍼인 `runCapabilities`는 기존처럼 배열을 반환합니다. 검증 항목이 없으면 성공이 아닌 `not-run`으로 기록합니다. 검증 항목은 `test:unit`이나 `apps/web:test`처럼 정확한 스크립트 키로 선택합니다. 자세한 절차는 [결정 작업 흐름](references/decision-workflow.md)과 [테스트 및 전환](references/testing-and-transition.md)을 참고하세요.

## OpenDesign

OpenDesign은 선택적으로 연결하는 외부 도구입니다. `fs-work`은 설치하거나 활성화하기 전에 동의를 구하고, 현재 호스트가 프로젝트 단위와 사용자 단위 중 어떤 범위를 제공하는지 알려줍니다. 애플리케이션의 `package.json`에는 추가하지 않습니다. 기본 디자인 검토에서도 Storybook, 공통 컴포넌트, shadcn 설정, Tailwind, 테마 변수, 기존 시각적 규칙을 확인합니다.

데스크톱 앱 설치만으로 설정이 끝나지는 않습니다. 호스트 에이전트는 별도의 OpenDesign MCP로 연결 상태를 확인하고, 선택한 모드의 인증을 완료하며, 현재 저장소에 사용할 디자인 프로젝트를 선택하거나 생성합니다. frontend-system은 이 선택을 저장하고 `get_work_context`로 반환합니다. 인증 정보나 결제는 직접 처리하지 않습니다.

| 모드 | 인증 및 사용 방식 |
| --- | --- |
| 기본 방식 | 현재 호스트 세션으로 저장소의 디자인을 검토합니다. OpenDesign 생성은 사용하지 않습니다. |
| OpenDesign Cloud | OpenDesign 연결 시 기본 제안 모드입니다. 브라우저 로그인과 OpenDesign Cloud 계정의 크레딧을 사용합니다. |
| Local Codex | 명시적으로 선택합니다. 설치·인증된 Codex 런타임과 해당 사용 한도를 이용하며 OpenDesign Cloud 크레딧 절차는 거치지 않습니다. |
| secure BYOK | 명시적으로 선택합니다. 인증 정보는 OpenDesign Settings에서 관리하고 비용은 선택한 제공자가 청구합니다. |

Cloud 요금은 바뀔 수 있으므로 [공식 요금 안내](https://open-design.ai/pricing/)를 확인하세요. 로그인 성공만으로 잔액이 충분하다고 판단하지 않습니다. 잔액이나 예상 비용 조회 도구가 없으면 초기화 결과에 크레딧 사용 가능 여부를 알 수 없다고 표시합니다. 설정 과정에서는 유료 테스트 생성을 실행하지 않습니다. 요청한 생성을 시작하기 전에 어떤 계정에 비용이 청구되는지 설명합니다. 잔액이 부족하면 도구가 반환한 충전 링크를 안내하고 사용자가 충전을 확인한 뒤 재개합니다.

### 여러 프로젝트에서 사용하기

같은 기기에서는 데스크톱 설치, 적용 가능한 호스트 MCP 등록, 인증된 계정을 재사용합니다. **각 저장소에서** 다음과 같이 실행합니다.

```text
$fs-work 이 프로젝트에 OpenDesign Cloud를 연결하고 로그인과 디자인 프로젝트 연결까지 확인해 줘.
```

로그인이 필요하면 반환된 브라우저 활성화 링크나 코드를 따라 진행하고, 에이전트가 완료 여부를 확인합니다. 현재 호스트에서 새로 등록한 도구를 불러올 수 없다면 새 작업을 시작하고 `fs-work`을 다시 실행합니다. 다른 모드를 사용하려면 `Local Codex로 연결해 줘`처럼 명시합니다.

각 저장소의 선택은 `.frontend-system/config.json`에 저장합니다.

```json
{
  "version": 1,
  "designProvider": {
    "name": "open-design",
    "scope": "user",
    "mode": "cloud",
    "projectId": "de6f189c-2947-4a0a-aa70-1d2bf8251b26"
  }
}
```

위 ID는 예시이며, 초기화할 때 OpenDesign이 반환한 실제 ID를 저장합니다. `scope`는 MCP 등록 범위를 뜻하고, 이 설정 파일 자체는 항상 해당 저장소에 속합니다. 다른 기기나 계정에서는 ID를 다시 검증하고, 프로젝트가 없으면 다시 연결합니다. 비밀번호, 토큰, 크레딧 잔액, 영구적인 준비 완료 표시는 저장하지 않습니다. 이전 설정도 읽을 수 있으며, 모드나 프로젝트 연결이 빠져 있으면 생성 전에 보완합니다. `configure_project`의 부분 업데이트는 같은 제공자의 기존 설정을 유지합니다. 제공자를 바꾸면 이전 제공자 설정을 지우고, `openDesignProjectId: null`은 프로젝트 연결을 해제합니다.

새 디자인을 생성하고 구현하려면 다음과 같이 요청합니다.

```text
$fs-work OpenDesign Cloud 크레딧을 사용해 이 프로젝트의 대시보드 디자인을 생성하고,
기존 컴포넌트와 테마에 맞춰 실제 코드에 적용해 줘. 모바일과 로딩·오류 상태도 확인해 줘.
```

새로 생성하지 않고 기존 디자인을 사용하려면 다음과 같이 요청합니다.

```text
$fs-work 연결된 OpenDesign 프로젝트의 대시보드 디자인을 읽고 현재 코드에 적용해 줘.
```

구현할 때는 저장한 디자인 프로젝트를 명시적으로 지정하고, 선택한 결과물의 스타일과 에셋을 읽어 현재 저장소에 맞게 적용합니다. 이후 렌더링된 UI를 비교하고 프로젝트 검증을 실행합니다. 생성된 미리보기만으로 구현 완료라고 판단하지 않습니다. 설정이 막혀도 저장소 분석은 진행하고, 완료하지 못한 OpenDesign 단계를 정확히 보고합니다. 알리지 않고 다른 제공자로 전환하지 않습니다. 인증, 생성, 충전, 소스 적용의 자세한 절차는 [연동 작업 흐름](references/open-design.md)을 참고하세요.

## 관리자 수동 버전 배포

`main`은 개발·지식 기여용이고, Codex/Claude 설치 설정은 `release` 브랜치를 참조합니다.
PR 병합과 sync는 배포를 실행하지 않습니다. 관리자가 버전을 정한 뒤
`npm run release:version -- 0.3.0`(예시), 빌드·검증·커밋을 진행합니다.
GitHub Actions **FS CI and delivery**를 main에서 `publish_release=true`와 해당 버전으로
직접 실행해야만 태그·GitHub Release·설치 채널을 갱신합니다. 저장소 소유자만 배포를
실행/재실행할 수 있으며, 기존 태그는 덮어쓰지 않습니다.

`release-manifest.json`은 도구/스킬/참조 파일과 지식 ID·원문/메타데이터 해시를 기록합니다.
`get_fs_release`로 설치본의 버전·지식 인덱스 해시를 조회할 수 있습니다.
첫 수동 배포가 성공해야 새 release 채널이 생깁니다. 기존 main 기반 설치는
마켓플레이스를 갱신해야 하며, 프로젝트의 승인된 계획은 업데이트로 자동 변경하지 않습니다.
[기여·검토·버전·배포 전체 절차](references/contribution-release.md)

## 지식 관리 흐름

FS는 프로그래밍 전반의 지식을 공통 저장소에 모읍니다. 어느 프로젝트에서든
`fs-knowledge add`와 내용을 전달하면 pending Markdown을 준비해 **공식 FS 저장소로 PR**을
생성합니다. GitHub CLI 인증이 필요하며 작업 프로젝트의 origin은 사용하지 않습니다.
원문 기여 PR 병합은 지식 승인·sync·플러그인 배포를 의미하지 않습니다. add는 제공된 내용을 템플릿의 필요한
항목으로 정리하되, 없는 근거나 적용 사례를 만들어 넣지 않습니다.

관리자가 PR을 병합한 뒤 FS 원본 checkout에서 Markdown 상단 metadata를 직접 바꿉니다.

```yaml
---
state: active
---
```

이후 **대화창에서 아래 명령만** 순서대로 요청하면 됩니다. 대상 목록이나 추가 문장은
필요하지 않습니다. 셸 하위 명령은 아닙니다.

```text
fs-knowledge active
fs-knowledge review
fs-knowledge sync
```

| 단계 | 처리 |
| --- | --- |
| add | `state: pending` 원문의 기여 PR 생성. 제목·내용만 전달해도 됨 |
| 관리자 metadata 변경 | 검토할 문서만 `state: active`로 선택 |
| active | 선택된 문서를 `knowledge/source/active/`로 이동하고 검토하기 좋은 구조로 정리 |
| review | active 문서의 근거·적용 조건·제외 조건·예시·미확인 사항을 검토 |
| merged | active 선택과 현재 승인 기록이 모두 있는 문서의 계산된 상태 |
| sync | merged 중 아직 반영하지 않은 문서만 자동 선택해 참조·검색·트리거에 반영 |

`merged`는 직접 쓰는 metadata 값이 아닙니다. 문서의 `state: active`는 유지하고,
`knowledge_status.lifecycle.merged`에서 검토 통과를 확인합니다. 내용·출처·분류 등이
바뀌면 검토가 만료되어 active로 돌아갑니다. sync는 pending/active의 검토나 승격을
자동으로 하지 않으며, 대상이 없으면 변경 없이 종료합니다. 검토 후에도 원문은 active
폴더에 남습니다. 이동은 ID와 하위 경로를 보존하고 충돌 파일을 덮어쓰지 않습니다.

metadata가 없는 기존 문서는 legacy로 표시하고 새 자동 처리에서는 제외합니다.
이미 배포된 참조는 그대로 유지하며, 기존 지식을 다시 반영하려면 사용자가 active로
선택하고 검토합니다. pending으로 되돌리는 것만으로 설치본이 철회되지는 않습니다.

검토 결과는 catalog에 `on-review / approved / changes-requested`로 기록하며,
해시 불일치는 `stale`, 검토 이력이 없는 이전 배포본은 `legacy-unreviewed`로 표시합니다.
MCP는 인용문 존재·해시·검토 조건을 검사합니다. 사실의 진위와 해석의 타당성은
호스트 AI/사용자가 판단합니다. 새 공용 필수 규칙 승인은 별도입니다.

개념 지식은 보조 근거로, 조건부 설계 지식은 direct 참조로 연결합니다. direct에는
트리거·체크·적용/제외 질문과 양성/음성 사례가 필요합니다. 라우팅은
[reference-index.ts](src/application/knowledge/reference-index.ts), 코드 사실 추출은
[code-triggers.ts](src/application/knowledge/code-triggers.ts), 해석과 판단 연결은
[trigger-review.ts](src/application/knowledge/trigger-review.ts)가 담당합니다.

[지식 보관 안내](knowledge/README.md) ·
[active 절차](references/workflows/fs-knowledge-active.md) ·
[검토 절차](references/workflows/fs-knowledge-review.md) ·
[실행 안내](docs/fs-runtime-guide.md)

### 대화창에서 블로그 링크 추가하기

FS가 설치된 Codex 또는 Claude Code의 **대화창에 링크와 요청을 함께 붙여 넣으세요.** 아래 예시는 터미널 명령이 아닌 스킬 실행 요청입니다. 예시 URL을 실제 글 주소로 바꾸면 됩니다.

일반 블로그 글을 추가하려면:

```text
fs-knowledge https://example.com/article
이 글을 지식으로 추가해주세요.
```

직접 작성한 글의 본문 전체를 보존하려면:

```text
fs-knowledge https://example.com/my-article
제가 작성한 글입니다. 원문 전체를 보존해주세요.
```

첨부한 자료를 명시적으로 active 준비 대상으로 선택하려면:

```text
fs-knowledge active — 이 링크의 지식을 검토 가능한 구조로 준비해주세요.
https://example.com/article
```

일반 외부 글은 출처와 요약을 저장하고, 본인 글이나 복제가 허용된 자료는 허용 범위에서 전문을 보존합니다. 로그인 등으로 본문을 읽을 수 없으면 본문 제공을 요청하며, 일부만 읽은 자료를 전체 원문으로 표시하지 않습니다.

추가만 요청했다면 metadata를 active로 바꾸고 `fs-knowledge active`, `fs-knowledge review`, `fs-knowledge sync`를 순서대로 요청하세요. sync는 검토를 통과한 지식을 기존 구현·리뷰 스킬이 검색할 수 있도록 인덱싱합니다. 글마다 새 스킬을 생성하는 방식은 아닙니다. 결과에는 저장 경로, 보존 방식, 누락 범위와 sync 처리 여부를 보고합니다.

다른 프로젝트에서도 공유 add에는 원본 저장소 경로가 필요하지 않습니다. 기여 브랜치·커밋·PR을 생성합니다. 관리자용 active/review/sync 또는 명시적 로컬 저장에는 원본 checkout 경로나 `FRONTEND_SYSTEM_REPO`가 필요하며, 플러그인 캐시에 저장하지 않습니다. 자세한 보존·갱신 기준은 [링크 지식 수집 설계](references/linked-knowledge.md)를 참고하세요.

### 저장과 작업 반영

기여 원문은 공식 저장소의 `knowledge/source/contributions/`로 PR을 받습니다. 관리자 원본은 `knowledge/source/{manual,imported,attachments,active}`에서도 관리합니다. `knowledge/catalog.json`에는 해시, 요약, 분류 정보를 저장하므로 모델이 자료 전체를 읽지 않고도 관련 후보를 추릴 수 있습니다. `fs-knowledge sync`는 간결하게 정리한 지침을 `references/learned/`에 배포합니다.

npm 패키지에는 원본 지식을 포함하지 않습니다. 심볼릭 링크로 연결한 개발용 플러그인에는 참조 문서 수정이 즉시 반영됩니다. 설치된 npm 패키지나 플러그인에는 해당 공통 설치본을 업데이트한 뒤 반영됩니다. 사용하는 프로젝트마다 별도 사본을 관리하지 않습니다.

공부한 내용은 [한국어 템플릿](knowledge/source/template.md)을 복사해 작성할 수 있습니다. CS 기초, 도메인 아키텍처, 프레임워크 원리도 등록 대상입니다. `fs-knowledge sync`는 주장별 근거와 적용 범위를 검토하고 개념과 판단을 구분해 `references/learned/index.json`에 등록합니다. 새로운 참조 생성, 기존 문서 보강, 보류, 배포 생략의 이유를 기록합니다. 원본 변경·삭제 시 관련 참조를 재검토합니다.

작업 중에는 `search_learned_knowledge`로 증상과 기술에 맞는 후보만 찾고, `read_learned_knowledge`로 필요한 본문을 나누어 읽습니다. 개념과 불확실한 주장은 자동 수정 규칙이 되지 않습니다. 기술 필터와 별도로 버전·도메인 조건은 모델이 확인합니다. 인덱스가 없는 이전 설치본은 기존 검색을 유지합니다.

`npm test`는 합성 검색 사례의 정밀도·재현율, 부적합 결과, 반환 문자 수와 원본 변경 검사를 실행합니다. 실제 작업의 검색 정확도나 모델 토큰 절감률을 측정한 결과는 아닙니다. 자세한 검토·배포·평가 절차는 [지식 인덱싱 안내](references/knowledge-indexing.md)를 참고하세요.

지식이 원본에서 판단 근거로 정리되는 과정과 향후 벡터 DB 확장 구상은 [인덱싱 흐름도](references/learned/README.md#지식을-쌓고-사용하는-방식)에 정리했습니다. 현재 구현과 미래 구상을 실선·점선으로 구분합니다.

## AI 분석 없이 실행하는 CLI

### 규칙과 검증 정책

반복 오류는 [기존 evidence에서 프로젝트 검사로 연결](references/workflow-policy.md#connect-recurring-failures-to-checks)합니다. 같은 보장 위반인지 확인하고, 기존 검사 재사용 → 정상/위반 예제 실행 → 필요 시 승인된 정책에 연결 → 위반 시 완료 거부까지 확인합니다. 기존 계약 안의 회귀 테스트와 새로운 의무 채택은 구분하며, 공통 규칙 자동 승격이나 일괄 금지 규칙은 추가하지 않습니다.

연결 예제는 [주문 계약 통합 테스트](test/policy-workflow.test.ts)에서 실행합니다. 기존 주문 테스트를 임시 프로젝트에 복사해 정상·위반 사례와 완료 거부·복구를 확인하며, 실제 운영에서 반복 오류가 관찰됐다는 뜻은 아닙니다.

공용 자료의 개념·판단과 프로젝트에서 채택한 필수 규칙은 구분됩니다.
`fs-knowledge sync`는 새 의무의 근거·조건·반례를 제시하고, 정확한 후보에 대한
사용자 승인 후 배포합니다. 기존 프로젝트의 정책은 자동으로 바뀌지 않습니다.
revision의 승인에는 문서와 검증 정책이 함께 포함됩니다.

필수 검사 누락·실패, 보호된 검사 설정 변경, 오래된 결과, 미완료 의미 검토로는
작업을 완료할 수 없습니다. 기본 시도 한도는 작업별 3회이며 재개해도 유지됩니다.
기존 위반은 좁게 한정한 범위와 해소 단계가 필요합니다. 자동 검사는 도구의 결과,
의미 검토는 모델의 판단 증거로 표시합니다. [정책/API 안내](references/workflow-policy.md)

### 공식 문서의 변경 확인

채팅에 링크를 주거나 `knowledge/sources.json`에 ID → URL을 저장합니다.
`fs-knowledge sync`에서 등록한 문서를 확인합니다. 원격 텍스트·Markdown은
조건부 요청과 본문 해시로 비교하며, AI에게는 변경된 부분과 필요한 문맥만
전달합니다. HTML/PDF는 호스트 도구의 확인이 필요할 수 있습니다.

```json
{
  "react-hooks": "https://react.dev/reference/eslint-plugin-react-hooks",
  "typescript-eslint": "https://typescript-eslint.io/users/configs/"
}
```

원본 캐시는 배포하지 않습니다. 확인 실패를 변경 없음으로 처리하지 않고,
미검토 차이는 다음 sync에도 남깁니다. 해시·다운로드·차이 계산 자체는 모델을
호출하지 않습니다. 문자 수를 실제 토큰 수나 절감률로 표현하지 않습니다.
[수집·검토 절차](references/source-updates.md)

CLI는 호스트 모델에 제공하는 데이터를 디버깅할 때 유용합니다.

```bash
fs inspect-context /path/to/project --overall
fs project-snapshot /path/to/project --base main
fs plans /path/to/project
fs workflow /path/to/project --plan profile-edit
fs work-context /path/to/project "프로필 편집 기능 추가" --mode implement
fs work-context /path/to/project "프로필 편집 기능 추가" --mode implement --plan profile-edit
fs work-context /path/to/project "보드 상태 관리 검토" --mode review
fs change-context /path/to/project --base origin/main
fs checks /path/to/project
fs checks /path/to/project --purpose baseline
fs checks /path/to/project --capability test:unit --baseline CHECK_ID
fs checks /path/to/project --required
fs checks /path/to/project --plan profile-edit --stage baseline
fs checks /path/to/project --plan profile-edit --stage issue --issue profile-form
fs checks /path/to/project --plan profile-edit --stage delivery
fs source-check /path/to/frontend-system
fs source-read /path/to/frontend-system react-hooks --offset 0
fs knowledge-status /path/to/frontend-system
fs knowledge-search /path/to/frontend-system "Next.js 캐시"
```

이 명령어들은 AI 분석을 수행하지 않습니다. 전체 작업 흐름을 실행하려면 스킬을 사용하세요.

`profile-edit`와 `profile-form`은 예시 ID입니다. `--plan`에는 저장된 계획 ID, `--issue`에는 그 계획의 이슈 ID를 사용합니다. issue/delivery 실행에는 승인된 검증 정책이 필요합니다. 스킬은 전체 작업 시도와 검사·의미 검토 기록도 함께 연결하므로, CLI 검사 한 번이 전체 작업 흐름을 대신하지는 않습니다.

`fs checks`는 실패·미실행·불안정 결과에 non-zero exit를 반환합니다.
`--required`는 승인한 정책이 있어야 하며 모든 필수 자동 검사를 실행합니다.
이 명령의 성공은 의미 검토까지 완료했다는 뜻이 아닙니다.

## 팀별 Tailwind 작성 규칙

지식은 화면의 결과뿐 아니라 승인된 코드 작성 기준으로도 연결할 수 있습니다. [Tailwind 팀 정책 원문](knowledge/source/manual/fs-tailwind-team-policy.md)은 검토·sync를 거쳐 [라우팅 지식](references/learned/tailwind-team-authorship.md)과 [조건부 필수 규칙](mandatory-rules/tailwind-css/team-style-policy.md)으로 연결됩니다. `className`/CVA import에서 후보를 찾고, 모델이 코드 맥락과 적용 조건을 확인합니다. 사용자가 채택한 범위에서 고정 클래스 JSX 직접 표기와 다중 prop 변형의 CVA 연결을 검사하며, 미결정 테마 전략은 사용자에게 묻습니다.

객체 매핑 금지는 Tailwind 자체의 제약이 아니라 이 팀의 선택입니다. 일반 데이터 객체, CVA 설정 객체, 단순 boolean 토글은 제외합니다. 패키지가 설치되어 있다는 이유만으로 팀 정책을 채택했다고 간주하지 않습니다.

승인한 파일과 변형 축을 프로젝트의 `style-policy.json`에 적고 lint script 및 계획의 필수 검사로 연결합니다.

```json
{"version":1,"files":["App.jsx","ui/Button.jsx"],"inlineStaticClasses":true,"completeClassTokens":true,"variants":[{"file":"ui/Button.jsx","axes":["tone","size"]}]}
```

```sh
node /path/to/frontend-system/bundle/style-check.js /path/to/project style-policy.json
```

검사기는 JSON 진단과 실패 exit code를 반환합니다. import만 추가하거나 사용하지 않는 CVA를 정의해도 통과하지 않습니다. 같은 파일의 바인딩/정의를 검사하며, 외부 helper는 별도 검토가 필요합니다. 자동 수정이나 테마 선택을 대신하지 않으므로, 모델이 승인 범위에서 수정하고 다시 검사합니다. 조건식의 데이터/판단 함수와 허용되는 CVA 결과 지역 변수는 위반이 아닙니다. 실제 CSS 생성·이벤트·화면은 별도 검증합니다.

프로젝트/CI에 검사기를 고정하려면 검증된 FS 패키지를 devDependency로 설치한 뒤 `node node_modules/frontend-system/bundle/style-check.js . style-policy.json`을 script로 연결할 수 있습니다.

## FS 자체 검증

```bash
npm ci
npm run check
npm --prefix test/fixtures/frontend ci
npm --prefix test/fixtures/frontend exec -- playwright install chromium
npm run test:frontend
npm run test:package
```

Node 테스트는 저장·승인·정책·시도 한도·소스 갱신을 검증합니다. 별도 예제는
실제 ESLint/Next 검사, 직접 작성한 경계 검사, 도메인 유닛 테스트와 Chromium
E2E를 실행합니다. 정상 사례와 의도적 위반의 진단을 모두 확인합니다.
GitHub Actions의 [FS CI and delivery](.github/workflows/ci.yml)는 PR과 main push에서
타입·린트·테스트·패키지·번들 일치 검사와 프론트엔드 acceptance/E2E를 실행합니다.
브라우저 보고서와 실패 trace는 7일 보관합니다. main의 두 검사 작업이 모두 통과하면
독립 실행 검사를 통과한 `.tgz` 설치 패키지를 커밋 SHA 이름의 Actions artifact로
14일 보관합니다. Actions의 수동 실행도 main에서 같은 절차를 사용할 수 있습니다.
이는 검증된 패키지를 전달하는 단계이며 npm 게시, GitHub Release 생성, 설치된
플러그인의 자동 업데이트나 원격 병합 필수 설정은 수행하지 않습니다.

로컬에서 같은 설치 패키지를 만들려면 `npm run build` 후
`npm run test:package -- --output-dir dist/release`를 실행합니다.
호스트 모델 판단 평가는 [판단 회귀 평가 절차](test/evals/README.md)에 따라 별도로 실행합니다. 스킬·공통 판단 지침·지식 적용 방식·호스트 모델 변경 시 관련 사례를 같은 조건에서 비교하고, 결함 누락·불필요한 변경·근거 없는 단정·허위 검증 보고를 구분합니다. 판정 기준과 이전 답은 평가 대상에 전달하지 않습니다. 결과는 `test/evals/`에 기록하며 자동 테스트 통과와 구분합니다. 이 절차는 FS 자체의 유지보수용이며 소비 프로젝트의 승인·완료 정책이나 일반 작업의 필수 검사를 추가하지 않습니다.

## 일반 AI와 FS의 정량 비교

**v14 반복 토큰 추세(2026-10-07):** 두 프로젝트에서 일반 AI/FS의 분석→계획을
각 3회 반복했습니다. 24개 실행·380개 응답의 사용량을 최종 CLI 합계와 대조했습니다.
FS 총 입력+출력은 14,703,486토큰으로 일반 1,513,394토큰의 **9.72배**,
비캐시 입력+출력은 968,446 / 311,986토큰으로 **3.10배**였습니다.
모델 요청 수는 297 / 83회, 요청당 평균 입력은 49,043 / 17,660토큰이었습니다.
작은 기록 작업에서도 커진 문맥을 반복 처리하는 패턴이 관측됐습니다.
FS 버전은 측정 중 고정했으며, **기록 호출 통합 → 문맥 전달 범위 축소 → 오류
진단 개선**의 수정안을 정리했습니다. 절감이 이미 달성됐다는 결과는 아닙니다.
일반 AI 한 회차의 파일 위치 불일치도 비용에 포함하며 설계 우위로 해석하지 않습니다.
[조건·반복별 범위·수정안](test/evals/fs-comparison/v14/README.md) ·
[작업 구간별 그래프와 실행 선택](test/evals/fs-comparison/v14/results/2026-10-07-trajectories/report.html).

**후속 수정·재시험 30회:** 초안/저장 호출 통합과 성공 결과 재사용 지침만 바꾼
24회 시험에서 FS 총 토큰은 오히려 2.2% 증가했습니다. 이후 요청하지 않은 기존
분석서 재작성을 제한하고 같은 초기 분석으로 계획 6개를 재실행했습니다.
기존 분석서 재작성은 5/6→0/6건, 근거가 연결된 미승인 계획 전달은 6/6건이었습니다.
계획 토큰은 첫 수정본 대비 13.6% 감소했지만 **최초 기준 대비로는 2.1% 감소**,
비캐시 입력+출력은 최초 대비 7.6% 감소입니다. 큰 폭의 절감·일반 AI 대비 비용
우위는 여전히 입증되지 않았습니다. 서버의 인용·최신성·승인 검증은 그대로입니다.
[세 시점의 수치·실패·검토 범위](test/evals/fs-comparison/v14/README.md#후속-수정과-재시험--2026-10-07) ·
[추가 보완의 계획 비교 그래프](test/evals/fs-comparison/v14/results/2026-10-07-plan-delta/comparison.png).

**v11 조사 기준 집중 비교(2026-10-06):** 같은 편집 함수의 호출부·계약을 direct / replay /
mixed / unknown으로 바꾸고 일반 AI·동일 원문 AI·FS를 새 세션에서 비교했습니다.
실제 모델 12회 모두 완료했고, FS 네 사례에서 트리거 검색 → 본문 읽기 → 조사 근거
저장이 확인됐습니다. 일반/원문 AI도 핵심 보존 계약과 미확인 질문을 다뤄 설계 판단
우위는 확인하지 못했습니다. [조건·실제 생성 리뷰](test/evals/fs-comparison/v11/README.md) ·
[전체 수치·오류·한계](test/evals/fs-comparison/v11/results/2026-10-06-investigation-1/analysis.md).

| v11 조건, 각 네 상황 | 완료 | 총 토큰 | 비캐시 입력+출력 | 합산 초 |
|---|---:|---:|---:|---:|
| 일반 AI | 4/4 | 415,215 | 76,911 | 254.387 |
| 동일 원문 AI | 4/4 | 394,582 | 100,950 | 241.662 |
| FS | 4/4 | 1,690,863 | 209,647 | 419.844 |

FS는 일반 AI 대비 총 토큰 4.07배·비캐시 입력+출력 2.73배, 원문 AI 대비
4.29배·2.08배였습니다. FS에 추가 요청한 구조화된 기록 저장 비용과 복구된 MCP 입력
오류 3건을 모두 포함합니다. 작은 코드와 평가용 지식 한 건의 리뷰 실험이며, 전체 계획·구현
비교나 대규모 지식 검색 평가가 아닙니다. 이전 v10과 직접 향상률을 계산하지 않습니다.

**v10 다중 프로젝트 비교(2026-10-06):** 디자인 시스템·편집기·가격 계산·SSR·업로드·확장 기능 여섯 사례를 추가했습니다. 실제 모델 비교로 sync의 불가능한 call 트리거, ESM 직접 import, 미입력 확인 근거 표시, 상세 응답의 계약 진단 누락을 보완했습니다. 현재 타입·lint·98개 회귀와 패키지 검사가 통과했습니다. [프로젝트·조건·실제 결과](test/evals/fs-comparison/v10/README.md).

별도 세 상황의 일반/원문/FS 9개 여정은 모두 완료됐고 FS의 지식 연결·저장 일치는 확인했습니다. 다만 일반 AI도 책임 분리와 구체적 검증 시나리오를 제시하여 **FS 고유의 설계 품질·비용 우위는 아직 미입증**입니다. 상세 설계 목차를 공통으로 주는 비교와 짧은 요청 비교를 모두 완료했습니다. 전체 37개 여정 중 36개 완료, 실제 생성·리뷰 호출 76회, 알려진 총 토큰 16,130,437 이상입니다. 제공자 용량 부족 2회의 미제공 사용량과 모든 실패 기록을 보존했습니다. 사례당 5개 소스 모듈의 계획 평가이며, 대형 프로젝트나 실제 구현 품질 점수는 아닙니다.


**이전 v9 보완·재시험(2026-10-05):** 네 후보를 실제 실행하며 인용 진단, 큰 revision의 검증된 JSON 파일 전달, 상세 스키마의 필요 시 조회, 결정의 효과/소유자 범위와 확인 근거를 보완했습니다. 입력 스키마는 44,748→30,250자로 32.4% 줄었지만 이는 토큰 절감률이 아닙니다. 승인·근거·최신성 검증은 유지했습니다. [네 회차 결과·실패 포함 비용](test/evals/fs-comparison/v9/results/2026-10-05-iteration-4/analysis.md).

마지막 두 계획은 확정된 결정의 기록 누락 없이 완료됐습니다. 모호한 평가 답변을 명시적으로 보충한 후속 검사에서는 일반 AI와 FS 모두 여섯 의무를 계획에 반영했습니다. FS는 저장된 필수 규칙 7개와 계획이 일치하고 계약 진단 0건이었지만, 추가 총 토큰은 원문 AI 121,970 / FS 556,475였습니다(비캐시 입력+출력 29,810 / 32,315). 서로 다른 앞선 대화 이력이 있어 전체 여정 비용 비교는 아닙니다. **기록 일관성의 개선은 확인했지만 고유한 품질·비용 우위는 미입증입니다.** [실제 양쪽 계획과 감사](test/evals/fs-comparison/v9/results/2026-10-05-iteration-4/followup/analysis.md).

타입·린트·96개 회귀 및 독립 패키지 검사가 통과했습니다. 이번 반복의 실제 모델 호출 48회와 알려진 토큰 19,470,343 이상을 모두 기록했습니다. 사용량 미제공 5회와 실패 기록을 보존하고 상위 대화 비용은 제외합니다. [최신 README](test/evals/fs-comparison/v9/README.md). 아래 파일럿과 v8 이하는 당시 결과입니다.

**v9 지식·질문·설계 판단 비교(2026-10-05):** 평가 대상을 지식이 실제 질문과 계획의 판단에 만드는 차이로 변경했습니다. 일반 AI / 같은 원문을 받은 AI / 기본 FS / 지식 추가 FS를 공유·독립 세션 두 상황에서 비교해 8개 여정을 완료했습니다. FS에는 저장된 출처·조건·제외 조건 → 라우팅 판단 → 결정 연결을 확인하는 `get_revision(detail: "influence")`도 추가했습니다. [실험 설계·결과](test/evals/fs-comparison/v9/README.md).

**지식 연결은 확인했지만 FS의 고유한 품질 우위는 입증하지 못했습니다.** 원문 AI와 지식 추가 FS 모두 같은 토큰 교체의 의미를 더 명시적으로 질문했습니다. 그러나 FS의 독립 세션 계획에는 `A → B → A` 교체를 토큰 문자열 비교만으로 구분할 수 있다고 판단한 오류가 있었습니다. 지식 추가 FS의 두 상황 합계는 2,471,575토큰으로 원문 AI 295,942토큰의 8.35배이며, 비캐시 입력+출력도 3.03배였습니다. 작은 코퍼스·모델 하나·상황당 완료 실행 한 번의 관측으로, sync와 trigger 각각의 독립 효과나 장기 유지보수 효과를 증명하지 않습니다. [실제 계획 8개·오류 근거·전체 실패 비용](test/evals/fs-comparison/v9/results/2026-10-05-planning-pilot/analysis.md). 아래 v8 이하 결과는 이전 구현 과제의 기록입니다.

**v8 문서 발견·연속 유지보수 비교(2026-10-05):** 상세 구현 계획을 미리 주지 않고, 일반 지시 / 관련 지식 위치 안내 / 위치 안내+FS의 세 조건으로 확장했습니다. 37개 제품 파일에서 초기 정리 → 변형 추가 → 이전 기본값 결정 변경을 수행하며, 단계마다 대화와 MCP를 초기화하고 코드·문서 이력은 유지합니다. 모든 조건에 같은 지식과 공개 검사기를 제공합니다. [설계·전체 결과·실제 코드](test/evals/fs-comparison/v8/README.md).

**후속 D는 완주했지만 FS에 불리했습니다.** 일반 지시와 지식 위치 안내는 세 단계 모두 첫 채점97/97, FS는97/97 →97/97 →95/97이며 외부 복구 후에도95/97입니다. 기본값만 바꾸는 과정에서 기존 `quiet`의 회색 배경을 보존하지 못했습니다. 누적 총 토큰은 일반1,936,177 / 위치 안내1,804,712 / FS7,432,020입니다. FS는 위치 안내 조건보다 총 토큰4.12배·비캐시 입력+출력2.49배를 쓰고 정확도도 낮았습니다. [D 전체 표](test/evals/fs-comparison/v8/results/2026-10-05T121918/analysis.md). 아래 A와 서비스 중단 기록은 당시 기록으로 보존합니다. D 이후 변경 전 동작의 확인 지침·복구 진단·실패 비용 집계를 보완하고, 같은 중간 코드에서 실패 단계를 분리해 재시험합니다.

**보완 후 동일 코드 진단 E도 완료했습니다.** 양쪽 첫 채점97/97이며, FS가 제품 수정 전에 기존 명시적 prop 동작을 테스트로 확인한 순서도 관측했습니다. 일반 조건470,957토큰/134.214초, FS2,100,553토큰/520.367초로 FS의 비용 우위는 없습니다. [E 결과·실제 코드·한계](test/evals/fs-comparison/v8/README.md#e--replay-2026-10-05t130717). 발견된 사례의 재시험이며 D의 실패를 덮거나 지침 단독의 인과 효과·일반적 우위를 입증한 것으로 해석하지 않습니다.

| A 초기 단계 / gpt-6-sol | 첫 외부 채점 | 총 처리 토큰 | 비캐시 입력+출력 | 초 |
| --- | --- | ---: | ---: | ---: |
| 일반 지시 | 97/97 | 722,771 | 72,147 | 245.474 |
| 관련 지식 위치 안내 | 97/97 | 507,436 | 39,596 | 187.971 |
| FS | 97/97·절차 통과 | 2,376,490 | 169,642 | 579.160 |

일반 두 조건은 후속 단계도 모두 첫 채점 97/97입니다. FS는 다음 단계에서 모델 서비스 용량 부족으로 중단됐습니다. 이후 중복 맥락, 시작·완료 기록 호출, 검토 ID 오류 안내, 검사 파일 해시 등록을 개선했습니다. 같은 수정 버전으로 두 번 재시험했지만 모두 준비 중 서비스 용량 부족으로 중단돼 **수정 후 토큰 절감과 FS 우위는 미확인**입니다. 전체 17회 모델 호출 중 완료 turn 14회·중단 3회이며, 보고된 토큰 하한은 5,837,408입니다. 미보고 사용량을 0으로 계산하지 않습니다.

타입·린트·93개 회귀, 실행기/집계기 6개, 정상·변이 교정 26건, 독립 패키지 검증은 통과했습니다. 클래스와 무관한 문자열을 위반으로 오인하던 공개 검사기와 독립 오라클을 교정했고, 이전 완료 구현 7개를 제한된 환경에서 재채점해 모두 같은 97/97을 확인했습니다. 질문 주제는 제공하므로 자율적 질문 발견을 입증하지 않으며, 모든 조건에 검사기가 있어 도구 없는 AI 대비 FS 전체의 효과와도 구분합니다.

**v7 작성 규칙 비교(2026-10-05):** 기능이 정상인 운영 콘솔에서 클래스 객체 2곳·CVA 미사용 변형 3곳·미정 테마를 분리해 평가했습니다. 35개 JS/JSX 파일과 CSS, 93개 검사를 사용하며 원문→검토/sync→트리거→필수 검사/테마 질문→계획→구현을 실제 실행했습니다. [조건·반복 전체·실제 코드](test/evals/fs-comparison/v7/README.md).

| 최종 D / gpt-6-sol | 첫 외부 채점 | 총 처리 토큰 | 비캐시 입력+출력 | 초 |
| --- | --- | ---: | ---: | ---: |
| 일반 AI | 93/93 | 439,367 | 38,215 | 166.209 |
| FS | 93/93·절차 통과 | 2,048,086 | 101,462 | 355.734 |

5회 paired run·20번 모델 호출 중 4쌍이 완주했고, 1회 FS work는 서비스 capacity 오류로 중단되어 미검증/토큰 미확인으로 보존했습니다. **원했던 작성 규칙 연결은 작동했지만, 같은 지식·검사기를 받은 일반 AI 대비 준수/비용 우위는 입증하지 못했습니다.** 최종 FS의 총 처리 토큰은 4.66배, 비캐시 입력+출력은 2.66배입니다. 최초 v7 FS 대비 총 토큰은 8.9% 감소했으나 비캐시 입력+출력은 1.2% 증가하여 일관된 비용 절감으로 볼 수 없습니다.

반복에서 scoped lint 기본 검사 누락, 큰 소스 요청의 페이지 처리, 내부 검색어 길이 초과, 정상 코드 오탐을 보완했습니다. 회귀 88개, 정상/위반 교정 13개, 독립 패키지 검증을 통과했고 이전 완료 구현 7개도 수정 오라클로 재채점해 같은 결과를 확인했습니다. 미완료 arm도 누락하지 않는 집계기를 추가했습니다. 실제 브라우저 동등성·장기 유지보수에서의 초기 비용 회수는 별도 검증 대상입니다.

**v6 확대·반복 비교 완료(2026-10-05):** 변경 대상 7→32개 파일(4.57배), 기준 코드 71→386줄(5.44배), 외부 검사 14→69개, 사용자 결정 2→8개로 확대했습니다. 주문·재고·반품·지갑과 교차 도메인 실패 복구를 포함합니다. 정상 2개/결함 38개의 격리 교정 후 실제 비교 6쌍(모델 호출 24회)을 수행했습니다. [전체 조건·결과·실제 코드 위치](test/evals/fs-comparison/v6/README.md)에 성공과 실패를 모두 기록했습니다.

| 최종 고정 버전 | 일반 AI 총 토큰 | FS 총 토큰 | 최초 외부 계약 | FS 절차 | FS MCP 오류 |
| --- | ---: | ---: | --- | --- | ---: |
| 001459 | 800,858 | 1,993,180 | 양쪽 69/69 | 통과 | 0 |
| 003233 (동일 manifest) | 669,454 | 3,714,369 | 양쪽 69/69 | 통과 | 0 |

두 실행 평균 FS는 첫 v6 FS 대비 **총 토큰 33.2%, 비캐시 입력 34.3%, 시간 24.0% 감소**했습니다. 개별 총 토큰 감소는 53.4%·13.1%로 편차가 큽니다. 단일 모델·단일 과제·2회 반복에서 관측한 감소이며 일반적인 개선율을 보장하지 않습니다.

**일반 AI 대비 우위는 아직 입증하지 못했습니다.** 같은 두 실행의 일반 AI 평균 대비 FS는 총 토큰 3.88배·비캐시 입력 1.49배·시간 1.67배이고 구현 점수는 같습니다. 총 토큰은 청구액이 아니며 실제 브라우저·질문의 적합성·장기 유지보수성은 이 점수로 판단하지 않습니다.

수정한 부분은 읽기 예산 재분배, 문서 해시/계획별 baseline 안내, 파일 범위를 이용한 지식 검색 보완, 누락 선행 기록·승인 확인, 공동 변경의 불필요한 계층별 checkpoint 분리 방지입니다. 사용자 결정·근거·승인·최종 검사와 격리는 유지했습니다. 최신 두 실행 모두 재사용 사실을 등록했고 FS 완료 기록이 수락됐습니다.

중간 B2는 제품 69/69여도 FS 절차를 생략해 **실패**했고, C는 527만 토큰으로 비용이 증가했습니다. 낮은 실패 비용을 개선 성과로 삼지 않았으며 [반복 기록](docs/fs-improvement-loop.md)에 모두 보존합니다. 타입·린트·82개 테스트와 패키지 검증을 통과했습니다. 링크가 열리지 않으면 `less test/evals/fs-comparison/v6/README.md`로 확인할 수 있습니다.

아래 v5 이하 수치는 이전 과제의 이력입니다.

반복 개선의 고정 기준·실측·직접 실행 권한 상태는 `docs/fs-improvement-loop.md`에 기록합니다. 실행 권한을 승인받아 에이전트가 직접 비교를 진행하고 있으며, 평가 모델·채점기의 격리는 유지합니다.

**직접 반복 비교 — 2026-10-04:** 개선하면서 8쌍의 실제 비교를 완료했습니다. 모두 양쪽 최초 외부 검사 14/14, 금지·사용자 결정 위반 0건, 외부 수정 호출 0회였습니다. **FS 절차의 완료는 확인했지만, 구현 준수 우위나 안정적인 총 토큰 절감은 입증하지 못했습니다.** 내부 개발 테스트의 실패·수정이 없었다는 뜻은 아닙니다. 전체 회차와 실패 원인은 [반복 기록](docs/fs-improvement-loop.md)에 보존합니다.

최신 로그·검사 순서 보완 후 [204033 결과](test/evals/fs-comparison/v5/results/2026-10-04T204033/analysis.md)는 다음과 같습니다.

| 지표 | 일반 AI | FS |
| --- | ---: | ---: |
| 최초 외부 계약 검사 | 14/14 | 14/14 |
| 총 처리 토큰 | 425,027 | 2,666,706 |
| 비캐시 입력 | 45,296 | 111,617 |
| 준비+구현 시간 | 205.710초 | 582.529초 |
| MCP 입력 오류 | 해당 없음 | 0건 |

FS는 일반 AI 대비 총 토큰 6.27배, 비캐시 입력 2.46배, 시간 2.83배입니다. 재사용 등록 3개·두 조회에서 발동 합계 6회, 새 답변 부분 수정 1/1, 개발 테스트의 MCP 요약 경로 사용과 최종 delivery 1회를 확인했습니다. 원본 로그와 실패 판정은 유지했습니다. 그런데도 과거 FS 161324 대비 토큰은 39.6% 많습니다. 이 작은 계약 구현에서는 기록·규격·검증의 추가 비용을 상쇄하는 품질 이득을 확인하지 못했습니다. **이번 반복의 토큰 절감 목표는 미달입니다.**

직전 도구 규격 도움말 버전에서 같은 manifest로 반복한 두 번도 보존합니다.

| 실행 ID | 일반 AI 총 토큰 | FS 총 토큰 | 일반 AI 시간 | FS 시간 | FS MCP 오류 |
| --- | ---: | ---: | ---: | ---: | ---: |
| [201059](test/evals/fs-comparison/v5/results/2026-10-04T201059/analysis.md) | 349,477 | 1,916,728 | 240.046초 | 495.411초 | 1 |
| [202328](test/evals/fs-comparison/v5/results/2026-10-04T202328/analysis.md) | 308,233 | 3,174,514 | 214.468초 | 620.662초 | 0 |
| 평균 | 328,855 | 2,545,621 | 227.257초 | 558.037초 | 0.5 |

FS 평균은 일반 AI 대비 총 토큰 7.74배, 비캐시 입력 3.26배, 시간 2.46배입니다. 과거 161324 대비 FS 평균 토큰은 33.2% 많고 시간은 15.9% 짧지만, 작은 표본의 시간 차이를 일반화하지 않습니다. 토큰 배수는 청구 금액 배수가 아닙니다. 제품 7개 중 6개는 각각 동일하고, 가격 함수의 차이는 실행별 분석에 남겼습니다. 유한 검사 통과는 전체 설계 품질의 동등성이나 실제 브라우저 성공을 뜻하지 않습니다.

새 답변의 근거 연결과 결정 부분 수정은 최근 8회 모두 성공했습니다. 묶음 조회, 저장 분석의 의미 트리거 재사용, 고유 인용의 줄 자동 계산, 생성된 입력 규격 도움말을 반영했습니다. 그러나 **MCP 오류가 0건이어도 비쌀 수 있습니다.** 202328에서는 UI 테스트의 환경/번들 오류 복구와 검사 통과 후 테스트 보강·재검증 비용이 남았습니다. 따라서 실패 로그의 앞·뒤 요약과 개발 검사 경로, 최종 검사의 순서를 추가 보완했습니다. 타입·린트·78개 테스트와 독립 패키지 검사를 통과했고, 실제 사용 여부와 비용은 위 204033에 기록했습니다. 모델·600초 제한·계약·채점·격리를 유지했으며, 좋은 회차만 선택하거나 검사를 완화하지 않았습니다.

문서 링크가 열리지 않으면 프로젝트 루트에서 `less docs/fs-improvement-loop.md`를 실행하세요. Space로 넘기고 q로 종료합니다.

새 비교 경로는 [v5 다계층 주문 계획 준수 평가](test/evals/fs-comparison/v5/README.md)입니다. HTTP·저장소·도메인·비동기 상태·React UI의 변경 대상 7개 파일, 14개 유한 검사, 사용자 결정 2개로 복잡성을 늘렸습니다. [기존 v4 결과](test/evals/fs-comparison/v4/README.md)는 보존하며 점수와 통계를 합치지 않습니다. FS 도구 경로를 생략한 실행은 제품 검사가 통과해도 FS 성공으로 집계하지 않습니다.

**이전 v5 시간 초과 — 2026-10-04T180529:** 일반 AI는 14/14, 631,543토큰·368.274초로 완료했습니다. FS는 준비 213.864초 후 구현 호출이 600.025초에 종료돼 외부 채점과 전체 토큰은 미집계입니다. 내부 완료 기록은 있지만 평가에서는 unverified이며, 제품 파일 7개는 일반 AI와 동일합니다. 저장 분석 9개에 reuse 등록이 없어 재사용 0회, 결정 부분 수정 4회 중 1회 성공, MCP 전체 47회 중 4회 오류였습니다. **이번 보완의 비용·품질 개선은 입증되지 않았으며 실제 사용 흐름의 결함이 확인됐습니다.** [원인 분석](test/evals/fs-comparison/v5/results/2026-10-04T180529/analysis.md)에 구현 한계와 다음 보완 우선순위를 기록했습니다. 링크가 열리지 않으면 `less test/evals/fs-comparison/v5/results/2026-10-04T180529/analysis.md`로 읽을 수 있습니다.

**이전 v5 실제 결과 — 2026-10-04T161324:** gpt-6-sol 한 쌍에서 일반 AI와 FS 모두 최초 14/14, 검출된 금지·결정 위반 0건, 외부 수정 호출 0회였습니다. 최종 제품 파일 7개는 바이트 단위로 동일합니다. 일반 AI는 260,373토큰·190.385초, FS는 1,910,803토큰·663.873초로 총 처리 토큰 **7.34배**, 비캐시 입력 **2.08배**, 시간 **3.49배**였습니다. FS 절차는 실행됐지만 구현 준수 우위는 확인하지 못했습니다. FS의 MCP 35회 중 3회는 입력/근거 연결 오류로 실패했습니다. [세부 결과·원인·코드 비교](test/evals/fs-comparison/v5/results/2026-10-04T161324/analysis.md)를 기록했습니다. 초기 계층 구조가 이미 주어졌고 실제 수정은 4개 파일의 8줄 교체였다는 과제 한계도 있습니다. 아래 사전 검사 기록은 이 실제 결과와 별개입니다.

**비용 분석 후 최적화:** 추가 1,650,430토큰 중 96.79%는 캐시 입력 증가분입니다. 결정만 조회하는 형식, 변경하지 않은 계획 필드 생략, 저장 직후 계약 연결 진단, 이전/현재 후보 차이 안내를 반영하고 중복 열람·검사 지시를 줄였습니다. 과거 로그의 조건부 응답 재구성에서는 결정 조회 59.9~62.0%, 생략 가능한 저장 요청 11.7~41.8%의 문자 수 감소를 확인했습니다. 당시 타입·린트·회귀 70개를 통과했습니다. 이후 실제 토큰 측정은 위 반복 비교와 [원인·반영 내역·pstack의 기여와 한계](docs/fs-token-cost-analysis.md)에 기록했습니다.

**분석 재사용 후속 보완:** 최초 분석의 진술에 의존 파일과 의미 트리거를 저장하면 `get_work_context`가 요청 범위에 맞는 진술을 찾아 라우팅에 연결합니다. 의존 파일·설정·관련 트리거 정의가 바뀌면 재검토로 전환하며, 서버 재시작 후에도 저장된 해석을 사용할 수 있습니다. 결정 변경은 `decisionUpdates`로 ID별 수정하고 다른 기록을 보존합니다. 새 사용자 선택에는 새 답변이 필요하며 승인 검증을 우회하지 않습니다. 기존 문서는 명시적인 재검토 없이 자동 재사용하지 않습니다. 당시 타입·린트·75개 테스트로 이 동작을 확인했습니다. 이후 실제 재사용과 결정 패치는 관측했지만, 전체 토큰 절감은 아직 입증되지 않았습니다. 세부 사용법과 실측 한계는 `docs/fs-token-cost-analysis.md`에 기록했습니다. 링크가 열리지 않으면 프로젝트 루트에서 `less docs/fs-token-cost-analysis.md`를 실행하세요.

**pstack 검토 후 반영 — 2026-10-04:** 미결정 draft는 선택값 없이 저장하되 승인은 계속 차단합니다. `get_work_context.knownContextId`는 최신 분석을 실행한 뒤 동일한 후보 메타데이터만 재전송하지 않습니다. 공개 경계의 호출 예시·시그니처·소유권·허용 의존성을 계획에 기록하고, 반복 실패와 지식의 실행 가능한 주장에 정상 예/반례 검증을 연결하도록 기존 지침을 보강했습니다. [적용 내역](docs/pstack-review.md#구현-후속-기록)을 참고하세요.

| pstack 반영 직후의 사전 검증(이전 기록) | 결과 | 해석 |
| --- | --- | --- |
| 타입·린트·FS 회귀 | 69개 통과 | 승인·근거·갱신 보호 유지 |
| v4 / v5 실행기 기능 검사 | 7개 / 3개 통과 | 모델 호출 없이 프로토콜·채점기 확인 |
| v5 고정 예제 | 정상 2개 수용 / 결함 15개 거부 | 채점기 검증이며 FS 품질 우위 아님 |
| 이미 읽은 분석의 재요청 | 해당 예제 응답 30.4% 감소 | 총 모델 토큰·CPU 절감은 미측정 |
| v5 실제 모델 비교 | sandbox 사전 검사 차단 / 호출 0회 | 새 품질·비용 비교 결과 없음 |

독립 패키지 검사도 통과했습니다. 위 사전 검사 시점의 에이전트 환경에서는 `sandbox_apply: Operation not permitted`로 중단됐고, 이후 외부 터미널에서 위 최신 v5 비교를 완료했습니다. [실행 기록과 일반 터미널 명령](test/evals/fs-comparison/v5/README.md#실행)을 남겼습니다. 아래 기존 실측을 새 변경의 성과로 바꾸어 해석하지 않습니다.

**계획 준수 비교 실제 결과 — 2026-10-04:** 새 compliance의 duplicated 한 쌍에서는 일반 AI와 FS 모두 최초 구현 11/11, 검출된 금지·사용자 결정 위반 0건, 추가 수정 0회였습니다. 두 조건 모두 질문 후 답변을 반영했습니다. 일반 AI는 258,094토큰·156.523초, FS는 1,433,357토큰·446.466초로 총 처리 토큰 5.55배·시간 2.85배였습니다. 비캐시 입력은 1.93배입니다. 이 명시적 계획에서는 규정 준수 우위를 확인하지 못했습니다. [새 결과와 남은 준비 비용](test/evals/fs-comparison/v4/results/2026-10-04T123641/analysis.md)을 기록했습니다. 한 사례의 검사 결과이며 전체 설계 품질의 동등성을 뜻하지 않습니다.

**계획 준수 평가 보강:** `--track compliance`를 추가했습니다. 동일한 계획에서 필수 항목, 금지된 파일·의존성·공개 API 변경, 입력 참조 계약, 질문 후 사용자 결정 반영을 별도로 검사합니다. 최초 위반과 수정 후 결과를 함께 보존합니다. 고정 예제는 허용 구현 6개 수용·결함 18개 거부이며, 이 고정 예제 검증 자체는 실제 모델 비교 성과가 아닙니다. 계획 저장·승인·조회 응답의 중복도 줄였습니다. 이전 응답 재구성에서는 대상 응답 문자가 사례별 66.1~96.3% 감소했지만 전체 토큰·시간 절감은 미측정입니다. [새 평가 계약·실행 명령·측정 한계](test/evals/fs-comparison/v4/README.md)를 참고하세요.

**이전 implementation 결과 — 2026-10-04:** 수정본의 전체 세 사례에서 일반 AI와 FS 모두 첫 구현에 통과했습니다. FS의 실제 라우팅·분석 참조·지식 적용·계획 승인·검증·완료도 확인했습니다. 일반 AI는 총 1,024,122토큰·648.423초, FS는 5,888,142토큰·1,356.998초로 **총 처리 토큰 5.75배, 시간 2.09배**였습니다. 캐시를 제외한 입력도 각각 80,591 / 245,302토큰입니다. 준비 단계 시간 초과는 이번에 재현되지 않았지만, 동일 계획 구현에서 추가 비용을 정당화하는 품질·수정 횟수 개선은 아직 입증되지 않았습니다. [상세 분석](test/evals/fs-comparison/v4/results/2026-10-04T074740/analysis.md)을 기록했습니다. 토큰 배수는 청구 금액 배수가 아니며 질문·계획 품질은 이 실험의 평가 대상이 아닙니다. 아래는 이전 실행과 로컬 검증 이력입니다.

**이후 외부 터미널에서 실행한 실제 결과:** `gpt-6-sol` 9회 호출에서 일반 AI는 세 사례 모두 첫 구현에 통과했고, FS는 모두 준비 단계의 300초 제한을 넘겨 구현에 진입하지 못했습니다. 이번에는 라우팅이 실행됐지만 도구 입력 오류·반복 기록·큰 응답이 관찰됐습니다. 일반 AI 총 875,530토큰(캐시 입력 777,984 포함), FS 사용량은 미수집입니다. 현재 버전의 작업 완료 효과는 입증되지 않았으며, 구현물 품질·비용 비율도 비교할 수 없습니다. [상세 분석](test/evals/fs-comparison/v4/results/2026-10-03T171521/analysis.md)을 기록했습니다. 아래 표는 그보다 앞선 로컬 검사 기록입니다.

**오류 분석 후 수정 검증:** 타입·린트·회귀 68개, v4 실행기 4개, 독립 패키지 검사를 통과했습니다. 이전 실행의 첫 맥락 요청을 재현한 결과, 지식 후보와 필수 규칙을 모두 유지하며 응답의 공백을 제외한 문자 수가 63.6~65.3% 줄었습니다. 이는 응답 크기 측정이며 AI 토큰·품질·속도 개선 결과가 아닙니다. [측정 자료](test/evals/fs-comparison/v4/validation/context-regression.json)와 [재실행 절차](test/evals/fs-comparison/v4/README.md#입력응답-단순화-후-검증)를 참고하세요. 새 격리 사전 검사도 현재 도구 환경에서는 차단되어 모델을 호출하지 않았습니다.

| 2026-10-03 검증 | 결과 | 해석 |
| --- | --- | --- |
| 타입 검사·린트·FS 회귀 검사 | 통과, 65개 테스트 | 근거 없는 승인·잘못된 완료 거부 및 수정 후 완료 확인 |
| v4 실행기 기능 검사 | 4개 통과 | 실제 MCP 근거 흐름, 답변 제한, 세션·사용량 집계, FS 절차 생략 판별 |
| 작성된 정답·결함 예제 | 정답 3개 수용, 결함 12개 거부 | 고정 예제의 판정기 검증이며 AI 생성 결과가 아님 |
| 독립 패키지 MCP 검사 | 통과 | npm 설치 캐시 경로를 `/private/tmp`로 지정하여 검증 |
| 실제 격리 비교 사전 검사 | 차단, 모델 호출 0회 | `sandbox_apply: Operation not permitted`; 새 버전의 품질·토큰 우위는 아직 미측정 |

[실제 차단 기록](test/evals/fs-comparison/v4/results/2026-10-03T170525/summary.json)과 기능 검사 방법은 v4 문서에 보존했습니다. 아래 v3·v2·v1 수치를 새 구현의 성과로 합산하지 않습니다.

새로 준비한 [Frontend Fundamentals 기반 React 평가](test/evals/fs-comparison/v3/fundamentals/README.md)는
일반/선물 주문의 질문·계획 → 구현 → 정책 변경을 비교합니다. 일반 AI, 같은 지식을 제공한 AI,
FS를 구분하고, 독립 정책과 공유 정책의 반례를 모두 둡니다. 구조를 미리 정답으로 주지 않으며
행동 검사와 가독성·응집도·결합도 리뷰를 분리합니다. 외부 실행 기록에서 모델 27회 호출을
확인했습니다. 6개 조건 중 4개는 후속 변경까지 통과했고 2개는 시간 초과입니다. 다만
채점기가 요구에 없는 영문 오류 문구를 강제하여 공유 정책의 세 조건 모두 불필요한 재수정을
거쳤습니다. 해당 채점 오류를 수정했으며, 기존 비용·수정 횟수는 FS 효과의 확정 근거로
사용하지 않습니다. 수정 후 이 환경의 재실행은 격리 오류로 중단됐습니다.

[실제 코드 나란히 보기](test/evals/fs-comparison/v3/maintenance/code-comparison.html)에서
일반 AI/FS가 작성한 세 단계의 정책·controller·테스트를 비교할 수 있습니다.
현재 파일럿은 확정된 구조·업무 계약과 같은 지식을 양쪽에 전달했으며 **사용자에게 질문해서
트레이드오프를 결정하는 효과는 측정하지 않았습니다.** [상호작용 평가 설계와 지식 경로 진단](test/evals/fs-comparison/v3/maintenance/README.md#무엇을-측정하나)을 구분해 기록했습니다.
지식의 해시 연결·기존 매핑 검사는 통과했지만, 실제 실행에서는 잘못된 도메인 필터와
의미 해석 누락을 확인했습니다. 원문 479개는 신규 구조화 리뷰 기준에서 legacy-unreviewed이며,
배포 상태만으로 원문 의미와 실제 적용까지 검증됐다고 판단하지 않습니다.

아래 기존 비교는 **gpt-6-sol 한 쌍의 유지보수 파일럿**입니다. 최초 구현 → 정책 변경 →
API 형식 변경을 진행했고 호출당 300초를 양쪽에 동일하게 적용했습니다. 아래는 **각 단계마다
새 세션을 연 기존 결과**입니다. 실행기를 같은 여정에서는 대화를 유지하도록 수정했으며,
새 조건의 실제 모델 비교는 아직 실행하지 않았습니다.

| 항목 | 일반 AI | FS |
| --- | ---: | ---: |
| 최초 구현의 필수 계약 | 8/8 | 8/8 |
| 정책 변경의 필수 계약 | 8/8 | 8/8 |
| API 형식 변경의 필수 계약 | 8/8 | 시간 초과로 미검증 |
| 전체 적격 완료 여정 | 1/1 | 0/1 |
| 완료된 앞 두 단계 총 토큰 | 368,332 | 2,004,696 |
| 같은 두 단계의 비캐시 입력+출력 | 57,420 | 119,896 |
| 전체 여정 총 토큰 | 599,067 | null: 마지막 단계 사용량 누락 |

완료된 같은 두 단계의 보고된 총 토큰은 FS가 **5.44배**, 비캐시 입력+출력은 **2.09배**였습니다.
이는 과금 비율이 아닙니다. 외부 검사 실패 후 재수정은 양쪽 모두 0회였으나 FS 마지막 단계는
그 검사에 도달하지 못했으므로 같은 신뢰성을 뜻하지 않습니다. FS 도구 사용은 원로그로
확인했고 잘못된 트리거·인용·실행 해시로 거절된 호출 4회와 반복 맥락 조회도 확인했습니다.
**이 한 쌍에서는 관측한 계약 충족의 우위나 토큰 절감이 없었습니다.** 전체 아키텍처·가독성이나
다른 모델·프로젝트로 일반화하지 않습니다. 일반 AI에도 같은 지식을 제공한 조건입니다.
[단계별 수치·원인·한계](test/evals/fs-comparison/v3/maintenance/README.md)와
[기계 판독용 분석](test/evals/fs-comparison/v3/maintenance/results/2026-10-02T131547/analysis.json)을 기록했습니다.

완료한 코드도 대조했습니다. 양쪽 모두 정책 계산 분리, load/send 주입, 두 진입점의 공통 계산
호출과 실패 복구를 구현했습니다. 일반 AI에는 전송 대기 중 중복 제출과 잘못된 입력의 전송
차단을 별도로 검사하는 테스트도 있었습니다. FS에는 계획·검증 이력이 더 남았지만, 이것이
더 좋은 제품 코드로 이어졌다는 증거는 확인하지 못했습니다. 독립 블라인드 품질 평가는 아닙니다.

여정 내부까지 세션을 초기화한 것은 실행기 설계 오류였습니다. 독립 실험 사이만 초기화하고
각 단계와 재수정은 같은 thread ID로 재개하도록 수정했습니다. **다만 최초 구현에서도
FS가 총 토큰을 5.18배 사용했으므로 세션 오류만으로 추가 비용이 설명되지는 않습니다.**
새 실행기는 재개 세션의 누적 사용량을 중복 합산하지 않고 호출별 증가분을 기록합니다.
로컬 회귀 검사 6개와 판정기 교정은 통과했으며, 실제 대화 재개는 `--session-check-only`로
모델당 짧은 두 턴을 먼저 확인할 수 있습니다. 기존 결과와 새 조건은 별도 manifest로 보존합니다.

아래는 이 실제 실행 전에 수행한 준비·환경 오류·판정기 교정 기록입니다.


2026-10-02, 사용자와 논의한 기준에 따라 **최초 구현 → 정책 변경 → I/O 형식 변경**의
작은 유지보수 평가를 추가했습니다. 종합 품질 점수 대신 합의한 계약 충족,
외부 실패 판정 뒤 재수정 횟수, 유지 대상으로 지정한 코드의 불필요한 변경,
제공자가 보고한 실제 누적 토큰을 기록합니다. 양쪽에 같은 요구와 지식을 제공합니다.

| 이번에 실제 확인한 항목 | 결과 | 해석 |
| --- | --- | --- |
| 판정기: 직접 작성한 정상 구현 | 3/3 통과 | 세 단계의 정상 계약 수용 |
| 판정기: 의도적 결함 구현 | 21/21 거부 | 정책·입력·진입점·I/O·복구·불필요한 변경 결함 탐지 |
| 모델 연결 검사 (`gpt-6-sol`) | 시작 실패, 완료 턴 0 | app-server 초기화 `Operation not permitted` |
| 새 평가 실행기의 격리 검사 | 시작 실패, exit 71 | `sandbox_apply: Operation not permitted` |
| 일반 AI / FS 실제 유지보수 여정 | 실행 없음 | 품질 차이·재수정 감소 미측정 |
| 실제 비교 토큰 | `null` | 누락을 0 토큰 또는 절감으로 계산하지 않음 |

[실행 방법·지표·한계](test/evals/fs-comparison/v3/maintenance/README.md),
[판정기 교정 결과](test/evals/fs-comparison/v3/maintenance/calibration.json),
[모델 연결 원로그](test/evals/fs-comparison/v3/results/connection-2026-10-02T120053/result.json),
[격리 실행 시도](test/evals/fs-comparison/v3/maintenance/results/2026-10-02-controlled-attempt/summary.json)를
보존했습니다. 원문 검토 변경은 타입·lint·60개 테스트와 독립 패키지 검사를 통과했고,
판정기 교정은 자동 테스트에도 포함됩니다. 이 준비 단계에서는 실행 환경에 막혔으며,
이후의 실제 실행 결과는 위 최신 결과표에 기록했습니다.
이 파일럿은 DOM 없는 상태·업무 로직 평가이며 시각 품질·React 생명주기·전체 아키텍처
적합성을 대표하지 않습니다. 단계마다 새 모델 세션을 열고 여정 안의 코드·기록만 이어가는
복원 조건으로, 대화를 유지하는 상호작용 실험과 구분합니다.

후속 외부 터미널 실행(12:21)은 연결에 성공했지만 baseline 권한 경로 설정 오류와
FS의 Git/실행 파일 접근 오류로 유효한 비교가 되지 못했습니다. 실행기 설정을 수정하고
오류 발생 시 전체 중단, 양쪽 권한·Git·FS MCP 사전 검사와 진행 출력을 추가했습니다.
모델을 다시 호출하기 전에 `python3 test/evals/fs-comparison/v3/maintenance/run.py --preflight-only`로
확인합니다. [진단 및 수정 기록](test/evals/fs-comparison/v3/maintenance/README.md)에
원로그·한계를 남겼으며 이 실행의 부분 결과로 성능 우위를 주장하지 않습니다.

13:14 외부 터미널에서 수정된 사전 검사를 재실행하여 양쪽 권한·Git·실행 파일 접근과
FS MCP snapshot 통과를 확인했습니다. [사전 검사 결과](test/evals/fs-comparison/v3/maintenance/results/2026-10-02T131433/summary.json)는
모델 호출 없는 실행 준비 검증이며 실제 모델 비교 결과는 별도로 수집해야 합니다.

2026-10-02 전체 sync 이전 후 확인한 **라우팅 회귀 비교**입니다.
이전 네 개 참조 연결 시점의 인덱스를 동결하고 같은 코드·기술·고정 의미 신호로 비교했습니다.
아래 수치는 v2 모델 실험의 품질 점수나 토큰 절감률이 아닙니다.

| 확인 항목 | 네 개 참조 연결 시점 | 전체 sync 이전 후 |
| --- | --- | --- |
| 참조 사용 경로 | 트리거 4개, 미분류 65개 | 직접 64개, 보조 5개, 미분류 0개 |
| 고정 코드 12건의 필수 지식 도달 | 4/12 | 12/12 |
| 무관 코드·스코프 가림·래퍼·제외 기술 4건 | 4/4 | 4/4 |
| sync 트리거 매핑 회귀 사례 | 7개 | 135개 |
| 원문이 같은 상태의 체크 변경 | 완료 표시 유지 가능 | 해당 원본을 미동기화로 표시 |
| 사용자 메모 입력 | 파일 작성·catalog 호출 필요 | 제목·내용 2개로 등록, sync는 별도 검토 |
| 모델별 실제 제품 품질·누적 토큰 | 이전 v2 결과 보존 | 새 비교 미실행 |

[실행 코드](test/evals/fs-comparison/v3/routing.mjs)와
[사례별 결과·스냅샷 해시](test/evals/fs-comparison/v3/routing-results.json)를 보존했습니다.
메모 등록→sync→상황 조회→코드 근거→판단 기록→변경 무효화도 임시 저장소에서 검사합니다.
개발용 사례이며 일부 의미 신호는 미리 작성한 해석입니다. 모델이 스스로 올바른
상황을 발견하거나 좋은 코드를 만든다는 증거로 확대하지 않습니다. 작성 편의는
필수 입력을 줄인 수준까지 확인했으며 실제 사용자 시간·만족도는 아직 측정하지 않았습니다.

```sh
npm run build
node test/evals/fs-comparison/v3/routing.mjs
```

현재 코드의 흐름은 [FS 코드와 사용 흐름](docs/fs-runtime-guide.md)에 정리했습니다. 지식 sync, 맥락 검색, Skill의 판단, 정책·검증 도구의 역할과 한계를 소스별로 연결합니다.

[v2 실제 비교](test/evals/fs-comparison/v2/README.md)는 A 18회·B 18회, 총 36회를 완료했습니다. 해당 스냅샷에서 토큰 절감과 일관된 품질 우위는 입증되지 않았습니다. A Sol의 FS 총 토큰 중앙값은 일반의 3.85배, B Astra는 4.59배였으며 다른 조건의 누락 사용량을 0으로 대체하지 않았습니다. [원인 분석](test/evals/fs-comparison/v2/failure-analysis.md)과 원자료는 보존합니다.

후속 코드는 정책 입력 간소화, 요약 맥락, 코드 관찰을 반영한 검색, sync 사전 검증과 검색 사례 검사, 반례·적용 근거를 연결하는 Skill 절차를 추가했습니다. 실제 원본 479개·참조 69개의 해시/연결 검사는 통과했지만 기존 인덱스의 저장된 검색 사례는 0개였으며, 기존 개발용 사례에서 정상·제외·검색 없음 7개를 연결했습니다. 의미 적합성까지 입증한 결과가 아닙니다.

[새 v3 평가](test/evals/fs-comparison/v3/README.md)는 **코드 기준 충족도와 최초 구현→후속 변경→결함 수정의 누적 비용**을 평가합니다. 동등 정보 비교와 사용자 상호작용 비교를 분리하고, 질문·사용자 시간·수정 횟수·누락 사용량을 기록합니다. 현재는 설계와 집계기까지 준비했으며 사용자 코드 검토·답변집/교정·실행기 연결 전입니다. 모델 재실험은 시작하지 않았습니다.

아래는 별도로 보존하는 **v1 측정 결과**입니다. v2·v3와 합산하지 않습니다.

2026-09-30에 같은 Next.js 주문 예제에서 수량 선택·합계·입력 검증·중복 전송 방지·실패 후 재시도를 구현하는 실험을 수행했습니다. 요청 모델은 GPT-6 Astra·Sol·Luna, 추론은 모두 `medium`이며, **모델별 일반/FS 조건을 각각 3회, 총 18회 집계**했습니다. 일반 조건은 Codex 단독, FS 조건은 `fs-plan → fs-work`와 고정한 FS MCP·문서를 제공합니다. 두 조건의 사용자 프롬프트는 같습니다.

매 실행마다 새 임시 프로젝트·초기 Git 커밋·독립 의존성 사본·새 ephemeral 세션을 만들었습니다. 이전 변경과 `.frontend-system/` 기록을 제거하고 개인 스킬·플러그인·메모리·hooks·하위 에이전트를 비활성화했습니다. 18개 고유 세션의 초기 소스와 프롬프트 해시가 일치합니다. 서버 프롬프트 캐시는 강제로 초기화할 수 없어 캐시 사용량을 별도 기록했습니다.

환경은 Codex CLI `0.159.0`, Node `24.12.0`, macOS arm64, 소스 커밋 `691b3858f6c34ccedeea34ae79f0884a3b9df3d1`입니다. [고정 프롬프트](test/evals/fs-comparison/prompt.md), [실험 절차·재현 명령](test/evals/fs-comparison/README.md), [원자료를 포함한 상세 보고서](test/evals/fs-comparison/results/2026-09-30T020539/report.md), [통제 조건 감사](test/evals/fs-comparison/results/2026-09-30T020539/control-audit.json)를 보관했습니다.

### 토큰과 작업 시간

총 토큰은 CLI의 누적 `input + output`입니다. 입력에 포함된 cached input과 별도 reasoning 출력은 다시 더하지 않습니다. 단일 컨텍스트 크기나 청구 금액을 뜻하지 않습니다. 비캐시 입력은 `input − cached input`, 시간은 모델 세션의 실행 시간이며 파일 준비·외부 채점 시간은 제외합니다.

| 요청 모델 | 조건 | 총 토큰 1회 | 2회 | 3회 | 총 토큰 중앙값 | 비캐시 입력 중앙값 | 시간 중앙값(초) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GPT-6 Astra | 일반 | 299,364 | 273,362 | 300,608 | 299,364 | 21,049 | 162.2 |
| GPT-6 Astra | FS | 1,014,467 | 826,870 | 1,213,366 | 1,014,467 | 76,727 | 378.0 |
| GPT-6 Sol | 일반 | 413,192 | 436,648 | 424,697 | 424,697 | 52,499 | 213.0 |
| GPT-6 Sol | FS | 2,196,754 | 2,677,198 | 4,136,056 | 2,677,198 | 89,723 | 505.2 |
| GPT-6 Luna | 일반 | 507,414 | 203,173 | 441,316 | 441,316 | 35,189 | 134.0 |
| GPT-6 Luna | FS | 3,520,705 | 2,307,605 | 3,089,358 | 3,089,358 | 129,197 | 551.6 |

FS/일반의 중앙값 비율은 총 토큰이 Astra **3.39배**, Sol **6.30배**, Luna **7.00배**, 작업 시간이 각각 2.33배, 2.37배, 4.12배였습니다. 입력·캐시·출력·추론 출력의 회차별 원값과 최솟값–최댓값은 상세 보고서에서 확인할 수 있습니다.

### 프론트엔드 결과물

외부 채점은 모델 종료 후 동일한 도메인 12개·API 10개·브라우저 11개 사례를 실행했습니다. 아래 통과 수는 세 번의 합계입니다. 브라우저 사례에는 접근 가능한 이름, 합계·전송 값, 입력 경계, 요청 중 비활성화, 오류 후 재시도, 키보드 제출, 360px 가로 넘침을 포함합니다.

| 요청 모델 | 조건 | 도메인/36 | API/30 | 브라우저/33 | 전체/99 | 원본 검사 명령/18 | FS 기록 complete/3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GPT-6 Astra | 일반 | 36 | 30 | 33 | 99 | 18 | 해당 없음 |
| GPT-6 Astra | FS | 36 | 30 | 31 | 97 | 18 | 3 |
| GPT-6 Sol | 일반 | 36 | 30 | 33 | 99 | 15 | 해당 없음 |
| GPT-6 Sol | FS | 36 | 30 | 33 | 99 | 15 | 3 |
| GPT-6 Luna | 일반 | 36 | 30 | 33 | 99 | 13 | 해당 없음 |
| GPT-6 Luna | FS | 36 | 30 | 33 | 99 | 12 | 1 |

원본 검사 명령은 lint·typecheck·경계 검사·unit·build·E2E 여섯 가지입니다. 외부 채점용 사본에는 원본 설정과 기존 테스트를 복원하며, 추가한 테스트는 남습니다. Sol의 E2E 실패는 합계 `output`과 성공 메시지의 `status` 선택자 충돌, Luna의 일부 unit 실패는 오류 문구 변경에 따른 기존 정규식 불일치였습니다. 이를 주문 동작 실패나 검사 약화와 동일시하지 않습니다. 기존 검사 파일은 Astra가 0/6회, Sol과 Luna가 각각 6/6회 수정했습니다.

Astra FS 세 번째 결과의 고정 점수는 **31/33**입니다. 두 사례가 `Total`을 기본 `status` 역할로 찾는데, 구현은 이름이 `Total`인 `<output role="group" aria-live="polite">`를 사용했습니다. 프롬프트는 output 요소와 접근 가능한 이름을 요구했으므로 이 점수에는 채점기의 더 강한 역할 가정이 섞여 있습니다. 동일한 제품 코드에서 역할 제한만 제거한 [사후 선택자 진단](test/evals/fs-comparison/results/2026-09-30T020539/20-gpt-6-astra-fs-r3/selector-diagnostic/score.json)은 33/33이었습니다. 이 진단은 모델 재실행 없이 수행했으며, 본 비교의 고정 점수는 바꾸지 않았습니다.

관측한 브라우저 `pageerror`는 모든 집계 실행에서 0건이고, production build의 모든 정적 JS gzip 합계는 276.22–276.42 KiB였습니다. 이는 초기 페이지 전송량·Lighthouse·WCAG 전체 준수 점수가 아닙니다.

Luna FS의 두 실행은 각각 `blocked`, `in-progress`로 남았습니다. 정책에 스크립트 본문 대신 `npm run …`을 등록해 검사가 거부된 상태였습니다. FS 완료 기록과 외부 기능 검사는 서로 다른 지표입니다. FS 9회에서는 계획·검토·검증 기록이 생성됐고, 도구 인자·기록 연결 오류에 따른 재시도도 토큰과 시간에 포함됐습니다.

### 해석과 실험 한계

**이번 단일 과제에서는 FS의 기능 점수 개선이나 토큰 절감이 관찰되지 않았습니다.** FS 절차와 기록 작성의 추가 사용량이 컸습니다. 다만 대부분의 기능 검사가 만점인 작은 과제여서, 더 복잡한 변경의 결함 탐지나 누적 지식·기록 재사용의 효과까지 판단할 수는 없습니다. 세 번의 반복, 고정된 순차 실행, 서버 캐시·부하·샘플링의 미통제를 고려해야 합니다. 실험 설계·채점 담당 세션과 사전 점검의 토큰은 표에 포함하지 않았습니다.

실행 중 임시 FS 문서 8개 유실이 관측된 Astra 세 번째 일반/FS 쌍은 원자료를 보존하고 재측정했습니다. 삭제 원인은 미확인입니다. 최종 표는 18회이며, 제외한 2회는 상세 보고서에 별도 표시합니다. 재측정은 저장소 내부 작업 폴더와 매 실행 전후 문서 해시 검사를 사용했습니다. 이전 실행의 스냅샷 검사는 간헐적이었다는 한계와 사전 파일럿 제외도 [실험 기록](test/evals/fs-comparison/README.md#2026-09-30-실행-중-예외)에 명시했습니다. 모델의 정책 작성 오류·미완료·채점 실패를 이유로 재실행하지 않았습니다.

## 개인정보 보호와 안전

- 저장소 파일과 가져온 자료는 신뢰할 수 없는 입력으로 취급합니다.
- 외부 도구 설치, GitHub 이슈 생성, 댓글 작성에는 명시적 승인이 필요합니다.
- 피드백에서 민감 정보를 제거하며, 사용 정보 수집이나 백그라운드 업로드는 하지 않습니다.
- 검증은 발견되었거나 정책에 명시된 비감시 패키지 스크립트를 실행합니다. 필수 스크립트 누락·변경은 실패로 처리합니다.
- 검증 중 제안된 제품 코드 수정은 사용자의 사전 승인 없이 적용하지 않습니다.
