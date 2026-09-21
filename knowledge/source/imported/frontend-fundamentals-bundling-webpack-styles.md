# 스타일 관리하기

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/bundling/webpack-tutorial/style.html
- 확인한 URL: https://frontend-fundamentals.com/bundling/webpack-tutorial/style.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 1975/1975문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

css-loader 변환과 style-loader의 DOM 스타일 주입을 연결한다.

## 검토·해석 및 생략

CSS import 자체가 사용하지 않는 선택자 제거를 뜻하지 않는다. loader의 일반 변환 순서와 다른 훅 동작을 혼동하지 않는다.
