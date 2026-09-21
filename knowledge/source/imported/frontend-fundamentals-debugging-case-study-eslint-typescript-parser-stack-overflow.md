# ESLint/TSC 파싱 콜스택 오버플로우 디버깅

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/compile/codegen_callstack_overflow_debug.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/compile/codegen_callstack_overflow_debug.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 1943/1943문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

매우 긴 생성 코드의 메서드 체인이 파서 호출 스택 한계에 닿은 경험이다.

## 검토·해석 및 생략

560개 실패·100개 분할은 해당 도구와 환경의 관측값이며 보편적 제한이 아니다.
