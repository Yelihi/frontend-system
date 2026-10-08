# 실제 프로젝트의 흐름을 분석하고 보기

FS는 **호스트 AI가 실제 코드를 추적한 기록**을 검증하고 HTML로 출력합니다.
HTML 템플릿이 임의의 프로젝트를 스스로 해석하는 것은 아닙니다. 사용자가 JSON이나
HTML을 직접 작성할 필요는 없습니다. 분석·기록 작성은 AI, 인용/버전 검사와 화면
생성은 FS 코드가 맡습니다.

## 지금 확인할 수 있는 실제 코드 기반 결과

| 원본 프로젝트 | 생성된 HTML | 범위 |
| --- | --- | --- |
| [v12 주문 소스](../test/evals/fs-comparison/v12/projects/request/src/pages.ts) | [주문 흐름](flows/order-workspace.html) | 9개 블록, 22개 관계, 8개 시나리오, 27개 코드 인용 |
| [v12 티켓 소스](../test/evals/fs-comparison/v12/projects/styles/src/Pages.tsx) | [티켓 선택 흐름](flows/ticket-selection.html) | 5개 블록, 8개 관계, 2개 시나리오, 9개 코드 인용 |

이들은 이전 비교에 사용한 프로젝트의 **현재 소스**에서 생성했습니다. 이전 모델이
만든 계획을 구현한 결과나, 배포된 애플리케이션의 실행 기록은 아닙니다.
기존 [표현 예제](examples/frontend-flow.html)는 별도의 가상 설계이며 실제 분석의 대체물이 아닙니다.

저장소 터미널에서 여세요. HTML은 독립적인 파일이라 다른 기기로 복사해도 됩니다.

```sh
open docs/flows/order-workspace.html
open docs/flows/ticket-selection.html
```

상단 이벤트 → 오른쪽 단계 버튼 → 주황색 출발/도착 블록 → **선택한 관계의 코드 근거**
순으로 확인합니다. 각 블록의 `근거`를 펼치면 파일·줄 번호·인용이 나옵니다.
하단에는 프로젝트 경로, 분석 해시, 생성 시각, 대상 파일, 탐색 범위, 미확인이 나옵니다.
전체 영향 범위는 청록색입니다. `이전/다음 단계`는 기록을 탐색하며 앱 함수를 실행하지 않습니다.

주문 흐름의 `저장 중 추가 입력`에서는 오래된 성공이 새 입력의 dirty를 지우는 현상을,
`저장 성공`에서는 성공 후 기존 오류 문구를 지우지 않는 현상을 그대로 표현했습니다.
원래 테스트 앱의 코드는 수정하지 않았습니다. 티켓 흐름의 여러 소비자 단계는
의존 관계 설명 순서이며 React의 렌더·DOM 커밋 실행 순서를 확정하지 않습니다.

## 내 프로젝트에서 처음 요청하기

업데이트된 FS 스킬/MCP가 연결된 대상 프로젝트에서 다음과 같이 요청합니다.
경로와 분석할 화면만 바꾸면 됩니다.

> $fs-plan-visualize 이 프로젝트의 주문 편집 화면과 연결된 목록 화면의 **현재 구현 흐름**을
> 분석해 주세요. 이벤트부터 실제 콜백·호출 인자·검증·상태/캐시 변경·HTTP·오류 표시·
> 구독 해제까지 따라가고, 코드 위치와 인용을 연결해 주세요. 확인하지 못한 관계는
> 명시하고, 제안 구조와 현재 동작을 섞지 마세요. 분석을 저장한 뒤 실제 코드 기반
> HTML을 생성해 주세요. 제품 코드는 변경하지 말고 project.md는 아직 갱신하지 마세요.

짧게 요청해도 됩니다.

```text
$fs-plan-visualize 주문 편집·목록 화면의 실제 흐름을 HTML로 보여주세요.
$fs-plan-visualize 주문 저장 코드 변경을 반영해 기존 그림을 갱신해주세요.
```

이 명령은 AI 대화에서 선택하는 전용 스킬이며, 터미널 명령과는 다릅니다.
분석·출력은 기존 FS 도구를 공유합니다. `fs-plan`은 설계 논의와 계획 작성,
`fs-plan-visualize`는 흐름 분석과 시각화 전달을 담당합니다. 새 스킬은 이 저장소의
플러그인 패키지에 포함되며, 이전 설치본에는 업데이트 전까지 나타나지 않습니다.

