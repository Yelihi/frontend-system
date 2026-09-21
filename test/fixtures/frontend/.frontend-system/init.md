# frontend Frontend Context


> Generated from 255e0f0b2ee22d28c7321ed6d710f5981d65a054. Verify evidence before changing approved decisions.


기존 주문 실패·재시도 흐름에 FS를 적용한 테스트 fixture. 제품 코드는 변경하지 않았다. 전체 운영 앱 평가가 아니다.

## Observed

- 검증 계약·조작 절차·실행 결과·검토 한계: [evidence/feature-order-retry.md](evidence/feature-order-retry.md)
- app/page.jsx → app/order-form.jsx → src/domain/orders.js → /api/orders; API는 stub, E2E는 응답 모킹.
- src/features/cart의 공개 index를 checkout이 사용; server/catalog는 server-only, server/public은 재노출.
- scripts/acceptance.mjs는 기존 정상/위반 검사를 실행하고 소스를 복원한다.

## Architecture

- 서버 페이지가 catalogue 내용을 client form의 children으로 전달한다.
- 주문 pending/error/submitted는 로컬 state이며 domain submitter가 비동기 중복 제출을 막는다.

## Conventions

- 현재 테스트 위치 유지: tests/order.test.mjs, e2e/order.spec.mjs.
- 관찰된 fixture 구조이며 일반 프로젝트 공통 규칙으로 승격하지 않는다.

## Decisions

- 사용자가 test 내 프로젝트의 적용 실행을 요청했다. 새로운 설계·검증 정책 승인이나 위임 확대 결정은 없다.

## Quality Gates

- 관찰된 기존 검사 6종 통과: f6fbadbb-bfc3-476d-acf8-4a88b742e6bf. 승인된 필수 정책이 있다는 뜻은 아니다.
- 정상/위반 acceptance 실행 통과. 상세 범위와 환경 실패 이력은 evidence 참고.

## Assumptions

- 인증·DB·실제 주문 저장·장기 재발 관찰·AI 판단 일반화는 평가 범위 밖.
- AGENTS.md와 설치된 Next.js 문서의 서버/클라이언트 경계를 확인했다.

## Open Questions

- None

