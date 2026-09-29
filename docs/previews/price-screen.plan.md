# 가격 화면 설계 미리보기

- Plan ID: PRICE-SCREEN · 초안 v1 · 미승인 · 실행 대상 아님
- 입력: 사용자가 첨부한 과거 가격 화면 관계도. 실제 프로젝트·화면 시안·API 계약은 제공되지 않았다.
- 목적: 요청별 계획, 상태·책임·이벤트 시각화, 최소 이슈 연결 방식의 예시.
- 범위: 연도·카테고리 선택, 차트와 월별 내역·요약의 일관성. 저장·drag and drop은 입력 근거가 없어 제외.

## 1. 관찰과 가정

| 구분 | 내용 |
| --- | --- |
| 그림에서 관찰 | SWR 데이터 공유, reducer의 year/category/monthly index, 연간 조회, 차트·내역·요약, 기기별 표시 |
| 제안 가정 | Next.js App Router, 서버에서 초기 조회 후 클라이언트 SWR에 초기 데이터 전달 |
| 제안 가정 | API가 연간 전체 데이터를 반환하고 카테고리는 클라이언트에서 필터링 |
| 확인 필요 | 실제 API·권한·응답량·설치 버전·외부 store·폴더 규약·반응형 요구 |
| 미확정 | 연도 선택 시 월 초기화/유지, URL 공유, 자동 갱신 주기·허용 신선도 |

## 2. 시각적 설계

- [책임과 데이터 관계도](price-ownership.html) · [원본](price-ownership.architecture.json)
- [연도 변경과 월 선택의 이벤트 순서](price-events.html) · [원본](price-events.sequence.json)

관계도는 초기 서버 경계와 브라우저 데이터 소비를, 순서도는 초기 진입 이후 연도 캐시 미스와 월 선택을 다룬다. 모든 이벤트를 담은 완전한 명세나 측정 결과가 아니다. HTML은 원본 명세의 생성물이며 설명은 한국어, 고정 뷰어 UI와 HTML 언어 설정은 도구의 영어 기본값이다.

## 3. 상태와 책임

| 상태 | 소유권 제안 | 변경·소비 | 논의/검사 |
| --- | --- | --- | --- |
| 연도별 데이터·조회 상태 | SWR 캐시 | 조회 응답 → 차트·내역·요약 | 사용자 범위 격리, 응답 역전, 실패·재시도 |
| year/category | 화면 상태; 공유 URL 요구 시 URL | 선택 UI → 조회 키/파생 계산 | 외부 store에 중복 복제하지 않기 |
| monthKey | 화면 내 공통 소유자 | 차트의 마우스·키보드·터치 → 내역 | index 대신 월 식별자, 필터·연도 전환 시 처리 |
| 합계·차트 시리즈 | 위 원본에서 계산 | 같은 연도·필터 조건을 사용 | 파생 값을 독립 store에 저장하지 않는 안 |
| 표시 범위 | 반응형 표시 책임 | 예전 그림의 12개월/6개월 | 6개월 선택·이동 방식 확인; 기기 종류로 도메인 데이터 변경 금지 |

공유 범위가 이 화면뿐이면 가까운 공통 컴포넌트가 UI 상태를 소유하는 안을 우선 비교한다. 기존 외부 store가 여러 화면의 초안·선택 유지 계약을 담당한다면 그 범위를 재사용한다. 실제 구조 확인 전 새 store 도입은 결정하지 않는다.

## 4. 이벤트 계약 후보

| ID | 이벤트 | 기대 동작 | 금지·실패 조건 / 검증 예정 |
| --- | --- | --- | --- |
| E01 / G01 | 연도 변경 | 해당 연도 키로 조회, 대기/실패 상태 구분 | A→B 선택 후 A의 늦은 응답이 B 화면을 덮지 않아야 함 |
| E02 / G02 | 월 선택 | 같은 monthKey의 차트 강조와 내역 표시 | 키보드·터치로도 선택; 데이터 없는 월 처리 확인 |
| E03 / G03 | 카테고리 변경·태그 삭제 | 차트·내역·요약의 필터 일치 | 필터링 후 같은 index가 다른 월을 가리키는 오류 방지 |
| E04 / G04 | 갱신·조회 실패 | 오류와 재시도 제공 | 다른 연도 데이터를 현재 연도의 확정 값으로 표시 금지 |

캐시가 있는 같은 연도 데이터를 유지하며 갱신할지, 갱신 시 내용을 숨길지는 별도 결정이다. 기존 데이터 표시와 서버 쓰기의 낙관적 업데이트는 구분한다. 조회 전용 예시에는 낙관적 쓰기·rollback을 추가하지 않는다.

## 5. 파일·함수 계약 후보

아래는 실제 저장소를 확인하기 전의 예시 이름이다. 기존 폴더 규약과 동일 책임 파일이 있으면 재사용한다.

| 예시 위치 | 책임·주요 계약 |
| --- | --- |
| app/prices/page.tsx | 서버 진입·초기 조회·직렬화 가능한 초기 데이터 전달; 인증/비밀 정보는 서버 경계 |
| features/prices/ui/PriceExplorer.tsx | 클라이언트 상호작용 조합, year/category/monthKey 소유 또는 기존 소유자 연결 |
| features/prices/model/price-view.ts | 순수 함수 selectPriceView(data, selection): 차트·내역·합계를 같은 조건으로 계산 |
| features/prices/api/usePriceChart.ts | 기존 SWR 설정을 재사용해 연도 키·조회·오류 상태 제공; 중복 hook이 있으면 통합 |
| features/prices/ui/PriceChart.tsx | 데이터 표시와 onMonthSelect(monthKey); 서버 요청 책임 없음 |
| features/prices/ui/MonthlyItems.tsx · PriceSummary.tsx | 전달받은 내역·합계 표시; 상호작용 책임은 필요한 곳에만 배치 |