처음에는 **한 페이지와 그 이벤트가 영향을 주는 소비자** 단위로 시작하는 것이 좋습니다.
대규모 프로젝트는 페이지/사용자 흐름별로 분리합니다. UI에 없는 store/cache나
로딩 상태를 형식에 맞추려고 만들어 넣지 않습니다. 라우터가 없으면 함수/연결 경계로
표현하고 실제 페이지 마운트 관계가 미확인임을 표시합니다.

AI의 작업 순서는 다음과 같습니다.

1. `get_project_analysis`로 현재 기록과 변경 여부를 조회합니다. 없거나 오래된 범위만
   분석합니다. manifest/설정 → 엔트리/라우트 → 실제 호출·소비자 순서로 읽습니다.
2. 코드의 현재 동작을 `basis: observed`로 작성합니다. 모든 블록·관계에 근거를 넣고
   호출 인자, 변경 대상, 반환/오류 소비자, 조건과 cleanup을 함께 추적합니다.
   필요하면 기존 검사나 작은 실행 검증으로 핵심 관계를 확인합니다.
3. `save_project_analysis`가 인용의 존재/위치, 그래프 연결과 원본 해시를 검사합니다.
   저장했다고 AI 해석의 의미가 자동 증명되는 것은 아닙니다.
4. `render_project_flow(id, expectedHash)`로 HTML을 생성합니다. 기본값은 **현재 원본과
   일치하는 observed 기록**만 허용합니다. stale이면 변경 범위를 재분석해야 합니다.
5. 반환된 실제 파일 경로를 제공하고, 분석 범위·제외·실행 검증 여부를 설명합니다.
   개선점은 별도의 finding/plan으로 연결합니다. 그림 생성을 위해 코드를 고치지 않습니다.

출력은 대상 프로젝트의 `.frontend-system/diagrams/<flow-id>.html`입니다.
분석은 `.frontend-system/analysis/flow/<flow-id>.json`, 버전은 `analysis/history/`에 저장됩니다.
시각화만 요청하면 `project.md`를 만들거나 갱신하지 않습니다. 이후 저장된 FS 계획을
요청할 때 기준 문서가 전혀 없으면 최초 분석·생성을 포함합니다. 기존 기준 문서는
명시적으로 요청할 때만 갱신하며, 문서 쓰기를 금지한 경우에는 계획 초안만 전달합니다.

## 코드 변경 후 갱신하기

> $fs-plan-visualize 주문 저장 코드가 바뀌었습니다. 기존 분석의 freshness와 변경 파일을 확인하고,
> 영향을 받는 호출부·오류·구독 흐름을 다시 분석한 뒤 HTML을 갱신해 주세요.
> 전체 프로젝트를 다시 읽기 전에 재사용 가능한 기록부터 확인해 주세요.

오프라인 HTML은 **생성 당시의 스냅샷**입니다. 열기만 해서는 최신 코드를 확인하지 않습니다.
`current`도 선언한 파일/탐색 범위의 일치이며 프로젝트 전체의 완전성 보증은 아닙니다.
명시한 의존 파일뿐 아니라 탐색 범위의 **기존 코드/설정/데이터 파일 내용**과 파일 추가·삭제를
확인합니다. 기존 파일이 새 호출부가 되어도 stale로 전환합니다. 안전하게 넓게 감지하므로
무관한 파일 변경도 재검토를 유발할 수 있습니다. 변경 이유를 먼저 보고 관련 코드만 조사하세요.
이전 형식의 기록은 내용 해시가 없어 재분석·저장 전까지 stale입니다.
관련 기록은 한 번에 조회하면 요청 안에서 파일 목록·해시를 공유합니다. 다음 요청에서는
다시 확인하므로 이전 조회의 해시 캐시로 변경을 놓치지 않습니다.
범위 밖 소비자, 동적 import, 런타임 설정은 별도로 추적하거나 한계에 남겨야 합니다.

설계 제안이나 과거 기록을 의도적으로 보고 싶을 때만 `allowUnverified: true`를 사용합니다.
이 옵션으로 stale/proposed를 current/observed로 바꾸지는 않습니다. 제안→실제 구현 전환은
구현 코드를 다시 읽고 새 observed 기록을 저장해야 합니다.

