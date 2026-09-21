# CSS 캐스케이드와 값 결정

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

스타일이 덮어써지거나 !important 없이 CSS 우선순위 충돌을 해결해야 할 때.

## 판단에 사용할 내용

출처·중요도·레이어·구체성·상속과 단축 속성의 생략 값을 순서대로 비교해 최종 값의 원인을 찾는다.

## 적용하지 않는 경우

선택자 구체성 숫자만 비교하거나 모든 충돌에 !important를 붙이는 근거가 아니다.

## 개념과 근거

스타일 충돌은 선택자 숫자만으로 결정하지 않는다. 출처·중요도·레이어가 먼저 정해지고 구체성·스코프 근접성·선언 순서가 해당 경쟁 범위에서 작용한다. 상속되는 속성과 초기값으로 돌아가는 속성을 구분한다. 단축 속성의 생략 값도 이전 선언을 덮을 수 있으므로 하위 속성까지 확인한다. -- 사용자 정의 속성의 재사용과 @property 등록의 타입·상속·초기값 메타데이터를 구분한다. specified·computed·used·actual 값은 같은 단계의 값이 아니다.

## 검토한 출처

- [CSS cascading and inheritance](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade)
- [Inheritance](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Inheritance)
- [Introduction to the CSS cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Introduction)
- [CSS property value processing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Property_value_processing)
- [Shorthand properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Shorthand_properties)
- [Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Specificity)
- [CSS custom properties for cascading variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables)
- [CSS properties and values API](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Properties_and_values_API)

적용 범위: 2026-09-21 MDN CSS 97개 등록 URL의 개요와 표시 본문 앞부분. 전체 하위 가이드·모든 속성 계약·호환성 표를 완독한 자료가 아니다.

기능 분류와 확인된 기본 관계를 concept로 반영했다. 목록의 모든 기능이 구현되었다고 해석하지 않는다. 세부 문법·예외·접근성·실행 성능은 기능을 채택할 때 해당 하위 문서와 대상 환경에서 확인한다.
