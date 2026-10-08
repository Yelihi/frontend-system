# Shared knowledge contributions and maintainer releases

## 처음 릴리스할 때

Release는 검증된 커밋에 버전 태그를 붙여 사용자에게 제공하는 배포본입니다.
이 저장소에서는 `main`이 개발 이력, `v0.3.0` 같은 태그가 특정 배포본,
`release` 브랜치가 플러그인 설치·업데이트에 제공할 커밋을 가리킵니다.
지식 PR 병합이나 sync만으로 `release` 브랜치가 이동하지 않습니다.

1. 이 FS 소스 저장소의 터미널에서 아래 Version and build identity 명령을 실행합니다.
   `0.3.0`은 예시이므로 배포할 버전으로 바꿉니다. `release:version` 직후 명세가
   일시적으로 낡는 것은 정상이며, `npm run check`에 포함된 build가 다시 만듭니다.
2. 검사 통과 후 배포할 소스·지식 catalog·bundle·release-manifest.json·워크플로를
   검토하여 커밋하고 GitHub `main`에 push/병합합니다. 로컬 수정만으로는 Actions가
   새 코드를 볼 수 없습니다. `node_modules`, `dist`, 편집기 복구 파일은 커밋하지 않습니다.
3. 저장소 소유자 계정으로 GitHub의 **Actions → FS CI and delivery → Run workflow**를
   엽니다. Branch는 `main`, `publish_release`는 체크, `release_version`에는
   준비한 정확한 버전(예: `0.3.0`, `v` 제외)을 입력하고 실행합니다.
4. `core`, `frontend`, `delivery`가 모두 성공했는지 확인합니다. Releases에서
   `v0.3.0`과 `.tgz`, `release-manifest.json`, `SHA256SUMS`를 확인하고,
   `release` 브랜치가 그 태그와 같은 커밋인지 확인합니다. 첫 배포는 이 브랜치도 만듭니다.
5. 사용자는 Codex/Claude에서 플러그인을 업데이트하고 실행 중인 MCP 세션을 다시 시작합니다.
   기존 `main` 기반 설치는 먼저 marketplace 소스를 새 `release` 채널로 갱신해야 합니다.

Actions의 `Run workflow` 버튼이 없으면 새 `workflow_dispatch` 설정이 GitHub 기본
브랜치에 올라갔는지 확인합니다. `delivery`가 대기 중이면 `release` environment의
승인 설정을, push가 거절되면 브랜치·태그 보호 규칙을 확인합니다. 실패 이유를 고친 뒤
같은 커밋·버전의 실행은 재시도할 수 있지만, 이미 배포한 버전의 내용을 바꾸려면
새 버전이 필요합니다. GitHub 웹의 Release 작성 버튼이나 로컬 publish 스크립트로
이 절차를 우회하지 않습니다. npm 계정이나 `npm publish`는 필요하지 않습니다.

버튼 대신 CLI로 실행하려면 위 커밋이 main에 올라간 뒤 소유자 계정으로 실행합니다.
아래 명령은 **실제 배포를 시작**합니다.

```sh
gh workflow run ci.yml --repo Yelihi/frontend-system --ref main \
  -f publish_release=true -f release_version=0.3.0
gh run list --repo Yelihi/frontend-system --workflow ci.yml --limit 5
```

## Contributor: any project, Codex or Claude

Install the released FS plugin and authenticate GitHub CLI once with `gh auth login`.
Use `fs-knowledge add` and provide the knowledge. The skill prepares one pending
Markdown document and submits a PR to `Yelihi/frontend-system`, main branch. The
repository comes from the plugin metadata, never the consuming project's origin.
Contributors without write permission use a fork; writers use a contribution branch.
No local FS checkout, catalog edit or plugin-cache write is needed for shared add.

