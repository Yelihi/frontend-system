# 로직 종류에 따라 합쳐진 함수 쪼개기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/code-quality/code/examples/use-page-state-readability.html
- 확인한 URL: https://frontend-fundamentals.com/code-quality/code/examples/use-page-state-readability.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 2627/2627문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

페이지의 모든 쿼리를 관리하는 Hook 대신 관심 값별 인터페이스를 두어 책임 범위를 줄인다.

## 검토·해석 및 생략

예제의 누락 import·setter 인자·의존성은 재검증 전 사용하지 않는다. Hook 분리만으로 구독 범위나 렌더 횟수가 줄어든다는 보장은 제외한다.
