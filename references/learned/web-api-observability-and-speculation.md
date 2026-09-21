# 플랫폼 측정·보고와 예상 탐색

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

브라우저 계측·오류 보고 범위를 정하거나 prefetch·prerender를 추가할지 판단할 때.

## 판단에 사용할 내용

타임라인·표본·근사 신호·정책 보고를 구분하고 예상 탐색의 네트워크 비용과 부수 효과를 확인한다.

## 적용하지 않는 경우

표본을 전체 실행 기록으로 보거나 측정 없이 사전 로딩의 성능 향상을 보장하지 않는다.

## 개념과 근거

Console은 진단 출력, Performance는 타임라인 측정, Self-Profiling은 콜스택 표본, Compute Pressure는 자원 압력 신호다. 표본과 근삿값을 정확한 전체 실행 기록으로 취급하지 않는다. Reporting은 정책 위반·폐기 기능 등 플랫폼 보고이고 애플리케이션의 모든 실패를 자동 수집하지 않는다.

Speculation Rules는 미래 문서 탐색의 prefetch·prerender를 대상으로 하며 모든 하위 자원을 위한 기능은 아니다. 후보 URL의 부수 효과·네트워크 비용·비활성 사전 실행 제한을 상세 문서에서 확인한다. 새 계측 도구를 무조건 추가하거나 측정 없이 성능 향상을 단정하는 규칙으로 사용하지 않는다.

## 검토한 출처

- [Compute Pressure API](https://developer.mozilla.org/en-US/docs/Web/API/Compute_Pressure_API)
- [Console API](https://developer.mozilla.org/en-US/docs/Web/API/Console_API)
- [JS Self-Profiling API](https://developer.mozilla.org/en-US/docs/Web/API/JS_Self-Profiling_API)
- [Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- [Reporting API](https://developer.mozilla.org/en-US/docs/Web/API/Reporting_API)
- [Speculation Rules API](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
