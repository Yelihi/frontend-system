# THREE.Cache.enabled로 인한 메모리 누수

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/javascript/three_cache_enabled_memory_leak.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/javascript/three_cache_enabled_memory_leak.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 1438/1438문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

서명 URL이 계속 바뀌어 Three.js 캐시가 누적된 메모리 문제를 설명한다.

## 검토·해석 및 생략

GPU 자원 해제와 JS 캐시 참조 해제를 분리해 조사한다. 모든 캐시를 비활성화하라는 규칙은 아니다.
