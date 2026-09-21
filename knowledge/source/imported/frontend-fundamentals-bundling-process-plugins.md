# 플러그인

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/plugin.html
- 확인한 URL: https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/plugin.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 3636/3636문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

compiler 훅에서 빌드 결과·HTML·상수 치환을 다루는 플러그인 구조를 설명한다.

## 검토·해석 및 생략

예제 클래스명 불일치를 제외한다. DefinePlugin은 클라이언트의 비밀 런타임 환경을 제공하지 않는다.
