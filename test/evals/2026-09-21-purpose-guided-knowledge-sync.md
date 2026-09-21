# 문서 선별 등록·참고 목적 보완 결과 — 2026-09-21

## 처리 결과

- 새 등록 URL 16개, 새 imported 요약 16개. 기존 URL 460개를 보존하여 총 476개.
- 참조 11개 신설, 기존 참조 3개에 새 출처 연결. 기존 58개 전체의 참고 목적을 보완하여 총 69개.
- 모든 참조 본문에 `참고 상황`, `판단에 사용할 내용`, `적용하지 않는 경우`를 추가. 검색 summary와 conditions·exclusions 및 본문 해시를 함께 갱신.
- 사용자 작성 React 원본 2개는 수정하지 않음. catalog 총 478개, represented 477개·omitted 1개(앞선 접근성 playground).
- 전부 concept. 새 필수 규칙·스킬·런타임 도구를 만들지 않았으며 설치된 플러그인은 갱신하지 않음.

## 등록 기준과 실제 범위

출처의 공식 여부만으로 결정하지 않았다. 반복해서 사용할 구체적인 질문·개념·판단 근거가 있는 문서를 선별했다. 홈페이지는 탐색에만 사용하고 전체 사이트를 수집하지 않았다. OWASP는 2025판 범위를 고정한 위험 분류 개요와 A01 상세를 함께 등록했다.

PWA·WebGL은 일반 작업에 일괄 적용할 자료가 아니다. 각각 오프라인 UX·직접 그래픽 구현을 다룰 때만 찾도록 본문과 검색 조건을 제한했다. TanStack은 React Query, Next.js는 App Router 경계에 한정했다.

