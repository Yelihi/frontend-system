# 코드 읽기 맥락과 예측 가능한 인터페이스

검토일: 2026-09-28 · decision · experience

## 참고 상황

조건 분기가 읽기 어렵거나 함수 이름과 반환값·숨은 부작용이 호출자의 예상과 다를 때. 작은 변경에도 래퍼·팩토리·파일을 반복해서 따라가거나 디자인 패턴 도입의 실익이 불분명할 때.

## 판단에 사용할 내용

호출자가 알아야 할 맥락과 계약을 기준으로 명명·분리·인라인 유지의 이익과 비용을 비교한다. 유지·가까이 배치·인라인·새 경계 도입 중 실제 변경 목적에 맞는 선택을 한다. 이는 조건부 판단 자료이며 필수 규칙이나 자동 수정 지시가 아니다.

## 적용하지 않는 경우

줄 수·파일 수 감소만으로 품질을 판정하거나 모든 조건식에 새 추상화를 만들지 않는다. 검증·불변식·접근성·서버/클라이언트 경계를 줄이는 근거나 모든 추상화가 비용을 높인다는 보장으로 사용하지 않는다.

## 개념과 근거

가독성은 단순히 파일 수나 코드 줄 수가 적다는 뜻이 아니다. 분기별 동작이 교차하면 역할별 분리가 도움이 될 수 있고, 간단한 정책이 여러 간접 계층에 흩어져 있으면 가까이 펼치는 편이 이해하기 쉽다. 둘은 상황이 다른 선택이며 새 추상화를 항상 만들거나 제거하는 규칙이 아니다.

이름과 반환값은 호출자가 예상하는 계약이다. 인증이 추가되는 HTTP 래퍼나 오류 정보를 가진 검증 결과는 그 차이가 드러나야 한다. 특히 객체 {ok:false} 자체를 if 조건으로 검사하면 실패도 참처럼 처리된다. 같은 종류로 보이는 함수라도 의미가 다르면 반환 타입을 억지로 맞출 필요가 없다.

복잡한 조건의 의미를 이름으로 요약할 수 있지만 계산을 미리 꺼내면 단락 평가·비용·부작용이 달라질 수 있다. 범위 비교의 표기는 팀의 독해 선호이며 JavaScript 연쇄 부등식으로 변환할 근거가 아니다. 단순한 삼항식이나 일회성 표현은 유지할 수 있다.

숫자에 이름과 단위를 붙이는 것은 의도 설명이다. 300ms를 상수로 만들었다고 애니메이션 완료나 서버 반영이 보장되지는 않는다. 숨은 로깅도 업무 이벤트라면 호출 흐름에 드러내는 선택이 있지만 감사·관측이 API 계약인 경우 내부에 둘 수 있다.

원문의 HOC·권한 가드·Hook 예제는 설계 설명이며 보안 인가나 성능 증명으로 배포하지 않는다. 이미 명확하고 계약이 일관된 코드는 유지할 수 있다.

## 추상화의 편익과 탐색 비용

Ondrej Velisek은 파일 사이의 간접 참조가 사람과 에이전트의 탐색 부담을 늘릴 수 있다고 설명한다. 계산기 실험에서도 일괄 변경과 결함 탐색 등 작업 종류에 따라 유불리가 달랐다. 따라서 추상화 수를 최소화하는 목표보다, 해당 작업에서 줄어드는 복잡성과 추가되는 탐색·변경 비용을 비교하는 관점으로 사용한다.

다음은 원문의 보편적 결론이 아니라 FS의 조건부 검토 판단이다. 호출자와 데이터 흐름을 확인하고 추상화가 가진 계약을 파악한 뒤 비교한다.

| 관찰한 상황 | 비교할 선택 | 그대로 유지하거나 분리할 조건 |
| --- | --- | --- |
| 객체 생성 함수가 필드만 그대로 전달한다 | 타입이 있는 객체 리터럴로 표현할 수 있는지 검토 | 런타임 검증·기본값·불변식이 있으면 그 책임을 보존한다. 타입만으로 외부 입력은 검증되지 않는다. |
| 한 동작을 이해하려고 의미 없는 래퍼·파일을 계속 따라간다 | 관련 코드를 가까이 두거나 불필요한 전달 계층을 인라인 | 도메인 의미·독립 변경·보안·번들·서버/클라이언트 경계가 있으면 파일 수보다 그 계약을 우선한다. |
| 단순 UI에 패턴·서비스·팩토리를 새로 넣으려 한다 | 현재 props·함수·조합으로 요구를 충족하는지 비교 | 실제 상태 공유·조합 계약이나 의존성 수명 관리가 필요하면 적절한 경계를 선택한다. 프레임워크나 DI 라이브러리 사용 자체는 도입·제거의 근거가 아니다. |
| 여러 경로가 같은 검증·정책·테마를 공유한다 | 공유 추상화를 유지해 함께 변경되는 의미를 표현 | 모양만 비슷하고 변경 이유가 다르면 분리도 비교한다. 중복 횟수만으로 합치거나 복제하지 않는다. |

React에서는 도메인 전용 Context 소비 위치와 범용 컴포넌트의 명시적 props를 구별한다. Provider 의존성·재사용 계약을 유지하며, 파일·Hook 분리만으로 렌더링 비용이 줄었다고 판단하지 않는다. 구체적인 조합 제약은 [Compound Component](react-compound-component-boundaries.md), 공통화 여부는 [변경 경계](code-quality-change-boundaries.md)를 함께 확인한다.

## 검증 방법과 수치의 한계

단순화 전후에 동일한 요구사항·수용 검사로 정상 동작, 잘못된 입력, 실패 처리, 공통 정책의 일관성을 비교한다. 비용을 주장하려면 모델·도구 권한·문맥·캐시 조건을 맞추고 국소 수정과 공통 변경을 모두 비교한다. 탐색 파일 수·왕복·시간·비용은 관측값이며 코드 정확성의 대체 지표가 아니다. 이 문서에서 실제 제품 비교나 비용 실험을 수행하지 않았다.

원문의 **30% 비용 증가**는 작은 합성 앱에서 얻은 결과를 모델로 외삽한 추정치다. 의도적으로 추가한 계층과 일부 작업의 bash 제한 등 실험 조건이 있으므로 FS의 절감률·일반 성능 보장으로 채택하지 않는다. 원시 실행 로그·통계를 재검증하지 않았으며 실행 횟수 집계 차이도 미확인이다.

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
- [The Cost of Abstraction for Humans and AI Agents](https://ondrejvelisek.github.io/the-cost-of-abstraction-for-humans-and-ai-agents/) — 2026-09-28 본문 설명·코드·표 검토. 전문을 복제하지 않은 요약이며 이미지·연결 규칙 파일·실험 실행은 제외.

적용 범위: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인

코드 품질 관점과 반례를 조건부 판단으로 보존한다. 예제 실행·성능 측정 및 공용 규칙 승인은 수행하지 않았다. 기존 토스 자료의 부분 열람 범위는 원래 source에 기록된 그대로이며 이번에 전체를 재수집한 것은 아니다.
