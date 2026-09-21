# Chromium — RenderingNG architecture

## 출처와 수집 상태

- 요청·원문 URL: https://developer.chrome.com/docs/chromium/renderingng-architecture
- 저자 / 발행처: Google Chrome for Developers
- 수집·검토일: 2026-09-21
- 게시·수정일: 아래 확인 범위에 적힌 날짜 외에는 미확인
- 보존 방식: summary — AI가 작성한 요약. 전문 복제 아님
- 확인 범위: Rendering pipeline와 processes·threads 개요의 설명. 이미지 도식·전체 엔진 소스·세부 플랫폼 분기는 제외.
- 원격 확인: needs-host · HTML은 호스트 웹 도구로 본문 확인; 텍스트 ACK 없음
- 누락 범위: 위에 명시한 부분 외의 하위 링크, 삽입 데모·영상·실행 검증은 포함하지 않음

## 출처 내용 요약

style·layout·paint·raster·compositing은 서로 다른 단계다. 조건에 따라 일부 단계를 건너뛰며 작업은 메인·compositor 스레드와 Viz 등의 구성요소로 나뉜다.

## 검토 해석과 제외한 주장

Chromium 구현 개요이며 웹 표준 계약이 아니다. transform만으로 메인 스레드 작업이 항상 사라진다고 보거나 같은 탭·iframe마다 별도 스레드가 있다고 일반화하지 않는다. 실제 trace 검증 없음.
