# 지식 원본

공부한 내용과 판단 근거를 검토 가능한 원본으로 보관하는 디렉터리입니다.

- `source/manual/`: 직접 작성한 Markdown
- `source/imported/`: 링크 출처와 요약, 보존이 허용된 원문 본문
- `source/attachments/`: 보관이 허용된 첨부 원본과 정리한 Markdown
- `catalog.json`: 분류, 요약, 해시, 배포 상태를 담은 목록
- `sources.json`: 반복 확인할 공개 공식 문서의 ID → URL 목록
- `.cache/`: 배포하지 않는 원격 본문·변경 비교 캐시
- `proposals/`: 사용자와 검토할 규칙 후보 및 내용 해시 기반 승인
- [template.md](template.md): 공부 내용을 작성할 한국어 템플릿

템플릿을 `source/manual/<주제>.md`로 복사해 작성하세요. 모든 항목을 채울 필요는 없습니다. 기초 원리만 정리해도 되며, 코드 변경 기준을 억지로 도출하지 않습니다.

`fs-knowledge`로 새 자료를 분류하고 중복을 확인합니다. `fs-knowledge sync`로 실제 작업에 사용할 요약을 `references/learned/`에 반영합니다. 원본 자료는 npm 배포 대상에서 제외됩니다. GitHub 보관은 별개이므로 파일 작성이나 지식 등록만으로 커밋·푸시되지는 않습니다.

## 블로그 링크 추가

FS가 설치된 Codex 또는 Claude Code의 대화창에 입력합니다. 터미널 명령이 아닙니다. 아래 예시는 각각 별도의 요청입니다.

```text
fs-knowledge https://example.com/article
이 글을 지식으로 추가해주세요.
```

```text
fs-knowledge https://example.com/my-article — 제가 작성한 글입니다. 본문 전체를 보존해주세요.
```

검토와 인덱싱까지 함께 요청할 수도 있습니다.

```text
이 링크를 지식으로 추가하고 fs-knowledge sync까지 진행해주세요.
https://example.com/article
```

첫 명령은 출처와 요약을 저장합니다. 본인 글이나 복제 허용 자료라면 원문 본문도 보존할 수 있습니다. 수집한 본문과 AI 해석을 분리하고, 일부만 읽었다면 전체 원문으로 표시하지 않습니다. sync는 이를 검토해 개념·조건부 판단으로 인덱싱하며, 기존 작업 스킬이 필요한 참조만 검색합니다. 글마다 새 스킬을 만들거나 본문 전체를 스킬에 넣지는 않습니다.

추가만 했다면 나중에 대화창에서 `fs-knowledge sync`를 요청하세요. 다른 프로젝트에서 요청한다면 원본 FS 저장소 경로를 함께 알려주거나 `FRONTEND_SYSTEM_REPO`를 설정합니다.

접근 제한과 보존 범위는 [링크 지식 수집 설계](../references/linked-knowledge.md)를 참고하세요.
임의 링크와 HTML/PDF는 호스트 도구가 읽습니다. 등록한 공개 텍스트·Markdown은
MCP가 변경을 확인하고 차이만 제공합니다. `fs-knowledge sync`에서 확인 후 필요한
문맥을 읽으며, 새 필수 규칙 후보는 사용자와 확정합니다. [갱신 절차](../references/source-updates.md)
