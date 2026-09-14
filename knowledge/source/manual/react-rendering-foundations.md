---
title: "React 기초: 상태와 UI 동기화, JSX, 순수성, Render와 Commit"
sourceType: manual
provenance: "사용자가 fs-knowledge-add 요청에 직접 제공한 한국어 Markdown; 6개 주제를 정규화하고 공식 문서로 보정"
author: "사용자 제공 (별도 저자 정보 없음)"
created: 2026-09-10
updated: 2026-09-10
accessed: 2026-09-10
facets:
  framework: [react]
  topic: [state, rendering, jsx, elements, purity]
  artifact: [concept-guide]
  maturity: [foundational]
---

# React 기초: 상태와 UI 동기화, JSX, 순수성, Render와 Commit

사용자 제공 노트의 여섯 주제를 하나의 기초 개념 문서로 정리했다. 원문의 반복 설명은 합쳤으며, 단정하거나 버전에 의존하는 주장은 아래 보정 표에 출처와 함께 보존했다. 원문 전체를 그대로 복제한 문서는 아니다. 적용 범위는 주로 React DOM 함수 컴포넌트이며, 서버 렌더링과 다른 렌더러는 별도 고려가 필요하다.

## 1. React의 필요성: 상태와 UI 동기화

작은 화면에서는 `element.innerText = count`처럼 DOM을 직접 갱신해도 충분하다. 상태와 인터랙션이 늘어나면 어떤 상태 변화가 어떤 텍스트·클래스·속성에 영향을 주는지 추적하는 부담이 커진다. 업데이트 누락이나 잘못된 순서는 JS 데이터와 화면의 불일치를 만든다. 원문에서는 이를 **Drift 버그**라고 부른다. 여기서는 설명용 용어로 사용하며 React의 공식 오류 분류로 취급하지 않는다.

- 명령형 UI는 요소 탐색, 속성 변경, 노드 삽입 등 갱신 절차를 직접 기술한다.
- 선언형 UI는 현재 입력에 대응하는 화면을 기술하고 React가 관리하는 DOM의 갱신을 맡긴다.
- 개발자는 어떤 화면을 보여줄지 계속 결정한다. 이벤트 핸들러에는 상태 변경 등의 명령형 코드가 존재한다.
- 컴포넌트는 UI를 조직하고 합성하는 중요한 단위이며, JSX는 이를 표현하는 선택 가능한 문법이다. 상태에서 UI를 도출하는 관점은 이 도구들이 해결하는 문제를 이해하는 데 도움이 된다.

