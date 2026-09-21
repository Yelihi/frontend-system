# CSS 박스·크기·레이아웃 선택

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

요소 너비가 넘치거나 margin·gap 계산이 예상과 다르고 flex와 grid 중 배치 방식을 고를 때.

## 판단에 사용할 내용

박스 경계·containing block·마진 병합 조건을 확인하고 한 방향 공간 배분과 행·열 배치 요구를 비교한다.

## 적용하지 않는 경우

포함 블록을 항상 직접 부모로 보거나 모든 수직 margin을 단순 합산하지 않는다.

## 개념과 근거

크기 문제에서는 content·padding·border·margin 경계와 containing block을 먼저 확인한다. 포함 블록이 항상 직접 부모인 것은 아니다. 마진 병합은 조건부이며 수직 마진을 무조건 합산하거나 최댓값으로만 계산하지 않는다. BFC는 블록·float 상호작용의 범위이며 flow-root가 생성 수단 중 하나다. flex는 한 차원의 공간 배분, grid는 행·열 배치, 다단은 콘텐츠의 열 흐름에 초점이 있다. gap과 박스 외부 margin은 위치와 의미가 다르다. 페이지·열 분할은 별도의 fragmentation 조건을 함께 검토한다.

## 검토한 출처

- [CSS box alignment](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_alignment)
- [CSS box model](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_model)
- [Introduction to the CSS box model](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_model/Introduction)
- [Mastering margin collapsing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_model/Margin_collapsing)
- [CSS box sizing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_sizing)
- [CSS display](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display)
- [Block formatting context](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Block_formatting_context)
- [Layout and the containing block](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Containing_block)
- [CSS flexible box layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout)
- [CSS fragmentation](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Fragmentation)
- [CSS gaps](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Gaps)
- [CSS grid layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout)
- [CSS multi-column layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Multicol_layout)
- [CSS paged media](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Paged_media)
- [CSS table](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Table)
- [CSS layout cookbook](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook)

적용 범위: 2026-09-21 MDN CSS 97개 등록 URL의 개요와 표시 본문 앞부분. 전체 하위 가이드·모든 속성 계약·호환성 표를 완독한 자료가 아니다.

기능 분류와 확인된 기본 관계를 concept로 반영했다. 목록의 모든 기능이 구현되었다고 해석하지 않는다. 세부 문법·예외·접근성·실행 성능은 기능을 채택할 때 해당 하위 문서와 대상 환경에서 확인한다.
