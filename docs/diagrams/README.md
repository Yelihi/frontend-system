# FS 지식 흐름도

[처음부터 읽는 설명](../../README.md#fs-전체-시퀀스)과 함께 보는 시각 자료입니다.
2026-10-08 작업 트리의 코드·스킬 절차를 근거로 작성했습니다. 설치된 release와 아직 배포하지 않은
로컬 변경은 다를 수 있습니다. 소비 프로젝트의 런타임을 관측한 그림은 아닙니다.

| 그림 | HTML | 수정할 원본 | 생성·검증 기록 |
| --- | --- | --- | --- |
| 지식 입력 → 검토 → sync → 배포 | [열기](knowledge-publication.html) | [workflow JSON](knowledge-publication.workflow.json) | [delivery](knowledge-publication.delivery.json), [브라우저](knowledge-publication.visual-check.json) |
| 코드 해석 → 후보 검색 → 판단 → 계획 | [열기](knowledge-application.html) | [workflow JSON](knowledge-application.workflow.json) | [delivery](knowledge-application.delivery.json), [브라우저](knowledge-application.visual-check.json) |

GitHub에서는 README의 PNG를 먼저 보세요. HTML은 내려받아 브라우저에서 열면 인터넷 없이
탐색할 수 있습니다. 설명은 한국어이며 Archify의 고정 메뉴와 HTML 언어 표시는 영어입니다.
두 그림은 Archify **workflow v2**, `showcase` 품질, 정적 기본 화면으로 생성했습니다.

## 그림을 읽을 때 구분할 사항

- 첫 그림은 공유 PR 기여의 정상 경로입니다. 명시적인 로컬 전용 메모 경로는 루트 README에 설명했습니다.
- PR 병합은 원문 수용입니다. `merged` 지식은 active 선택과 현재 유효한 검토 승인을 모두 갖춘 상태입니다.
- 검토가 실패하면 원문을 보완합니다. 승인 뒤 내용·검토 대상 metadata가 바뀌면 다시 검토해야 합니다.
- sync는 배포가 아닙니다. 지식의 상태를 바꾸어도 이미 배포된 설치본을 자동 회수하지 않습니다.
- 두 번째 그림에서 코드 의미를 이해하는 주체는 현재 호스트 AI입니다. 도구는 사실·후보·검사 결과를 제공합니다.
- 후보 발견은 수정 명령이 아닙니다. AI가 조건·반례와 코드 근거를 대조하고, 필요한 선택만 개발자에게 묻습니다.
- 기존 지식 모두가 상세 조사 명세로 전환되지는 않았습니다. 전체 호출 관계·동작을 정적 분석으로 보장하지 않습니다.

## 실제 구현과의 대응

| 그림의 단계 | 확인할 구현·절차 |
| --- | --- |
| 명령 해석과 역할 분담 | [fs-knowledge 스킬](../../skills/fs-knowledge/SKILL.md), [MCP 진입점](../../src/mcp.ts) |
| pending 초안과 공식 PR | [add 절차](../../references/workflows/fs-knowledge-add.md), [contribution.ts](../../src/application/knowledge/contribution.ts) |
| 사용자의 active 선택과 문서 준비 | [active 절차](../../references/workflows/fs-knowledge-active.md), [source-state.ts](../../src/application/knowledge/source-state.ts), [catalog.ts](../../src/application/knowledge/catalog.ts) |
| 원문 검토·승인·merged 상태 | [review 절차](../../references/workflows/fs-knowledge-review.md), [catalog.ts](../../src/application/knowledge/catalog.ts) |
| 참조·색인·트리거 작성과 완료 검사 | [sync 절차](../../references/workflows/fs-knowledge-sync.md), [색인 명세](../../references/knowledge-indexing.md), [reference-index.ts](../../src/application/knowledge/reference-index.ts) |
| 수동 배포와 설치 | [배포 안내](../../references/contribution-release.md), [CI](../../.github/workflows/ci.yml), [Codex marketplace](../../.agents/plugins/marketplace.json) |
| 환경·코드·흐름 해석과 기존 근거 재사용 | [fs-plan 스킬](../../skills/fs-plan/SKILL.md), [project-facts.ts](../../src/application/project-facts.ts) |
| 사실 추출과 후보 연결 | [build-work-context.ts](../../src/application/context/build-work-context.ts), [code-triggers.ts](../../src/application/knowledge/code-triggers.ts), [routing.ts](../../src/application/knowledge/routing.ts) |
| 검색, 본문 해시 확인과 읽기 | [reference-index.ts](../../src/application/knowledge/reference-index.ts) |
| 적용 판단·근거·결정과 계획 연결 | [trigger-review.ts](../../src/application/knowledge/trigger-review.ts), [design-evidence.ts](../../src/application/design-evidence.ts), [설계 절차](../../references/workflows/evidence-led-design.md) |

이 표는 구현 위치를 찾는 안내입니다. 그림의 각 화살표가 하나의 MCP 호출과 정확히 대응하지는 않습니다.
변하지 않은 근거는 재사용하고, 필요한 코드와 참조만 추가로 읽습니다.

## 검증 범위

두 그림 모두 deterministic 검증 **9/9, 오류 0, 경고 0**과 자동 브라우저 검사를 통과했습니다.
1440×900, 1600×1000, 1920×1080, 2048×1320에서 기본 화면의 가로·세로 넘침을 검사했습니다.
1440×900 및 2048×1320의 light/dark 최종 스크린샷 총 8장을 직접 확인하여 노드·화살표·한글
레이블과 설명 카드의 잘림·겹침이 없음을 확인했습니다. 첫 배치의 넘침을 해결한 시각 수정은 1회입니다.

자동 브라우저 기록의 `visualReview: pending`은 도구가 사람/모델의 시각 판단을 대신하지 않는다는 뜻입니다.
별도의 [시각 확인 기록](knowledge-diagrams.review.json)에 최종 HTML 해시와 확인 범위를 연결했습니다.
초점 탐색·모든 export 형식·모바일 화면은 별도로 테스트하지 않았습니다.
루트 README의 Mermaid는 논리적인 호출 순서를 설명하며 이 Archify 브라우저 검사 대상에는 포함되지 않습니다.

## 다시 생성하기

Archify가 설치된 환경에서 저장소 루트를 기준으로 실행합니다. 생성된 HTML을 직접 수정하지 않고
workflow JSON을 수정한 뒤 두 파일 각각 검증·생성·브라우저 확인을 반복합니다.

```sh
ARCHIFY_ROOT=/Users/yelihi/.agents/skills/archify
node "$ARCHIFY_ROOT/bin/archify.mjs" validate workflow docs/diagrams/knowledge-publication.workflow.json --quality showcase --json
node "$ARCHIFY_ROOT/bin/archify.mjs" deliver workflow docs/diagrams/knowledge-publication.workflow.json docs/diagrams/knowledge-publication.html --quality showcase --json > docs/diagrams/knowledge-publication.delivery.json
node "$ARCHIFY_ROOT/bin/archify.mjs" visual-check docs/diagrams/knowledge-publication.html --json
```

설치 경로에 맞게 `ARCHIFY_ROOT`를 변경합니다. 두 번째 그림은 위 명령의 `knowledge-publication`을
`knowledge-application`으로 바꾸어 실행합니다. 종료 코드와 기록을 확인하고 새 스크린샷도 직접 읽습니다.
HTML이 바뀌면 이전 해시의 시각 확인 기록을 재사용하지 않습니다.

## FS 전체 구조

2026-10-10 사용 흐름 정리에 맞춘 FS 자체 구조입니다. 소비 프로젝트의 분석 결과가 아닙니다.

- [구조도 HTML](fs-overview.html) · [architecture JSON](fs-overview.architecture.json)
- [9/9 생성 검증과 파일 해시](fs-overview.delivery.json)
- [브라우저 검사](fs-overview.visual-check.json) · [직접 시각 확인](fs-overview.review.json)

개발자 → 호스트 AI → MCP의 호출 관계와 스킬·지식·프로젝트 기록의 역할을 표현합니다.
각 화살표는 표시된 역할의 관계이며 모든 반환 메시지나 도구의 파일 접근을 나열하지 않습니다.
실제 순서는 루트 README의 시퀀스를 참고하세요. 원문 review/sync와 수동 배포 과정도 그곳에 있습니다.

| 요소 | 확인한 구현·절차 |
| --- | --- |
| 전체 분석과 갱신 | [fs-project](../../skills/fs-project/SKILL.md), [분석 절차](../../references/workflows/fs-project.md) |
| 질문 대기와 계획·구현 | [질문 절차](../../references/workflows/user-decisions.md), [fs-plan](../../skills/fs-plan/SKILL.md), [fs-work](../../skills/fs-work/SKILL.md) |
| MCP 검색과 기록 | [src/mcp.ts](../../src/mcp.ts), [routing.ts](../../src/application/knowledge/routing.ts), [project-store.ts](../../src/application/project-store.ts), [workflow-store.ts](../../src/application/workflow-store.ts) |
| sync한 지식 | [fs-knowledge](../../skills/fs-knowledge/SKILL.md), [색인](../../references/learned/index.json) |

showcase 검증 9/9, 오류·경고 0. 1440×900, 1600×1000, 1920×1080, 2048×1320의
브라우저 넘침 검사를 통과했습니다. 양 끝 크기의 light/dark 스크린샷 4장을 직접 확인했습니다.
한글 노드·연결선·카드가 잘리지 않으며, 고정 메뉴는 영어입니다. 모바일·모든 내보내기 형식은 미검증입니다.

다시 만들 때는 위 명령 예시의 타입을 `architecture`, 파일 이름을 `fs-overview.architecture.json` /
`fs-overview.html`로 바꿉니다. 수정 후 validate → deliver → visual-check를 실행하고 실제 이미지를 확인합니다.
