# Shadow DOM 스타일 경계

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

외부 CSS가 Shadow DOM 내부에 적용되지 않거나 중첩 컴포넌트의 테마 지점을 노출해야 할 때.

## 판단에 사용할 내용

host·slotted·part·exportparts와 컴포넌트가 공개한 스타일 경계를 대조한다.

## 적용하지 않는 경우

일반 선택자가 모든 shadow 경계를 통과한다고 가정하거나 비공개 내부 구조에 의존하지 않는다.

## 개념과 근거

선택자가 shadow tree 경계를 일반 문서 트리처럼 통과한다고 가정하지 않는다. host·slotted 관련 선택은 컴포넌트 경계에서 필요한 연결 지점이며, 외부 ::part 스타일은 컴포넌트가 노출한 part를 대상으로 한다. exportparts가 필요한 중첩 구조와 컴포넌트의 공개 스타일 계약을 함께 확인한다.

## 검토한 출처

- [CSS scoping](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scoping)
- [CSS shadow parts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Shadow_parts)

적용 범위: 2026-09-21 MDN CSS 97개 등록 URL의 개요와 표시 본문 앞부분. 전체 하위 가이드·모든 속성 계약·호환성 표를 완독한 자료가 아니다.

기능 분류와 확인된 기본 관계를 concept로 반영했다. 목록의 모든 기능이 구현되었다고 해석하지 않는다. 세부 문법·예외·접근성·실행 성능은 기능을 채택할 때 해당 하위 문서와 대상 환경에서 확인한다.
