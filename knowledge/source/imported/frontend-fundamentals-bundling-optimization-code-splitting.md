# 코드 스플리팅

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/bundling/deep-dive/optimization/code-splitting.html
- 확인한 URL: https://frontend-fundamentals.com/bundling/deep-dive/optimization/code-splitting.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 4149/4149문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

동적 import와 공유 청크로 초기 다운로드와 후속 로딩을 나눈다.

## 검토·해석 및 생략

추가 왕복·실패 처리·캐시 영향이 있다. 예시 임계값과 라이브러리를 최적값·필수 의존으로 채택하지 않는다.
