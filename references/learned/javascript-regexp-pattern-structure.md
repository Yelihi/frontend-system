# JavaScript 정규식의 패턴 구조

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

정규식 캡처 결과가 다르거나 g 플래그·match·matchAll·문자열 이스케이프가 혼동될 때.

## 판단에 사용할 내용

문자 집합·위치 조건·그룹·반복 범위와 소비 메서드의 반환 형식을 각각 대조한다.

## 적용하지 않는 경우

정규식이 일치한다는 이유로 ReDoS 안전성이나 신규 assertion의 엔진 지원까지 보장하지 않는다.

## 개념과 근거

문자 클래스는 소비할 문자의 집합, assertion은 위치나 주변 조건, 그룹은 하위 패턴 묶음, 수량자는 반복 범위를 표현한다. 캡처와 비캡처를 목적에 맞게 나누고 g 플래그 및 match·matchAll 등 소비 메서드에 따른 반환 구조를 확인한다. 리터럴과 생성자는 작성·이스케이프 방식이 다르다. 원문에 등장한 신규 assertion이나 플래그별 기능은 이 개요만으로 현재 대상 엔진 지원을 보장하지 않는다. 패턴의 안전성과 최악 실행 시간을 검증한 자료는 아니다.

## 검토한 출처

- [Regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions)
- [Assertions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Assertions)
- [Character classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes)
- [Groups and backreferences](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Groups_and_backreferences)
- [Quantifiers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Quantifiers)
- [Regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions)

적용 범위: 2026-09-21 MDN JavaScript 49개 등록 URL의 개요·표시 본문 일부. 상세 메서드·모든 예외·엔진 버전 호환성은 별도 검토 대상이다.

언어 개념을 검색 가능한 참조로 묶었다. 최신 제안이나 legacy 안내를 즉시 도입·교체 규칙으로 승격하지 않는다. 코드 실행·성능 실측·모든 하위 문서 검토는 수행하지 않았다.
