# 웹 플랫폼·HTTP·URI·PWA

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

manifest를 추가했는데 오프라인·설치가 안 되거나 HTTP·URI·앱 상태의 역할이 혼동될 때.

## 판단에 사용할 내용

자원 식별·요청 응답·상태 관리·설치 메타데이터를 분리하고 필요한 상세 문서를 찾는다.

## 적용하지 않는 경우

이 허브 요약만으로 개별 캐시 헤더나 PWA 설치 요건을 확정하지 않는다.

## 개념과 근거

URI는 자원 식별 방식이며 scheme에 따라 요청 외의 동작도 일으킬 수 있다. HTTP의 요청·응답과 무상태성은 애플리케이션이 쿠키 등으로 상태를 관리할 수 없다는 뜻이 아니다. PWA의 설치·오프라인·백그라운드 동작은 각각 필요한 플랫폼 기능과 조건을 갖는다. manifest는 메타데이터를 전달하며 파일 하나를 추가하는 것만으로 모든 PWA 동작이 생기지 않는다. 이 허브 참조는 개별 헤더·캐시 정책·설치 요건의 상세 계약을 대신하지 않는다.

## 검토한 출처

- [HTTP: Hypertext Transfer Protocol](https://developer.mozilla.org/en-US/docs/Web/HTTP)
- [Web technology for developers](https://developer.mozilla.org/en-US/docs/Web)
- [Web application manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest)
- [Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [URIs](https://developer.mozilla.org/en-US/docs/Web/URI)

적용 범위: 2026-09-21 MDN 웹 기술 허브 18개와 WebAssembly 허브 1개의 개요. 연결된 전체 표준·API·보안 가이드는 미검토이다.

탐색과 개념 구분에 한정했다. 보안 완결성·성능 보장·모든 브라우저 지원·PWA 설치 자격은 이 자료만으로 판단하지 않는다.