## 6. 먼저 결정할 질문

| 선택 | 현재 추천과 이유 | 재검토 조건 |
| --- | --- | --- |
| 연간 조회 후 필터 / 서버 필터 | 그림을 보존하는 첫 안을 시연에 사용 | 응답량·권한·집계 규칙을 확인해 변경 |
| 화면 상태 / URL 상태 | 공유·복귀 요구를 확인한 뒤 결정 | 링크 공유, 뒤로 가기, 새로고침 유지 요구 |
| 월 초기화 / 가능한 월 유지 | 전환을 명시적으로 처리; 그림은 초기화 가정 | 사용자가 연도 간 같은 월 비교를 원할 때 |
| 화면 소유 / 외부 store | 화면 내부라면 공통 소유자부터 검토 | 다른 화면까지 유지할 상태가 확인될 때 |

## 7. 최소 작업 이슈 제안

아래 목록은 가정과 중요 질문이 해결되고 승인된 후 실행한다. 순서는 의존 관계이며 파일 하나당 이슈가 아니다. 예정 검사를 실행 결과로 표시하지 않는다.

| ID | 선행 | 변경 계약·최소 작업 | 테스트·완료 조건 |
| --- | --- | --- | --- |
| PRICE-01 | 없음 | G02/G03: 파생 계산과 월 식별 계약. 기존 구현이 있다면 보호 테스트부터 | 연도·필터·월 식별 정상/빈 값/경계 사례; 공개 입출력 고정 |
| PRICE-02 | PRICE-01 | G01/G04: 초기 서버 데이터와 연도 조회 연결 | 키·권한 범위·응답 역전·오류·재시도; server/client 경계 검사 |
| PRICE-03 | PRICE-02 | G02/G03: 차트·내역·요약과 입력 연결 | 월·카테고리·연도 전환의 통합 검사, 키보드·터치 경로 |
| PRICE-04 | PRICE-03 | G01–G04: 실제 화면 회귀와 CI 증거 연결 | 브라우저 주요 흐름, 합의한 접근성 검사, 실제 보고서 보존 |

각 이슈의 테스트는 해당 이슈 안에서 작성·실행한다. PRICE-04가 앞 이슈의 테스트를 뒤로 미루는 뜻은 아니다. 미확정 성능 임계값이나 캐시 정책은 착수 전에 결정하고 계약에 반영한다.

## 8. 검증 상태

설계 도식 자체의 생성·브라우저 확인 결과는 각 delivery/visual-check 파일에 기록한다. 앱 코드·단위 테스트·E2E·실제 네트워크·실제 렌더링은 이 예시에서 실행하지 않았다. 런타임의 plan ID/issue 선택 기능도 이 문서로 구현된 것이 아니다.

### 도식 전달 검증 기록

2026-09-29, Archify 2.17. 앱의 정확성 검증과 구분한다. 아래 SHA-256은 생성 원본과 HTML을 식별한다. 각 HTML의 자동 브라우저 기록은 visualReview를 pending으로 유지하며, 아래 시각 검토는 별도의 이미지 검토 결과다.

```text
diagram_type: architecture
output: /Volumes/Storage2TB/Projects/github/1.personal-project/7.frontend-system/docs/previews/price-ownership.html
specification_sha256: 2818744e0ec13a6e1ba8f438202e6566f4ea5632ac2e547062f5aa34c9fcf81e
artifact_sha256: 8e6893434a4d6cbabc19ac5cc9de7fcc82438bb8fd2b9cb82674eabd14e11cfd
validation: 9/9 showcase, 0 errors, 0 warnings
browser_evidence: passed
visual_review: passed
correction_rounds: 0
```

[생성 검증](price-ownership.delivery.json) · [브라우저 검증](price-ownership.visual-check.json) · [테마별 화면](price-ownership.visual-check.html)

```text
diagram_type: sequence
output: /Volumes/Storage2TB/Projects/github/1.personal-project/7.frontend-system/docs/previews/price-events.html
specification_sha256: 1ecf832d6dc833bfbfd497b8ef5efe937dacc04e4b87c16d4f445a88532c6f8b
artifact_sha256: 28caefcfa7d635b3a2081b5ebaae984176b8d8ee9dff7408d8962e39665c098d
validation: 9/9 showcase, 0 errors, 0 warnings
browser_evidence: passed
visual_review: passed
correction_rounds: 0
```

[생성 검증](price-events.delivery.json) · [브라우저 검증](price-events.visual-check.json) · [테마별 화면](price-events.visual-check.html)

브라우저 측정: 1440×900, 1600×1000, 1920×1080, 2048×1320에서 화면 넘침 없음. 이미지 검토: 각 도식의 1440×900 light와 2048×1320 dark를 직접 확인했으며 텍스트·연결선·카드 잘림을 발견하지 않았다. correction_rounds는 최초 HTML 전달 후 시각 검토로 수정한 횟수다. 초기 명세의 가독성·라벨 배치는 전달 전 생성 검사에서 수정했다. 노드 선택·검색·내보내기 기능 전체의 회귀 테스트는 수행하지 않았다.
