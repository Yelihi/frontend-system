# 실시간 차트 페이지 만들다가 메모리 터져서 브라우저 죽은 이야기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/react/react_unmount_cleanup.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/react/react_unmount_cleanup.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 1746/1746문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

실시간 차트에서 누적 데이터와 소켓·타이머 정리 누락을 조사한 경험이다.

## 검토·해석 및 생략

네이티브 WebSocket의 connect 예제와 exhaustive-deps가 정리를 보장한다는 해석은 채택하지 않는다. 데이터 상한은 제품 요구에 따른다.
