# 지식 검토와 인덱싱

## 원본과 판단의 구분

CS, 도메인 아키텍처, 프레임워크 원리 모두 받는다. 원본은 보존하고 주장별로 출처, 사실/해석, 적용 버전, 반례를 확인한다. 사용자 경험을 무조건 일반화하거나 모델 지식과 다르다는 이유로 버리지 않는다. 최신성이나 정확성이 불확실한 주장은 공식 자료로 확인하고, 확인하지 못하면 uncertain으로 남긴다. 내부 구현을 공개 계약으로 바꾸지 않는다. 개념만 있는 문서에 트레이드오프나 코드 변경 지침을 발명하지 않는다.

- concept: 설명과 원인 분석에 쓰는 개념. 수정 규칙으로 자동 변환하지 않는다.
- decision: 증상과 조건, 선택지, 비용, 반례, 그대로 유지할 조건을 갖춘 판단.
- review=reviewed: 근거와 적용 범위를 검토했다는 뜻이며 보편적 진리를 뜻하지 않는다.
- review=uncertain: 충돌이나 검증 부족이 남아 있다. 수정의 단독 근거로 사용하지 않는다.

## sync 출력

참조 본문 앞부분에 `참고 상황`, `판단에 사용할 내용`, `적용하지 않는 경우`를 명시한다.
각 문서의 실제 증상·질문과 확인할 개념을 적고, 같은 분야라는 이유로 동일한 문구를 반복하지 않는다.
검색 요약에도 참고 상황을 반영하고 `conditions`에는 실제 기술·환경 조건을 기록한다.
수집 날짜·부분 열람·미실행 같은 검토 한계는 사용 상황과 구별해서 보존한다.
개념 설명을 위해 만든 참조에는 해결책이나 수정 의무를 억지로 추가하지 않는다.

`references/learned/index.json`은 버전 1·2도 읽지만 새 sync 완료에는 버전 3을 사용한다. 모든 형식은 `entries`와 `outcomes`를 갖는다. 정확한 스키마는 `src/application/knowledge/reference-index.ts`와 `src/application/policy.ts`에 있다. 도구는 해시·연결·구조·규칙 승인을 검증하며 주장의 진실성을 자동 인증하지 않는다.

버전 2의 `kind: rule`은 `rule` 정의와 `ruleApproval: {proposalId, proposalHash}`를 추가한다. rule은 id/version/title/statement/layer/obligation/conditions/exclusions/evidence/verification/examples/validation/limitations를 갖는다. layer는 domain/architecture/framework/accessibility/security/testing, obligation은 required/recommended, verification은 existing-tool/custom-check/behavior-test/review, validation은 proposed/verified이다. 예제는 path/expectation(pass/fail/excluded)/선택 diagnostic을 기록한다. 검증하지 않은 예제는 verified로 표시하지 않는다.

필수 후보의 저장은 `save_rule_proposal`, 검토는 `get_rule_proposal`, 사용자 확정은 `approve_rule_proposal`을 사용한다. 후보 내용·원본 해시가 바뀌면 다시 검토한다. 배포 rule과 sources는 승인한 후보와 일치해야 한다. rule 항목은 review=reviewed여야 하며 concept/decision에 rule 메타데이터를 붙이지 않는다. 공용 승인이 프로젝트 채택을 뜻하지는 않는다.

각 entry 필드:

