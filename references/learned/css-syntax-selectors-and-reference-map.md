# CSS 문법·선택자·레퍼런스 탐색

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

CSS 선언이 무시되거나 중첩 선택자·의사 요소가 기대한 대상을 선택하지 않을 때.

## 판단에 사용할 내용

허용 값 문법, 선택 대상과 관계, 함수형 선택자·값 함수의 차이를 확인하고 세부 지원 문서로 이동한다.

## 적용하지 않는 경우

MDN 목록에 있다는 이유만으로 믹스인·결합자·신규 문법이 대상 브라우저에 구현되었다고 보지 않는다.

## 개념과 근거

속성 이름과 값의 짝이 선언을 만들며 허용 값은 속성별 문법을 따른다. dimension에서 수와 단위를 붙이고 문자열·식별자의 따옴표 요구를 구분한다. 선택자는 대상, 결합자는 관계, 의사 클래스는 상태 등의 조건, 의사 요소는 렌더링 부분을 표현한다. 값 함수와 함수형 선택자는 역할이 다르다. CSS nesting은 브라우저 해석이며 전처리기 문법과 동일하다고 가정하지 않는다. MDN 목록에 등장하는 기능이 모두 구현된 것은 아니다. 특히 이 범위에서 CSS 믹스인과 column combinator는 미지원으로 안내되어 있으므로 기능별 문서를 추가 확인한다.

## 검토한 출처

- [CSS guides](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides)
- [CSS custom functions and mixins](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Custom_functions_and_mixins)
- [CSS namespaces](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Namespaces)
- [CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Nesting)
- [CSS pseudo-elements](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Pseudo-elements)
- [CSS selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Selectors)
- [CSS syntax](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Syntax)
- [Introduction to CSS syntax: declarations, rulesets, and statements](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Syntax/Introduction)
- [CSS values and units](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Values_and_units)
- [Numeric data types](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Values_and_units/Numeric_data_types)
- [Textual data types](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Values_and_units/Textual_data_types)
- [CSS: Cascading Style Sheets](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [CSS reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference)
- [CSS at-rules](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules)
- [CSS properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties)
- [CSS selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors)
- [CSS combinators](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/Combinators)
- [Pseudo-classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/Pseudo-classes)
- [Pseudo-elements](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/Pseudo-elements)
- [CSS values](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values)
- [CSS data types](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/Data_types)
- [CSS value functions](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/Functions)

적용 범위: 2026-09-21 MDN CSS 97개 등록 URL의 개요와 표시 본문 앞부분. 전체 하위 가이드·모든 속성 계약·호환성 표를 완독한 자료가 아니다.

기능 분류와 확인된 기본 관계를 concept로 반영했다. 목록의 모든 기능이 구현되었다고 해석하지 않는다. 세부 문법·예외·접근성·실행 성능은 기능을 채택할 때 해당 하위 문서와 대상 환경에서 확인한다.
