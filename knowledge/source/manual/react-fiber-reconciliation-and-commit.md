---
title: "React 엔진: Fiber, 더블 버퍼링, 재조정, Key와 DOM 커밋"
sourceType: manual
sourceUrl: "https://github.com/Yelihi/frontend-system/issues/2"
provenance: "사용자 제공 한국어 Markdown과 GitHub 이슈 #2 본문; 이슈에 연결된 그림 3장 직접 판독"
sourceTitle: "[React] The Engine"
author: "Yelihi (GitHub 이슈 작성자)"
publisher: "GitHub / Yelihi/frontend-system"
sourceCreated: 2026-09-09T04:06:03Z
sourceUpdated: 2026-09-09T06:28:17Z
created: 2026-09-10
updated: 2026-09-10
accessed: 2026-09-10
implementationReference: "facebook/react v19.2.0 (검증용 고정 버전이며 최신 버전 주장 아님)"
facets:
  framework: [react]
  topic: [state, rendering, elements, fiber, reconciliation, keys, commit]
  artifact: [concept-guide]
  maturity: [internals]
---

# React 엔진: Fiber, 더블 버퍼링, 재조정, Key와 DOM 커밋

사용자 노트의 다섯 주제를 정규화했다. [원본 이슈](https://github.com/Yelihi/frontend-system/issues/2#issue-5394805719)의 본문·작성자·날짜와 연결된 그림 3장을 확인했다. 반복 내용은 합쳤으며, 원문 주장과 보정은 별도 표에 함께 남긴다. 이미지 원본은 저장소에 복제하지 않고 링크와 판독 내용을 보존한다. 그림 제공 사이트는 arpitjsoni.com이며 개별 이미지의 저자·라이선스는 별도 확인하지 않았다.

기초 개념은 [상태·JSX·순수성·Render와 Commit](react-rendering-foundations.md)을 참고한다. 이 문서는 React DOM의 Fiber 구현을 다루므로 기초 문서와 병합하지 않는다. 내부 필드·함수·플래그는 공개 API가 아니며, 아래 구현 설명은 **v19.2.0**을 기준으로 한다.

## 1. The Fiber Tree

엘리먼트는 UI를 기술하는 값이고, Fiber는 작업과 컴포넌트 정체성을 추적하는 내부 레코드다. 함수 컴포넌트와 호스트 요소 모두 Fiber로 표현될 수 있다. JSX 소스 문자열을 런타임에 다시 읽는 것이 아니라 렌더 결과를 기존 Fiber와 조정한다.

| 필드 | 의미와 범위 |
| --- | --- |
| `tag` | FunctionComponent, HostComponent 등 작업 종류를 나타내는 내부 숫자 상수 |
| `type`, `elementType`, `key` | 처리할 타입과 엘리먼트의 타입·식별 정보 |
| `pendingProps`, `memoizedProps` | 처리할 props와 해당 Fiber에서 처리한 props; WIP 값이 반드시 마지막 커밋의 값인 것은 아님 |
| `memoizedState` | 함수 컴포넌트에서는 상태를 보관하는 Hook 목록의 시작점; Fiber 종류에 따라 의미가 다름 |
| `stateNode` | 호스트 Fiber에서는 DOM 노드, 클래스에서는 인스턴스 등; 함수 컴포넌트는 보통 `null` |
| `return`, `child`, `sibling` | 부모, 첫 자식, 다음 형제 관계 |
| `alternate` | 대응하는 다른 버전의 Fiber 또는 `null` |
| `flags`, `subtreeFlags`, `deletions` | 자신·하위 트리의 작업 표시와 삭제 대상 |
| `lanes`, `childLanes`, `updateQueue` | 우선순위와 대기 작업 처리에 사용하는 정보 |

근거: [ReactFiber.js — v19.2.0](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiber.js).

`useState` 값은 컴포넌트 함수의 지역 변수에 영구 저장되지 않는다. 함수 컴포넌트 Fiber의 `memoizedState`에서 Hook 레코드들이 `next`로 연결되고 각 레코드가 `memoizedState`, `baseState`, `baseQueue`, `queue` 등을 갖는다. 원문의 `fiber.memoizedState: 0` 예시는 이 연결 리스트 설명과 맞지 않는다. 숫자 상태 `0`은 해당 Hook 레코드의 값이고 Fiber 쪽은 목록의 head다. 호출 순서에 의존하는 상태 Hook은 매 렌더에서 같은 순서를 지켜야 한다. 모든 React API가 각각 같은 형태의 Hook 셀 하나를 만든다고 일반화하지 않는다. [ReactFiberHooks.js — v19.2.0](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberHooks.js)

부모·자식·형제 포인터는 JS 재귀 호출 스택에만 의존하지 않고 작업 위치를 추적하는 데 유용하다. 중단·재개에는 스케줄러와 작업 루프도 필요하며 연결 리스트만으로 동시성이 생기지는 않는다. 같은 함수 호출 중간을 임의로 선점하는 방식도 아니다. [ReactFiberWorkLoop.js — v19.2.0](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberWorkLoop.js)

엘리먼트를 재사용하거나 메모이즈할 수도 있다. Fiber의 필요성을 설명할 때 엘리먼트는 언제나 생성 직후 버려진다고 단정하지 않는다. Fiber 역시 영구 객체가 아니며 재마운트·삭제·alternate 재사용과 구분해야 한다.

## 2. Two Trees and a Pointer Swap: Double Buffering

`current`는 커밋된 트리를, `work-in-progress`는 준비 중인 버전을 가리킨다. `createWorkInProgress`는 `alternate`가 없으면 만들고 있으면 재사용한다. 모든 노드에 두 객체가 처음부터 존재하는 것은 아니다. 재사용되는 호스트 Fiber 쌍은 동일한 `stateNode`를 참조할 수 있어 화면 전체의 DOM을 복제할 필요가 없다. 신규·교체 노드는 별도 생성된다. [ReactFiber.js — v19.2.0](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiber.js)

작업을 건너뛰는 bailout과 하위 구조 공유는 비용을 줄인다. 다만 부모에서 받은 props, context, 자신의 업데이트, 하위 작업 우선순위 등에 따라 다시 방문하거나 자식 Fiber를 준비할 수 있다. 변화가 없는 가지는 언제나 비용 0이라는 보장은 없다.

순수한 렌더를 폐기하면 그 초안의 DOM 변경을 화면에 커밋하지 않을 수 있다. 렌더 중 외부 객체를 변경했다면 초안을 버려도 그 부작용은 되돌아가지 않는다. 오류 경계나 Suspense가 별도 결과를 커밋하는 경우도 구분한다.

포인터 대입만으로 브라우저 화면이 바뀌지는 않는다. 확인한 구현은 DOM mutation 이후 `root.current = finishedWork`를 수행하고 layout 단계로 넘어간다. 이 순서는 아래 첫 그림의 표기와 다르다. [ReactFiberWorkLoop.js — `flushMutationEffects`](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberWorkLoop.js)

## 3. Diffing, Step by Step

상태 보존을 판단하는 기본 범위는 같은 부모 아래의 자식 정체성이다. key가 있다면 key와 호환되는 타입을 함께 확인하고, key가 없으면 위치가 매칭 기준이 된다. 같은 key만으로 다른 타입을 보존하거나 서로 다른 부모 사이에서 상태를 옮길 수는 없다. 부모의 타입 변경은 그 아래 상태도 리셋할 수 있다. 삭제는 렌더에서 결정하고 실제 언마운트와 DOM 반영은 커밋에서 처리하므로 즉시 파괴와 구분한다. [React: Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)

배열 자식의 일반적인 갱신 경로는 앞에서부터 슬롯을 매칭한 뒤, 그 경로로 처리하지 못하는 나머지를 Map으로 찾아 조정한다. key가 있다고 첫 순차 비교를 생략하지 않는다. 재사용 Fiber의 이전 인덱스가 `lastPlacedIndex`보다 작으면 이동용 `Placement`를 표시하고, 그렇지 않으면 기준점을 높인다. 새 Fiber도 삽입 대상으로 표시하며 남은 이전 자식은 삭제 대상으로 기록한다. 이는 실제 DOM 호출 목록 자체가 아니라 작업 정보다. [ReactChildFiber.js — `reconcileChildrenArray`, `placeChild`](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactChildFiber.js)

예를 들어 같은 타입·안정적인 key를 가진 `A B C → C A B`에서 C의 이전 인덱스 2가 기준점이 된다. A의 0과 B의 1은 그보다 작으므로 이 휴리스틱은 A와 B를 이동 대상으로 본다. C 하나를 앞으로 옮기는 방법도 있으므로 전역 최소 이동을 보장하지 않는다.

레거시 문서의 `O(n³)`는 일반적인 트리 차이 계산과 React의 휴리스틱을 비교한 설명이다. key가 있는 단순 리스트의 최소 이동 문제까지 언제나 `O(n³)`이라고 말할 근거가 아니다. 또한 자식 조정의 선형적인 탐색 특성을 컴포넌트 계산과 브라우저 레이아웃까지 포함한 전체 비용 보장으로 확장하지 않는다. [React: Reconciliation (legacy)](https://legacy.reactjs.org/docs/reconciliation.html)

## 4. Keys Are Identity

key는 형제 사이에서 안정적인 데이터 정체성을 표현한다. `key={item.id}`처럼 데이터 생성 시 정해진 ID를 사용한다. 렌더 중 매번 새 랜덤 key를 만들면 기존 자식과 매칭되지 않는다. 전역 유일성은 필요 없고 `props.key`로 읽을 수 없으므로 필요하면 `id`도 별도 전달한다. [React: Rendering Lists](https://react.dev/learn/rendering-lists)

인덱스 key는 항목 위치가 정체성과 계속 일치할 때만 적합하다. prepend, 삭제, 필터링, 정렬이 있으면 같은 위치의 Fiber가 다른 데이터에 붙어서 Hook 상태나 비제어 input 값이 잘못된 행에 남을 수 있다. 행이 그대로 이동하도록 하려면 안정적인 ID를 사용한다. 명시적 key가 없을 때 위치를 사용한다는 것은 Fiber의 `key` 필드에 실제 숫자가 자동 기록된다는 뜻은 아니다. [React: Rendering Lists](https://react.dev/learn/rendering-lists)

사용자 변경 시 편집기의 모든 내부 상태를 리셋하려면 다음과 같이 정체성을 바꿀 수 있다.

```tsx
<ProfileEditor key={user.id} user={user} />
```

원문의 `key="{userId}" user="{user}"`는 표현식이 아닌 문자열을 전달하므로 위처럼 고친다. key 변경은 하위 상태와 DOM 정체성까지 초기화할 수 있으므로 포커스와 미저장 입력도 영향을 받는다. 단 한 번의 함수 호출을 보장하는 기법은 아니다. 같은 ID 사용자의 bio 변경까지 자동으로 초기화한다는 의미도 아니다. [React: Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)

원문의 Effect 예시는 ID 변경 후 `draft`를 다시 설정하는 추가 갱신을 만든다. 편집 대상 교체에 따른 전체 리셋이면 key 패턴이 더 직접적이다. 일부 값만 병합하거나 미저장 변경을 보존해야 한다면 별도 정책이 필요하며 props에서 시작한 편집 상태 자체를 모두 안티패턴으로 취급하지 않는다.

## 5. How the DOM Gets Updated: The Commit Phase

렌더 중 Fiber에 `Placement`, `Update`, `ChildDeletion` 같은 작업 정보를 남기고 커밋에서 화면에 연결된 DOM에 적용한다. `flags`는 `useEffect`만을 뜻하지 않으며 모든 변경 payload가 flag 안에 담기는 것도 아니다. `subtreeFlags`는 필요한 하위 작업을 찾는 데 쓰인다. 새 하위 트리를 위한 분리된 DOM 노드 준비는 렌더 중에도 가능하다.

DOM 갱신은 태그와 prop에 따라 다르다. `className`은 이 버전의 일반적인 경로에서 `class` attribute로 처리되고, 텍스트는 `nodeValue` 또는 `textContent` 경로를 사용할 수 있다. `dangerouslySetInnerHTML`은 실제 `innerHTML`을 사용한다. 일반 텍스트를 HTML로 해석하지 않는 것과 모든 XSS가 차단된다는 보장은 다르다. [ReactDOMComponent.js](https://github.com/facebook/react/blob/v19.2.0/packages/react-dom-bindings/src/client/ReactDOMComponent.js), [setTextContent.js](https://github.com/facebook/react/blob/v19.2.0/packages/react-dom-bindings/src/client/setTextContent.js)

새 호스트 하위 트리를 연결 전 조립할 수 있지만, Fragment나 여러 호스트 형제를 삽입할 때 여러 `appendChild`·`insertBefore` 호출이 필요할 수 있다. 단일 연결 호출은 보장되지 않는다. [ReactFiberCommitHostEffects.js — v19.2.0](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberCommitHostEffects.js)

브라우저는 일반적으로 스타일·레이아웃 작업을 지연해 합칠 수 있다. DOM 쓰기 한 번마다 반드시 레이아웃이 발생하지는 않는다. 변경 후 레이아웃 값을 강제로 읽으면 동기 레이아웃을 유발할 수 있으므로, 삽입 횟수와 레이아웃·paint 횟수를 동일시하지 않는다. [web.dev: Layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)

일반적인 커밋 설명은 before-mutation(snapshot) → mutation → current 전환 → layout(ref 연결·layout Effect)로 읽는다. 오래된 ref 해제와 Effect cleanup도 있어 모든 ref 작업이 마지막에만 일어나는 것은 아니다. 사용자 콜백에서 DOM을 읽을 수도 있으므로 mutation 단계에 어떤 읽기도 없다는 보장은 아니다. 커밋을 오류 시 롤백하는 DB 트랜잭션으로 해석하지 않는다. [ReactFiberWorkLoop.js — v19.2.0](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberWorkLoop.js)

`useLayoutEffect`는 브라우저 paint를 막을 수 있다. `useEffect`는 보통 paint 이후 실행되지만 상호작용 등으로 paint 전에 실행될 수도 있다. 따라서 paint → passive Effect를 절대 순서로 고정하지 않는다. [React: useLayoutEffect](https://react.dev/reference/react/useLayoutEffect), [React: useEffect](https://react.dev/reference/react/useEffect)

렌더 중 ref를 일반적인 가변 입력으로 읽거나 수정하지 않는다. DOM ref는 커밋과 연결되어 이전 노드 또는 `null`일 수 있지만, 모든 ref가 DOM ref인 것은 아니다. 값이 예측 가능하게 한 번만 생성되는 초기화 예외는 공식 문서가 허용한다. [React: useRef](https://react.dev/reference/react/useRef)

## 그림 3장 판독과 보정

2026-09-10에 이슈 본문의 이미지 URL을 내려받아 직접 확인했다. 아래는 원문 그림의 시각적 내용을 요약한 것이며 React 구현 검증과 구분한다.

### 그림 1 — 더블 버퍼링 시퀀스

[원본 그림](https://www.arpitjsoni.com/react-internals/diagrams/renders/02-the-engine/02-two-trees-double-buffering-d2.png)은 사용자 코드·React·DOM의 세 세로 축을 놓고 setter 요청, 초안 준비·공유, 렌더·차이 계산, 포인터 교체, DOM 반영을 위에서 아래로 배열한다. 초안 계산 중 기존 UI가 유지된다는 주석이 있다.

**보정:** 그림은 교체를 mutation 앞에 놓았으나 확인한 v19.2.0 구현은 mutation 뒤, layout 앞에서 current를 바꾼다. 실제 화면 변경에는 DOM 작업과 브라우저 paint도 필요하다. 공유 가지 비용이 항상 0이거나 포인터 교체만으로 화면이 바뀐다는 뜻으로 읽지 않는다. 근거는 2절의 `ReactFiberWorkLoop.js`다.

### 그림 2 — 재조정 분기

[원본 그림](https://www.arpitjsoni.com/react-internals/diagrams/renders/02-the-engine/03-diffing-step-by-step-d1.png)은 같은 위치의 타입 비교에서 시작한다. 불일치는 하위 트리·상태 제거, 일치는 Fiber·상태 보존과 props 갱신으로 이어진다. 이어 자식 key 유무에 따라 위치 매칭 또는 순차 비교 후 Map·기준점을 이용한 이동 판단으로 나뉜다.

**보정:** 형제 범위와 타입 호환성을 함께 고려해야 한다. 같은 key라도 타입이 다르면 새 정체성이다. 그림은 교육용 분기이며 실제 배열 알고리즘은 key 유무만으로 완전히 분리된 두 경로가 아니다. 근거는 3절의 `ReactChildFiber.js`다.

### 그림 3 — 커밋 타임라인

[원본 그림](https://www.arpitjsoni.com/react-internals/diagrams/renders/02-the-engine/05-how-dom-gets-updated-d1.png)은 렌더 완료·flags에서 snapshot 읽기, DOM 변경, ref 연결·layout Effect, 브라우저 paint, passive Effect 순으로 가로 진행한다.

**보정:** 마지막 두 단계는 항상 고정된 순서가 아니다. ref 해제·cleanup은 이 요약에 빠져 있으며 read/write를 앱 전체에서 완전히 분리해 준다는 보장도 없다. 근거는 5절의 Effect 문서와 작업 루프 소스다.

## 원문 주장과 보정 기록

원문 열은 사용자 제공 Markdown 및 위 이슈의 주장 요약이다. 근거 없는 절대 표현은 아래 범위로 제한한다.

| 원문 주장 요약 | 보정 | 근거 |
| --- | --- | --- |
| Fiber의 `memoizedState`가 숫자 상태다 | 함수 Fiber에서는 Hook 목록 head이고 개별 Hook이 상태값을 가진다. | 1절 Hook 소스 |
| 같은 Fiber 객체가 영구 유지되며 모든 엘리먼트는 일회성이다 | 상태의 논리적 정체성과 객체 참조를 구분한다. alternate를 재사용하고 삭제·재마운트할 수 있으며 엘리먼트도 재사용 가능하다. | 1·2절 |
| 연결 리스트이므로 중단 가능하고 변경은 언제나 효율적이다 | 작업 루프·스케줄링이 함께 필요하고 매칭·탐색 비용도 있다. 배열로는 중단 가능한 작업을 구현할 수 없다는 뜻은 아니다. | 1·3절 |
| 항상 정확히 두 완성 트리, 동일 DOM 하나, 무변경 가지 비용 0 | alternate는 지연 생성된다. 여러 루트·신규 DOM·교체 노드가 존재하고 bailout 판단 비용도 있다. | 2절 Fiber 소스 |
| 포인터 스왑이 화면을 원자적으로 전환한다 | mutation 실행과 current 전환, 브라우저 paint를 구분한다. 오류 롤백 보장은 아니다. | 2·5절 및 그림 1 |
| key가 있으면 순서·타입을 무시한다 | 같은 부모의 key와 타입 호환성이 필요하며 순차 매칭 경로도 사용한다. | 3절 재조정 소스 |
| 타입이 다르면 즉시 Fiber·DOM·Hook이 파괴된다 | 렌더에서 교체를 결정하고 커밋에서 언마운트·DOM 변경을 실행한다. | 3·5절 |
| 최소 리스트 이동은 `O(n³)`이고 React는 낭비 없이 최적이다 | 일반 트리 편집과 리스트 이동 문제를 혼동한 설명이다. React는 최소 DOM 이동을 보장하지 않는다. | 3절 legacy 문서·이동 예시 |
| key 변경은 딱 한 번 렌더하며 상태를 리셋한다 | 정체성 변경 패턴이지 호출 횟수 보장이 아니다. JSX 표현식의 따옴표도 제거한다. | 4절 공식 상태 문서 |
| 모든 DOM 갱신은 flag만으로 정해진 단일 속성 쓰기다 | flag와 props·타입별 처리 등을 함께 사용하며 실제 API 호출 수는 달라진다. | 5절 DOM 구현 |
| React는 `innerHTML`을 절대 쓰지 않고 XSS를 완전히 차단한다 | 일반 텍스트 경로와 `dangerouslySetInnerHTML`을 구분한다. 전체 보안 보장으로 확장하지 않는다. | 5절 DOM 구현 |
| 50개 삽입은 50회 레이아웃, React에서는 1회 삽입·paint다 | DOM API 횟수와 레이아웃 횟수는 다르며 둘 다 단일 횟수 보장은 없다. | 5절 호스트 삽입 소스·web.dev |
| passive Effect는 항상 paint 후이며 ref는 항상 DOM 참조다 | Effect 타이밍 예외와 비-DOM ref·예측 가능한 초기화를 구분한다. | 5절 공식 Hook 문서 |

## 적용 시 확인할 질문

- 행 입력이나 상태가 바뀐 데이터에 붙는가? key 안정성, 부모 범위, 타입 변경을 확인한다.
- 편집 대상을 바꿀 때 전체 상태를 버려야 하는가? key로 정체성을 바꾸는 패턴을 검토한다.
- 렌더 로그는 늘었는데 DOM이 그대로인가? 렌더 계산과 커밋을 구분한다.
- paint 전에 측정해야 하는가? layout Effect의 필요성과 비용을 검토하고 일반 동기화는 Effect에 둔다.

출처의 접근일은 2026-09-10이다. 공개 API 지침은 react.dev를 우선하고, 내부 구조 분석은 위 고정 태그 소스에만 적용한다.
