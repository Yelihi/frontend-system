# 네이티브 버튼·링크·폼과 실제 HTML 구조

검토일: 2026-09-21 · 분류: concept · 근거: 공개 문서와 검토한 원본 요약

## 참고 상황

클릭만 되는 행·가짜 버튼, 중첩 버튼 또는 Enter 제출 오류를 조사할 때.

## 판단에 사용할 내용

최종 DOM의 button·a·form 의미, 콘텐츠 모델과 제출 경로를 확인해 키보드와 탐색 동작의 누락을 찾는다.

## 적용하지 않는 경우

stopPropagation으로 잘못된 HTML 구조를 해결하거나 모든 입력을 form 내부로 옮기는 근거가 아니다.

## 개념과 근거

동작을 실행하는 button과 목적지로 이동하는 a[href]는 기본 키보드 조작과 브라우저 기능이 다르다. 클릭 핸들러나 role=button만으로 이 동작이 모두 생기지는 않는다. 커스텀 버튼은 포커스와 Enter/Space, 비활성 상태를 별도로 처리해야 한다. CSS display 값이 HTML 콘텐츠 모델을 바꾸지는 않는다. [버튼 동작 원문](https://frontend-fundamentals.com/a11y/predictability/fake-button.html).

일반 button 안에 다른 button이나 링크 같은 interactive content를 넣는 것은 콘텐츠 모델에 맞지 않는다. stopPropagation은 이벤트 전파만 제어하며 DOM 구조를 유효하게 만들지 않는다. 다만 모든 interactive 요소의 중첩을 금지하는 일반화도 틀리다. label과 그 입력처럼 허용된 관계가 있으므로 실제 태그의 규칙을 확인한다. 디자인 시스템 이름이 아니라 최종 DOM이 기준이다. [MDN button](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button), [중첩 원문](https://frontend-fundamentals.com/a11y/structure/button-inside-button.html).

테이블 행의 onclick만으로는 링크의 탐색 기능과 키보드 경로가 없다. 셀 안의 실제 링크는 한 선택지이고 행을 덮는 링크 오버레이는 선택적 구성이다. 오버레이가 텍스트 선택, 다른 컨트롤, 포커스 표시를 가릴 수 있다는 비용을 확인한다. 기존 행 클릭에 동등한 링크·키보드 경로가 있다면 무조건 제거할 이유는 없다. [행 링크 원문](https://frontend-fundamentals.com/a11y/structure/table-row-link.html).

form은 제출 동작을 묶는다. 제출 로직을 버튼 클릭에만 두면 다른 제출 경로를 놓칠 수 있다. 버튼의 type과 form owner가 실제 의도에 맞는지 확인한다. 모든 입력이 form 자손일 필요는 없으며 외부 form 연결이나 독립 설정 입력도 있다. Enter 처리에서는 textarea와 IME 조합 상태를 구분한다. [폼 원문](https://frontend-fundamentals.com/a11y/predictability/form.html).

검토 대상은 접근성 경로와 의미의 불일치다. 새로운 라이브러리 도입, 모든 행 클릭 금지, 모든 input의 form 강제 같은 공용 정책은 이 자료에서 도출하지 않는다.

원본 catalog ID: `frontend-fundamentals-accessibility-why-accessibility`, `frontend-fundamentals-accessibility-structure-avoid-nested-buttons`, `frontend-fundamentals-accessibility-structure-accessible-table-row-links`, `frontend-fundamentals-accessibility-predictability-button-behavior`, `frontend-fundamentals-accessibility-predictability-form-semantics`.

