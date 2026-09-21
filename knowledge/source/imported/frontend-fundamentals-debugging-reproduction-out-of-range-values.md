# 일반적인 범위에서 벗어나도록 재현하기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/reproduce/out-range.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/reproduce/out-range.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 2039/2039문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

경계 전후 값과 극단적인 입력으로 오류 조건을 찾는다.

## 검토·해석 및 생략

문자열 length는 사용자 인식 글자 수와 다를 수 있다. 안전 정수 범위 초과가 모든 개별 값의 표현 불가능을 의미하지는 않는다.
