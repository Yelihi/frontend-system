# JavaScript 문법·제어 흐름·템플릿

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

줄바꿈 뒤 반환값이 달라지거나 var 스코프·tagged template·JSON 파싱이 혼동될 때.

## 판단에 사용할 내용

표현식과 문장, ASI·블록 스코프·strict mode, 일반 보간과 태그 호출의 의미를 확인한다.

## 적용하지 않는 경우

세미콜론 등 팀 코드 스타일을 새 필수 규칙으로 만들거나 strict mode의 성능 향상을 보장하지 않는다.

## 개념과 근거

표현식은 값으로 평가되고 문장·선언은 실행과 바인딩을 구성한다. var는 블록 단위가 아니며 let·const와 구분한다. 줄바꿈이 항상 문장 끝을 뜻하지 않으므로 ASI 규칙을 확인한다. strict mode는 일부 의미를 바꾸며 성능 최적화의 보장이 아니다. 템플릿 보간과 tagged template는 다르고 태그 결과는 문자열일 필요가 없다. 후행 쉼표가 허용되는 JavaScript 위치와 JSON 문법을 혼동하지 않는다. 코드 스타일의 선호는 이 개념 참조가 새 규칙으로 강제하지 않는다.

## 검토한 출처

- [Control flow and error handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [Expressions and operators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators)
- [Grammar and types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types)
- [Loops and iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration)
- [Lexical grammar](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar)
- [Expressions and operators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators)
- [Statements and declarations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements)
- [Strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)
- [Template literals (Template strings)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
- [Trailing commas](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Trailing_commas)

적용 범위: 2026-09-21 MDN JavaScript 49개 등록 URL의 개요·표시 본문 일부. 상세 메서드·모든 예외·엔진 버전 호환성은 별도 검토 대상이다.

언어 개념을 검색 가능한 참조로 묶었다. 최신 제안이나 legacy 안내를 즉시 도입·교체 규칙으로 승격하지 않는다. 코드 실행·성능 실측·모든 하위 문서 검토는 수행하지 않았다.
