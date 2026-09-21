# 청크·캐시·트리 셰이킹과 번들 분석

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

초기 JavaScript가 크거나 분할 청크 로딩이 실패하고 production에서 CSS·초기화가 사라질 때.

## 판단에 사용할 내용

청크 로드 시점·실패 경로·배포 캐시와 sideEffects 표시를 확인하고 번들 크기와 실제 사용자 지표를 따로 비교한다.

## 적용하지 않는 경우

모든 모듈을 lazy load하거나 sideEffects:false를 일괄 추가하지 않는다.

## 개념과 근거

코드 분할은 초기 로드에서 필요 없는 작업을 뒤로 미룬다. 대신 후속 요청·실패 처리·지연이 생길 수 있어 청크 수나 예제 임계값만으로 최적화를 판정할 수 없다. 내용 해시가 붙은 URL은 변경 파일의 식별을 돕지만 HTML·캐시 헤더·구버전 청크 보존 등 실제 배포 흐름도 함께 맞아야 한다.

트리 셰이킹은 사용 여부와 부수 효과의 분석이다. ESM의 정적 구조가 유리하지만 import한 객체의 내부가 깊게 불변이라는 뜻은 아니다. 모듈 최상위 선언 조건을 파일 첫 줄 강제로 해석하지 않는다. 순수하다고 표시한 호출과 sideEffects 메타데이터는 도구에 주는 가정이며 프로그램을 실제로 순수하게 바꾸는 기능이 아니다.

sideEffects:false를 무조건 추가하면 사용되어야 할 CSS·초기화가 제거될 수 있다. 필요한 부수 효과가 있는 파일을 정확히 표시하고 프로덕션 결과를 확인해야 한다. 원문의 console.log가 있는 getter도 부수 효과가 있다. [webpack 공식 tree shaking 안내](https://webpack.js.org/guides/tree-shaking/).

번들 분석은 어떤 모듈이 공간을 차지하는지 보여주며 실제 전송·파싱·실행 시간과 사용자 지표는 별도다. 라이브러리 크기만으로 교체하지 않고 기능·정확성·호환성 비용을 비교한다. 기존 산출물이 목표를 만족하면 추가 분할이나 의존 교체를 할 이유가 없다.

## 검토한 출처

- [출력](https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/output.html)
- [코드 스플리팅](https://frontend-fundamentals.com/bundling/deep-dive/optimization/code-splitting.html)
- [트리셰이킹(Tree Shaking)](https://frontend-fundamentals.com/bundling/deep-dive/optimization/tree-shaking.html)
- [번들 분석](https://frontend-fundamentals.com/bundling/deep-dive/optimization/bundle-analyzer.html)

적용 범위: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인

원문의 설정 예제·도구 순위·성능 수치는 실측 또는 최신 버전 계약으로 배포하지 않는다. 접힌 다른 도구 탭과 실행 실습은 제외.

## 추가 검토한 원문

[Patterns.dev — Dynamic Import](https://www.patterns.dev/vanilla/dynamic-import/)

Dynamic Import의 초기 미사용 기능을 늦게 로드하는 사례를 보강했다. 첫 사용 지연·fallback·실패 경로를 함께 고려하며 아이콘까지 전부 분할하지 않는다. 원문의 “SSR은 Suspense를 지원하지 않는다”는 설명은 [현재 React Suspense 문서](https://react.dev/reference/react/Suspense)의 streaming server rendering 안내와 맞지 않아 제외한다. 예시 크기와 CodeSandbox 실행 결과는 일반화하지 않는다.
