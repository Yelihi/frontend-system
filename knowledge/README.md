# 공유 지식 기여와 FS 반영

프론트엔드뿐 아니라 서버·인프라·저수준·CS 학습 내용을 보관합니다. 공식 저장소로의 기여와 실제 코드
판단에 사용할 지식의 검토·배포를 분리합니다. 기존 지식을 일괄 활성화하지 않습니다.

## 저장 위치

- `source/contributions/`: 공유 add로 생성한 pending 기여 PR의 문서
- `source/manual/`: 원본 checkout에 명시적으로 로컬 저장한 메모
- `source/imported/`: 출처와 요약, 보존이 허용된 본문
- `source/attachments/`: 첨부 원본과 설명 Markdown
- `source/active/`: 사용자가 선택하고 active 명령으로 모은 원문. 검토·sync 후에도 유지
- `catalog.json`: 분류·원문/검토/배포 해시와 검토 기록
- `sources.json`: 반복 확인할 공개 문서 ID → URL
- `.cache/`: 배포하지 않는 원격 변경 비교 자료
- `proposals/`: 별도 승인이 필요한 공용 규칙 후보
- [source/template.md](source/template.md): 필요 항목만 사용하는 작성 양식

## 명령만으로 사용하기

1. `gh auth login`으로 GitHub 인증 후 어느 프로젝트에서든 `fs-knowledge add`와 내용을
   전달합니다. AI는 pending Markdown을 준비하고 공식 FS 저장소로 PR을 생성합니다.
   권한이 없으면 fork를 사용하며, 실패하면 초안을 보존해 같은 ID로 재시도합니다.
2. 관리자가 PR을 병합한 뒤 원본 checkout에서 검토할 문서의 metadata를 직접 바꿉니다.

```yaml
---
state: active
---
```

3. `fs-knowledge active`: active 표시 문서를 `source/active/`로 모으고 적용 상황·근거·
   반례·조사 질문 등을 정리합니다. 기존 `manual/topic.md`는 `active/manual/topic.md`가
   되며 ID는 유지됩니다. 원문을 덮어쓰거나 pending을 임의 선택하지 않습니다.
4. `fs-knowledge review`: 별도 설명 없이 active 대상을 검토합니다. 보완이 필요하면 active를
   유지하고 이유를 남깁니다. 통과한 현재 문서는 status에서 merged로 표시됩니다.
5. `fs-knowledge sync`: merged 중 미반영 문서를 자동 선택합니다. active 검토를 대신
   수행하지 않습니다. 반영할 대상이 없으면 변경하지 않습니다.

명령은 AI 대화창의 Skill 요청이며 터미널 하위 명령이 아닙니다. `active` 요청에 특정
자료를 명시적으로 첨부하면 그 자료의 선택과 구조 정리도 맡길 수 있습니다. 대상 없는
active 명령은 기존 metadata만 따릅니다. 작성자는 트리거 ID나 JSON을 만들 필요가 없습니다.

## 상태의 의미

metadata에는 pending 또는 active만 씁니다. merged는 active 선택에 더해 현재 원문과
metadata 해시에 유효한 승인 기록이 있는 경우 계산합니다. 문서에 merged를 적어 승인할 수
없습니다. review의 내부 상태(on-review/approved/changes-requested/stale)와 배포 이력은
별도로 유지합니다. 검토가 끝나도 metadata의 active와 저장 폴더는 유지됩니다.

원문·출처·분류 변경은 merged를 만료시킵니다. 다시 active 준비와 review 후 sync합니다.
metadata가 없는 기존 문서는 legacy로 표시하고 자동 처리에서 제외합니다. 이미 배포한
참조는 유지하며, 다음 반영부터 사용자 선택이 필요합니다. 로컬 상태 변경으로 기존
설치본이 자동 철회되지는 않으므로 잘못된 기존 참조는 명시적으로 정정·철회해야 합니다.

검토는 해시·인용·기록 요건을 검사하며 사실의 진위나 AI 판단의 정답을 보장하지 않습니다.
개념 자료는 supporting, 적용 조건을 갖춘 설계 조언은 direct, 미확인은 deferred로
구분합니다. 다른 언어의 지식을 옮겨 적용할 때 원래의 전제와 대상 환경의 차이도 검토합니다.
새 공용 필수 규칙은 지식 검토와 별도의 승인이 필요합니다.

## 링크와 배포

링크는 실제 접근한 내용의 출처·요약과 수집 범위를 보관합니다. URL만으로 전문 보존
권한을 가정하지 않으며, 본인 글이나 허용 자료는 허용 범위에서 보존합니다. 첨부 원본은
보존하고 설명 Markdown을 이동할 때 상대 링크를 점검합니다.

원본은 npm 배포 대상에서 제외되며 sync한 참조가 `references/learned/`에 반영됩니다.
공유 add는 pending 원문 PR까지 생성합니다. sync는 배포가 아닙니다. 관리자용 유지보수와
명시적 로컬 저장에는 원본 checkout 경로나 `FRONTEND_SYSTEM_REPO`를 지정하며, 공유 add에는
해당 경로가 필요하지 않습니다. 설치본 업데이트는 관리자 릴리스 이후 수행합니다.

[active 절차](../references/workflows/fs-knowledge-active.md) ·
[검토 절차](../references/workflows/fs-knowledge-review.md) ·
[sync 절차](../references/workflows/fs-knowledge-sync.md) ·
[링크 보존 기준](../references/linked-knowledge.md)

[기여 PR과 관리자 수동 배포](../references/contribution-release.md)
