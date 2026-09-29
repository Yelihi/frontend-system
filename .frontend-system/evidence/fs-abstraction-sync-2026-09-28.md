# 추상화 비용 자료의 범위 제한 sync

- 날짜: 2026-09-28
- 대상 source: `ondrej-velisek-abstraction-cost-humans-ai`
- source / published SHA-256: `cb25fe52f8f1d22eb29a298a4b5894e38ef70136c6ed6c8dcfb0c31470c750b9`
- 보강 참조: `code-quality-context-and-contracts` — 기존 내용을 유지하며 concept에서 조건부 decision으로 보강
- 참조 SHA-256: `48d8290590830f74f4726f594cb426b8feeffde90f72f05acf9f90b958f02242`
- 연결: `code-quality-change-boundaries`, `react-compound-component-boundaries`와 related 양방향 연결. 기존 근거는 유지했다.
- 규칙 승격·프로젝트 정책 채택·설치 플러그인 갱신은 수행하지 않았다.

## 수집 및 판단 범위

로컬 상태에서 미배포 자료는 이번 source 1건이며 삭제·변경·영향 참조는 없었다. `get_knowledge_sources`로 확인한 등록 URL 목록에 대상 URL이 없으므로 등록 출처 fetch/ACK 대상은 없다. 원문 HTML은 웹 도구로 재확인했다. 다른 등록 출처의 원격 갱신은 이번 범위에 포함하지 않았다.

추상화의 탐색 비용과 복잡성 은닉·재사용·공통 변경의 편익을 비교하는 판단을 반영했다. 30% 비용 추정치의 일반화와 일괄 추상화 제거는 제외했다. 원문 실험·원시 로그·통계의 재현 검증은 하지 않았다.

의미 검토에서는 무의미한 전달 래퍼를 단순화 후보로, 런타임 검증과 불변식을 가진 팩토리·공통 정책은 유지 반례로 구별했다. React의 단순 props와 실제 상태 공유·조합 요구를 구별했다. 이는 문서 검토이며 제품 코드의 실행 결과가 아니다.

## 실행한 확인

- `npm run check`: 타입 검사·린트·빌드 성공, 테스트 39개 통과. 기존 지식 인덱스·본문·원본 해시 검증 및 검색 회귀 포함.
- 로컬 MCP `search_learned_knowledge`에서 다음 4건 모두 보강한 decision을 상위 5개 내 반환했다.

| 검색어 | 기술 맥락 | 결과 |
| --- | --- | --- |
| 작은 변경마다 래퍼 파일 탐색 비용 | React | 대상 발견 |
| thin wrapper factory indirection | TypeScript | 대상 발견 |
| 디자인 패턴 도입 추상화 | React | 대상 발견 |
| abstraction cost | Vue | 기술 중립 판단으로 대상 발견 |

- `zzunmatchedknowledgeprobezz`: 결과 0개. 자연어 전체에 대한 오탐률 측정은 아니다.
- `read_learned_knowledge`: 본문 4,336문자와 해시 검증 성공, 추가 페이지 없음. 패턴 참조의 역방향 related 연결 확인.
- `mark_knowledge_synced`: 대상 1건 성공. 이후 `knowledge_status`의 uncataloged / changed / unpublished / deleted / affectedReferences 모두 0건.
- 한국어의 넓은 검색어에는 다른 후보도 함께 반환되었다. 위 결과는 합성 검색 확인이며 실제 사용자 적중률·의미 판단 정확도·비용 절감률의 증거가 아니다.

이 기록은 이번 지식 반영만 설명하며 기존 프로젝트 실행 기록을 최신 검증으로 갱신하지 않는다.
