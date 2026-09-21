# TanStack Query React — Important Defaults

## 출처와 수집 상태

- 요청·원문 URL: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
- 저자 / 발행처: TanStack
- 수집·검토일: 2026-09-21
- 게시·수정일: 아래 확인 범위에 적힌 날짜 외에는 미확인
- 보존 방식: summary — AI가 작성한 요약. 전문 복제 아님
- 확인 범위: 공식 Markdown 전체 4,486문자. React 어댑터 latest 문서의 기본 동작; 적용 시 설치 버전 확인. 연결된 커뮤니티 글은 제외.
- 원격 확인: pending-review · 스냅샷 SHA-256 928016d904c681646ff73ea2d55ec9512c27cbe359f58eccd0697ed1ee97ae47
- 누락 범위: 위에 명시한 부분 외의 하위 링크, 삽입 데모·영상·실행 검증은 포함하지 않음

## 출처 내용 요약

데이터의 stale 여부와 inactive 캐시 수거는 다른 축이다. 재마운트·포커스·재연결, polling, retry와 구조 공유의 기본값을 구분한다.

## 검토 해석과 제외한 주장

gcTime을 신선도 설정으로 사용하지 않는다. Infinity·static 지원과 동작은 설치 버전에서 확인하고 권한 데이터가 영구 불변이라고 가정하지 않는다. 모든 기본값을 비활성화하는 공통 정책은 만들지 않는다.
