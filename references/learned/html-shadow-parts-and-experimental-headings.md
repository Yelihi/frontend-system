# Shadow DOM 연결과 실험적 HTML 속성

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

Web Component 슬롯·part 연결이 안 되거나 실험적 anchor·제목 수준 속성을 도입하려 할 때.

## 판단에 사용할 내용

콘텐츠 배정과 스타일 공개 지점, 중첩 exportparts 및 실험 기능의 지원 조건을 구분한다.

## 적용하지 않는 경우

실험 속성으로 기존 제목 구조·접근성을 대체하거나 HTML anchor와 CSS 앵커 기능을 동일시하지 않는다.

## 개념과 근거

slot은 콘텐츠 배정, part는 스타일 지점 노출, exportparts는 중첩 경계 밖으로 이름을 전달한다. is는 정의된 customized built-in과 지원 브라우저 조건이 필요하다. anchor HTML 속성은 비표준·실험적이므로 표준 CSS 앵커 방식과 혼동하지 않는다. headingoffset·headingreset은 계산된 제목 수준을 다루는 실험적 속성이며 기존 제목 태그를 바꾸지 않는다. 지원되지 않는 환경의 구조적 제목 접근성을 대신하는 보편적 수단으로 권하지 않는다.

## 검토한 출처

- [anchor HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/anchor)
- [exportparts HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/exportparts)
- [headingoffset HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/headingoffset)
- [headingreset HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/headingreset)
- [is HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/is)
- [part HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/part)
- [slot HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/slot)

적용 범위: 2026-09-21 MDN HTML 개요 및 전역 속성. 현재 대상 브라우저의 세부 호환성과 실행 동작은 도입 시 재확인한다.

MDN 표시 본문의 개요·값·사용 주의 범위를 요약했다. 실행 예제·호환성 표의 모든 버전·연결 문서는 미검증이다. Limited availability·Experimental·Non-standard 표시는 도입 허가가 아니라 추가 확인 조건이다.