- id: 영문 소문자·숫자·점·밑줄·하이픈으로 된 안정적인 식별자
- kind, title, summary: 개념/판단 구분과 간결한 검색 요약
- path, contentHash: learned/ 아래 Markdown 상대 경로와 전체 파일 SHA-256
- keywords: 증상, 질문, 한국어/영어 별칭. 무관한 검색어를 나열하지 않는다.
- domains: networking, concurrency, state 등 실제 지식 영역
- technologies, excludedTechnologies: 적용/제외 기술 이름. 빈 적용 목록은 기술 중립을 뜻한다. React와 Vue를 혼용하는 저장소는 해당 작업 영역의 기술로 재검색한다.
- conditions, exclusions: 버전·도메인·환경 제약과 반례. 문자열 의미는 모델이 판단하며 검색기가 버전 범위를 자동 판정하지 않는다.
- evidenceKind: public-contract / implementation / experience / hypothesis
- review: reviewed / uncertain
- sources: 원본 catalog ID → 검토한 원본 파일의 SHA-256
- related: 필요할 때 더 읽을 개념·판단 ID. 재귀적으로 전부 펼치지 않는다.
- routing: `{mode, reason}`. direct는 직접 검토 질문, supporting은 related로 연결한 direct 판단의 보조 개념, deferred는 근거·맥락 미확정이다. v3 모든 항목에 필요하다.
- triggers/checks: direct에서 함께 필수이며 다른 mode에는 두지 않는다. 트리거는 `{kind, value, description?}`이며 kind는
  call/import/path/jsx-element/jsx-attribute/semantic/syntax이다. syntax는 현재 `parameter-dispatch`만 지원한다. call은 `react#useEffect`처럼 import 원본과
  내보낸 이름을 사용한다. import는 모듈 문자열, path는 파일/폴더 경계 접두,
  JSX는 intrinsic 태그와 명시 속성만 추출하며 래퍼 컴포넌트의 DOM은 추정하지 않는다.
  semantic은 호스트가 해석한 안정적인 상황 ID이며 상황 설명 description이 필수다. 이름 별칭은 구문 바인딩으로
  확인하되 재수출의 원래 출처는 자동 추정하지 않는다.
- investigation: 조건부 조사 명세(version: 1). questions의 id/kind(code 또는 intent)/role(applicability, exclusion, context)/instruction, preserve, alternatives(option/tradeoff), onMissing을 저장한다. [구체적 조사·판정 절차](workflows/knowledge-investigation.md)를 따른다. 선택한 원문의 direct 참조는 새 MCP sync 전에 이를 작성해야 한다. 미전환 항목은 withoutInvestigation/legacy-checklist로 표시하며, 조사 완료로 취급하지 않는다.
- checks는 `{id, question, guidance, verification}`이다. verification은
  review/static/behavior/runtime으로 필요한 검증의 성격을 설명한다.
  실행 완료나 자동 수정 의무를 뜻하지 않는다. 반례·유지 조건·예시 코드는
  기존 본문에 두고 필요할 때 읽는다. 같은 지식의 check ID는 중복할 수 없다.

`triggerChecks`는 `{signals: [{kind, value}], technologies, expectedIds,
forbiddenIds, expectEmpty?}`로 트리거→참조 매핑의 회귀 사례를 고정한다.
`validate_knowledge_sync`와 완료 표시는 이 사례도 검사한다. direct마다 양성 기대 ID와 음성 금지 ID 사례가 필요하다. 신호 매칭은 자연어 exclusions를 이해했다는 증거가 아니다. 매핑 테스트와
실제 코드에서 트리거를 찾는 테스트는 별개이며 둘 다 필요하다. 새 sync는 추출기가 만들지 않는 짧은 call 이름(예: `useEffect`)을 거부한다. `module#export` 또는 지원하는 `global#fetch`를 실제 추출 결과에서 가져온다. 주입된 객체 메서드와 로컬 함수의 도메인 의미는 인용된 semantic 해석으로 연결한다. 같은 가짜 신호를 triggerChecks에 넣어 통과시키는 것으로 추출 검증을 대신하지 않는다. 기존 인덱스는 수정할 수 있도록 읽기를 유지한다. 조건부 지식을
트리거에 연결한다고 필수 규칙으로 승격되는 것은 아니다.

여러 항목이 같은 파일을 참조할 수 있지만 파일을 작고 응집력 있게 유지한다. 핵심 근거와 조건은 배포 참조에 포함한다. 원본 파일은 설치본에 없을 수 있으므로 원본 링크만 남겨 근거를 대체하지 않는다.

인덱스 루트의 선택 `retrievalChecks`는 `{query, technologies, expectedIds, forbiddenIds}` 배열이며, 검색 결과가 없어야 하는 사례는 `expectEmpty: true`를 추가한다. 빈 expectedIds만으로 검색 없음이 검증되지는 않는다. 수정한 참조의 실제 증상, 다른 기술에서 제외될 사례, 결과가 없어야 하는 사례를 기록한다. `validate_knowledge_sync`는 파일을 바꾸지 않고 출처·본문·규칙 승인·결과 연결·이 검색 사례를 검사한다. `mark_knowledge_synced`도 같은 검사를 재사용하며 실패한 검색 사례가 있으면 완료 표시를 거부한다. 기존 인덱스에 사례가 없으면 호환성을 유지하되 미검증 경고를 반환한다. 이 검사는 원문 주장이 정확히 요약됐는지를 자동 판정하지 않는다.

