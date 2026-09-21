# React 19.2.0 Fiber alternate와 Hook 상태 구조

검토일: 2026-09-21 · 분류: concept · 근거: 고정 버전 구현

## 참고 상황

React Fiber의 두 트리가 DOM 두 벌인지, memoizedState가 개별 useState 값인지 해석할 때.

## 판단에 사용할 내용

React v19.2.0의 alternate 생성·재사용과 Hook 연결 구조를 읽어 내부 도식의 오해를 바로잡는다.

## 적용하지 않는 경우

고정 버전 내부 필드를 최신 공개 API나 앱 코드의 의존 대상으로 사용하지 않는다.

## 개념과 근거

적용 범위는 React v19.2.0 소스의 내부 구현이다. 최신 버전이나 앱에서 의존할 공개 API 계약으로 일반화하지 않는다.

createWorkInProgress는 current.alternate가 없으면 Fiber를 만들고 있으면 재사용한다. 쌍이 처음부터 모든 노드에 존재하는 것은 아니다. 재사용되는 호스트 Fiber 쌍이 같은 stateNode를 가리킬 수 있으므로 “두 트리”는 화면 전체 DOM의 두 복사본을 뜻하지 않는다. [v19.2.0 ReactFiber.js](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiber.js).

함수 컴포넌트의 상태 Hook은 레코드의 연결 구조로 저장된다. mountWorkInProgressHook에서 첫 레코드는 Fiber.memoizedState에 연결하고 다음 레코드는 이전 Hook의 next에 연결한다. 따라서 useState(0)의 0을 Fiber.memoizedState 값 그 자체로 그린 도식은 이 구현과 맞지 않는다. 모든 React API가 동일한 Hook 셀 하나를 만든다고 확대 해석하지 않는다. [v19.2.0 ReactFiberHooks.js](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberHooks.js).

이번 검토는 위 두 구현 구간을 재확인했다. 원본에 담긴 WorkLoop의 상세 커밋 순서, lastPlacedIndex 추적, DOM 속성별 내부 함수와 이미지 도식은 이 작은 참조에 재배포하지 않는다. 전체 엔진을 실행·추적했다고 보고하지 않는다.

더블 버퍼링을 DB 트랜잭션의 롤백 보장이나 최소 DOM 이동 횟수 보장으로 바꾸지 않는다. 실제 버그 조사에서 내부 필드에 의존하는 변경보다 공개 상태 모델과 측정을 우선 검토할 수 있다. 공개 개념은 관련 참조에서 별도로 찾는다.

원본 catalog ID: `react-fiber-reconciliation-and-commit`.

