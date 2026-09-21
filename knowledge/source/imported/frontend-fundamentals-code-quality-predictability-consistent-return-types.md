# 같은 종류의 함수는 반환 타입 통일하기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/code-quality/code/examples/use-user.html
- 확인한 URL: https://frontend-fundamentals.com/code-quality/code/examples/use-user.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 3634/3634문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

비슷한 API Hook과 검증 함수에서 반환 모양의 불일치가 호출자 오해를 만드는 이유를 설명한다.

## 검토·해석 및 생략

서로 다른 의미의 함수를 같은 타입으로 억지 통일하지 않는다. {ok:false}도 truthy이므로 판별 필드를 읽어야 한다.