각 outcome은 sourceId, sourceHash, action, reason을 갖는다.

- represented: 새 참조 생성, 기존 참조 보강 또는 중복 출처 연결. sources에 해당 원본을 연결한다.
- deferred: 충돌·검증 부족으로 배포 보류. 동기화 완료로 표시하지 않는다.
- omitted: 유용한 새 내용이 없어 배포 생략. 이유를 기록하고 원본은 보존한다.

일부 주장만 반영했다면 reason에 반영/보류한 절과 이유를 구분한다. 원본 변경으로 영향을 받은 모든 참조를 재검토한다. 삭제된 원본의 연결을 임의로 다른 근거에 붙이지 않는다. 근거를 복구하거나 대체 근거를 검토하고, 근거가 사라진 판단은 배포 인덱스에서 제거한다. 인덱스 전체를 갱신할 때 영향 없는 항목과 기록을 보존한다.

`mark_knowledge_synced`는 인덱스 구조, 본문 해시, 전체 항목의 원본 해시, 대상 원본의 처리 결과를 확인한다. 이는 의미 검토를 대체하지 않는다. omitted는 처리 완료로 기록할 수 있으나 deferred는 계속 미배포로 남는다. 반환할 보고서에서 둘을 구분한다.

## 작업 중 검색

완료 기록은 원본의 `publishedHash`와 참조·트리거·체크·관련 자료·사례의
`publishedArtifactsHash`를 함께 저장한다. 본문 예시가 바뀌면 contentHash도
갱신해야 한다. 원문이 같아도 파생 자료가 달라지면 해당 원본은 다시 unpublished다.
다른 원본의 완료를 일괄 해제하지 않는다. legacy 미이전 항목과 deferred는 상태에
별도로 표시하며 미이전 인덱스로 새 sync를 완료할 수 없다.

### 코드에서 트리거로

계획·구현의 기본 진입점은 `get_work_context`다. 이 도구가 이미 아래 코드 분석과
의미 트리거 탐색을 수행하므로 동일 범위로 1~2번을 다시 호출하지 않는다.
요약의 contextId와 후보를 사용하고, 새 해석·미확인 범위·항목별 검토가 필요한
경우에만 아래 개별 도구를 추가로 사용한다. 계획의 후보 채택/제외는
save_revision의 결정 기록에 연결한다. 별도의 체크 항목 검토가 필요한 작업에서는
4번을 사용하며, 계획 저장을 위해 같은 판단을 두 형식으로 반복하지 않는다.

1. 작업 코드를 먼저 읽고 `inspect_code_knowledge`에 `files`(최대 40개)와
   해당 영역의 `technologies`를 전달한다. 전체 폴더를 재귀적으로 해석하지 않는다.
   이 도구는 AST 자체 대신 경로·import·호출·parameter-dispatch 구조 신호, 해시, warnings와 체크리스트를
   반환한다. 이름 별칭·스코프 가림을 확인한다. tsconfig/jsconfig의 경로 해석은
   파일 위치의 단서이며 재수출/동적 import/번들러 전용 별칭은 호스트가 추적한다.
2. `discover_knowledge_triggers({query, technologies, domains, offset, limit})`로
   작업 증상과 코드 관찰에 맞는 설명을 찾는다. query는 최대 20개 후보이므로
   범위 확인에는 domains와 페이지 조회를 사용한다. 응답 hash를 다음 페이지의
   expectedHash로 전달한다. 전체 어휘를 매 검사마다 반환하지 않는다.
   의미 해석이 필요한 경우 발견한 상황을 선택해
   `interpretations: [{path, line, evidence, signal, interpretation}]`으로 다시
   호출한다. evidence는 인용 행부터 최대 10행 안의 실제 코드다. 도구는 코드와
   인용의 일치를 확인하지만 의미의 진실성을 증명하지 않는다. 도메인·이벤트·
   props/state 소유권은 호스트가 실제 호출자를 읽고 해석한다.
