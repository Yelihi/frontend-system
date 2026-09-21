# 매직 넘버 없애기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/code-quality/code/examples/magic-number-cohesion.html
- 확인한 URL: https://frontend-fundamentals.com/code-quality/code/examples/magic-number-cohesion.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 823/823문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

애니메이션 시간과 후속 작업의 대기가 함께 변경되어야 한다는 응집 문제를 설명한다.

## 검토·해석 및 생략

상수 이름만 만들고 실제 애니메이션과 연결하지 않으면 응집 문제는 남는다. 완료 신호·공유 값의 실제 연결을 확인한다.
