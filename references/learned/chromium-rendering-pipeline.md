# Chromium의 style·layout·paint·합성 단계

검토일: 2026-09-21 · concept · implementation

## 참고 상황

화면 갱신 trace에서 Layout·Paint·Raster·Composite 비용을 구분하거나 CSS 모션이 어느 단계를 거치는지 설명할 때.

## 판단에 사용할 내용

단계별 입력·출력과 메인·compositor·Viz의 책임을 구분하고 실제 trace에서 생략 또는 반복되는 단계를 찾는다.

## 적용하지 않는 경우

Chromium 구현을 모든 브라우저의 표준 계약으로 보거나 transform이 항상 합성만으로 처리된다고 보장하지 않는다.

## 개념과 근거

렌더링은 스타일 결정, 배치, 그리기 명령, 래스터화와 합성 등 여러 단계다. 필요 없는 단계는 생략할 수 있고 조건이 맞는 시각 효과·스크롤은 메인 스레드의 일부 작업을 거치지 않을 수 있다.

DOM·프레임·프로세스·스레드는 서로 다른 단위다. 문서의 구성요소 설명을 고정된 프로세스 수나 iframe당 전용 스레드 보장으로 바꾸지 않는다. 현재 제품의 병목은 아키텍처 도식만으로 확정할 수 없으며 실제 측정과 연결한다.

## 검토한 출처와 범위

- [Chromium — RenderingNG architecture](https://developer.chrome.com/docs/chromium/renderingng-architecture) — Rendering pipeline와 processes·threads 개요의 설명. 이미지 도식·전체 엔진 소스·세부 플랫폼 분기는 제외.

적용 조건: 확인한 RenderingNG 아키텍처 설명. Chromium 버전·플랫폼·프레임 프로세스 배치는 실행 환경에서 확인한다.

읽은 범위의 개념 참조이며 제품 코드·예제 실행, 접근성·보안·성능 검증 완료를 뜻하지 않는다.
