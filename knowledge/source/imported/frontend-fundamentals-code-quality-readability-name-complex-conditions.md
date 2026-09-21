# 복잡한 조건에 이름 붙이기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/code-quality/code/examples/condition-name.html
- 확인한 URL: https://frontend-fundamentals.com/code-quality/code/examples/condition-name.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 1764/1764문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

중첩 조건의 의미를 변수 이름으로 드러내고 단순한 일회성 표현식은 유지하는 선택을 비교한다.

## 검토·해석 및 생략

표현식 추출은 단락 평가 순서를 바꿀 수 있으므로 부작용과 비용을 확인한다. 조건마다 함수화하지 않는다.
