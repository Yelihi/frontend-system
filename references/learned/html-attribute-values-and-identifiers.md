# HTML 속성 값과 식별자

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

HTML 속성에 false를 넣어도 동작이 켜지거나 id·class·data-* 선택이 예상과 다를 때.

## 판단에 사용할 내용

불리언·열거 값, 문서 식별자와 선택자 이스케이프, 사용자 데이터의 역할을 구분한다.

## 적용하지 않는 경우

전역 속성이 모든 요소에서 같은 동작을 하거나 data-*가 접근성·타입 검증을 제공한다고 가정하지 않는다.

## 개념과 근거

전역 속성이라는 말은 모든 요소에서 같은 동작을 보장하지 않는다. 불리언 속성은 존재 여부를, 열거 속성은 정의된 문자열 값을 해석한다. class는 여러 토큰, id는 문서 내 단일 고유 식별자이며 선택자로 사용할 때 CSS 문법과 이스케이프를 확인한다. data-*는 사용자 정의 데이터 저장 통로이지 접근성 의미나 타입 검증을 자동으로 만들지 않는다. style 선언과 콘텐츠의 의미를 분리한다.

## 검토한 출처

- [HTML: HyperText Markup Language](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [Global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes)
- [class HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/class)
- [data-* HTML global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/data-*)
- [draggable HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/draggable)
- [id HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/id)
- [style HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/style)

적용 범위: 2026-09-21 MDN HTML 개요 및 전역 속성. 현재 대상 브라우저의 세부 호환성과 실행 동작은 도입 시 재확인한다.

MDN 표시 본문의 개요·값·사용 주의 범위를 요약했다. 실행 예제·호환성 표의 모든 버전·연결 문서는 미검증이다. Limited availability·Experimental·Non-standard 표시는 도입 허가가 아니라 추가 확인 조건이다.
