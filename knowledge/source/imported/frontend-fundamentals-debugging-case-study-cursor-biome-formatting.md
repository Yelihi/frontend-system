# Cursor에서 Biome 포맷팅이 동작하지 않는 현상 디버깅

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/cursor/cursor_biome_formatting_debug.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/cursor/cursor_biome_formatting_debug.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 2071/2071문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

에디터 Biome 확장과 프로젝트 바이너리의 버전 불일치를 로그로 조사한 경험이다.

## 검토·해석 및 생략

재부팅과 재설치를 함께 했으므로 각각의 인과 효과가 분리 검증되지 않았다. 특정 확장 버전 고정과 자동 업데이트 금지를 일반 규칙으로 만들지 않는다.
