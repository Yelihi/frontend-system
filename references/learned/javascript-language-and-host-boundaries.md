# JavaScript 언어와 호스트 경계

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

브라우저에서는 되던 코드가 Node·worker에서 API 없음 오류를 내거나 언어 문서와 Web API를 혼동할 때.

## 판단에 사용할 내용

ECMAScript 내장 기능과 호스트 제공 기능, 모듈 문법과 실행 환경의 로딩을 나누어 확인한다.

## 적용하지 않는 경우

이 개요를 이벤트 루프의 상세 순서나 모든 엔진의 신규 기능 지원 근거로 사용하지 않는다.

## 개념과 근거

엔진은 언어를 구현하고 호스트는 DOM·I/O 등 환경 기능을 제공한다. 언어 내장 객체의 존재와 브라우저 API의 존재를 혼동하지 않는다. 모듈의 문법과 실제 해석·로딩 경로는 호스트 조건을 함께 본다. 가이드는 개념 입문, 레퍼런스는 세부 계약 확인에 사용한다. MDN에 문서화된 신규 기능이 모든 엔진이나 확정 표준에 포함되었다고 가정하지 않으며 구형 호환 기능도 플랫폼마다 지원이 다를 수 있다. 이 참조는 이벤트 루프의 상세 큐 순서를 검토한 자료가 아니다.

## 검토한 출처

- [JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [Introduction](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction)
- [JavaScript language overview](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Language_overview)
- [JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [JavaScript reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference)
- [Deprecated and obsolete features](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Deprecated_and_obsolete_features)
- [JavaScript error reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors)
- [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [Standard built-in objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects)
- [JavaScript technologies overview](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/JavaScript_technologies_overview)

적용 범위: 2026-09-21 MDN JavaScript 49개 등록 URL의 개요·표시 본문 일부. 상세 메서드·모든 예외·엔진 버전 호환성은 별도 검토 대상이다.

언어 개념을 검색 가능한 참조로 묶었다. 최신 제안이나 legacy 안내를 즉시 도입·교체 규칙으로 승격하지 않는다. 코드 실행·성능 실측·모든 하위 문서 검토는 수행하지 않았다.
