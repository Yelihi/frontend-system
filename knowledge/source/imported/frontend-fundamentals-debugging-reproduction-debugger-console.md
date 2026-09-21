# 디버거와 콘솔로그 활용하기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/reproduce/debugger.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/reproduce/debugger.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 2583/2583문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

중단점과 콘솔의 표·그룹·시간·호출 추적 기능으로 실행을 관찰한다.

## 검토·해석 및 생략

console.assert는 일반적으로 예외를 던지는 검증 도구가 아니다. 관찰 오버헤드와 객체의 지연 표시를 고려한다.
