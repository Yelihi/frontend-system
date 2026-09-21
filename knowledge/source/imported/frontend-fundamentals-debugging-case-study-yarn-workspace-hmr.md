# yarn Workspace에서 공통 패키지 수정 시 HMR이 동작하지 않는 문제 디버깅

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/yarn/yarn_workspace_hmr_debug.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/yarn/yarn_workspace_hmr_debug.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 1760/1760문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

Yarn 워크스페이스에서 패키지 해석과 HMR 문제를 함께 조사한 경험이다.

## 검토·해석 및 생략

PnP 채택만으로 모든 개발 서버의 감시와 HMR이 보장되지는 않는다. 원문의 설정 예시와 최신 도구 호환성을 검증 없이 복제하지 않는다.
