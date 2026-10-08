# v10 — 여러 프로젝트에서 지식 기반 계획 비교

한 가지 요청/인증 예제에 맞춰진 개선인지 확인하기 위해 서로 다른 여섯 프로젝트를 추가했다.
기존 v9 결과는 그대로 보존한다. [고정 프로토콜](protocol.md)과 공개된 보충 조건으로 실제 모델 비교를 완료했다.

| 프로젝트 | 핵심 판단 | 분류 |
| --- | --- | --- |
| [디자인 시스템](projects/design-system/README.md) | button/link 동작, 네이티브 속성, 독립 테마, 스타일 경계 | 개선용 |
| [문서 편집기](projects/draft-editor/README.md) | 자동 저장, 새 편집과 응답의 순서, 충돌, 문서/편집기별 초안 | 개선용 |
| [가격 계산 화면](projects/pricing-console/README.md) | 계산 순서·반올림, 입력 불변성, 오류, 서버 가격 권한 | 개선용 |
| [SSR 장바구니](projects/ssr-storefront/README.md) | 요청 간 격리, hydration, guest/account 전환, 저장소 | 별도 검증용 |
| [업로드 대기열](projects/offline-uploader/README.md) | 재시도와 불확실한 결과, 취소, 동시성, workspace 생명주기 | 별도 검증용 |
| [확장 기능 호스트](projects/plugin-shell/README.md) | 구독/명령 소유권, 재진입, callback 오류, 교체와 해제 | 별도 검증용 |

각 프로젝트는 TypeScript 소스 5개와 README·package.json·tsconfig.json을 가진다. DOM 컴포넌트,
순수 도메인 계산, 서버 진입점 등 실행 맥락이 다르지만 프레임워크별 지원을 검증하는 실험은 아니다.
큰 생산 프로젝트를 흉내 낸 코드량 비교도 아니다. 제품 코드는 구현하거나 실행하지 않는다.

일반 AI / 지식 원문 AI / FS 세 조건으로 질문 → 실제 질문에 해당하는 고정 답변 → 미승인 계획을
비교한다. 지식 원문 AI와 FS에는 동일한 조건부 지식 여섯 편을 제공한다. source review/sync는
격리된 실험 코퍼스만 대상으로 실행하며 저장소의 실제 지식을 게시하거나 변경하지 않는다.

첫 세 프로젝트의 결과로 발견한 문제를 개선한 뒤 새 대화/사본에서 재시험한다. 별도 세 프로젝트는
수정 후보를 고정하기 전 모델 결과를 보지 않는다. 알려진 실패를 고친 결과와 별도 상황에 전달되는
효과를 구분한다. 같은 후보를 성공이 나올 때까지 재실행해 유리한 표본만 고르지 않는다.

품질은 실제 사용자 답변 위반, 근거 없는 필수 변화, 관련 없는 지식 적용, 검증 가능한 시나리오,
저장 규칙과 문서의 일치로 검토한다. 질문·문서·추상화의 수로 종합 점수를 만들지 않는다.
비용은 실패 포함 토큰/시간/도구 오류로 별도 기록한다. 제공자 캐시는 초기화할 수 없다.

## 확인된 수정과 완료된 비교

실제 코드 추출에서 나오지 않는 bare call 이름으로 메타데이터와 정답을 함께 만들면 합성 검사만
통과할 수 있었다. 발행 검증에 `module#export`/지원하는 `global#fetch` 검사를 추가했고,
실제 소스 검사에서는 import 호출 4개 사례와 인용된 의미 해석 2개 사례를 구분해 확인했다.
지역 함수의 같은 이름은 정적 일치로 인정하지 않는다. 이것은 의미 판단의 정확도 점수가 아니다.

추가로 라우팅 모듈의 직접 ESM import 순환 오류, 미입력 확인 근거를 위임처럼 표시하던 문구,
상세 저장/계약 조회에서 계약 진단이 빠지던 응답 불일치를 수정했다. 현재 타입·lint·98개 회귀와
패키지 검사가 통과했다. 상세 응답 수정은 아래 holdout-1 종료 전 동결된 런타임에는 포함되지 않는다.

| 실행 | 완료 여정 | 총 토큰 | 비캐시 입력+출력 | 해석 |
|---|---:|---:|---:|---|
| [2026-10-06-development-1](results/2026-10-06-development-1/analysis.md) | 8/9 | 3,145,794+ | 400,194+ | 초기 진단; FS 계획 1회 제공자 용량 부족 |
| [2026-10-06-development-2](results/2026-10-06-development-2/analysis.md) | 7/7 | 3,392,053 | 341,557 | 라우팅/표시 수정 후 재검증 |
| [2026-10-06-development-3](results/2026-10-06-development-3/analysis.md) | 3/3 | 1,462,089 | 152,265 | 감사 조회를 평가기로 이동; 총 비용 감소는 관찰 안 됨 |
| [2026-10-06-holdout-1](results/2026-10-06-holdout-1/analysis.md) | 9/9 | 4,198,387 | 484,467 | SSR·업로드·확장 기능 세 상황 |
| [2026-10-06-development-4](results/2026-10-06-development-4/analysis.md) | 3/3 | 1,377,984 | 142,272 | 상세 진단 수정·미답변 범위 명시 후 편집기 회귀 |
| [2026-10-06-natural-1](results/2026-10-06-natural-1/analysis.md) | 6/6 | 2,272,384 | 258,944 | 짧은 요청으로 가격·확장 기능 재비교 |

