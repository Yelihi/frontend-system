# JavaScript 값·동등성·컬렉션

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

객체 비교가 예상과 다르거나 큰 ID 정밀도가 손실되고 Map·Array·TypedArray를 선택할 때.

## 판단에 사용할 내용

피연산자 타입·NaN·부호 있는 0·객체 정체성과 키·인덱스·버퍼 뷰 모델을 구분한다.

## 적용하지 않는 경우

기본 동등성 비교를 깊은 비교로 여기거나 손실된 숫자를 후속 타입 검사로 복원할 수 있다고 보지 않는다.

## 개념과 근거

암묵적 변환은 연산의 의미를 바꿀 수 있으므로 실제 피연산자 타입을 확인한다. ===와 Object.is는 NaN과 부호 있는 0에서 다르고 어떤 기본 비교도 서로 다른 객체의 구조를 자동으로 깊게 비교하지 않는다. Number로 변환한 큰 식별자의 손실은 변환 후 타입 검사로 복원할 수 없다. Array는 인덱스 기반, Map은 임의 키 기반이고 TypedArray는 버퍼를 해석하는 뷰다. 버퍼와 뷰, 일반 배열의 확장 메서드를 혼동하지 않는다.

## 검토한 출처

- [JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures)
- [Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)
- [Indexed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections)
- [Keyed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Keyed_collections)
- [Numbers and strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Numbers_and_strings)
- [JavaScript typed arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Typed_arrays)

적용 범위: 2026-09-21 MDN JavaScript 49개 등록 URL의 개요·표시 본문 일부. 상세 메서드·모든 예외·엔진 버전 호환성은 별도 검토 대상이다.

언어 개념을 검색 가능한 참조로 묶었다. 최신 제안이나 legacy 안내를 즉시 도입·교체 규칙으로 승격하지 않는다. 코드 실행·성능 실측·모든 하위 문서 검토는 수행하지 않았다.