## CLI로 저장/출력하기

아래는 **FS 저장소에서 실행**하는 재현 경로입니다. 스킬 대화 대신 CLI로 새 분석을
자동 생성하는 명령은 아닙니다. AI가 준비한 근거 포함 JSON을 검사·저장하거나,
이미 저장된 기록을 다시 출력할 때 사용합니다. 저장소 빌드와 설치된 플러그인 캐시
갱신은 별개이므로 기존 플러그인에 새 도구 옵션이 없다면 이 경로로 먼저 확인합니다.

```sh
npm run build
npm run fs -- flow-list /absolute/path/to/project
npm run fs -- flow-save /absolute/path/to/project .frontend-system/drafts/order-flow.json
npm run fs -- flow-render /absolute/path/to/project order-flow --expected-hash <저장_결과의_hash>
```

`flow-save` 입력은 `{expectedHash:null, record:{kind:"flow", data:...}}`이고, 갱신 시
현재 hash를 넣습니다. 정확한 형식은 `node bundle/tool-help.mjs save_project_analysis`로
읽습니다. `flow-list`의 `nextOffset`이 있으면 `--offset`으로 다음 목록을 조회합니다.
HTML 시작 시나리오는 `--scenario <id>`, Mermaid는 `--format mermaid`로 선택합니다.
영어 조작 화면은 `--language en` 또는 MCP `language: "en"`을 사용합니다(기본 `ko`).
분석 내용과 코드 인용은 번역하지 않습니다. 생성된 HTML을 직접 수정하지 말고 분석
기록이나 출력 옵션을 바꿔 다시 생성해야 반환된 파일 해시와 일치합니다.
`--allow-unverified`는 제안/오래된 분석을 명시적으로 미리보기할 때만 사용합니다.

이번 두 실제 소스의 산출물을 재현하려면 다음을 실행합니다.

```sh
npm run build
node scripts/render-observed-flows.mjs
```

이 스크립트는 검토한 [분석 데이터](flows/order-workspace.json)를 MCP에 저장하고 출력합니다.
[source-hashes.json](flows/source-hashes.json)의 원본 버전과 다르면 중단합니다. 원본이
바뀌면 먼저 흐름을 재검토해야 하며, 실패를 없애려고 해시만 갱신하면 안 됩니다.
테스트 프로젝트에 생성한 `.frontend-system` 기록은 비교 실험 입력에서 제외됩니다.

## 검증 범위

[내보내기 기록](flows/export-report.json)은 원본 해시, 저장 버전, 출력 경로와 소스 불변을 남깁니다.
[test/observed-flow.test.ts](../test/observed-flow.test.ts)는 실제 테스트 프로젝트의 TS에서
타입을 지운 모듈을 실행합니다. mock HTTP와 EventTarget으로 검증 실패 시 무효과,
낙관적 변경, 401/500 복원, 호출자 headers 변경, 새 입력 dirty 문제, 오류 표시,
cleanup과 외부 store 구독 해제를 확인합니다. 이 검사는 실제 서버/React 렌더를 실행하지 않습니다.

[test/project-flows.test.ts](../test/project-flows.test.ts)는 인용·그래프·최신성 검증 외에
stale/proposed의 기본 출력 거부, 명시적 미리보기, 이전 HTML 보존과 시나리오 선택을 검사합니다.
시각화는 분석의 설명 도구입니다. 완전한 호출 그래프 추출기, 런타임 profiler 또는
새로운 AI 비교 성능 입증으로 해석하지 않습니다.


2026-10-07 검증: typecheck/lint 및 **124개 테스트 통과**, CLI 목록·출력·초기 시나리오,
패키지 배포 검사와 스킬 형식 검사를 확인했습니다. [검증 기록](flows/verification.json)을 참고하세요.
브라우저 도구의 보안 정책이 로컬 HTML 주소 탐색을 차단하여 **이번 변경 후 시각적
렌더링/브라우저 상호작용은 미검증**입니다. 위 `open` 명령으로 직접 확인할 수 있습니다.
기존 가상 예제의 브라우저 검사 결과를 실제 프로젝트 그림의 검사로 사용하지 않습니다.

별도 새 세션의 실제 분석·변경·계획 검증과 실패/비용은 [v13 기록](../test/evals/fs-comparison/v13/README.md)에 보존합니다.