| 등록 ID / 원문 | 연결한 참조 | 확인 범위 |
| --- | --- | --- |
| [typescript-module-compiler-options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html) | [typescript-module-environment](../../references/learned/typescript-module-environment.md) | 앱의 bundler·Node 실행 환경 선택, 라이브러리 외부 의존·선언 파일과 dual emit 설명. 문서 수정일 2026-09-18. |
| [patterns-react-compound-components](https://www.patterns.dev/react/compound-pattern/) | [react-compound-component-boundaries](../../references/learned/react-compound-component-boundaries.md) | Context 기반 상태 공유, 직접 자식 clone 방식, Pros·Cons 및 표시된 예제 일부. |
| [patterns-loading-dynamic-import](https://www.patterns.dev/vanilla/dynamic-import/) | [bundling-output-and-optimization](../../references/learned/bundling-output-and-optimization.md) | EmojiPicker 지연 로딩과 fallback, 청크 예시 및 SSR 설명의 검토. |
| [wai-apg-dialog-modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | [accessibility-modal-focus](../../references/learned/accessibility-modal-focus.md) | About, Keyboard Interaction, 초기·복귀 포커스 Notes, Roles·States·Properties. |
| [wai-apg-accessible-names](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/) | [accessibility-names-and-alternatives](../../references/learned/accessibility-names-and-alternatives.md) | 이름·설명의 목적, Cardinal Rules of Naming 및 네이티브/보이는 텍스트 우선 원칙. 전체 역할별 표·계산 알고리즘은 제외. |
| [webdev-performance-optimize-inp](https://web.dev/articles/optimize-inp) | [web-performance-interaction-diagnosis](../../references/learned/web-performance-interaction-diagnosis.md) | 실사용 데이터·실험실 재현, 입력 지연·처리 시간·표시 지연의 구분, 긴 작업과 layout 조사. 삽입 미디어·관련 링크 전체는 제외. |
| [webdev-performance-layout-thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing) | [web-performance-interaction-diagnosis](../../references/learned/web-performance-interaction-diagnosis.md) | 레이아웃 비용, 스타일 쓰기 뒤 측정, read/write 반복 예시, DevTools 관찰 방법. |
| [webdev-pwa-offline-ux](https://web.dev/articles/offline-ux-design-guidelines) | [pwa-offline-state-feedback](../../references/learned/pwa-offline-state-feedback.md) | 연결 변화·콘텐츠 신선도·다운로드·저장 및 동기화 상태·언어와 피드백 지침. 링크된 서비스워커 구현은 제외. |
| [owasp-top10-2025-overview](https://top10.owasp.org/2025/) | [security-server-authorization-boundary](../../references/learned/security-server-authorization-boundary.md) | 2025판 소개와 위험 10개 분류 목록. 상세 검토는 별도 등록한 A01에 한정. |
| [owasp-top10-2025-broken-access-control](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/) | [security-server-authorization-boundary](../../references/learned/security-server-authorization-boundary.md) | 설명·예방·접근 권한 우회 사례. 전체 CWE와 외부 자료는 제외. |
| [nextjs-server-client-components](https://nextjs.org/docs/app/getting-started/server-and-client-components) | [react-compound-component-boundaries](../../references/learned/react-compound-component-boundaries.md), [nextjs-server-client-boundary](../../references/learned/nextjs-server-client-boundary.md) | 공식 Markdown 전체 20,410문자의 서버·클라이언트 역할, 초기 HTML·hydration, import 경계·children·context·환경 분리. 버전 메타데이터 16.3.5, 수정일 2026-08-25. |
| [react-avoid-unnecessary-effects](https://react.dev/learn/you-might-not-need-an-effect) | [react-derived-state-and-effects](../../references/learned/react-derived-state-and-effects.md) | 공식 Markdown의 설명 본문·Recap과 앞부분 코드. 파생 값·이벤트·외부 동기화 구분에 한정해 배포. 뒤쪽 코드 전체와 Challenges는 미검토. |
| [tanstack-query-important-defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) | [tanstack-query-freshness-and-retention](../../references/learned/tanstack-query-freshness-and-retention.md) | 공식 Markdown 전체 4,486문자. React 어댑터 latest 문서의 기본 동작; 적용 시 설치 버전 확인. 연결된 커뮤니티 글은 제외. |
| [architecture-micro-frontends-tradeoffs](https://martinfowler.com/articles/micro-frontends.html) | [micro-frontends-adoption-tradeoffs](../../references/learned/micro-frontends-adoption-tradeoffs.md) | 2019-06 게시. 개념·점진적 전환·독립 배포의 장점과 Downsides 전체. 데모 앱·배포 코드·구현 방식 전체는 제외. |
| [chromium-renderingng-architecture](https://developer.chrome.com/docs/chromium/renderingng-architecture) | [chromium-rendering-pipeline](../../references/learned/chromium-rendering-pipeline.md) | Rendering pipeline와 processes·threads 개요의 설명. 이미지 도식·전체 엔진 소스·세부 플랫폼 분기는 제외. |
| [webgl-fundamentals-how-it-works](https://webglfundamentals.org/webgl/lessons/webgl-how-it-works.html) | [webgl-shader-data-flow](../../references/learned/webgl-shader-data-flow.md) | vertex/fragment 단계, varying 보간, buffer·attribute 연결과 normalize 설명. 삽입 데모·전체 코드 실행·행렬 단원은 제외. |

원문 전문을 복제하지 않고 출처 내용 요약과 검토 해석을 분리했다. 각 imported 파일에 보존 방식·확인 범위·누락·버전 조건을 남겼다. 연결된 하위 문서 전체, 삽입 영상·데모의 실행, 제품의 실제 성능·보안·접근성 검증은 포함하지 않는다.

## 등록하지 않은 링크

- [Awwwards](https://www.awwwards.com/), [CSS Design Awards](https://www.cssdesignawards.com/), [Siteinspire](https://www.siteinspire.com/), [GDWEB](https://www.gdweb.co.kr/sub/list.asp), [Dribbble](https://dribbble.com/): 디자인 사례 발견용. 특정 사례를 선택했을 때 프로젝트 문서에 참고 의도를 기록하는 방식이 적합하다.
- [FE News](https://github.com/naver/fe-news): 큐레이션 발견용. 뉴스 목록 대신 필요한 원문을 추후 선별한다. 뉴스레터 변경 추적을 이번 작업에 추가하지 않았다.
- [Life of a Pixel](https://www.youtube.com/watch?v=K2QHdgAKP-s): 영상 본문·자막을 확보하지 못했으므로 등록하지 않았다. Chromium 렌더링 텍스트 자료는 별도로 등록했지만 영상을 검토한 것으로 대신하지 않는다.
- TypeScript·Patterns.dev·WAI·web.dev·PWA·Next.js·React·TanStack·WebGL·Chromium의 홈페이지/목차: 위 표의 개별 문서로 범위를 좁혔다. 나머지 모든 하위 문서를 등록한 것은 아니다.

## 기존 문서의 참고 목적 보완

기존 개념·출처·검토 한계를 보존하면서 본문 앞에 실제 사용할 상황과 확인할 내용을 적었다. MDN 개요의 읽은 범위를 실제 사용 조건과 혼동하지 않도록, 검색 conditions의 수집 범위 문구는 제거하고 본문의 검토 범위는 유지했다.

예시:

- [CSS 캐스케이드](../../references/learned/css-cascade-and-value-resolution.md): 스타일이 덮어써지는 상황 → 출처·레이어·구체성·상속·단축 속성 비교.
- [저장소](../../references/learned/web-api-files-and-storage.md): 데이터 유실·용량 초과 → 저장 방식·할당량·권한·삭제 조건 구분.
- [모달](../../references/learned/accessibility-modal-focus.md): 포커스 이탈·복귀 실패 → 초기 포커스·배경 차단·내부 탐색·복귀 위치 확인.
- [React Fiber](../../references/learned/react-fiber-work-in-progress.md): DOM 두 벌이라는 오해 → v19.2.0 내부의 alternate·Hook 연결 구조 설명에만 활용.
- [폐기 API](../../references/learned/web-api-retired-features.md): 기존 코드의 이관 조사 → 신규 채택이나 모든 브라우저의 제거 완료 증거로 사용하지 않음.

69개 본문 각각에 구체적인 목적을 기록했다. 이는 재사용 지식의 사용 범위이며 특정 프로젝트의 실제 채택·제외 결정이나 검증 결과를 대신하지 않는다. 이후 sync에서도 같은 구분을 유지하도록 [인덱싱 안내](../../references/knowledge-indexing.md)를 보완했다.

## 원문에서 그대로 채택하지 않은 부분

- Patterns.dev Dynamic Import의 SSR/Suspense 설명: [현재 React Suspense 문서](https://react.dev/reference/react/Suspense)의 streaming SSR 안내와 맞지 않는 부분을 제외. 고정 번들 크기를 성능 보장으로 사용하지 않음.
- Compound Pattern의 클릭 div·혼재된 clone/context 예제: 완성된 접근성 위젯으로 복사하지 않음. 서버 context 해석은 [Next.js 공식 경계 문서](https://nextjs.org/docs/app/getting-started/server-and-client-components)의 Client Component 조건으로 제한.
- web.dev 레이아웃 최적화: 치수 읽기 순서를 바꾸면 의미가 유지되는지 확인하며, 변경 후 측정을 이전 값으로 대체하거나 예시 치수를 영구 캐시하지 않음.
- web.dev INP의 iframe 스레드 설명: 프레임·프로세스·스레드를 같은 단위로 일반화하지 않음. 이 자료에서는 지연의 세 구간과 측정 절차에 집중.
- OWASP 통계: 전체 웹의 발생률로 일반화하지 않음. Top 10을 완전한 보안 인증으로 사용하지 않음.
- TanStack의 static 예시: 권한 정보의 영구 불변을 가정하지 않고 서버 인가와 갱신 요구를 따로 검토.
- Micro Frontends: 2019년 경험의 장단점을 유지하되 당시 데모·배포 구성을 현재 표준으로 복사하지 않음.
- WebGL: 교육용 설명의 fragment와 화면 픽셀을 무조건 일대일로 일반화하지 않음.

## 검증과 sync 상태

- `npm run check`: 타입 검사·lint·빌드, 테스트 27개 통과.
- 실제 참조 인덱스 검색 회귀 51개: 지정한 기대 참조가 상위 5개에 모두 포함됨. React·Next.js·TypeScript 기술 조건과 Vue 제외 사례 포함.
- 전 참조의 본문 해시·출처 해시, 등록 URL 중복, catalog/outcome/참조 연결을 확인. 본문 최대 2,947문자, 69개 모두 한 번의 12,000문자 제한 읽기 내에 포함.
- `npm run test:package`: 통과. 스킬 4개, raw knowledge 배포 제외, 독립 MCP 실행 확인.
- `git diff --check`: 통과.
- 검증 후 새 원본 16개를 `markKnowledgeSynced` 처리. 로컬 지식 상태의 uncataloged·changed·unpublished·deleted·affectedReferences는 모두 0.

검색 평가는 합성 회귀이며 실제 사용자 정확도나 조언의 타당성을 입증하지 않는다. 지정한 기대 ID만 관련 결과로 세는 진단 수치는 precision 0.3404, recall 1.0이고, 51개 질의의 반환 메타데이터 합계는 111,909문자다. 서로 다른 사례 수·라벨 집합이므로 이전 보고서와 직접 성능 비교하지 않는다. 단어 부분 일치 검색의 무관 후보는 여전히 남으며 검색 엔진은 변경하지 않았다.

## 원격 검토 상태와 한계

선별 URL 16개에 원격 확인을 실행했다. 로컬 네트워크 제한으로 실패한 첫 시도 후 허용된 네트워크 실행으로 재확인했다.

- HTML 13개: `needs-host`. 호스트 웹 도구에서 본문을 확인하고 요약을 반영했으나 원격 텍스트 ACK를 만들지 않았다.
- Next.js·TanStack Query 2개: 공식 텍스트 스냅샷을 읽고 참조 배포 후 해당 해시만 ACK했다.
- React Effect 1개: 설명 본문·Recap과 앞부분 코드에서 파생 값·이벤트·동기화 구분을 반영했다. 뒤쪽 코드 전체·Challenges는 미검토이므로 원격 스냅샷 ACK를 보류했다. 다음 원격 확인에도 pending-review가 남는다. 로컬 참조의 제한된 범위 sync 완료와 전체 원격 문서의 검토 완료는 구분한다.

설치본 refresh·커밋·푸시는 수행하지 않았다.

