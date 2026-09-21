# React Query 사용 중 반환 타입 단언 오류

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/typescript/react_query_refetch_typescript.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/typescript/react_query_refetch_typescript.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 2997/2997문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

React Query의 선언한 타입과 실제 응답 구조가 달라 refetch 후 문제가 드러난 사례다.

## 검토·해석 및 생략

제네릭 타입은 런타임 데이터를 변환하지 않는다. 실제 매핑과 오류 경로를 확인한다.
