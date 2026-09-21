# 함께 바뀌는 코드와 변경 영향의 경계

검토일: 2026-09-21 · concept · experience

## 참고 상황

비슷한 코드를 합칠지, 함께 수정되는 파일·폼 검증·페이지 Hook을 나눌지 고민할 때.

## 판단에 사용할 내용

모양의 유사성보다 업무 의미·변경 이유·실제 의존을 비교해 공통화와 분리의 경계를 판단한다.

## 적용하지 않는 경우

폴더 이동·Hook 분리만으로 의존 제한이나 렌더 감소를 보장하지 않는다.

## 개념과 근거

응집도는 함께 바뀌는 것의 연결이고 결합도는 한 변경이 다른 곳에 미치는 영향이다. 동일한 업무 의미와 변경 이유를 공유하면 공통화의 이익이 있지만 비슷한 모양만 묶으면 옵션과 분기가 늘 수 있다. 가상의 미래 차이만으로 복제하거나 중복이라는 이유만으로 합치는 결론은 모두 피한다.

기능 가까이 파일을 두면 변경과 삭제 범위를 찾기 쉽다. 그러나 폴더 구조는 import 제한을 강제하지 않고 외부 의존도 사라지지 않는다. 실제 의존과 프로젝트의 검사 장치를 함께 보아야 한다.

폼 검증은 독립 필드와 필드 간 제약을 구별한다. 각 필드에서 재사용할 검증과 폼 전체의 관계 검증을 병행할 수 있다. 모든 폼을 한 스키마로 합치거나 모든 검증을 필드에 분산하는 보편 규칙은 없다.

광범위한 페이지 Hook을 나누면 인터페이스의 책임을 좁힐 수 있다. 렌더 감소는 실제 상태 구독·context·라이브러리 구현에 달려 있으므로 파일이나 함수 분리만으로 보장하지 않는다. 예제 setter 인자와 누락된 의존성은 그대로 사용하지 않는다.

중간 계층이 쓰지 않는 props는 composition으로 줄일 수 있다. 명시적인 props가 역할을 잘 표현하면 유지할 수 있고 context가 자동 최선은 아니다. 원문 context 예제는 제공자와 일부 식별자 정의가 빠져 있어 완성품으로 제공하지 않는다.

시간 상수도 실제 애니메이션과 후속 작업이 함께 변경되는 연결이 있어야 응집도가 생긴다. 이름 하나만 새로 붙이는 변경은 연결 자체를 만들지 않는다.

## 검토한 출처

- [좋은 코드를 위한 4가지 기준](https://frontend-fundamentals.com/code-quality/code/)
- [함께 수정되는 파일을 같은 디렉토리에 두기](https://frontend-fundamentals.com/code-quality/code/examples/code-directory.html)
- [매직 넘버 없애기](https://frontend-fundamentals.com/code-quality/code/examples/magic-number-cohesion.html)
- [폼의 응집도 생각하기](https://frontend-fundamentals.com/code-quality/code/examples/form-fields.html)
- [책임을 하나씩 관리하기](https://frontend-fundamentals.com/code-quality/code/examples/use-page-state-coupling.html)
- [중복 코드 허용하기](https://frontend-fundamentals.com/code-quality/code/examples/use-bottom-sheet.html)
- [Props Drilling 지우기](https://frontend-fundamentals.com/code-quality/code/examples/item-edit-modal.html)

적용 범위: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인

코드 품질 관점과 반례를 개념으로 보존한다. 예제 실행·성능 측정 및 공용 규칙 승인은 수행하지 않았다.
