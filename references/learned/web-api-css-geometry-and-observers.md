# CSSOM·기하·관찰자·애니메이션

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

요소 크기·교차 상태를 관찰하거나 좌표 변환·글꼴 로딩·화면 전환 API를 선택할 때.

## 판단에 사용할 내용

ResizeObserver와 IntersectionObserver의 관찰 대상, CSS 값·기하 타입 및 모션 취소·포커스 요구를 구분한다.

## 적용하지 않는 경우

교차를 사용자의 실제 인지로 보거나 새 기하 API의 성능 우위를 측정 없이 단정하지 않는다.

## 개념과 근거

CSSOM의 문자열 값과 Typed OM의 타입 있는 값을 구분한다. Houdini는 여러 하위 API의 묶음으로 각 기능의 지원을 따로 확인한다. 등록 속성의 타입·상속 메타데이터, 글꼴 로딩과 FontFaceSet 등록, Range 강조는 각각 다른 작업이다.

CSSOM View는 좌표·스크롤, Geometry는 점·행렬 등의 교환 타입이다. 기하 API 채택만으로 계산이 더 빠르다고 단정하지 않는다. IntersectionObserver는 교차 변화이고 ResizeObserver는 크기 변화이며 사용자가 실제 내용을 인지했다는 확정 증거는 아니다. Web Animations와 View Transition에는 취소·포커스·줄인 모션 등 사용자 경험을 함께 고려한다. CSS·SVG 조작이 모든 자원 비용을 없애지 않는다.

## 검토한 출처

- [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
- [CSS Font Loading API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Font_Loading_API)
- [CSS Object Model (CSSOM)](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model)
- [CSS Painting API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Painting_API)
- [CSS Properties and Values API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Properties_and_Values_API)
- [CSS Typed Object Model API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Typed_OM_API)
- [CSSOM view API](https://developer.mozilla.org/en-US/docs/Web/API/CSSOM_view_API)
- [Geometry interfaces](https://developer.mozilla.org/en-US/docs/Web/API/Geometry_interfaces)
- [Houdini APIs](https://developer.mozilla.org/en-US/docs/Web/API/Houdini_APIs)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Resize Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API)
- [SVG API](https://developer.mozilla.org/en-US/docs/Web/API/SVG_API)
- [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
