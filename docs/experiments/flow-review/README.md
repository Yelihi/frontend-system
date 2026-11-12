# FS 4탭 시각화 반영

2026-11-12. 11월 11일 전달된 `fs-visualization-handoff`의 확정 화면을 실제 FS 렌더 경로에 반영했다. 후속 요청대로 기존 FS의 배경·회색/청회색 팔레트와 시스템 sans / monospace 글꼴을 유지했다. Echo 제품 소스는 수정하지 않았다.

- [실제 FS 렌더 결과](project/.frontend-system/diagrams/echo-save-response-loss.html)
- [동일 renderer의 별도 업로드/Vitest fixture](project/.frontend-system/diagrams/upload-review.html)
- [정규 Echo 입력](../../../test/fixtures/flow-review/echo.json)
- [확정 원본](../../../test/fixtures/flow-review/reference/approved-echo.html)
- [기준 스크린샷 manifest](baseline/manifest.json)
- [브라우저 검증 기록](browser/verification.json)

## 반영 범위

실제 경로는 `flow-render` / `render_project_flow` → `renderProjectFlow` → `prepareFlowExplorer` → `projectFlowView` → `prepareExplorer`다. `review.version:1`에서만 새 화면을 선택한다. 기존 page explorer, no-pages/English logical view, Mermaid, capture 검증은 유지했다. 전체 프로젝트 합성은 흐름별 review 모델과 hash를 보존하고, 기존 전체 지도와 개별 4탭 화면을 선택할 수 있게 했다.

기존 5단계 flow와 프로토타입 executionFlow를 동시에 저장하지 않는다. 정규 시나리오 하나의 9단계가 순서 있는 edge ID, typed field 변화, rule/test ID를 소유한다. 도메인 규칙 6개·계약 5개·테스트 계획 7개가 동일 ID를 사용한다. 참조 누락·중복·잘못된 field owner·불일치하는 contract/step/test 연결과 미지원 버전을 거부한다. false/0/null, 미확인, 아직 값 없음은 구분한다.

화면의 함수 출처·state/ref/db/result·runner는 정규 데이터다. 이름과 단계 번호에 따른 Echo 전용 조건문은 없다. D1/D2 편집은 화면·계약 제안·p-ui/m-a11y 예상 조건을 함께 바꾸고, 해당 확인만 해제한다. 초안은 flowHash+version별 localStorage와 JSON 내보내기/불러오기를 사용하며 실패를 표시한다. 확인 완료는 실제 실행 성공이나 서버 승인이 아니다.

화살표는 카드 경계 포트에서 출발/도착하며, 카드 bbox를 피하는 직교 경로와 별도 레인을 사용한다. 유실 연결은 성공 화살표 대신 ×를 표시한다. resize·폰트 로딩·탭 전환 때 다시 측정한다. 실제 경로를 찾지 못하면 숨긴 채 성공으로 처리하지 않고 연결 이름을 경고한다.

## 확정 원본과 차이

테마/글꼴은 사용자의 후속 요청에 따른 변경이다. 탭 순서, 와이어프레임→외부 카드→단계/상태 표, 도메인/계약, 의존성, 도구별 상세 테스트의 배치는 유지했다. 화살표의 대각선·카드 관통을 개선했다. 로컬 초안의 내보내기/불러오기 버튼과 출처의 제안 구분을 표시했다.

프로토타입의 문자열 `2 유지`/`Blob A 유지`를 실제 값과 변경 여부로 분리했다. 유지된 값은 ‘유지’로 표시한다. 4단계는 서버 commit 이후 브라우저 성공 미확인 상태이며, rejection과 오류 UI는 5단계다. 존재하지 않는 timeout을 구현 사실로 추가하지 않았다. 캡처 없는 제안 화면은 와이어프레임으로 표시한다.