개념적인 흐름은 **업데이트 요청 → UI 설명 계산 → DOM 반영**이다. 초기 렌더도 존재하고, 모든 렌더가 DOM 변경으로 이어지지는 않는다. [React: Render and Commit](https://react.dev/learn/render-and-commit)

## 2. UI Is a Function of State

`UI = f(state)`는 UI를 현재 입력으로부터 계산한다는 정신 모델이다. 보다 구체적으로 컴포넌트의 입력에는 `props`, `state`, `context`가 있다. 외부 저장소는 적절한 구독을 통해 입력으로 연결해야 하며, 임의의 JS 변수 변경을 React가 자동 감지하는 것은 아니다.

`f`는 컴포넌트 트리의 합성을 나타낼 수 있다. 매 업데이트마다 반드시 루트부터 전체 트리를 다시 호출한다는 뜻은 아니다. React는 업데이트가 발생한 컴포넌트와 관련 하위 트리를 렌더하고, 조건에 따라 작업을 생략할 수 있다. [React: Render and Commit](https://react.dev/learn/render-and-commit)

동일한 입력에 같은 결과를 내는 순수 계산은 예측과 테스트를 쉽게 한다. 하지만 UI 결과 테스트만으로 이벤트, 포커스, 외부 시스템 연동까지 검증할 수는 없다. 상태 기록을 되돌리는 디버깅도 필요한 입력의 기록과 복원 체계가 있어야 하며, 네트워크 부작용이나 DOM의 모든 상태가 자동 복원되지는 않는다.

다시 계산하는 UI 설명과 실제 DOM 교체를 구분해야 한다. React는 결과를 비교해 필요한 DOM 변경을 적용한다. 다만 계산량, 트리 크기, 조정 비용도 성능에 영향을 주므로 객체 생성은 언제나 무시할 만큼 싸다는 결론을 내리지 않는다.

## 3. Elements Are Just Objects

JSX는 변환 후 실행되면 React 엘리먼트라는 UI 설명 객체를 만든다. `<button />`을 평가하는 것 자체가 브라우저의 `HTMLButtonElement`를 만들거나 화면에 삽입하는 것은 아니다.

```jsx
const element = <button className="btn">Click me</button>;

// 자동 JSX 런타임을 사용하는 변환의 개념적 예시
const elementDescription = jsx('button', {
  className: 'btn',
  children: 'Click me',
});
```

`type`은 호스트 태그 문자열, 컴포넌트 함수·클래스 또는 특수 React 타입 등이 될 수 있다. `props`는 속성과 자식을 담고, `key`는 형제 항목의 식별에 사용된다. `children`은 일반적인 prop이지만 렌더 가능한 값의 규칙을 따른다. 임의 객체가 모두 유효한 자식인 것은 아니다.

엘리먼트와 props는 불변으로 취급한다. 개발 환경의 freeze는 얕은 동결이며, 중첩 객체를 복제하거나 깊게 동결하지 않는다. 엘리먼트 내부 구조를 앱 로직의 계약으로 삼지 않는다. [React: createElement](https://react.dev/reference/react/createElement)

엘리먼트 모델은 브라우저에만 국한되지 않지만, 웹의 `div`와 React Native의 `View` 등 호스트 타입은 렌더러마다 다르다. 동일한 웹 엘리먼트 트리를 모든 렌더러에서 그대로 사용할 수 있다는 뜻은 아니다.

## 4. JSX under the Hood

JSX는 HTML과 닮은 JS 문법 확장이다. 일반적인 브라우저 실행을 위해 변환하며 자동 런타임, 클래식 런타임, 개발 모드에 따라 생성 코드가 달라질 수 있다.

```jsx
// JSX
<button id="btn" {...props}>Click {name}</button>

// 자동 런타임의 개념적 결과: 여러 정적 자식은 jsxs를 사용할 수 있다.
jsxs('button', { id: 'btn', ...props, children: ['Click ', name] });
```

- 일반 속성과 spread는 선언 순서대로 적용되어 뒤의 값이 앞의 값을 덮어쓸 수 있다. `key` 등 특수 처리는 단순 객체 병합만으로 설명되지 않는다.
- `{}`에는 표현식을 넣는다. `if`·`for` 문장은 컴포넌트 본문에 작성하거나 표현식으로 바꾼다.
- `items.length && <List />`는 빈 목록에서 숫자 `0`을 반환한다. `items.length > 0 && <List />` 또는 삼항식을 사용한다. `null`, `undefined`, boolean은 화면 내용으로 표시되지 않지만 숫자 `0`은 표시된다. [React: Conditional Rendering](https://react.dev/learn/conditional-rendering)
- `className`, `htmlFor` 등 React DOM의 이름 규칙을 따른다. `data-*`, `aria-*`는 하이픈 표기를 유지한다. 모든 prop이 DOM 프로퍼티와 1:1 대응하는 것은 아니다.
- 스타일 객체는 `fontSize` 등 카멜 케이스를 사용한다. `width: 100`은 보통 `100px`로 적용되고 `opacity`, `zIndex`, `lineHeight`, `flex` 등은 단위 없는 숫자를 지원한다. [React DOM: Common components](https://react.dev/reference/react-dom/components/common)
- Fragment는 DOM 래퍼 없이 자식을 묶는다. 배열도 반환할 수 있으므로 반드시 부모 태그나 Fragment로 감쌀 필요는 없다. key가 필요한 Fragment에는 `<Fragment key={id}>` 형태를 쓴다. [React: Fragment](https://react.dev/reference/react/Fragment)
- JSX 자식 위치의 주석은 `{/* 주석 */}`으로 작성한다. 스타일 객체는 `style={{ color: 'red' }}`처럼 표현식과 객체 리터럴의 중괄호를 각각 쓴다.
- `return` 바로 다음 줄에 JSX를 쓰면 자동 세미콜론 삽입으로 `undefined`를 반환할 수 있다. 여러 줄 반환은 `return (`처럼 같은 줄에서 괄호를 연다.
- `key`는 컴포넌트의 일반 prop으로 전달되지 않는다. 내부에서 ID가 필요하면 `id` 같은 별도 prop도 전달한다.

## 5. Components and Purity

함수 컴포넌트의 렌더 계산은 같은 입력에 같은 결과를 내고, 렌더 전에 존재한 객체나 외부 상태를 변경하지 않아야 한다. 조건문, 반복문, 포맷팅 같은 계산은 허용된다. 현재 호출 안에서 새로 만든 배열에 `push`하는 지역 변경도 외부에서 관찰되지 않는다면 안전하다. 반면 props가 가리키는 공유 객체를 수정하는 것은 지역 변경이 아니다. [React: Keeping Components Pure](https://react.dev/learn/keeping-components-pure)

- 렌더 중 DOM 직접 변경, 모듈 변수 변경, 네트워크 부작용, 타이머 등록을 피한다.
- 사용자 동작에 따른 부작용은 이벤트 핸들러에서 처리한다.
- 외부 시스템과 지속적으로 동기화해야 할 때 Effect를 사용하고 필요한 정리를 제공한다. 파생 데이터 계산이나 특정 클릭 처리를 Effect에 몰아넣지 않는다. Effect는 클라이언트 커밋에 연결되지만 언제나 브라우저 paint 뒤에 실행된다는 보장은 없다. [React: useEffect](https://react.dev/reference/react/useEffect)
- StrictMode의 개발용 추가 호출은 순수성 문제를 드러내는 장치다. 코드 오류가 자동으로 증명되거나 모든 부작용이 검출되는 것은 아니다. [React: Keeping Components Pure](https://react.dev/learn/keeping-components-pure)
- 함수 호출의 지역 변수는 다음 호출까지 상태를 보존하지 않는다. React가 컴포넌트의 트리상 정체성과 연결해 상태를 유지한다. Fiber는 내부 구현을 설명하는 용어이며 앱이 의존할 공개 계약은 아니다.

컴포넌트를 직접 함수처럼 호출해 Hook 동작을 시험하기보다 React를 통해 렌더한다. 순수한 데이터 변환은 일반 함수로 직접 검사할 수 있다.

## 6. Render and Commit

Render는 컴포넌트를 호출하고 결과를 조정하는 계산이다. Commit은 준비된 변경을 화면에 연결된 DOM에 적용하는 단계이며 ref 연결 등이 포함된다. 렌더 중에는 현재 화면을 바꾸지 않지만, 초기 마운트에 필요한 분리된 DOM 노드를 준비하는 것까지 금지된다는 뜻은 아니다. Paint는 별도의 브라우저 작업이다. [React: Render and Commit](https://react.dev/learn/render-and-commit)

동시 렌더링에서 React는 작업을 일시 중단하거나 버리고 재시도할 수 있다. 이는 협력적 스케줄링이며 실행 중인 긴 컴포넌트 함수의 임의 명령을 즉시 선점한다는 뜻은 아니다. DOM 변경은 준비된 결과를 커밋할 때 수행한다. [React: React v18.0](https://react.dev/blog/2022/03/29/react-v18)

이벤트 핸들러의 setter는 업데이트를 요청한다. 같은 렌더의 상태값은 스냅샷이므로 호출 직후 읽는 값이 즉시 바뀌지 않는다. 이전 값을 바탕으로 여러 번 증가하려면 `setCount(c => c + 1)` 같은 업데이트 함수를 사용한다. React는 여러 요청을 배칭하지만 개별 사용자 이벤트를 무조건 하나로 묶지는 않는다. [React: Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)

React 18의 현대적 루트에서는 타이머와 Promise 콜백 등으로 자동 배칭 범위가 확장되었다. 이것을 모든 비동기 흐름이 반드시 한 번의 render/commit으로 끝난다는 보장으로 읽지 않는다. [React: React v18.0](https://react.dev/blog/2022/03/29/react-v18)

## 원문 주장과 보정 기록

아래 원문 열은 사용자 제공 Markdown의 주장 요약이다. 충돌하는 주장을 삭제하지 않고 함께 기록했다. 근거가 없는 절대적 성능·안전성 주장은 검증된 규칙으로 배포하지 않는다.

| 원문 주장 요약 | 보정 및 적용 한계 | 근거 |
| --- | --- | --- |
| 수동 DOM에서는 Drift가 불가피하며 큰 앱은 React보다 느려진다 | 수동 구현도 정확하고 빠를 수 있다. 필연성·성능 우열은 제공 자료만으로 입증되지 않는다. 동기화 책임을 줄인다는 동기로 사용한다. | 사용자 원문; 성능 측정 근거 미제공 |
| 컴포넌트는 표면적 도구이며 React가 항상 완벽한 동기화를 보장한다 | 컴포넌트의 조직·합성 역할도 중요하다. 잘못된 상태 모델이나 외부 DOM 변경까지 React가 자동 해결하지 않는다. | 사용자 원문에 대한 범위 보정 |
| JS 객체 생성은 항상 매우 싸고 Diff는 절대 최소 변경을 보장한다 | 정량 비용이나 수학적 최적해 보장으로 일반화하지 않는다. 렌더 계산 자체도 병목이 될 수 있다. | [Render and Commit](https://react.dev/learn/render-and-commit) |
| 엘리먼트와 props는 항상 완전히 freeze되고 props는 복사본이다 | 개발 모드의 얕은 freeze와 불변성 규칙을 구분한다. 중첩 참조는 공유될 수 있어 변경 시 부모 데이터도 오염될 수 있다. | [createElement](https://react.dev/reference/react/createElement) |
| `$$typeof: Symbol.for('react.transitional.element')`, 최상위 `ref`가 정확한 고정 구조다 | 내부 구조와 Symbol 이름은 버전에 의존한다. React 19는 `ref`를 prop으로 지원하고 `element.ref` 접근을 폐기 예정으로 다룬다. 내부 필드에 의존하지 않는다. | [React v19](https://react.dev/blog/2024/12/05/react-19) |
| `$$typeof`가 XSS를 방지한다 | 엘리먼트 위장 방어에 관한 원문 설명을 전체 XSS 방지 보장으로 확장할 수 없다. 이 문서는 내부 Symbol 검사를 보안 API로 검증하지 않았다. | 사용자 원문; 보안 보장 미검증 |
| 함수는 하나만 반환하므로 Fragment가 필수다 | 배열도 하나의 반환값이다. Fragment는 추가 DOM 없이 그룹을 표현하는 선택지다. | [Fragment](https://react.dev/reference/react/Fragment) |
| 모든 props는 DOM 프로퍼티에 1:1 매핑된다 | React DOM에 고유한 이름과 동작이 있으며 특수 prop과 이벤트도 존재한다. | [Common components](https://react.dev/reference/react-dom/components/common) |
| 컴포넌트는 오직 엘리먼트 객체만 반환한다 | 문자열, 숫자, 배열, 빈 노드 등 렌더 가능한 값도 존재한다. 서버에서 HTML을 생성하는 렌더러도 구분해야 한다. | [createElement](https://react.dev/reference/react/createElement) |
| 상태 배열만 저장하면 모든 UI를 타임 트래블할 수 있다 | 입력·컴포넌트 정체성·외부 상태의 복원 범위를 설계해야 한다. 단순 호출만으로 일반적 복원이 된다는 주장은 조건부다. | 사용자 원문의 순수 함수 모델에 대한 한계 명시 |
| DOM 노드는 반드시 커밋에서 처음 생성된다 | 초기 렌더에서 노드를 준비할 수 있다. 준비와 화면에 삽입하는 커밋을 구분한다. | [Render and Commit](https://react.dev/learn/render-and-commit) |
| 변경된 React 설명서가 있을 때만 브라우저가 paint한다 | CSS 애니메이션 등 React 밖의 요인도 paint를 유발할 수 있다. React 렌더 횟수와 브라우저 paint를 동일시하지 않는다. | 사용자 원문의 적용 범위 보정 |
| 커밋은 모든 상황에서 All-or-Nothing이다 | 동기적 DOM 반영을 DB 트랜잭션 같은 실패 롤백 보장으로 해석하지 않는다. 여러 루트와 모든 외부 관찰까지 원자성을 일반화하지 않는다. | [React v18.0](https://react.dev/blog/2022/03/29/react-v18); 트랜잭션 보장은 문서에 없음 |
| `await`, 타이머를 가리지 않고 언제나 한 번만 렌더·커밋한다 | 자동 배칭은 전체 비동기 작업의 단일 배치를 보장하지 않는다. `await` 전후가 같은 배치라고 가정하지 않으며 재시도·개발용 호출도 구분한다. | [Queueing updates](https://react.dev/learn/queueing-a-series-of-state-updates), [React v18.0](https://react.dev/blog/2022/03/29/react-v18) |
| Effect는 화면에 그려진 후 실행된다 | 커밋과 paint는 다르다. 상호작용에 따른 Effect는 paint 전에 실행될 수 있다. | [useEffect](https://react.dev/reference/react/useEffect) |

## 원문에 포함된 이미지 출처

다음 URL은 사용자가 제공한 그림의 출처로 보존한다. 이미지 내용은 이번 정규화의 검증 근거로 사용하지 않았으며 파일도 내려받지 않았다. 저자·제목·라이선스는 별도 확인되지 않았다.

- [JSX under the Hood 그림](https://www.arpitjsoni.com/react-internals/diagrams/renders/01-foundations/04-jsx-under-the-hood-d2.png)
- [Render and Commit 그림 1](https://www.arpitjsoni.com/react-internals/diagrams/renders/01-foundations/06-render-and-commit-d1.png)
- [Render and Commit 그림 2](https://www.arpitjsoni.com/react-internals/diagrams/renders/01-foundations/06-render-and-commit-d2.png)

본문의 보정 근거는 React 팀의 공식 문서이며 접근일은 2026-09-10이다. 자동 런타임 변환 예시는 개념 설명용이며 특정 컴파일러의 정확한 출력 스냅샷이 아니다.
