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

`references/learned/index.json`은 버전 1(개념·판단)을 계속 읽으며, 새 규칙은 버전 2로 배포한다. 두 형식 모두 `entries`와 `outcomes`를 갖는다. 정확한 스키마는 `src/application/knowledge/reference-index.ts`와 `src/application/policy.ts`에 있다. 도구는 해시·연결·구조·규칙 승인을 검증하며 주장의 진실성을 자동 인증하지 않는다.

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

여러 항목이 같은 파일을 참조할 수 있지만 파일을 작고 응집력 있게 유지한다. 핵심 근거와 조건은 배포 참조에 포함한다. 원본 파일은 설치본에 없을 수 있으므로 원본 링크만 남겨 근거를 대체하지 않는다.

각 outcome은 sourceId, sourceHash, action, reason을 갖는다.

- represented: 새 참조 생성, 기존 참조 보강 또는 중복 출처 연결. sources에 해당 원본을 연결한다.
- deferred: 충돌·검증 부족으로 배포 보류. 동기화 완료로 표시하지 않는다.
- omitted: 유용한 새 내용이 없어 배포 생략. 이유를 기록하고 원본은 보존한다.

일부 주장만 반영했다면 reason에 반영/보류한 절과 이유를 구분한다. 원본 변경으로 영향을 받은 모든 참조를 재검토한다. 삭제된 원본의 연결을 임의로 다른 근거에 붙이지 않는다. 근거를 복구하거나 대체 근거를 검토하고, 근거가 사라진 판단은 배포 인덱스에서 제거한다. 인덱스 전체를 갱신할 때 영향 없는 항목과 기록을 보존한다.

`mark_knowledge_synced`는 인덱스 구조, 본문 해시, 전체 항목의 원본 해시, 대상 원본의 처리 결과를 확인한다. 이는 의미 검토를 대체하지 않는다. omitted는 처리 완료로 기록할 수 있으나 deferred는 계속 미배포로 남는다. 반환할 보고서에서 둘을 구분한다.

## 작업 중 검색

프로젝트 맥락과 실제 코드를 읽은 뒤 관찰한 증상·질문으로 `search_learned_knowledge`를 호출한다. 기술 이름만으로 관련성을 가정하지 않는다. 기술을 알고 있다면 technologies에 전달한다. 모르면 조건 미확인 상태로 취급한다. 상위 후보의 kind, review, conditions, exclusions를 확인한 뒤 `read_learned_knowledge`로 필요한 본문만 읽는다. nextOffset이 있으면 판단에 필요한 반례가 뒤에 있는지 확인한다. 관련 ID는 현재 판단에 필요한 경우에만 추가로 읽는다.

검색 결과 없음은 결함 없음이나 지식 부재의 증명이 아니다. 별칭과 관찰된 다른 원인으로 좁게 재검색하고, 부족하면 모델 지식·공식 자료·측정을 활용하며 근거 출처를 구분한다. 개념·불확실한 자료를 단독 수정 근거로 사용하지 않는다. 기술 조건 필터를 통과해도 버전·도메인 조건은 별도로 확인한다.

## 평가

`npm test`의 지식 검색 평가를 사용한다. 코드 상황, 검색어, 해당 영역 기술, 기대 ID, 부적합 ID를 고정하고 상위 5개 후보의 정밀도·재현율과 부적합 검색 수를 확인한다. 반환 JSON의 문자 수는 맥락 크기의 대용 지표이며 실제 모델 토큰 수가 아니다.

문서에 있는 문장 그대로만 질문하지 말고 한국어/영어 표현, 다른 프레임워크, 기술 중립 CS, 결과가 없어야 하는 질문, 불확실한 가설을 포함한다. 사례와 관련성 판정은 사람이 검토하고 검색 튜닝용과 별도의 평가용 사례를 구분한다. 현재 자동 사례는 합성 회귀 테스트이므로 실제 사용자 적중률을 입증하지 않는다.

의미 평가에서는 원본 대비 과장·조건 누락·근거 없는 처방, 불필요한 변경, 상충 근거 은폐를 별도로 검토한다. 검색 점수만으로 답변 품질을 판정하지 않는다. 실제 작업에서 발견한 누락·오적용을 재현 사례로 추가한다.