모두 gpt-6-sol, medium이다. 위 표는 생성 호출만 집계하며, 실패한 사용량은 0으로 처리하지 않는다.
리뷰를 포함한 전체 호출은 [비용 원장](results/cost-ledger.json)에 별도로 보존한다.
일부 답변집의 정책 묶음을 답변 전달 전에 분리한 변경은 해당 실행의 amendment 문서에 기록했다.
소스는 각 5개 모듈의 작은 진단 사례다. 대형 생산 프로젝트·장기 유지보수·실행 구현 품질의 증거는 아니다.

완료된 세 상황에서는 일반/원문 AI도 요청별 상태, 주입된 경계, 등록별 소유권 등 의미 있는 구조와
검증 예시를 제시했다. FS의 **지식 연결과 기록 일관성은 확인했지만 고유한 설계 품질·비용 우위는
아직 입증하지 못했다.** 계획은 미승인 상태이며 실제 제품 구현이나 테스트 통과로 계산하지 않는다.

사용자가 제시한 연산별 API 예시는 지식에 추가하지 않았다. [구조적 의도 관찰](results/intent-review-supplement.md)은
호출부와 변경 요구가 구조를 뒷받침하는지 확인하며, 클래스·특정 패턴·분기 제거 자체에 점수를 주지 않는다.

상세 응답 수정 재검증과 [사전 등록한 짧은 요청 비교](results/natural-request-hypothesis.md)를 완료했다.
기존 공통 프롬프트는 모든 조건에 상세 설계 목차를 주는 `guided` 비교다. 추가 `natural` 비교는
같은 코드·답변 절차를 유지하면서 짧은 요청을 사용한다. 두 결과를 섞거나 이전 결과를 대체하지 않는다.

전체 37개 여정 중 36개가 완료됐다. 생성 74회와 별도 리뷰 2회를 포함해 실제 호출은 76회이며,
알려진 총 토큰은 **16,130,437 이상**, 비캐시 입력+출력은 **1,812,229 이상**이다. 제공자 용량 부족
2회(생성 1회·리뷰 1회)는 사용량 미제공이며 0으로 계산하지 않았다. 코디네이터 대화 비용은 제외한다.
자연어 근거 배열을 처리하지 못한 평가기 오류는 원래 4개 응답을 재사용해 복구했고 모델 재호출은 없었다.

짧은 요청 비교에서도 일반/원문 AI가 책임 분리와 열린 결정을 제시했다. FS의 가격·확장 기능 계획은
각각 일반 AI 대비 총 토큰 9.97배·4.58배, 비캐시 입력+출력 2.20배·2.81배였다. 이 비율은 단일 실행
관측치이며 요금이나 순수 라우팅 효과가 아니다. FS 가격 실행에서는 수정한 상세 응답의 진단을 읽고
누락된 검증 연결을 보완했다. 실제 자동 테스트 통과를 뜻하지 않으며 계획은 미승인 상태다.
[양쪽 실제 계획·비용·한계](results/2026-10-06-natural-1/analysis.md)에서 직접 비교할 수 있다.

## 실행

```sh
npm run build
python3 test/evals/fs-comparison/v10/run.py prepare \
  --output test/evals/fs-comparison/v10/results/my-run --cohort development
python3 test/evals/fs-comparison/v3/maintenance/run.py --preflight-only \
  --output test/evals/fs-comparison/v10/results/my-run/isolation
python3 test/evals/fs-comparison/v10/run.py questions \
  --output test/evals/fs-comparison/v10/results/my-run
```

각 질문을 읽고 `cases.json`의 고정 답변 중 실제 질문에 해당하는 항목만 선택하여
`<result>/<cell>/answers.json`에 `questionId`, `bankKeys`, 정확한 `answer`, `mappingRationale`를
작성한다. 의미 매핑에는 사람/코디네이터 검토가 필요하며 키워드만으로 자동 답변하지 않는다.

```sh
python3 test/evals/fs-comparison/v10/run.py plan \
  --output test/evals/fs-comparison/v10/results/my-run
python3 test/evals/fs-comparison/v10/run.py summarize \
  --output test/evals/fs-comparison/v10/results/my-run
python3 test/evals/fs-comparison/v10/audit.py \
  test/evals/fs-comparison/v10/results/my-run
```

준비/질문/계획 시 입력·런타임을 동결하고 사용한 모델/명령·개별 사용량·대화 ID를 보존한다.
기존 결과는 덮어쓰지 않는다. `--cohort holdout`은 별도 검증 사례,
`--cases ... --arms raw-K1 fs-K1`은 명시적으로 선택한 회귀 비교를 준비한다.
짧은 요청 조건은 새 `prepare` 실행에 `--prompt-mode natural`을 추가한다.
보고서는 실제 완료 결과를 기반으로 업데이트한다.

링크가 열리지 않으면 저장소에서 `less test/evals/fs-comparison/v10/README.md`로 읽는다.
