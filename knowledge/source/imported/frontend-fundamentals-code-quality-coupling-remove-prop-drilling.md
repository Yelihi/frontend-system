# Props Drilling 지우기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/code-quality/code/examples/item-edit-modal.html
- 확인한 URL: https://frontend-fundamentals.com/code-quality/code/examples/item-edit-modal.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 4645/4645문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

중간 컴포넌트가 쓰지 않는 prop 전달을 composition으로 줄이고 필요하면 context를 검토한다.

## 검토·해석 및 생략

의미 있는 props는 문제 자체가 아니다. context는 암묵적 의존을 늘릴 수 있고 원문 context 예제에는 제공자와 값 정의가 빠져 있어 완성 코드로 배포하지 않는다.
