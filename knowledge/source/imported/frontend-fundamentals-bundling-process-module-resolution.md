# 경로 탐색

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/resolution.html
- 확인한 URL: https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/resolution.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 5685/5685문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

상대 경로·패키지·별칭·확장자 및 TypeScript와 번들러의 해석 일치를 설명한다.

## 검토·해석 및 생략

src/...는 설정 없이 절대 경로가 아니다. 원문의 경로 오타와 Node 내장 모듈의 브라우저 자동 지원 주장을 제외한다.
