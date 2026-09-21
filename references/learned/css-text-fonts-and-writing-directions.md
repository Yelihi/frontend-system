# CSS 텍스트·글꼴·쓰기 방향

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

웹폰트 로딩 후 줄바꿈이 바뀌거나 RTL·세로쓰기에서 여백·정렬이 반대로 보일 때.

## 판단에 사용할 내용

폰트 대체·인라인 배치·공백 처리와 논리 방향을 확인하고 생성 콘텐츠의 의미 전달을 별도로 점검한다.

## 적용하지 않는 경우

CSS로 생성한 필수 정보가 모든 보조 기술에 전달된다고 가정하지 않는다.

## 개념과 근거

글꼴 선택과 자원 로딩·실패 대체를 함께 고려한다. 인라인 줄 배치와 baseline, 텍스트의 줄바꿈·공백 처리, 장식은 다른 층위의 기능이다. block·inline과 start·end는 쓰기 방향에 따라 물리적 의미가 달라진다. ruby는 본문에 짧은 주석을 붙이는 표현이고 카운터·생성 콘텐츠는 시각 표현 기능이다. ::highlight()는 Range를 꾸미면서 DOM 구조를 바꾸지 않는다. CSS로 생성한 필수 정보가 모든 접근성 경로에 충분히 전달된다고 가정하지 않는다.

## 검토한 출처

- [CSS counter styles](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Counter_styles)
- [CSS custom highlight API](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Custom_highlight_API)
- [CSS font loading](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Font_loading)
- [CSS fonts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Fonts)
- [CSS generated content](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Generated_content)
- [CSS inline layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Inline_layout)
- [CSS lists and counters](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Lists)
- [CSS logical properties and values](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Logical_properties_and_values)
- [CSS ruby layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Ruby_layout)
- [CSS text](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Text)
- [CSS text decoration](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Text_decoration)
- [CSS writing modes](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Writing_modes)

적용 범위: 2026-09-21 MDN CSS 97개 등록 URL의 개요와 표시 본문 앞부분. 전체 하위 가이드·모든 속성 계약·호환성 표를 완독한 자료가 아니다.

기능 분류와 확인된 기본 관계를 concept로 반영했다. 목록의 모든 기능이 구현되었다고 해석하지 않는다. 세부 문법·예외·접근성·실행 성능은 기능을 채택할 때 해당 하위 문서와 대상 환경에서 확인한다.
