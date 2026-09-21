# Next.js — Server and Client Components

## 출처와 수집 상태

- 요청·원문 URL: https://nextjs.org/docs/app/getting-started/server-and-client-components
- 저자 / 발행처: Vercel / Next.js
- 수집·검토일: 2026-09-21
- 게시·수정일: 아래 확인 범위에 적힌 날짜 외에는 미확인
- 보존 방식: summary — AI가 작성한 요약. 전문 복제 아님
- 확인 범위: 공식 Markdown 전체 20,410문자의 서버·클라이언트 역할, 초기 HTML·hydration, import 경계·children·context·환경 분리. 버전 메타데이터 16.3.5, 수정일 2026-08-25.
- 원격 확인: pending-review · 스냅샷 SHA-256 4d37246d02570508cf936281dd141428f982235778622aea6cfdcbfdd1297e5e
- 누락 범위: 위에 명시한 부분 외의 하위 링크, 삽입 데모·영상·실행 검증은 포함하지 않음

## 출처 내용 요약

use client는 모듈 의존 경계를 선언하며 초기 HTML 렌더링이 없다는 뜻은 아니다. 서버에서 만든 children을 전달하는 구성과 클라이언트가 직접 import하는 코드는 구분한다.

## 검토 해석과 제외한 주장

App Router 기준이다. context 소비는 Client Component에 한정하고 전달 props는 React 직렬화 조건을 확인한다. Pages Router·모든 Next.js 버전에 확대하지 않으며 예제 실행과 캐시 정책 전체 검토는 제외.
