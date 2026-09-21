# 개발 서버

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/bundling/deep-dive/dev/dev-server.html
- 확인한 URL: https://frontend-fundamentals.com/bundling/deep-dive/dev/dev-server.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 3140/3140문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

개발 서버의 파일 감지·라우팅 fallback·프록시·HTTPS를 설명한다.

## 검토·해석 및 생략

개발 프록시는 배포 CORS 설정의 대체가 아니다. changeOrigin은 일반적으로 Host 관련 옵션이며 인증서 검증 해제를 보편 해법으로 배포하지 않는다.
