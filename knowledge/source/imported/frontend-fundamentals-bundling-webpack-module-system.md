# 모듈로 코드 구조화하기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/bundling/webpack-tutorial/module-system.html
- 확인한 URL: https://frontend-fundamentals.com/bundling/webpack-tutorial/module-system.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 5542/5542문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

전역 스크립트 의존성을 import/export로 명시하고 npm 패키지를 그래프에 연결한다.

## 검토·해석 및 생략

브라우저 ESM도 가능하다. import 형태만으로 필요 코드 제거·성능 향상이 보장되지는 않는다.
