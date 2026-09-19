# 7.frontend-system Frontend Context


> Generated from 38dfcff8d3ecec45a9c747c85439fa961d49d49c. Verify evidence before changing approved decisions.


FS 0.2.0: 호스트 AI의 설계·구현 판단에 승인된 규칙, 실행 검사, 최신 근거를 연결하는 TypeScript CLI/MCP와 스킬 패키지.

## Observed

- 사용자 명령은 fs-plan, fs-work, fs-review, fs-knowledge 4개이며 세부 절차는 references/workflows에 보관한다.
- 공식 자료 URL은 knowledge/sources.json에서 관리한다. 현재 목록은 비어 있으며 등록·조사는 사용자 요청 시 수행한다.
- 전체 검사 13개가 통과했다. 핵심 Node 테스트 25개, 프론트엔드 정상/위반 사례, Chromium E2E, 패키지 smoke를 포함한다.

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
- 이번 전환은 기존 정책 없는 실행 기록의 호환 경로를 사용했다. 새 정책 강제 동작은 별도 자동 테스트로 검증했다.

## Quality Gates

- 최종 검증: checks/55e74a51-b48b-4ca4-960b-c12bd28010eb.json (stable=true, full=true).
- npm run check; npm run test:frontend; npm run test:package. CI 정의: .github/workflows/ci.yml.
- 상세 결과와 검증 한계: evidence/fs-020-verification.md.

## Assumptions

- 검증은 이 로컬 환경에서 수행했다. GitHub CI 실행 및 병합 필수 설정·배포는 수행하지 않았다.
- 모델 검토는 정확성 증명이 아니다. HTML/PDF는 호스트 도구로 읽고, 자동 텍스트 갱신 검사는 지원되는 텍스트 응답만 처리한다.

## Open Questions

- None