3. 후보의 conditions/exclusions와 checks를 검토한다. 조사 명세가 있는 후보는
   [knowledge-investigation](workflows/knowledge-investigation.md)의 구체적 조사 지시를 따른다.
   관계 확인이 필요할 때만 includeRelations:true로 최대 200개 사실을 조회한다. 필요한 경우에만
   `read_learned_knowledge`로 예시와 반례를 읽는다. candidates.supporting은
   해당 판단에서 필요할 때 읽는 보조 자료 목록이다. 트리거로 직접 연결된 후보는
   단어 검색 상위 5개 제한과 별개다. 새 지식은 sync 시 조건과 함께 연결한다.
4. 허용된 구현 작업에서는 `save_knowledge_review`에 동일한 input,
   inspectionHash, evidence 기록 id/expectedHash와 checklist의 각 itemId에 대한
   judgments를 보낸다. 각 judgment는 decision, rationale, evidence,
   verification: {kind, reason}을 갖는다. decision은 apply/keep/not-applicable/
   needs-context/needs-decision, 검증 종류는 none/static/test/browser/profiler다.
   evidenceLine을 생략하면 트리거 행부터 인용을 확인한다. 파일 경로 트리거 또는
   긴 함수에서는 실제 근거가 있는 같은 파일의 evidenceLine을 지정한다.
   같은 파일의 다른 호출 위치도 각각 판단한다. 읽기 전용 리뷰에서는 저장하지
   않고 판단을 보고한다.
5. 새로운 제품 트레이드오프만 사용자와 결정하고 기존 결정을 재사용한다.
   추가 코드 조사로 해결할 문제는 사용자에게 떠넘기지 않는다. pending은 해결된
   결정이 아니다. uncertain 참조는 apply로 기록할 수 없다. reviewed는 모든
   판단이 기록됐다는 뜻이며, 실제 구현이나 검사 통과를 뜻하지 않는다.
6. 동작 검증은 기존 프로젝트 검사와 승인 정책·save_semantic_review에 연결한다.
   코드/config/지식 변경 후 재조회한다. 파일 추가·의존 변경 후에는 조사 범위도
   다시 정한다. 이 기록은 선택한 파일만 다루며 저장소 전체를 인증하지 않는다.

런타임 조사의 계기는 사용자 증상, 변경된 동작 계약 또는 근거를 갖춘 AI 해석이다.
Effect 발견만으로 브라우저/Profiler를 실행하지 않는다. 응답 순서·상태 수명은
작은 동작 테스트부터 확인하고, 실제 렌더 지연·포커스·브라우저 동작이 필요한
경우에만 해당 환경으로 확장한다. Profiler는 개발 서버에서도 쓸 수 있지만
실행 중인 React 트리가 필요하며 빌드 전 소스/SSR만으로 UI 성능을 측정하지 않는다.
브라우저 측정과 단순 코드 패턴을 구분하고 실행하지 않은 검증은 미검증으로 남긴다.

경로 트리거는 아키텍처 검토 단서이지 의존 방향을 강제하는 규칙이 아니다.
합의된 의존 규칙은 대상 프로젝트의 lint/의존 검사와 승인 정책으로 강제하고,
트리거 누락이나 검색 순위 때문에 생략하지 않는다. 기본 탐색은 FS가 포함한
TypeScript 파서를 사용하며 대상 프로젝트에 ESLint 설치를 요구하지 않는다.
알 수 없는 문법·미해결 import·빈 결과는 결함 없음 판정이 아니다.

sync는 새 Skill을 매번 생성하는 과정이 아니다. 네 개의 진입 Skill은 유지하고, `references/learned/*.md`와 인덱스를 갱신한다. 모델은 현재 작업에 맞는 진입 Skill을 선택하고, 그 절차 안에서 참조를 선택한다.

`get_work_context`는 기본적으로 요약을 반환한다. `get_revision`으로 선택한 정책·이슈 계약, `get_project_document`로 프로젝트 문서를 읽고 해시가 같은 자료를 반복해서 전부 읽지 않는다. `detail: full`로 기존 전체 맥락을 요청할 수 있다.

