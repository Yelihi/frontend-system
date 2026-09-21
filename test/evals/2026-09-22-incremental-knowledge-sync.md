# 추가 sources 범위별 sync — 2026-09-22

## 범위 결정과 결과

시작 커밋은 `32ae1bd`. [전체 sync 기록](2026-09-21-sequential-knowledge-sync.md)의 460개 이후 추가된 URL 16개를 대상으로 삼았다. [추가 등록 기록](2026-09-21-purpose-guided-knowledge-sync.md)과 현재 sources·catalog·index를 대조하니 이 16개도 이미 로컬 참조에 반영돼 있었다. 시작 시 uncataloged·changed·unpublished·deleted·affectedReferences는 모두 0이었다.

이번에는 추가 16개의 원격 변경과 이전 검토 범위를 네 묶음 순서로 확인했다. 이전 460개의 원격 재수집은 하지 않았다. URL 등록 476개, 로컬 원본 포함 catalog 478개, concept 참조 69개를 유지했다. 새 참조는 없고 React 참조 1개를 보강했다. 원본 처리 결과는 represented 477개·omitted 1개를 유지한다.

| 순서 | 범위 | URL 수 | 결과 |
| --- | --- | ---: | --- |
| 1 | React·Next.js·TanStack Query | 3 | Next.js·TanStack 스냅샷 동일. React의 이전 미검토 구간까지 읽고 참조 보강·sync·ACK |
| 2 | TypeScript·Patterns.dev 2개·마이크로 프런트엔드 | 4 | HTML의 관련 절 재검토. 기존 판단·제외 조건 유지 |
| 3 | WAI APG 2개·OWASP 2025 개요와 A01 | 4 | HTML의 관련 절 재검토. 기존 이름·포커스·서버 인가 경계 유지 |
| 4 | web.dev 3개·RenderingNG·WebGL | 5 | HTML의 관련 절 재검토. 기존 성능·오프라인·렌더링 개념 유지 |

## 원격 확인과 읽은 범위

로컬 `checkSources`를 사용했다. 첫 React 묶음은 샌드박스 DNS 제한으로 실패했고 승인된 네트워크 실행으로 네 묶음 모두 재확인했다. 결과는 unchanged 2개, pending-review 1개, needs-host 13개였다. HTML 13개는 호스트 웹 도구의 추출 본문 중 아래 절을 읽고 기존 참조와 대조했다. 확인 범위에서 기존 판단을 수정할 근거가 없었다는 뜻이며 HTML 전문의 바이트 동일성을 입증하지 않는다. 웹 도구의 캐시 응답 가능성도 있으므로 원격 전체 문서의 최신성 보증으로 사용하지 않는다.

| 등록 ID | 이번 확인 범위 |
| --- | --- |
| `react-avoid-unnecessary-effects` | 공식 Markdown 61,392문자 전체. 설명·코드·Recap·Challenges 문제/해답. `readSourceChange`의 같은 expectedHash로 0·12000·24000·36000·48000·60000 offset을 읽음 |
| `nextjs-server-client-components` | 기존 ACK와 응답 해시 동일. 본문 재검토 생략 |
| `tanstack-query-important-defaults` | 기존 ACK와 응답 해시 동일. 본문 재검토 생략 |
| `typescript-module-compiler-options` | 앱의 bundler·Node 환경, 라이브러리 external 의존·선언 파일·dual emit 조건 |
| `patterns-react-compound-components` | clone/context 예제, Pros·Cons, 직접 자식 제약·prop 덮어쓰기와 서버 context 표현 |
| `patterns-loading-dynamic-import` | EmojiPicker 지연 로딩·fallback, 번들 크기 예시와 SSR/Suspense 문구 |
| `architecture-micro-frontends-tradeoffs` | 개념과 장점 개요, Downsides의 중복 의존성·환경 차이·운영 비용 |
| `wai-apg-dialog-modal` | About·Keyboard Interaction·초기/복귀 포커스 Notes·Roles/States/Properties |
| `wai-apg-accessible-names` | 이름/설명의 목적·Cardinal Rules·네이티브/ARIA 이름 연결. 전체 역할별 표·알고리즘 제외 |
| `owasp-top10-2025-overview` | 2025판 소개·위험 분류 목록 |
| `owasp-top10-2025-broken-access-control` | Description·How to prevent·Example attack scenarios. 개별 CWE 본문 제외 |
| `webdev-performance-optimize-inp` | 실사용/실험실 진단·지연 세 구간·이벤트 처리·layout. 프레임별 메인 스레드 표현은 기존 제외 유지 |
| `webdev-performance-layout-thrashing` | 레이아웃 비용·강제 동기 레이아웃·읽기/쓰기 반복·DevTools 관찰 |
| `webdev-pwa-offline-ux` | 연결/콘텐츠 갱신 상태·오프라인 준비/저장·대용량 다운로드 선택·상태 안내 |
| `chromium-renderingng-architecture` | pipeline stages·process/thread 구조·프레임과 프로세스 구분. 이미지 도식·엔진 소스 제외 |
| `webgl-fundamentals-how-it-works` | varying 보간·buffer/attribute 연결·vertexAttribPointer·normalizeFlag. 데모 실행 제외 |

