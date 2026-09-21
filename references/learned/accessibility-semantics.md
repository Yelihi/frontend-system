# 접근성의 역할·이름·상태와 동작

검토일: 2026-09-21 · 분류: concept · 근거: 공개 문서와 검토한 원본 요약

## 참고 상황

role이나 aria-disabled를 추가했는데 키보드 조작·비활성 상태가 화면과 다를 때.

## 판단에 사용할 내용

실제 태그의 기본 동작과 계산된 역할·이름·상태를 대조해, 의미 전달과 이벤트 구현 중 어디가 빠졌는지 찾는다.

## 적용하지 않는 경우

ARIA 속성 존재나 의미 기반 테스트 통과를 전체 접근성 준수의 증거로 사용하지 않는다.

## 개념과 근거

접근성에는 시각·청각·운동·인지 등 다양한 이용 조건이 포함된다. 역할은 요소의 종류, 이름은 대상이나 목적, 상태는 선택·펼침 등의 현재 정보를 전달한다. 이 정보가 실제 조작 방식과 일치하는지가 핵심이다. [MDN 개요](https://developer.mozilla.org/en-US/docs/Web/Accessibility), [기초 가이드](https://frontend-fundamentals.com/a11y/basic-guide/overview.html).

HTML의 의미는 태그 이름 하나만으로 결정되지 않는다. 예를 들어 href가 있는 a는 링크이며 input의 역할은 type 등에 따라 달라진다. 네이티브 요소에는 이미 의미와 동작이 있는 경우가 많다. role은 의미를 전달하지만 이벤트 처리나 포커스 이동을 구현하지 않는다. [역할 설명](https://frontend-fundamentals.com/a11y/basic-guide/role.html).

aria-disabled는 비활성 상태를 알릴 뿐 클릭·키보드 동작을 막지 않는다. HTML disabled의 동작과 구별해야 한다. checked/selected/expanded도 화면 상태 및 동작과 맞지 않으면 서로 다른 정보를 주게 된다. live region은 변화 전달 수단이지만 구체적인 낭독 시점과 문자열은 환경 의존적이다. [MDN aria-disabled](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled), [상태 설명](https://frontend-fundamentals.com/a11y/basic-guide/state.html).

검토할 질문: 실제 렌더링 태그와 속성은 무엇인가, 계산된 역할·이름·상태는 무엇인가, 포커스 및 키보드 조작은 가능한가? 의미 기반 테스트의 통과만으로 전체 접근성이 입증되지는 않는다.

원문의 낭독 순서·단어를 모든 스크린리더의 계약으로 취급하지 않는다. 가이드의 네 교육 주제를 WCAG 네 원칙과 동일시하지 않는다. 이 개념 참조는 준수 인증이나 새 공용 필수 규칙이 아니다.

원본 catalog ID: `frontend-fundamentals-accessibility-getting-started`, `frontend-fundamentals-accessibility-why-accessibility`, `frontend-fundamentals-accessibility-principles`, `frontend-fundamentals-accessibility-basics-overview`, `frontend-fundamentals-accessibility-basics-roles`, `frontend-fundamentals-accessibility-basics-states`, `mdn-web-accessibility-overview`.