프로젝트 맥락과 실제 코드를 읽은 뒤 관찰한 증상·질문으로 `search_learned_knowledge`를 호출한다. 기술 이름만으로 관련성을 가정하지 않는다. 기술을 알고 있다면 technologies에 전달한다. 모르면 조건 미확인 상태로 취급한다. 상위 후보의 kind, review, conditions, exclusions를 확인한 뒤 `read_learned_knowledge`로 필요한 본문만 읽는다. nextOffset이 있으면 판단에 필요한 반례가 뒤에 있는지 확인한다. 관련 ID는 현재 판단에 필요한 경우에만 추가로 읽는다.

코드 관찰을 `get_work_context.observations: [{path, observation}]`로 전달하면 요청·제약과 함께 검색에 반영한다. 파일 경로는 실제 프로젝트 파일인지 확인하지만 관찰의 진실성은 호스트가 책임진다. 검색 결과는 `matchedTerms`, 본문 `contentHash`, 후보 상태를 포함한다. 영어는 단어/식별자 경계로, 한국어는 제한된 접두 형태로 비교하며 일반 단어와 낮은 점수의 꼬리 후보를 제거한다. 점수는 의미적 신뢰도가 아니다.

기존 plan/decision/evidence에 필요한 항목만 기록한다: 관찰 파일·상태 → 참조 ID/해시 → 조건 충족/제외 근거 → 채택/미채택/보류 → 영향을 받는 규칙·검사. 별도 보고서를 매 작업마다 만들 필요는 없다. 신뢰 경계·상태 수명·실패 처리처럼 답에 따라 설계가 달라지는 질문을 묻고, 이미 받은 답은 재사용한다. 해결하지 못한 조건은 자동 채택하지 않는다.

검색 결과 없음은 결함 없음이나 지식 부재의 증명이 아니다. 별칭과 관찰된 다른 원인으로 좁게 재검색하고, 부족하면 모델 지식·공식 자료·측정을 활용하며 근거 출처를 구분한다. 개념·불확실한 자료를 단독 수정 근거로 사용하지 않는다. 기술 조건 필터를 통과해도 버전·도메인 조건은 별도로 확인한다.

## 평가

`npm test`의 지식 검색 평가를 사용한다. 코드 상황, 검색어, 해당 영역 기술, 기대 ID, 부적합 ID를 고정하고 상위 5개 후보의 정밀도·재현율과 부적합 검색 수를 확인한다. 반환 JSON의 문자 수는 맥락 크기의 대용 지표이며 실제 모델 토큰 수가 아니다.

문서에 있는 문장 그대로만 질문하지 말고 한국어/영어 표현, 다른 프레임워크, 기술 중립 CS, 결과가 없어야 하는 질문, 불확실한 가설을 포함한다. 사례와 관련성 판정은 사람이 검토하고 검색 튜닝용과 별도의 평가용 사례를 구분한다. 현재 자동 사례는 합성 회귀 테스트이므로 실제 사용자 적중률을 입증하지 않는다.

의미 평가에서는 원본 대비 과장·조건 누락·근거 없는 처방, 불필요한 변경, 상충 근거 은폐를 별도로 검토한다. 검색 점수만으로 답변 품질을 판정하지 않는다. 실제 작업에서 발견한 누락·오적용을 재현 사례로 추가한다.

## Source review gate

Before deriving/publishing, use the [lifecycle workflow](workflows/fs-knowledge-active.md). The user sets Markdown state: active; active prepares notes, review approves them, and a bare sync selects only current merged sources awaiting publication. Sync never activates or reviews pending notes. Follow [source review](workflows/fs-knowledge-review.md) separately for active sources. `knowledge_status.sourceReviews` distinguishes current approved reviews from on-review/changes-requested/stale/legacy-unreviewed sources. `read_source_knowledge` bounds source context and returns snapshot hashes; `save_source_review` records host/user judgments without publishing. The shared sync validator requires current approved reviews for selected IDs and binds them into publication hashes. The internal TypeScript helper with empty IDs audits index integrity only; omitted MCP IDs instead select merged unpublished sources. The internal empty-ID audit does not certify source reviews or publish any source. Existing publications without review records remain explicitly legacy-unreviewed, requiring review on the next selected sync. Do not confuse claim-level host judgment with mechanical quotation/hash validation.

Legacy low-level catalog helpers remain usable by historical fixtures; public MCP review and sync require explicit active selection and current merged evidence. Legacy records are never selected by the new automatic queues.