`comparison/`에 같은 Chromium·light 테마·1440px viewport에서 원본과 구현의 주요 6단계 및 나머지 3탭을 각각 캡처했다. 테마와 포트 변경 때문에 전체 이미지의 픽셀 일치를 통과 조건으로 사용하지 않았다. 원본 baseline은 전달된 확정 HTML에서 먼저 생성했으며 구현 화면으로 덮어쓰지 않았다.

## 재현

```sh
npm run build
npm run test:flow-review
npm run test:package
```

`test:flow-review`는 fixture 프로젝트에 기존 save API로 정규 기록을 저장하고 실제 renderer를 호출한 뒤 브라우저 검사를 실행한다. 현재 소스 변경을 반영하려면 먼저 build한다. 기준 화면만 다시 캡처하려면 `npm run test:flow-review:baseline`을 사용한다.

기존 CLI로 동일 결과를 다시 만들 수 있다. hash는 `flow-list`에서 현재 값을 읽는다.

```sh
npm run fs -- flow-list docs/experiments/flow-review/project
npm run fs -- flow-render docs/experiments/flow-review/project echo-save-response-loss --expected-hash <현재-hash> --allow-unverified
```

`--allow-unverified`는 이 기록이 proposed fixture이기 때문에 명시한다. 현재 관측 코드의 stale 검사를 우회하는 용도가 아니다. 입력의 근거는 인계 자료의 출처가 명시된 소스 발췌이며, 실제 Echo checkout이나 런타임 관측으로 위장하지 않는다.

## 검증

- 전체 node:test: **172/172 통과**.
- 브라우저: 1440/1024/390/320px × 9단계와 의존성 연결, 카드 관통/수평 overflow, 1px 이내 왼쪽 정렬, hover/focus/touch와 Escape, D1/D2 편집·확인 무효화·복원·잘못된 초안 거부·저장 실패 표시, light/dark, 다른 fixture/runner, script 문자열의 비실행을 검사했다. 단언 수는 `browser/verification.json`을 따른다.
- 실제 CLI와 공유 함수의 HTML hash 일치, 설치용 패키지 안의 standalone MCP 저장→렌더, 새 viewer 파일 포함 확인: 통과.
- typecheck/build, 수정한 TS 파일 lint, release check, `git diff --check`: 통과.
- 공식 `npm run check`: typecheck 후 **기존 실험 파일의 lint 오류 21개**로 중단. 전체 build/test를 별도로 실행했다. 오류는 `echo-maintenance/followup.test.tsx`, `echo-recall-review/core-browser.cjs`, `harness/browser-restore.cjs`, `harness/check-auth.cjs`에 있으며 이번 작업에서는 수정하지 않았다.

미검증: 실제 Echo API/DB 및 Jest·Playwright 실행, 운영 배포, 다른 브라우저, 스크린리더. 200% 확대는 1440px 화면의 유효 CSS viewport를 720px로 줄인 동등 조건이며, 브라우저 메뉴의 실제 확대율을 자동 조작한 검사는 아니다. 테스트 계획 7개를 확인해도 Echo 테스트 7개가 통과했다는 뜻이 아니다. source/learned·PR 기능 삭제, 플러그인 전역 설치, 원격 PR/게시/배포는 수행하지 않았다.

## 0.13.0 배포 범위

배포는 `bfa3a02`에서 분리한 체크아웃에 이번 4탭 시각화 변경만 적용했다. 원래 작업 트리의 미커밋 지식 정리·부분 영향 분석·과거 Echo 비교 실험 변경은 포함하지 않았다. 따라서 위의 원래 작업 트리 검증과 배포 체크아웃의 분모가 다르다.

배포 체크아웃의 공식 `npm run check`는 typecheck·lint·build와 **170/170 테스트가 모두 통과**했다. 새 브라우저 검사도 GitHub frontend CI에 등록했으며, 생성된 browser/comparison 자료는 CI artifact에 포함한다. 실제 공개 릴리스와 설치 채널 이동은 공식 workflow_dispatch의 core/frontend 검증 후 delivery에서 실행한다.
