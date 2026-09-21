# Radix UI Dialog 내 Select 컴포넌트 ESC 키 충돌 버그 사례

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/package/radix_ui_dialog_select_esc.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/package/radix_ui_dialog_select_esc.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 2749/2749문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

Radix Dialog와 Select의 독립적인 dismissable-layer 사본이 닫기 동작을 충돌시킨 사례다.

## 검토·해석 및 생략

먼저 실제 의존성 트리와 호환성을 확인한다. 오래된 버전 강제나 잠금 파일 삭제를 기본 처방으로 채택하지 않는다. Portal 자체가 모든 이벤트 차단 실패의 원인은 아니다.
