# 7.frontend-system Frontend Context


> Generated from 4f1d6a77e50a33b19394bc46952c3278fe8aa47d. Verify evidence before changing approved decisions.


FS 0.2.0: 호스트의 판단에 승인된 규칙·현재 소스에 연결된 검사·검토를 결합하는 TypeScript CLI/MCP와 4개 스킬. 2026-09-22 신뢰성 보강을 반영했다.

## Observed

- 사용자 명령은 fs-plan, fs-work, fs-review, fs-knowledge 4개이며 세부 절차는 references/workflows에 보관한다.
- knowledge/sources.json에 476개 출처를 등록했다. 지식 개념 참조와 승인된 실행 규칙은 구분한다.
- 현재 핵심 Node 테스트 38개 통과. 3개 주문 계약의 3회 반복 eval, 프론트엔드 정상/위반 사례, Chromium E2E 1개와 패키지 smoke를 확인했다.

## Architecture

- src/adapters/filesystem: 파일·스크립트·프레임워크 발견. src/application: 맥락, 지식, 정책, 실행 기록. src/mcp.ts와 src/cli.ts: 호스트 진입점.
- policy.ts는 revision에 함께 해시되는 규칙·검사·검토·보호 파일·예외를 정의한다. workflow-store.ts는 최신 근거와 단계 의존성, 최대 3회 시도를 확인한다.
- knowledge/sources.ts는 조건부 HTTP 요청과 캐시·diff를 처리한다. rule-proposals.ts는 출처에 결합된 규칙 후보 승인을 기록한다.

## Conventions

- 호스트 모델이 의미를 판단하고 구현한다. 별도 AI 실행기나 범용 그래프 엔진은 없다.
- 기존 프로젝트의 테스트 배치를 보존한다. 결정적 검사 결과와 모델 검토 근거는 별도 기록한다.
- 변경한 자료만 제한된 창으로 읽는다. 스냅샷·검사 로그 전체는 로컬 저장하고 응답은 요약한다.

## Decisions

- 승인 근거와 목표는 revision.md, 단계 완료는 refactoring.md와 execution.json을 참조한다.
- 공통 규칙 승인과 프로젝트 채택은 별개다. 기존 프로젝트 규칙은 고정하고 업데이트 영향부터 검토한다.
- 이전 전환은 legacy 실행 경로였다. 이번 보강은 세 FS 도구 보장에 대해 명시적인 검사·guard·검토 정책을 고정했다.

## Quality Gates

- 현재 필수 검사: checks/3702361e-164f-4954-9517-d84aadb6d934.json (stable=true, test/typecheck/lint passed).
- npm run check에 반복 eval을 포함한다. test:eval로 좁은 반복 평가를 실행할 수 있다. 기존 frontend/package 검사와 CI 정의를 유지한다.
- 현재 결과와 범위: evidence/fs-reliability-hardening.md. 이전 결과: evidence/fs-020-verification.md.

## Assumptions

- 검증은 이 로컬 환경에서 수행했다. GitHub CI 실행 및 병합 필수 설정·배포는 수행하지 않았다.
- 모델 검토는 정확성 증명이 아니다. HTML/PDF는 호스트 도구로 읽고, 자동 텍스트 갱신 검사는 지원되는 텍스트 응답만 처리한다.
- 루트 기술 발견에는 내장 프론트엔드 예제도 포함된다. 실제 제품 적용 시 대상 패키지 경로를 지정해야 한다.

## Open Questions

- 실제 적용 검증 대상 프로젝트와 기능은 무엇인가? — 현재 결과는 FS 자체와 합성 예제이며 소비 프로젝트 검증을 대신하지 않는다.
