# CSS 색·이미지·장식 효과

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

이미지 자르기·마스킹·혼합 효과를 선택하거나 고대비 환경에서 장식과 포커스 단서가 사라질 때.

## 판단에 사용할 내용

clip·mask·filter·blend와 shape-outside의 목적을 구분하고 사용자 색상 설정에서 정보가 유지되는지 본다.

## 적용하지 않는 경우

그림자·불투명도만으로 대비나 합성 성능이 확보되었다고 판단하지 않는다.

## 개념과 근거

배경과 테두리·그림자는 박스 장식이고, blending은 색을 혼합하며, filter는 렌더링 효과를 처리한다. clipping은 경로 안팎을 구분하고 masking은 투명도·휘도 기반 가시성을 조정한다. shape-outside는 float 주변 텍스트 흐름에 관여하므로 단순히 이미지를 자르는 것과 다르다. 사용자 색상·강제 대비 환경과 포커스 단서를 고려한다. 그림자·불투명도만으로 충분한 대비나 합성 성능을 보장한다고 해석하지 않는다.

## 검토한 출처

- [CSS backgrounds and borders](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Backgrounds_and_borders)
- [CSS basic user interface](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Basic_user_interface)
- [CSS borders and box decorations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Borders_and_box_decorations)
- [CSS color adjustment](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Color_adjustment)
- [CSS colors](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Colors)
- [CSS compositing and blending](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Compositing_and_blending)
- [CSS filter effects](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Filter_effects)
- [CSS images](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Images)
- [CSS masking](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Masking)
- [CSS shapes](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Shapes)

적용 범위: 2026-09-21 MDN CSS 97개 등록 URL의 개요와 표시 본문 앞부분. 전체 하위 가이드·모든 속성 계약·호환성 표를 완독한 자료가 아니다.

기능 분류와 확인된 기본 관계를 concept로 반영했다. 목록의 모든 기능이 구현되었다고 해석하지 않는다. 세부 문법·예외·접근성·실행 성능은 기능을 채택할 때 해당 하위 문서와 대상 환경에서 확인한다.
