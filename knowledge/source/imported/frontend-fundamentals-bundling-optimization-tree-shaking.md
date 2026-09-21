# 트리셰이킹(Tree Shaking)

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/bundling/deep-dive/optimization/tree-shaking.html
- 확인한 URL: https://frontend-fundamentals.com/bundling/deep-dive/optimization/tree-shaking.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 5969/5969문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

사용되는 export와 모듈 평가의 부수 효과를 분석해 코드를 제거한다.

## 검토·해석 및 생략

import/export는 모듈 최상위이지 물리적 첫 줄이 아니다. console.log getter도 부수 효과가 있고 sideEffects:false는 부수 효과 제거 기능이 아니다.
