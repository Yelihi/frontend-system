# 번들 분석

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/bundling/deep-dive/optimization/bundle-analyzer.html
- 확인한 URL: https://frontend-fundamentals.com/bundling/deep-dive/optimization/bundle-analyzer.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 1428/1428문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

산출물에서 큰 모듈·중복 의존을 찾는 번들 분석의 활용을 소개한다.

## 검토·해석 및 생략

용량만으로 라이브러리 교체를 결정하지 않는다. sideEffects:false의 일괄 적용은 CSS·초기화를 깨뜨릴 수 있어 제외한다.
