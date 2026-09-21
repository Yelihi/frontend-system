# React 상태 스냅샷, 순수 렌더, DOM 커밋과 paint

검토일: 2026-09-21 · 분류: concept · 근거: 공개 문서와 검토한 원본 요약

## 참고 상황

React setter 직후 이전 값이 읽히거나 렌더 로그 횟수와 화면 갱신 횟수가 달라 보일 때.

## 판단에 사용할 내용

렌더별 상태 스냅샷, updater와 배칭, DOM commit과 브라우저 paint를 구분해 관찰한 현상을 설명한다.

## 적용하지 않는 경우

다른 프레임워크의 계약이나 실제 성능 향상·고정 Effect 실행 시점을 단정하는 근거가 아니다.

## 개념과 근거

React에서 render는 UI 설명을 계산하고 commit은 준비한 변경을 화면에 연결된 DOM에 반영한다. 브라우저 paint는 별도 단계다. 컴포넌트 호출이 발생해도 결과가 같다면 DOM을 바꿀 필요가 없다. 초기 렌더에서는 연결 전 DOM 노드를 준비할 수 있으므로 “모든 노드는 commit에서 처음 생성된다”는 설명은 부정확하다. [Render and Commit](https://react.dev/learn/render-and-commit).

이벤트 핸들러가 읽는 state는 해당 렌더의 스냅샷이다. setter 뒤 같은 핸들러에서 이전 값이 읽혀도 저장 실패의 증거가 아니다. 이전 값에 의존하는 연속 업데이트는 updater 함수로 표현할 수 있다. 배칭이 모든 await·타이머·별도 사용자 이벤트를 하나의 render로 묶는다는 보장은 없다. [Queueing updates](https://react.dev/learn/queueing-a-series-of-state-updates).

렌더 계산은 외부 공유 객체를 바꾸는 부작용과 구별된다. 호출 안에서 새로 만든 객체의 지역 변경까지 금지되는 것은 아니다. 이벤트는 사용자의 행동에 대한 처리이고 Effect는 외부 시스템 동기화에 쓰인다. useEffect를 언제나 paint 이후라고 단정하지 않는다. useLayoutEffect는 paint를 막을 수 있어 시각적 측정 등 필요와 비용을 확인한다. [useEffect](https://react.dev/reference/react/useEffect), [순수성](https://react.dev/learn/keeping-components-pure).

JSX의 엘리먼트는 UI 설명이며 DOM 노드 그 자체가 아니다. 불변으로 취급하는 props도 깊은 복사본이라는 뜻은 아니다. 숫자 0은 화면에 표시될 수 있으므로 items.length && 표현은 빈 목록에서 0을 반환한다. key는 일반 prop이 아니고 Fragment는 추가 DOM 없는 묶음이다. 이 세부 설명은 원본 노트의 공식 문서 연결을 보존한 요약이며 이번 실행에서 모든 JSX API를 재검증한 것은 아니다.

원본 두 노트의 보정된 개념을 반영했다. “React는 항상 더 빠르다”, “commit은 실패 시 전부 롤백한다”, “엘리먼트 표식이 XSS를 모두 막는다”는 주장은 배포 근거에서 제외한다. 호출 횟수·DOM 쓰기 횟수·layout·paint 횟수는 같지 않으며 성능 결론에는 실제 측정이 필요하다. React 웹 렌더링의 설명으로 사용하며 다른 프레임워크의 동작을 추정하는 근거로 삼지 않는다.

원본 catalog ID: `react-rendering-foundations`, `react-fiber-reconciliation-and-commit`.

