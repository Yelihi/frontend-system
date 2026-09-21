# React — You Might Not Need an Effect

## 출처와 수집 상태

- 요청·원문 URL: https://react.dev/learn/you-might-not-need-an-effect
- 저자 / 발행처: React
- 수집·검토일: 2026-09-21
- 게시·수정일: 아래 확인 범위에 적힌 날짜 외에는 미확인
- 보존 방식: summary — AI가 작성한 요약. 전문 복제 아님
- 확인 범위: 공식 Markdown의 설명 본문·Recap과 앞부분 코드. 파생 값·이벤트·외부 동기화 구분에 한정해 배포. 뒤쪽 코드 전체와 Challenges는 미검토.
- 원격 확인: pending-review · 스냅샷 SHA-256 b32370f3f29b26c0dcdea24475c88a807898585e69913f3b027fa2b8dccf41f5
- 누락 범위: 위에 명시한 부분 외의 하위 링크, 삽입 데모·영상·실행 검증은 포함하지 않음

## 출처 내용 요약

기존 props·state로 계산할 값과 특정 사용자 이벤트 처리를 Effect로 우회하지 않는다. 외부 시스템과 동기화하는 Effect는 별개이며 메모이제이션은 계산 비용을 확인한 뒤 판단한다.

## 검토 해석과 제외한 주장

Effect 일괄 삭제 규칙으로 만들지 않는다. 뒷부분 상태 조정·초기화·구독·fetch 예제의 처방은 이번 참조에서 배포하지 않는다. 원격 스냅샷은 미검토 예제·연습문제의 검토를 위해 ACK하지 않는다.
