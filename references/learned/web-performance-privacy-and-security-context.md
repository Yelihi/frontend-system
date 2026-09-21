# 웹 성능·프라이버시·보안의 조사 범위

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

성능·데이터 수집·보안 개선 요청에서 무엇을 측정하고 어느 데이터 경로를 조사할지 정할 때.

## 판단에 사용할 내용

사용자 경험 지표, 필요한 수집 데이터, 제삼자 전달과 자산별 공격 경로를 구분해 조사 범위를 잡는다.

## 적용하지 않는 경우

HTTPS·CSP 설정만으로 보안 완결성이나 규정 준수를 선언하지 않는다.

## 개념과 근거

성능은 실제 로딩과 반응 시간뿐 아니라 사용자가 진행 상황을 인지하는 경험도 포함한다. 프라이버시에서는 필요한 데이터와 제삼자에게 전달되는 경로를 식별한다. 보안은 사이트의 실제 자산·행동·공격 경로에 따라 방어를 검토한다. HTTPS·CSP 같은 기초 조치가 모든 공격을 차단하거나 규정 준수를 보증하는 것은 아니다. 구체적 취약점 수정이나 정책 설계는 해당 상세 문서와 현재 구현을 추가 확인한다.

## 검토한 출처

- [Web performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
- [Privacy on the web](https://developer.mozilla.org/en-US/docs/Web/Privacy)
- [Security](https://developer.mozilla.org/en-US/docs/Web/Security)

적용 범위: 2026-09-21 MDN 웹 기술 허브 18개와 WebAssembly 허브 1개의 개요. 연결된 전체 표준·API·보안 가이드는 미검토이다.

탐색과 개념 구분에 한정했다. 보안 완결성·성능 보장·모든 브라우저 지원·PWA 설치 자격은 이 자료만으로 판단하지 않는다.
