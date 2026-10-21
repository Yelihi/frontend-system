# FS 0.12.0 구조와 사용 흐름

기준: [`810484e`](https://github.com/Yelihi/frontend-system/commit/810484e78df91329ff5af6f792d3ab522e5af1d5)의 코드와 스킬 절차. 미배포 지식 보강 작업은 설명 기준에 포함하지 않았습니다.

| 그림 | 탐색 HTML | 원본 | 생성 검증 | 브라우저 검증 |
| --- | --- | --- | --- | --- |
| 플러그인 구조 | [HTML](architecture.html) | [JSON](architecture.json) | [receipt](architecture.delivery.json) | [receipt](architecture.visual-check.json) |
| 새 프로젝트 | [HTML](new-project.html) | [JSON](new-project.json) | [receipt](new-project.delivery.json) | [receipt](new-project.visual-check.json) |
| 리팩터링 | [HTML](refactor.html) | [JSON](refactor.json) | [receipt](refactor.delivery.json) | [receipt](refactor.visual-check.json) |
| 기능 추가 | [HTML](feature.html) | [JSON](feature.json) | [receipt](feature.delivery.json) | [receipt](feature.visual-check.json) |

## 해석과 근거

- 구조도는 주요 책임·입출력 관계입니다. 모든 도구 호출과 반환 경로를 나열하지 않습니다. 노드의 `SRC`에서 고정 커밋의 근거 파일을 확인할 수 있습니다.
- 사용 흐름은 **주요 정상 경로**입니다. 연결선은 앞 단계의 결과를 다음 단계에 전달한다는 뜻이므로 같은 문구를 선마다 반복하지 않았습니다.
- 회색은 사용자 결정, 초록은 AI 해석·구현, 분홍은 FS 도구·절차입니다. 도구 호출도 AI가 수행하며, FS가 별도 모델로 자율 실행한다는 뜻이 아닙니다.
- 기존 프로젝트는 전체 분석 부재·부분·변경 상태에 따라 AI가 먼저 분석합니다. 최신 근거는 재사용합니다. 신규 프로젝트에는 관찰된 코드가 있다고 가정하지 않습니다.
- 설계 피드백은 필요만큼 반복합니다. 실패 검사는 수정 후 재검사하며, 중요한 미결정 사항은 질문으로 돌아갑니다. PR 이후 병합·배포는 별도입니다.

| 내용 | 확인한 코드·절차 |
| --- | --- |
| 분석 진입 판정 | [project-readiness.ts](../../../src/application/project-readiness.ts), [프로젝트 시각화 수명주기](../../../references/workflows/project-visualization-lifecycle.md) |
| 코드와 지식 후보 | [routing.ts](../../../src/application/knowledge/routing.ts), [fs-plan](../../../skills/fs-plan/SKILL.md) |
| 설계·테스트·사용자 결정 | [staged-planning.md](../../../references/workflows/staged-planning.md), [user-decisions.md](../../../references/workflows/user-decisions.md) |
| 연속 구현과 피드백 | [fs-work](../../../skills/fs-work/SKILL.md), [PR readiness](../../../references/workflows/pr-readiness.md) |
| 기준 기록과 이슈 뷰 | [project-visualization.ts](../../../src/application/project-visualization.ts), [project-changes.ts](../../../src/application/project-changes.ts) |

## 생성과 확인

Archify 2.17로 생성했습니다. 설명은 한국어이고 고정 뷰어 UI와 HTML `lang`은 영어입니다. README의 PNG는 전달된 HTML의 SVG 영역을 브라우저에서 캡처했습니다.

저장소 루트에서, 설치된 Archify 경로를 `ARCHIFY_ROOT`로 지정한 뒤 실행합니다.

```bash
node "$ARCHIFY_ROOT/bin/archify.mjs" validate architecture docs/diagrams/guide/architecture.json --repo-root . --quality showcase --json
node "$ARCHIFY_ROOT/bin/archify.mjs" deliver architecture docs/diagrams/guide/architecture.json docs/diagrams/guide/architecture.html --repo-root . --quality showcase --json
node "$ARCHIFY_ROOT/bin/archify.mjs" visual-check docs/diagrams/guide/architecture.html --json
```

세 사용 흐름은 타입을 `workflow`, 파일 이름을 해당 이름으로 바꾸고 `--repo-root`를 생략합니다. 검증 후에만 새 HTML·PNG·receipt를 함께 갱신합니다.

- 생성 검증: 각 그림 showcase **9/9**, 오류·경고 0. 정확한 JSON·HTML SHA-256은 각 delivery receipt에 있습니다.
- 브라우저 검증: **1440×900, 1600×1000, 1920×1080, 2048×1320**에서 넘침 검사. 양 끝 크기의 light/dark 캡처를 보존합니다.
- 시각 확인 범위와 결과: [review.json](review.json).
- 범위 밖: 실 프로젝트의 AI 판단 정확도, 모바일 조작, 모든 내보내기 형식. 이 그림의 검증은 FS 성능 비교 실험이 아닙니다.
