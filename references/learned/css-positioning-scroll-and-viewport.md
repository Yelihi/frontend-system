# CSS 위치·스크롤·뷰포트

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

z-index를 높여도 가려지거나 중첩 스크롤·모바일 안전 영역·컨테이너 반응형 배치가 어긋날 때.

## 판단에 사용할 내용

쌓임 맥락, 넘침·scroll chaining·snap·anchoring과 viewport·container 조건을 나누어 원인을 좁힌다.

## 적용하지 않는 경우

전역 z-index 크기 비교나 새 앵커 기능의 일괄 도입으로 해결하지 않는다.

## 개념과 근거

z-index는 쌓임 맥락 내부에서 의미가 있고 자식 맥락은 부모에서 하나의 단위다. 넘침 처리와 경계 이후 scroll chaining, 정지 위치를 정하는 snap, 레이아웃 변화에 대응하는 anchoring은 별개 기능이다. 뷰포트 조건과 컨테이너 조건을 구분하고 env 값으로 안전 영역 같은 장치 공간을 고려한다. 앵커 배치는 대상 요소와 넘침 대체 위치를 연결한다. 스크롤바 색·폭을 바꿀 때 조작 영역과 대비를 유지한다. 원형 화면·XR·새 앵커 기능은 해당 플랫폼 지원을 별도 확인한다.

## 검토한 출처

- [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning)
- [CSS conditional rules](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Conditional_rules)
- [CSS containment](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment)
- [CSSOM view](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/CSSOM_view)
- [CSS environment variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Environment_variables)
- [CSS media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries)
- [CSS overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Overflow)
- [CSS overscroll behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Overscroll_behavior)
- [CSS positioned layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout)
- [Stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context)
- [CSS round display](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Round_display)
- [CSS scroll anchoring](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_anchoring)
- [CSS scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap)
- [CSS scrollbars styling](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scrollbars_styling)
- [CSS viewport](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Viewport)
- [WebXR DOM overlays](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/WebXR_DOM_overlays)

적용 범위: 2026-09-21 MDN CSS 97개 등록 URL의 개요와 표시 본문 앞부분. 전체 하위 가이드·모든 속성 계약·호환성 표를 완독한 자료가 아니다.

기능 분류와 확인된 기본 관계를 concept로 반영했다. 목록의 모든 기능이 구현되었다고 해석하지 않는다. 세부 문법·예외·접근성·실행 성능은 기능을 채택할 때 해당 하위 문서와 대상 환경에서 확인한다.
