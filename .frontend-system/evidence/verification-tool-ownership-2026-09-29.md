# 검증 도구 소유권과 CI 증거 연결

- 날짜: 2026-09-29
- 요청: 프로젝트가 검증 의존성과 lockfile을 소유하고 FS가 설정·실행·해석을 안내하는 방향에 사용자 “네 진행하죠”로 진행 승인. 전체 방향 초안의 승인을 뜻하지 않음.
- 변경: plan/work에 검증 도구 절차 연결; 프로젝트·워크스페이스·환경·운영의 설치 책임과 CI 재현 절차 명시. 기존 예제 Playwright에 HTML·JSON 보고서, CI의 test.only 차단, 실패 trace 포함 결과물 업로드 설정. 새 의존성 없음.
- 근거: [검증 도구 절차](../../references/verification-tools.md), [CI](../../.github/workflows/ci.yml), [예제 설정](../../test/fixtures/frontend/playwright.config.mjs).

## 실제 실행

- npm run check: 타입·lint·빌드 및 39개 테스트 통과, 실패·skip 0.
- npm run test:package: npm 캐시 접근 제한으로 첫 실행 실패, 승인된 샌드박스 밖 재실행 통과. 네 스킬·원시 지식 제외·독립 MCP 실행 확인.
- npm run test:frontend: acceptance 통과. 정상 사례를 검사하고 hooks·접근성·import/re-export/dynamic 경계·도메인 변이·server-only 위반을 거부함. 후속 E2E는 로컬 포트의 EPERM으로 중단.
- npm --prefix test/fixtures/frontend run test:e2e: 승인된 샌드박스 밖 재실행에서 1개 통과. 중복 제출 차단·실패 표시·재시도 성공을 Chromium에서 확인.
- JSON 실제 결과: expected 1, unexpected 0, skipped 0, flaky 0, runner errors 0. HTML 파일 생성 확인.
- 환경: Node v24.12.0, macOS arm64, Next 개발 서버, API 응답은 테스트에서 모킹. 실제 백엔드 저장이나 운영 빌드 E2E를 입증하지 않음.
- 로컬 결과: test/fixtures/frontend/playwright-report/index.html 및 test/fixtures/frontend/test-results/results.json. Git 제외 경로이며 다음 실행에서 교체될 수 있음. JSON SHA-256: e1d62ae7a2c48750d5904ebf43986e11a214ed6bcc7320af9d3aab8615d2bd97.
- CI YAML·스킬 frontmatter는 기존 fixture의 js-yaml로 파싱 확인; 스킬의 파일 참조 확인. skill-creator quick_validate.py는 Python PyYAML 부재로 실행 불가. 이를 해당 검증기 통과로 기록하지 않음.
- git diff --check와 bundle/mcp.js 변경 없음 확인.

## 한계와 후속 확인

GitHub 원격 CI·artifact 업로드·필수 검사 설정은 실행 확인하지 않았다. 실패 trace 보존은 기존 설정이며 이번 통과 실행에서 생성하지 않았다. 소비 프로젝트 설치, test.md 자동 생성, 배포·플러그인 업데이트, 모델 판단 개선율 측정은 수행하지 않았다. 반복 모델 동의를 신뢰도 확률로 취급하지 않는다. 기존 workflow 정책의 stale 상태나 승인·완료 기록을 변경하지 않았다.

실제 프로젝트 적용 시 프레임워크·도구 버전 충돌, 준비되지 않은 환경의 오판정, 로컬과 CI 결과 차이를 확인해 이 절차를 보완한다.

## 검증 대상 식별

기준 HEAD: fb73be94b912d047754451b46e3d0db9a137f996; 위 결과는 미커밋 변경이 포함된 작업 트리에 대한 결과다. 전체 소스 스냅샷 인증은 아니며 아래 파일 해시로 이번 절차·설정을 식별한다.

- references/verification-tools.md: `2d9b9bbb53682ecd4ded77f07125c6f66e0a8d987c8cb48ed3d6e5e6c56bb245`
- skills/fs-plan/SKILL.md: `b2be04df1bb6b26e0b56b4b68769acb7a46ee874928deb448514c6fd47a8cc78`
- skills/fs-work/SKILL.md: `99aa4cc667d441a947e3c09d3c311380560952fbc32fb925aca4f16e4f161473`
- .github/workflows/ci.yml: `328c6fa5079fa16bd4c02b1ab307dd2fb273334df3beeb3e738463110823e49c`
- test/fixtures/frontend/playwright.config.mjs: `d7dc6f8d84d6d476d6cb15ea659af91df4e64a496fa2ca1d8db2a61644cadd25`
