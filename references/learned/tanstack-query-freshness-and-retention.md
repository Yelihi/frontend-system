# TanStack Query의 신선도·재조회·캐시 수명

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

창을 다시 선택하면 요청이 나가거나 캐시가 있는데도 재조회되고 staleTime과 gcTime이 혼동될 때.

## 판단에 사용할 내용

신선도와 inactive 수거, 마운트·포커스·재연결·polling·실패 retry를 나누어 실제 요청 원인을 확인한다.

## 적용하지 않는 경우

모든 재조회를 끄거나 권한 데이터가 영구 불변이라고 가정해 static 캐시에 맡기지 않는다.

## 개념과 근거

기본적으로 캐시 데이터는 stale로 간주될 수 있고 stale 데이터는 마운트·포커스·재연결 계기에 재조회된다. staleTime은 신선도, gcTime은 사용되지 않는 캐시의 수거 시점에 관여한다. refetchInterval은 신선도와 별개인 주기 설정이다.

Infinity와 static은 무효화에 대한 반응이 다르므로 지원 버전과 데이터의 변경 가능성을 확인한다. 실패 retry와 JSON 호환 데이터의 구조 공유도 요청·참조 변화의 원인 조사에 포함한다. 원문이 예로 든 권한 데이터라도 서버 인가와 갱신 요구를 생략할 근거가 되지 않는다.

## 검토한 출처와 범위

- [TanStack Query React — Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) — 공식 Markdown 전체 4,486문자. React 어댑터 latest 문서의 기본 동작; 적용 시 설치 버전 확인. 연결된 커뮤니티 글은 제외.

적용 조건: TanStack Query React 어댑터의 확인 시점 latest 문서. gcTime·static 등은 설치 버전과 사용자 설정을 확인한다.

읽은 범위의 개념 참조이며 제품 코드·예제 실행, 접근성·보안·성능 검증 완료를 뜻하지 않는다.
