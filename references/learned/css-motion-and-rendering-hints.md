# CSS 모션과 렌더링 힌트

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

상태 전환·스크롤 연동 모션을 구현하거나 will-change를 붙여도 애니메이션이 느릴 때.

## 판단에 사용할 내용

transition·keyframes·transform·timeline의 역할과 비용을 구분하고 해당 속성 지원과 실제 렌더링을 확인한다.

## 적용하지 않는 경우

will-change나 transform만으로 GPU 가속·성능 향상을 보장하지 않는다.

## 개념과 근거

transition은 상태 사이 변화, keyframes는 애니메이션 시퀀스, easing은 변화율을 정의한다. transform은 정상 흐름을 바꾸지 않고 좌표계를 변환하며 합성 순서에 영향을 받는다. motion path는 경로 진행, scroll timeline은 스크롤 진행, View Transition은 문서 상태 전환이라는 서로 다른 기준을 사용한다. will-change는 준비를 위한 힌트이므로 성능 향상이나 GPU 승격을 보장하지 않는다. 최신 이산 값·intrinsic 크기 전환의 가능성을 오래된 auto 전환 경고만으로 단정하지 않으며 개별 속성의 지원과 실제 모션 요구를 추가 확인한다.

## 검토한 출처

- [CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animations)
- [Using CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animations/Using)
- [CSS easing functions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Easing_functions)
- [CSS motion path](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Motion_path)
- [CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)
- [CSS transforms](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transforms)
- [Using CSS transforms](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transforms/Using)
- [CSS transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions)
- [Using CSS transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions/Using)
- [CSS view transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/View_transitions)
- [CSS will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Will_change)

적용 범위: 2026-09-21 MDN CSS 97개 등록 URL의 개요와 표시 본문 앞부분. 전체 하위 가이드·모든 속성 계약·호환성 표를 완독한 자료가 아니다.

기능 분류와 확인된 기본 관계를 concept로 반영했다. 목록의 모든 기능이 구현되었다고 해석하지 않는다. 세부 문법·예외·접근성·실행 성능은 기능을 채택할 때 해당 하위 문서와 대상 환경에서 확인한다.
