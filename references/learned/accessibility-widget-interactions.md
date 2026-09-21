# 탭·아코디언·선택 컨트롤의 키보드 상호작용

검토일: 2026-09-21 · 분류: concept · 근거: 공개 문서와 검토한 원본 요약

## 참고 상황

탭 방향키가 동작하지 않거나 라디오·스위치의 선택 상태와 포커스가 어긋날 때.

## 판단에 사용할 내용

위젯 종류에 맞는 Tab 진입점, 방향키·Space·Enter 처리, 선택 상태와 패널 연결을 대조한다.

## 적용하지 않는 경우

네이티브 컨트롤을 모두 커스텀 ARIA 위젯으로 교체하거나 예제 JSX를 완성품으로 복사하지 않는다.

## 개념과 근거

이 참조는 일반 웹 위젯의 동작 모델이다. 이름·상태·키보드 처리·포커스가 함께 맞아야 하며, 원문의 간략한 JSX는 완성된 구현이 아니다.

- 탭: tablist 안의 활성 탭으로 진입하고 방향키로 다른 탭에 이동한다. 수동 활성화 방식에서는 Enter/Space가 패널을 선택한다. 자동 활성화는 패널 표시 지연이 거의 없는 경우에 적합하다. tab/tabpanel의 연결 ID, 선택 상태, 표시 상태가 일치해야 한다. [APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
- 아코디언: 기본 펼침은 details/summary로 표현할 수 있다. 커스텀 패턴은 제목의 버튼과 expanded·패널 연결을 관리한다. 원문 예제의 존재하지 않는 labelledby ID는 사용할 수 없다. 모든 패널에 region을 붙이면 불필요한 랜드마크가 늘 수 있다. [APG accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).
- 라디오: 한 그룹에서 최대 하나를 선택한다. 이미 선택한 항목을 Space로 다시 활성화해도 해제하지 않는다. 일반 커스텀 그룹은 방향키 이동과 선택을 함께 처리하지만 toolbar 내부는 별도 패턴이다. 원문의 개별 setChecked(!checked) 코드는 이 모델을 충족하지 못한다. [APG radio](https://www.w3.org/WAI/ARIA/apg/patterns/radio/).
- 체크박스: 항목을 독립적으로 켜고 끄는 의미다. 관련 항목은 그룹명이 도움이 되지만 단독 항목에 그룹을 억지로 만들지는 않는다. React controlled 입력은 변경 이벤트와 실제 상태를 연결해야 한다. [원문 checkbox](https://frontend-fundamentals.com/a11y/ui-foundation/checkbox.html).
- 스위치: 켜짐/꺼짐의 두 상태이며 이름은 상태 전환에도 유지된다. Space로 조작하고 네이티브 checkbox 기반이면 checked를 상태로 사용한다. hidden 입력을 유일한 조작 대상으로 둔 원문 예제는 배포하지 않는다. hidden은 시각적인 감춤만을 뜻하지 않는다. [APG switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/), [MDN hidden](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden).

검토할 질문: Tab 진입점, 방향키/Space/Enter 처리, 상태 변경, 표시되는 포커스, 이름 계산이 함께 작동하는가? 이미 이 동작을 제공하는 네이티브 요소나 검증된 컴포넌트라면 역할을 다시 구현할 필요가 없다. 브라우저·보조 기술의 세부 동작과 실제 제품 검증은 별도다.

원본 catalog ID: `frontend-fundamentals-accessibility-components-tabs`, `frontend-fundamentals-accessibility-components-accordion`, `frontend-fundamentals-accessibility-components-radio`, `frontend-fundamentals-accessibility-components-checkbox`, `frontend-fundamentals-accessibility-components-switch`.

