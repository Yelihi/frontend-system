# 코드 읽기 맥락과 예측 가능한 인터페이스

검토일: 2026-09-21 · concept · experience

## 참고 상황

조건 분기가 읽기 어렵거나 함수 이름과 반환값·숨은 부작용이 호출자의 예상과 다를 때.

## 판단에 사용할 내용

호출자가 알아야 할 맥락과 계약을 기준으로 명명·분리·인라인 유지의 이익과 비용을 비교한다.

## 적용하지 않는 경우

줄 수·파일 수 감소만으로 품질을 판정하거나 모든 조건식에 새 추상화를 만들지 않는다.

## 개념과 근거

가독성은 단순히 파일 수나 코드 줄 수가 적다는 뜻이 아니다. 분기별 동작이 교차하면 역할별 분리가 도움이 될 수 있고, 간단한 정책이 여러 간접 계층에 흩어져 있으면 가까이 펼치는 편이 이해하기 쉽다. 둘은 상황이 다른 선택이며 새 추상화를 항상 만들거나 제거하는 규칙이 아니다.

이름과 반환값은 호출자가 예상하는 계약이다. 인증이 추가되는 HTTP 래퍼나 오류 정보를 가진 검증 결과는 그 차이가 드러나야 한다. 특히 객체 {ok:false} 자체를 if 조건으로 검사하면 실패도 참처럼 처리된다. 같은 종류로 보이는 함수라도 의미가 다르면 반환 타입을 억지로 맞출 필요가 없다.

복잡한 조건의 의미를 이름으로 요약할 수 있지만 계산을 미리 꺼내면 단락 평가·비용·부작용이 달라질 수 있다. 범위 비교의 표기는 팀의 독해 선호이며 JavaScript 연쇄 부등식으로 변환할 근거가 아니다. 단순한 삼항식이나 일회성 표현은 유지할 수 있다.

숫자에 이름과 단위를 붙이는 것은 의도 설명이다. 300ms를 상수로 만들었다고 애니메이션 완료나 서버 반영이 보장되지는 않는다. 숨은 로깅도 업무 이벤트라면 호출 흐름에 드러내는 선택이 있지만 감사·관측이 API 계약인 경우 내부에 둘 수 있다.

원문의 HOC·권한 가드·Hook 예제는 설계 설명이며 보안 인가나 성능 증명으로 배포하지 않는다. 이미 명확하고 계약이 일관된 코드는 유지할 수 있다.

## 검토한 출처

- [시작하기](https://frontend-fundamentals.com/code-quality/code/start.html)
- [좋은 코드를 위한 4가지 기준](https://frontend-fundamentals.com/code-quality/code/)
- [같이 실행되지 않는 코드 분리하기](https://frontend-fundamentals.com/code-quality/code/examples/submit-button.html)
- [구현 상세 추상화하기](https://frontend-fundamentals.com/code-quality/code/examples/login-start-page.html)
- [로직 종류에 따라 합쳐진 함수 쪼개기](https://frontend-fundamentals.com/code-quality/code/examples/use-page-state-readability.html)
- [복잡한 조건에 이름 붙이기](https://frontend-fundamentals.com/code-quality/code/examples/condition-name.html)
- [매직 넘버에 이름 붙이기](https://frontend-fundamentals.com/code-quality/code/examples/magic-number-readability.html)
- [시점 이동 줄이기](https://frontend-fundamentals.com/code-quality/code/examples/user-policy.html)
- [삼항 연산자 단순하게 하기](https://frontend-fundamentals.com/code-quality/code/examples/ternary-operator.html)
- [왼쪽에서 오른쪽으로 읽히게 하기](https://frontend-fundamentals.com/code-quality/code/examples/comparison-order.html)
- [이름 겹치지 않게 관리하기](https://frontend-fundamentals.com/code-quality/code/examples/http.html)
- [같은 종류의 함수는 반환 타입 통일하기](https://frontend-fundamentals.com/code-quality/code/examples/use-user.html)
- [숨은 로직 드러내기](https://frontend-fundamentals.com/code-quality/code/examples/hidden-logic.html)

적용 범위: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인

코드 품질 관점과 반례를 개념으로 보존한다. 예제 실행·성능 측정 및 공용 규칙 승인은 수행하지 않았다.