각 ID의 원문 URL은 [sources.json](../../knowledge/sources.json), 기존 요약·보존 조건은 `knowledge/source/imported/<id>.md`에 있다. 내용이 유지되는 15개 원본은 날짜만 바꾸어 재등록하지 않았다. HTML은 텍스트 스냅샷/ACK를 생성하지 않으므로 다음 확인에도 needs-host일 수 있다.

## React 보강과 제외

[공식 문서](https://react.dev/learn/you-might-not-need-an-effect)는 이전 스냅샷과 동일했다. 새 원문 변경을 발견한 것이 아니라 미검토 범위를 해소했다. [원본 요약](../../knowledge/source/imported/react-avoid-unnecessary-effects.md)과 [기존 참조](../../references/learned/react-derived-state-and-effects.md)를 함께 보강했다.

- key 초기화와 선택 ID 보존은 동작이 다르며, 렌더 중 갱신 예제는 같은 컴포넌트와 반복 방지 조건에 한정한다.
- query/page 요청의 cleanup은 오래된 응답을 무시하는 예제다. 요청 취소·HTTP 오류 처리·캐시·완성된 데이터 계층으로 해석하지 않는다.
- 외부 저장소 구독과 useSyncExternalStore, 서버 snapshot의 적용 조건을 추가했다. 부모 알림은 이벤트 원인과 상태 소유권으로 판단한다.
- 앱 초기화의 모듈 변수를 서버 사용자별 상태 공유에 적용하지 않는다. Effect 일괄 제거·메모이제이션 의무·실측 성능 주장은 만들지 않았다.

참조 검색 요약·키워드·조건·제외, 원본/본문 해시와 outcome을 함께 갱신했다. 기존 코드의 함수로 재등록했고, 검증 뒤 `markKnowledgeSynced`와 `acknowledgeSource`를 실행했다. ACK한 React 원격 해시는 `b32370f3f29b26c0dcdea24475c88a807898585e69913f3b027fa2b8dccf41f5`다. 최종 로컬 캐시에서 React·Next.js·TanStack 모두 hash=reviewedHash, diff 0문자를 확인했다.

## 실행한 검증과 한계

- `npm run check`: typecheck·lint·build·테스트 27개 통과.
- 실제 참조 인덱스 검색 사례 54개 통과. 요청 경합·외부 구독·Vue 제외의 3개 사례를 추가했다. 지정 기대 ID 기준 recall@5=1.0, precision@5=0.328947, 반환 메타데이터 합계 120,824문자. 합성 검색 평가이며 실제 사용자 정확도·조언 타당성·모델 토큰 절감 측정이 아니다.
- URL 476개의 중복/연결과 catalog 478개의 현재 원본 해시·outcome·represented 참조 연결을 전수 대조했다. 전체 69개 참조의 bounded read·본문/원본 해시는 기존 테스트와 sync 함수에서 검증했다.
- `npm run test:package`: 네 스킬·원본 knowledge 배포 제외·독립 MCP 실행 통과.
- 최종 knowledgeStatus의 uncataloged·changed·unpublished·deleted·affectedReferences 모두 0, 공용 규칙 후보 없음.
- `git diff --check` 통과. 새 기록 파일도 EOF 단일 개행·후행 공백 없음을 별도 확인했다.

React 전체 텍스트를 읽었지만 예제를 실행하지 않았다. HTML의 모든 하위 링크·미디어·데모, 제품 성능·접근성·보안 검증, 설치된 플러그인 갱신은 이번 범위에 포함하지 않는다. 새 필수 규칙·스킬·런타임 코드는 추가하지 않았다. 이번 sync 변경은 작업 트리에 남기며 별도 커밋·푸시는 수행하지 않았다.
