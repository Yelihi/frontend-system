# 페이지 구성과 이벤트 영향 보기

**실제 프로젝트의 흐름은 [주문 HTML](../flows/order-workspace.html), [티켓 HTML](../flows/ticket-selection.html)과 [사용 가이드](../project-flow-guide.md)를 보세요.** 아래 파일은 가상 설계 예제입니다.

`frontend-flow.json` 하나로 `frontend-flow.html`과 `frontend-flow.mmd`를 생성합니다.
실제 저장소를 자동 분석한 결과가 아니라, 표기법을 확인하기 위한 **제안된 주문 편집 예제**입니다.

```sh
npm run build
node scripts/render-flow-demo.mjs
open docs/examples/frontend-flow.html
```

- 페이지 안에 컴포넌트를 넣고 각 카드에 props/state/events/lifecycle을 표시합니다.
- 외부 store/cache/module/service는 페이지 밖에 둡니다.
- 이벤트 선택은 영향 범위를 청록색으로, 단계 선택은 출발·도착을 주황색으로 표시합니다.
- 화살표는 현재 단계의 관계입니다. 모든 관계를 동시에 그려 생기는 혼잡을 줄였습니다.
- 실패·유효성 오류·취소를 성공 흐름과 별도 시나리오로 확인할 수 있습니다.
- 구독자 알림과 실제 React 렌더/DOM 커밋은 구분합니다. 미마운트 페이지가 즉시 갱신된다고 하지 않습니다.
- 근거를 접어서 볼 수 있습니다. 관측 흐름에는 코드 인용이, 이 예제에는 제안 표기가 나옵니다.

C4의 경계와 동적 상호작용 개념을 참고했지만, 이 카드는 C4 표준 기호가 아닙니다.
[Mermaid flowchart](https://mermaid.js.org/syntax/flowchart.html)의 subgraph로 중첩을
표현할 수 있고 [C4 dynamic diagram](https://c4model.com/diagrams/dynamic)은 번호로
상호작용을 표현합니다. 프론트엔드 상태·이벤트와 단계별 탐색은 별도 표현을 더했습니다.

브라우저 검증: `node scripts/check-flow-demo.mjs`.
1560×1100 및 390×844에서 이벤트/단계 변경, 외부 효과가 없는 경로, 스크립트 오류와
모바일 가로 넘침을 확인합니다. 저장소의 기존 Playwright 설치를 재사용합니다.

Mermaid 11.12.0 브라우저 번들로 실제 SVG 렌더도 확인했습니다. 재검증하려면 해당
버전의 로컬 번들을 `node scripts/check-flow-mermaid.mjs /path/to/mermaid.min.js`에
전달합니다. FS 런타임에는 Mermaid 의존성을 추가하지 않았습니다. HTML은 외부
스크립트·폰트 없이 열리고, Mermaid SVG/PNG도 네트워크 없이 볼 수 있습니다.

관련 파일: `src/application/flow-schema.ts`(기록 형식), `project-flows.ts`(저장/최신성),
`flow-view.ts`(투영), `references/workflows/project-flow-analysis.md`(AI 분석 순서).
