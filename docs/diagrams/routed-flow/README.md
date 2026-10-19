# 두 라우트 주문 흐름 예제

이 HTML은 [실행 가능한 주문 앱](../../examples/routed-order-app/)의 `/`와
`/activity/`를 연결합니다. 주문 저장 후 활동 기록 페이지로 이동하는 실제 브라우저
동작을 확인하고, `idle`·`saved`·`populated`·`empty` 화면을 Playwright로 캡처했습니다.
예제는 백엔드 대신 `localStorage`를 사용합니다. 화면 이미지는 디자인 시안이나
렌더러의 빈 대체 화면이 아닙니다.

| 자료 | 역할 |
| --- | --- |
| [flow.json](flow.json) | 라우트 이동과 단계별 호출·상태 변경 |
| [view-model.json](view-model.json) | 코드 노드, 페이지, 화면 상태, 근거 |
| [source-model.mjs](source-model.mjs) | 확인한 예제 코드를 위 두 자료로 기록하는 입력 |
| [captures/](captures/) | 브라우저에서 실행해 얻은 네 화면과 영역 좌표 |
| [assets.json](assets.json) | 화면 이미지를 렌더러에 연결한 자료 |
| [index.html](index.html) | FS 렌더러가 생성한 탐색 화면 |

`view-model.json`의 기준 커밋은 예제 앱을 고정한 `40b264f`입니다. 현재 예제
코드가 이 기준과 달라지면 흐름·근거·화면을 다시 확인해야 합니다. 컴포넌트와
`localStorage`의 관계는 코드에서 확인한 흐름이며, 실행 중의 호출 추적기가 수집한
결과라고 주장하지 않습니다.

저장소 루트에서 다음 순서로 화면과 HTML을 다시 만들 수 있습니다. 브라우저 설치는
`test/fixtures/frontend`의 Playwright 설정을 사용합니다.

```sh
node docs/examples/routed-order-app/capture.mjs
node docs/diagrams/routed-flow/source-model.mjs
node skills/fs-plan-visualize/scripts/build.mjs docs/diagrams/routed-flow/view-model.json docs/diagrams/routed-flow
node docs/diagrams/routed-flow/assemble-assets.mjs
node skills/fs-plan-visualize/scripts/build.mjs docs/diagrams/routed-flow/view-model.json docs/diagrams/routed-flow
```

첫 빌드가 기록한 해시를 네 화면의 `assets.json`에 연결한 뒤 마지막 빌드에서
`captureCoverage: complete`를 확인합니다. 실제 페이지의 다른 단계로 이동해도
해당 페이지의 마지막 캡처 상태를 보여주는 구간이 있으므로, 단계 설명과 화면 상태를
함께 읽으세요.

HTML은 저장소 루트에서 `python3 -m http.server 4173`을 실행한 뒤
`http://localhost:4173/docs/diagrams/routed-flow/`에서 열 수 있습니다.
처음 라우트 개요에서 페이지를 선택하고, 연결된 흐름을 열어 각 단계를 클릭합니다.
