# JavaScript 함수·클로저·객체 소유권

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

클로저 값·객체 변경이 예상과 다르거나 순회에서 상속 속성·symbol이 누락될 때.

## 판단에 사용할 내용

렉시컬 환경 참조, 매개변수 재대입과 객체 변경, 자체·상속·열거 범위를 나누어 조사한다.

## 적용하지 않는 경우

클로저를 깊은 복사본으로 설명하거나 Proxy가 대상의 불변 조건을 무시한다고 가정하지 않는다.

## 개념과 근거

클로저는 주변 환경에 대한 참조를 가지며 생성 시 모든 값을 깊은 복사하는 장치가 아니다. 함수 매개변수에 새 값을 대입하는 것과 전달된 객체의 내용을 바꾸는 것을 구분한다. 객체 속성을 순회할 때 자체/상속·열거 여부·문자열/symbol의 범위를 확인한다. class는 prototype에 기반하지만 TDZ·strict body·private 멤버 같은 고유 의미도 있어 단순 문자열 치환으로 보지 않는다. Proxy가 기본 연산을 가로채더라도 target의 불변 조건을 무시할 수 없다.

## 검토한 출처

- [Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- [Enumerability and ownership of properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Enumerability_and_ownership_of_properties)
- [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)
- [Meta programming](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming)
- [Using classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_classes)
- [Working with objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects)
- [Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions)

적용 범위: 2026-09-21 MDN JavaScript 49개 등록 URL의 개요·표시 본문 일부. 상세 메서드·모든 예외·엔진 버전 호환성은 별도 검토 대상이다.

언어 개념을 검색 가능한 참조로 묶었다. 최신 제안이나 legacy 안내를 즉시 도입·교체 규칙으로 승격하지 않는다. 코드 실행·성능 실측·모든 하위 문서 검토는 수행하지 않았다.