The two tools separate preparation from submission. Local recovery files live under
`~/.frontend-system/contributions/<id>/`; this is managed draft storage, not a second
knowledge repository. Failure keeps the draft. Reuse the returned id/hash to retry;
existing branches and PRs are verified/reused, never force-pushed or duplicated.
Fork creation may be asynchronous: a temporary GitHub error stays blocked for retry.
Only Markdown is submitted; normalize supported attachment content and report what
was not included. Explicit local-only saves remain possible with an explicit checkout.

## Maintainer: select and review knowledge

Merge a contribution PR to accept the pending original. In the source checkout, change
its frontmatter to `state: active`, then invoke `fs-knowledge active`, `fs-knowledge review`,
and `fs-knowledge sync` separately. Metadata selection remains maintainer-owned.

Git PR merge and the calculated knowledge status merged are distinct. Knowledge merged
means the active source has a current approved review. Sync only consumes those sources;
it does not release the plugin, update users' installations or replace approved plans.
Existing projects retain linked knowledge hashes and their decision/approval history.
Changed evidence requires scoped reconsideration through the existing guards.

## Version and build identity

`package.json`, package-lock root, Codex and Claude plugin manifests share one version.
After choosing the next version, run from the source checkout:

```sh
npm ci
npm run build
npm run release:version -- 0.3.0
npm run check
npm run test:package
npm run release:check
npm run release:ready
```

The version above is an example, not an automatic release choice. The version command
only edits local metadata. Build regenerates deterministic `release-manifest.json` with
plugin version, packaged runtime/skill/reference file hashes, knowledge IDs, metadata
hashes and original source hashes. No timestamp, private source body or local user path
is included. `get_fs_release` identifies the installed build; it does not certify that
GitHub published it. The release tag binds that manifest to the tested Git commit.

`release:check` verifies versions, the installation channel and built-file identity.
`release:ready` additionally rejects stale/unsynced knowledge used by distributed
references. Pending notes not represented in the index do not prevent a release.
Historical publications remain supported; unsynced modifications still need explicit
maintainer selection/review/sync. Never auto-approve legacy notes to pass the gate.

## Publish only when the owner chooses

Commit the reviewed source, bundle and manifest changes to main. In GitHub Actions,
run **FS CI and delivery** on main with `publish_release=true` and the exact prepared
`release_version`. Normal PRs, main pushes and manual checks with false never publish.
Only the repository owner may initiate/re-run publication. The release job also uses
the `release` environment; configure required reviewers there for additional protection
if desired. Branch/ruleset settings must permit that workflow to update release.

Both core and frontend checks must pass. Delivery verifies package and knowledge readiness,
creates an immutable `v<version>` tag and GitHub Release containing the tested tgz,
release manifest and SHA256SUMS, then advances the `release` branch fast-forward only.
It never overwrites an existing tag or replaces assets of an already published release.
A retry can finish updating the channel after a partial publication. A new release
commit must have a version greater than the previous channel version. To revert a
behavior, publish a new version with a revert commit; do not rewrite release history.

Codex and Claude marketplace descriptors both fetch the **release** branch. PR merge
and sync on main therefore cannot reach ordinary plugin updates before release.
The first manual release creates this branch: do not advertise the new channel as
installable before that succeeds. Existing main-based installations need a marketplace
refresh/reinstall to adopt the channel. Direct installs explicitly pinned to main remain
development installs and do not get this guarantee. Users update the plugin through
Codex/Claude; an already running MCP session must be restarted to load the new build.
No npm registry publication is performed by this workflow.

## Validation limits and references

Local tests use isolated source fixtures and a simulated GitHub boundary; they do not
create public test PRs or publish a real release. Auth, repository policy and GitHub
availability are verified when the contributor/owner actually performs the operation.

- [GitHub Git trees API](https://docs.github.com/en/rest/git/trees)
- [GitHub fork API](https://docs.github.com/en/rest/repos/forks)
- [Manual workflow runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [Claude marketplace sources](https://code.claude.com/docs/en/plugin-marketplaces)
- [Codex plugins](https://learn.chatgpt.com/docs/plugins)
