# 지식 원본

공부한 내용과 판단 근거를 검토 가능한 원본으로 보관하는 디렉터리입니다.

- `source/manual/`: 직접 작성한 Markdown
- `source/imported/`: 웹사이트와 외부 문서를 정리한 노트
- `source/attachments/`: 보관이 허용된 첨부 원본과 정리한 Markdown
- `catalog.json`: 분류, 요약, 해시, 배포 상태를 담은 목록
- [template.md](template.md): 공부 내용을 작성할 한국어 템플릿

템플릿을 `source/manual/<주제>.md`로 복사해 작성하세요. 모든 항목을 채울 필요는 없습니다. 기초 원리만 정리해도 되며, 코드 변경 기준을 억지로 도출하지 않습니다.

`fs-knowledge-add`로 새 자료를 분류하고 중복을 확인합니다. `fs-knowledge-sync`로 실제 작업에 사용할 요약을 `references/learned/`에 반영합니다. 원본 자료는 npm 배포 대상에서 제외됩니다. GitHub 보관은 별개이므로 파일 작성이나 지식 등록만으로 커밋·푸시되지는 않습니다.
