# 숨은 로직 드러내기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/code-quality/code/examples/hidden-logic.html
- 확인한 URL: https://frontend-fundamentals.com/code-quality/code/examples/hidden-logic.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 971/971문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

잔액 조회에 숨은 로깅을 호출자의 업무 흐름으로 분리해 예측 가능성을 높인다.

## 검토·해석 및 생략

관측·감사 요구 때문에 내부 로깅이 계약인 경우는 반례다. 이동만으로 로깅 실패의 영향이 사라지는 것은 아니다.
