# 주문 실패·재시도 — FS 적용 기록

## 범위와 계약

2026-09-21 사용자가 지정한 test 내 프론트엔드 테스트 프로젝트에 적용했다.
운영 소비 프로젝트가 아닌 Next.js/React 합성 fixture의 실제 실행 결과다.
기존 tests/order.test.mjs와 e2e/order.spec.mjs의 계약을 검증 대상으로 삼았다.
제품 요구를 새로 만들거나 기존 승인 정책을 바꾸지 않았다.

- 처리 중 중복 제출을 거부하고 전송을 한 번만 수행한다.
- 실패하면 pending을 풀고 오류를 보여 재시도를 허용한다.
- 재시도 성공 시 오류를 제거하고 Order received를 표시한다.
- 양의 정수가 아닌 수량은 전송 전에 거부한다(단위 검사 범위).

## 다음 실행 절차

저장소 루트에서 node dist/src/cli.js work-context test/fixtures/frontend "Verify order retry" --mode verify로 현재 기록과 소스를 비교한다.
기존 빌드 산출물이 없으면 루트에서 npm run build를 먼저 실행한다.
앱의 npm 의존성과 설치된 Playwright 버전의 Chromium이 필요하다.
이번에는 npm exec -- playwright install chromium --only-shell로 누락된 실행 파일을 설치했다.

전체 검사: node dist/src/cli.js checks test/fixtures/frontend
UI만 확인: npm --prefix test/fixtures/frontend run test:e2e
위반 탐지: npm --prefix test/fixtures/frontend run acceptance
acceptance는 fixture를 일시 변형하고 finally에서 복원한다. 실행 전 변경을 확인하고
같은 앱의 빌드·E2E와 동시에 실행하지 않는다.

Playwright가 127.0.0.1:3217에 npm run dev를 실행한다. 포트가 비어 있어야 하며
reuseExistingServer는 false다. 외부 계정·인증·주문 데이터는 필요하지 않다.

1. / 진입 후 Server-rendered catalogue 표시를 확인한다.
2. Place order 클릭. 첫 /api/orders 응답을 기존 page.route로 보류한다.
3. Submitting 버튼 비활성화와 요청 1회를 확인한다.
4. 첫 요청을 HTTP 500으로 완료해 Order failed. Try again. 오류를 확인한다.
5. Place order를 다시 클릭하고 HTTP 200 응답 뒤 Order received, 오류 제거,
   총 요청 2회를 확인한다. 상세 조작과 assertion은 e2e/order.spec.mjs를 재사용한다.

브라우저 검사는 버튼 비활성화, 실패 표시와 재시도를 검증한다. 처리 중 직접적인
submit 재호출 거부는 tests/order.test.mjs가 실제 domain 구현에 대해 확인한다.

## 이번 결과 — 절차와 구분

소스 커밋: 255e0f0b2ee22d28c7321ed6d710f5981d65a054
소스 해시: acd53f47af87874dbedef2b71b01bcf3d76f624ec625e8be7d3c409432f3a99f
환경: darwin/arm64, Node v24.12.0, 설치된 Next.js 16.3.5,
React 19.3.0, Playwright 1.63.0, Chromium headless shell v1243.
최종 실행 시각: 2026-09-21T03:48:38.390Z

- [초기 검사](../checks/874c42fb-1ae4-43ec-bf73-8c517c58c13d.json): 경계·unit·typecheck·lint·build 통과,
  E2E는 sandbox listen EPERM으로 실패. 제품 결함으로 분류하지 않았다.
- [권한 부여 후 검사](../checks/6ff06eb8-96f6-4406-91b5-460589e0f4a9.json): 같은 5종 통과,
  E2E는 Chromium 실행 파일 부재로 실패. 필요한 브라우저 설치로 환경을 보완했다.
- [최종 검사](../checks/f6fbadbb-bfc3-476d-acf8-4a88b742e6bf.json): 6종 모두 통과, stable=true, full=true.
  단위 1건과 브라우저 1건이 통과했고 sourceHash는 세 실행 모두 동일하다.
- acceptance 종료 코드 0: 정상 전후 검사 통과. hooks 1건, alt-text 1건,
  import/re-export/dynamic 경계 3건, domain guard 1건, server-only 2건 등
  의도한 위반 8건이 각각 기대 진단으로 거부됐다.
  원본 출력은 로컬 reports/order-acceptance.log에 보관한다(Git 제외).

## 검토와 한계

호스트 /root가 page → OrderForm → createOrderSubmitter → send → /api/orders와
단위/E2E assertion, 접근성 역할·버튼, server-only 경계를 직접 검토했다.
이번 범위에서 제품 수정이 필요한 결함은 발견하지 못했고 앱·검사 코드는 유지했다.
낮은 영향의 기존 fixture 검증이므로 추가 검토자나 별도 모델 평가를 실행하지 않았다.

API 응답은 브라우저에서 모킹한다. app/api/orders/route.js 자체도 accepted를
반환하는 stub이며 인증·서버 수량 검증·멱등성·DB 영속 저장을 입증하지 않는다.
UI에는 수량 입력이 없고 1을 전송한다. typecheck 범위는 src/domain/orders.js뿐이다.
기본 접근성 lint 통과가 전체 접근성 검증은 아니다. 다른 브라우저는 실행하지 않았다.
성공 화면 스크린샷은 생성하지 않았으며 trace는 실패 시에만 남도록 설정돼 있다.
후속 장기 관찰이 없어 실제 재발 여부와 AI 신뢰도·개선율은 미확인이다.

fixture에는 승인된 revision/policy가 없다. 검사는 기존 capability를 사용했으며
새 승인·필수 정책·attempt·semantic review·execution complete를 만들지 않았다.
실패 후 완료 거부의 정책 통합 증거는 루트 test/policy-workflow.test.ts의 합성 검사이며
이 fixture에 정책이 채택됐다는 뜻이 아니다.

이번 적용에서 사용자 정정이나 제품 재작업은 관찰하지 않았다. 환경 실패 두 건은
검사 성공으로 숨기지 않고 보존했다. 다음 유사 작업은 기존 범위를 유지하며,
위임 확대나 공통 규칙 승격을 뒷받침하는 결과로 사용하지 않는다.
