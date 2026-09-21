# Canvas·WebGL·WebGPU·XR

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

Canvas·WebGL·WebGPU·XR 중 렌더링 경로를 고르거나 그래픽 장치 상실·대체 UI를 검토할 때.

## 판단에 사용할 내용

픽셀 출력과 의미 있는 조작 구조, 버전·확장·장치 한도·세션 조건을 나누어 상세 구현 자료를 찾는다.

## 적용하지 않는 경우

최신 API라는 이유로 교체하거나 픽셀 출력만으로 접근성·성능을 충족했다고 보지 않는다.

## 개념과 근거

Canvas의 그려진 픽셀은 의미 있는 DOM을 자동 생성하지 않는다. 중요한 콘텐츠에는 접근 가능한 구조와 조작 경로가 필요하다. WebGL의 버전·확장, WebGPU의 장치·한도·파이프라인, WebXR의 세션·입출력 장치는 별도 지원 조건을 갖는다. 최신 API라는 이유만으로 기존 구현을 교체하거나 특정 장치의 가속·성능을 보장하지 않는다. 그래픽 자원의 수명·장치 상실·권한·대체 렌더링을 실제 사용 가이드에서 추가 확인한다.

## 검토한 출처

- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [WebGL: 2D and 3D graphics for the web](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
- [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
