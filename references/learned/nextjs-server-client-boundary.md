# Next.js App Router의 서버·클라이언트 구성 경계

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

use client를 어디에 둘지, 서버 children·context를 조합할지 또는 클라이언트 번들에 서버 코드가 섞였는지 판단할 때.

## 판단에 사용할 내용

JSX의 시각적 중첩과 import 모듈 그래프를 구분하고 필요한 상호작용 경계·직렬화 props·환경 전용 모듈을 확인한다.

## 적용하지 않는 경우

Client Component를 초기 서버 HTML이 없는 컴포넌트로 해석하거나 Pages Router·모든 Next.js 버전에 확대하지 않는다.

## 개념과 근거

use client는 클라이언트 모듈 그래프의 경계이며 모든 파일에 반복할 필요는 없다. 최초 로드에서는 Client Component도 초기 HTML 구성에 참여할 수 있으므로 이름만 보고 브라우저에서만 실행된다고 단정하지 않는다.

서버에서 구성한 children을 Client Component에 전달하는 것과 그 컴포넌트가 서버 모듈을 직접 import하는 것은 다르다. 경계를 넘는 props는 React 직렬화 조건을 따르고 context 소비는 Client Component에서 수행한다. server-only 표시는 잘못된 import를 발견하는 장치이며 전체 인증·인가를 대신하지 않는다.

## 검토한 출처와 범위

- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — 공식 Markdown 전체 20,410문자의 서버·클라이언트 역할, 초기 HTML·hydration, import 경계·children·context·환경 분리. 버전 메타데이터 16.3.5, 수정일 2026-08-25.

적용 조건: 확인한 Next.js 16.3.5 문서의 App Router 모델. 실제 프로젝트 버전과 경계를 확인한다.

읽은 범위의 개념 참조이며 제품 코드·예제 실행, 접근성·보안·성능 검증 완료를 뜻하지 않는다.
