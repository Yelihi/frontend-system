# 번들 의존성 그래프와 모듈 탐색·변환

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

Module not found가 발생하거나 TypeScript 별칭은 통과하지만 빌드·런타임에서 import가 실패할 때.

## 판단에 사용할 내용

entry부터 resolve·변환·출력까지 추적하고 패키지 exports, 별칭, CSS·이미지 처리와 타입 검사를 구분한다.

## 적용하지 않는 경우

타입 제거를 타입 검사로 여기거나 프레임워크가 제공하는 설정 위에 불필요한 번들러를 추가하지 않는다.

## 개념과 근거

번들러는 진입점에서 의존성을 탐색해 그래프를 만들고, 필요한 변환을 거친 모듈과 자원을 청크·파일로 출력한다. 단순 문자열 이어붙이기나 항상 한 파일을 만드는 작업으로 이해하면 동적 import와 공유 청크를 놓친다. 브라우저 ESM도 가능하므로 모든 프로젝트에 번들링이 필수인 것은 아니다.

모듈 탐색은 실행 환경과 설정에 달려 있다. 상대 경로, 패키지 exports, 별칭, 확장자 우선순위가 어떤 파일을 가리키는지 확인한다. TypeScript가 이해한 별칭이 번들러·테스트 러너·런타임에 자동 전달되는 것은 아니다. src/... 표기 자체가 운영체제 절대 경로는 아니며 Node 내장 모듈이 브라우저에서 자동 제공되지 않는다.

webpack의 module.rules는 파일 변환, plugins는 빌드 단계 확장에 관여한다. css-loader는 CSS를 모듈로 해석하고 style-loader 같은 적용 경로가 별도로 필요하다. webpack 5 Asset Modules는 파일이나 URL·인라인 자원 처리를 제공하지만 이미지 압축까지 자동 보장하지 않는다. TypeScript의 타입 제거와 타입 검사를 구별한다.

React에 특정 번들러나 Babel이 필수라는 주장, 도구별 고정 속도 순위, Vite 내부 엔진의 영구 고정 설명은 제외한다. esbuild에는 개발용 serve API가 있다. [esbuild 공식 API](https://esbuild.github.io/api/#serve). 이미 프레임워크가 제공하는 빌드 설정이 요구를 충족하면 독립 설정과 플러그인을 더 만들 필요가 없다.

## 검토한 출처

- [시작하기](https://frontend-fundamentals.com/bundling/get-started.html)
- [번들링이란](https://frontend-fundamentals.com/bundling/overview.html)
- [번들러란](https://frontend-fundamentals.com/bundling/bundler.html)
- [소개](https://frontend-fundamentals.com/bundling/webpack-tutorial/intro.html)
- [웹팩 도입하고 첫 번들 만들기](https://frontend-fundamentals.com/bundling/webpack-tutorial/make-first-bundle.html)
- [모듈로 코드 구조화하기](https://frontend-fundamentals.com/bundling/webpack-tutorial/module-system.html)
- [TypeScript 적용하기](https://frontend-fundamentals.com/bundling/webpack-tutorial/typescript.html)
- [React 적용하기](https://frontend-fundamentals.com/bundling/webpack-tutorial/react.html)
- [스타일 관리하기](https://frontend-fundamentals.com/bundling/webpack-tutorial/style.html)
- [이미지 등 정적 자원 다루기](https://frontend-fundamentals.com/bundling/webpack-tutorial/assets.html)
- [플러그인으로 빌드 확장하기](https://frontend-fundamentals.com/bundling/webpack-tutorial/plugin.html)
- [소개](https://frontend-fundamentals.com/bundling/deep-dive/overview.html)
- [번들링, 꼭 필요할까요?](https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/overview.html)
- [진입점](https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/entry.html)
- [경로 탐색](https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/resolution.html)
- [로더](https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/loader.html)
- [플러그인](https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/plugin.html)
- [번들링 시작하기](https://frontend-fundamentals.com/bundling/tutorial/basic.html)

적용 범위: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인

원문의 설정 예제·도구 순위·성능 수치는 실측 또는 최신 버전 계약으로 배포하지 않는다. 접힌 다른 도구 탭과 실행 실습은 제외.
