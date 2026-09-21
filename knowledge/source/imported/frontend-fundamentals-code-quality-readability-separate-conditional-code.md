# 같이 실행되지 않는 코드 분리하기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/code-quality/code/examples/submit-button.html
- 확인한 URL: https://frontend-fundamentals.com/code-quality/code/examples/submit-button.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 1473/1473문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

권한별로 교차된 분기와 Effect를 별도 컴포넌트로 묶어 한 번에 읽는 맥락을 줄이는 예다.

## 검토·해석 및 생략

컴포넌트 분리는 상태·Effect 수명도 바꿀 수 있다. 단순한 조건까지 일괄 추출하는 규칙은 제외한다.
