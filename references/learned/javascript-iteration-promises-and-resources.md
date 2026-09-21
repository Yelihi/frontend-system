# JavaScript 반복·Promise·자원 수명

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

Promise 후속 완료·오류가 연결되지 않거나 반복 소비와 구독·파일 정리 시점을 판단할 때.

## 판단에 사용할 내용

iterable·iterator의 소비 모델, then의 반환 연결과 메모리 수집·명시적 자원 정리를 구분한다.

## 적용하지 않는 경우

finalizer의 실행에 중요한 정리를 맡기거나 using 구문의 지원·예외 순서를 이 개요만으로 확정하지 않는다.

## 개념과 근거

iterable은 iterator를 얻는 프로토콜이고 iterator는 next()로 value·done을 제공한다. 필요할 때 소비하는 시퀀스가 배열 전체 할당과 같은 것은 아니다. Promise 연결에서 then()의 새 결과를 반환·관찰해 후속 완료와 실패가 이어지는지 확인한다. 자동 메모리 수집은 파일·구독 등 자원의 명시적 정리를 대신하지 않는다. 중요한 정리를 finalizer가 언젠가 실행할 것이라는 가정에 두지 않는다. using·await using은 여기서 상세 지원·예외 순서를 검토하지 않았으므로 도입 전 별도 확인한다.

## 검토한 출처

- [Iterators and generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators)
- [Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)
- [JavaScript resource management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Resource_management)
- [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)

적용 범위: 2026-09-21 MDN JavaScript 49개 등록 URL의 개요·표시 본문 일부. 상세 메서드·모든 예외·엔진 버전 호환성은 별도 검토 대상이다.

언어 개념을 검색 가능한 참조로 묶었다. 최신 제안이나 legacy 안내를 즉시 도입·교체 규칙으로 승격하지 않는다. 코드 실행·성능 실측·모든 하위 문서 검토는 수행하지 않았다.
