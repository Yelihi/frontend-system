# Frontend quality priorities

Apply these as review dimensions, not as a demand for every abstraction in every change.

1. Preserve framework intent: rendering boundaries, data flow, caching, routing, bundle size, and hydration behavior.
2. Keep state at the narrowest durable owner. Separate server, URL, form, remote-cache, and ephemeral UI state.
3. Keep business decisions independent from rendering and transport where that improves testability.
4. Prefer cohesive components and existing project conventions over speculative layers.
5. Check accessibility, input validation, trust boundaries, failure handling, observability, race conditions, and cleanup.
6. Match tests to risk: unit for decisions, integration for boundaries, E2E for critical journeys, and Storybook for reusable visual states.
7. Validate build and browser-sensitive behavior using the project's real toolchain.

For Next.js, prefer Server Components and server-side data access by default. Move Client Components to the interactive leaves, and justify client state and effects. Adapt this principle to the installed version and the project's established conventions.

## 상태와 비동기 처리의 필요성 검토

구현과 리뷰에서 다음 관점을 적용한다. 모든 변경에 별도 보고서나
추상화를 요구하지 않으며, 해당하는 항목만 확인한다.

- 상태·큐·구독·캐시를 추가하기 전에 실제 요구사항과 변경 가능성을
  확인한다. 요구사항을 단순화하려면 사용자와 합의하고,
  합의 후에는 그 요구 때문에 필요했던 보조 로직도 재검토한다.

- 상태의 소유 위치를 정하기 전에 상태 자체가 필요한지 확인한다.
  모듈 캐시, 기존 객체, DOM 등에서 확인 가능한 사실을 별도 변수로
  복제하지 않는다. 대체 수단의 수명과 무효화 조건이 일치해야 한다.

- 초기 준비, 사용마다 실행할 작업, 종료 시 정리할 작업을 구분한다.
  책임 분리가 필요하더라도 파일·함수·effect의 수를 기계적으로 늘리지 않는다.
  “한 번 실행”은 모듈·문서·컴포넌트·요청 중 어느 범위인지 명시한다.

- 비동기 대기에는 실제 의존 관계가 있어야 한다.
  어떤 결과를 기다리며, 기다리지 않으면 어떤 실패가 발생하는지 확인한다.
  익숙한 방어 패턴이라는 이유만으로 대기를 추가하지 않는다.

- 취소·직렬화·초기화 보장은 사용하는 버전의 API와 구현을 확인한다.
  실제 작업 취소, 후속 작업 시작 방지, 완료 결과 무시는 구분한다.
  라이브러리가 지원하지 않는 취소 기능을 있다고 가정하지 않는다.

- 검사는 보호하는 부수 효과와 가까운 위치에 둔다.
  같은 동기 실행 구간에서 중복된 검사는 줄이되,
  await 이후 변경될 수 있는 조건은 다시 확인한다.
  성공·실패 경로 모두에서 오래된 작업의 영향을 검토한다.

- ID의 생성 주체, 고유성 범위, 안정성, 재사용 조건을 확인한다.
  논리적 대상의 ID, DOM 객체, 렌더링·요청별 ID를 혼동하지 않는다.

- 단순화 후에도 실패 처리, 접근성, 보안, 필요한 정리는 보존한다.
  재진입, 지연 성공·실패, 정리 이후 완료처럼 실제 오동작을 드러내는
  기존 테스트를 활용한다. 모킹된 테스트가 검증하는 범위를 명시한다.
