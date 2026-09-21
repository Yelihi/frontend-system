# web.dev — Avoid large, complex layouts and layout thrashing

## 출처와 수집 상태

- 요청·원문 URL: https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing
- 저자 / 발행처: Google web.dev
- 수집·검토일: 2026-09-21
- 게시·수정일: 아래 확인 범위에 적힌 날짜 외에는 미확인
- 보존 방식: summary — AI가 작성한 요약. 전문 복제 아님
- 확인 범위: 레이아웃 비용, 스타일 쓰기 뒤 측정, read/write 반복 예시, DevTools 관찰 방법.
- 원격 확인: needs-host · HTML은 호스트 웹 도구로 본문 확인; 텍스트 ACK 없음
- 누락 범위: 위에 명시한 부분 외의 하위 링크, 삽입 데모·영상·실행 검증은 포함하지 않음

## 출처 내용 요약

스타일 변경 직후 치수를 읽으면 동기 레이아웃이 필요할 수 있고 루프에서 읽기·쓰기를 섞으면 비용이 반복될 수 있다. 측정으로 병목을 확인하고 불필요한 반복을 줄인다.

## 검토 해석과 제외한 주장

읽기 순서를 바꿔도 의미가 유지되는지 확인한다. 변경 후 치수가 필요한 작업을 이전 값으로 대체하지 않으며 크기를 영구 캐시하지 않는다. 예시 16ms·DOM 수치를 공통 임계값으로 사용하지 않는다.
