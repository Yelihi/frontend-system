# 함께 수정되는 파일을 같은 디렉토리에 두기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/code-quality/code/examples/code-directory.html
- 확인한 URL: https://frontend-fundamentals.com/code-quality/code/examples/code-directory.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 1718/1718문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: 일반 프런트엔드 유지보수 개념; React 예제의 생명주기·라이브러리 API는 프로젝트별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

함께 바뀌는 파일을 기능 가까이 두어 탐색과 삭제 범위를 이해하기 쉽게 한다.

## 검토·해석 및 생략

디렉터리 배치는 import를 자동 차단하지 않으며 외부 참조가 남아 있으면 폴더 삭제만으로 안전하지 않다.
