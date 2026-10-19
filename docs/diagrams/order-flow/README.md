# 실제 주문 화면·흐름 예제

[탐색형 HTML](index.html) · [README 이미지](../order-flow.png)

입력은 [저장된 주문 분석의 화면 자료](../../proposals/component-flow-explorer/observed/view-model.json)입니다.
기준 커밋과 흐름 해시, 코드·콜백 근거는
[분석 기록](../../proposals/component-flow-explorer/observed/proposal.md)에 있습니다.
`assets.json`의 네 화면은 기존 Next.js 예제를 실행해 얻은
[검증된 캡처](../../proposals/component-flow-explorer/observed/verification.json)에서
옮겼습니다. 화면을 임의로 다시 그린 이미지가 아닙니다.

저장소 루트에서 다시 렌더링할 수 있습니다.

```sh
node skills/fs-plan-visualize/scripts/build.mjs \
  docs/proposals/component-flow-explorer/observed/view-model.json \
  docs/diagrams/order-flow
```

결과의 `captureCoverage`는 `page:idle`, `page:pending`, `page:error`,
`page:success` 모두 `captured`여야 합니다. 원본 기록이나 렌더러가 바뀌면 캡처
바인딩 해시가 어긋날 수 있습니다. 실제 화면과 상태를 확인하고 새 자산을 연결하세요.
README 이미지는 HTML의 실패·재시도 시나리오 5단계에서 찍은 브라우저 화면입니다.
