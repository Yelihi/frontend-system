# 기존 배포 지식의 sync 정합성 복구

2026-10-08 · 사용자 요청: 배포를 막는 두 지식의 정합성 정리 및 release 사용 안내.

## 확인한 문제

`react-rendering-foundations`, `react-fiber-reconciliation-and-commit`의 실제 원문,
catalog contentHash, publishedHash는 서로 같았다. 그러나 현재 index의 entry,
related entry, 검색·트리거 사례를 포함한 publication hash가 마지막 완료 기록과 달랐다.
영향 범위에는 rendering, identity, Fiber, Next.js boundary, derived-state/effects 참조가 포함된다.

HEAD의 index는 v1이고 작업 중 index는 v3였다. 연결된 Effect 문서의 보강만 되돌려
계산해도 이전 해시가 복원되지는 않았다. 따라서 불일치를 그 한 변경만의 결과로
단정하지 않는다. 이전 sync 시점의 전체 산출물 스냅샷 없이 변경별 기여도는 확정하지 않았다.

## 수행한 정리

- 두 원문 전체(기초 135줄, 엔진 153줄)와 보정·생략 범위, 연결된 배포 참조를 읽었다.
- React 공식 렌더·순수성·상태 보존·Effect·엘리먼트 문서를 대조했다. v19.2.0의
  createWorkInProgress, mountWorkInProgressHook, placeChild, flushMutationEffects,
  DOM 속성/텍스트 처리, insertOrAppendPlacementNode의 관련 구현 구간을 확인했다.
- catalog에 host 검토를 저장했다: 기초 13개, 엔진 14개 주장 묶음. 직접 인용,
  판단, 근거 URL, 조건, 제외 범위를 포함한다. 검토자는 사용자가 아닌 host다.
- 기존 catalog API의 역사적 배포 호환 경로로 validateKnowledgeSync와
  markKnowledgeSynced를 실행했다. 해시를 직접 덮어쓰거나 검증 코드를 완화하지 않았다.
- 두 원문, 원문 해시, learned index/본문, 다른 catalog 항목은 변경하지 않았음을
  실행 중 assertion으로 확인했다. pending/legacy 원문을 active로 자동 선택하지 않았다.

이는 기존 배포 완료 기록의 재검토·복구이며 새 lifecycle/investigation 이관은 아니다.
두 원문은 legacy 상태를 유지한다. 일반 MCP sync의 merged/investigation 요구도 유지한다.
미전환 체크리스트의 상세 맥락 조사 명세가 없다는 경고는 그대로 반환된다.
향후 새 sync로 내용을 바꿀 때에는 사용자의 active 선택과 해당 명세 보강이 필요하다.

원문 이미지의 과거 판독을 이번에 다시 수행했다고 주장하지 않는다. React 엔진 실행,
실제 프로젝트의 브라우저 동작·성능·보안 인증도 수행하지 않았다. 제외된 성능/롤백/XSS
보장과 그림은 배포 근거로 승격하지 않았다.

## 실행 결과

| 검사 | 결과 |
| --- | --- |
| 전체 index 검색 회귀 | 9/9 통과 |
| 전체 index 트리거 매핑 회귀 | 139/139 통과 |
| knowledgeStatus.unpublished | 0건 |
| knowledgeStatus.affectedReferences | 0건 |
| npm run check | 타입·lint·테스트 134/134 통과 |
| npm run test:package | 실제 tgz 추출·명세 파일 해시·독립 MCP 검사 통과 |
| npm run release:ready | 0.2.0 통과 |

별도로 로컬 `.guide.md.swp`/`.DS_Store`를 npm은 패키지에서 제외하지만 명세 생성기는
포함하던 차이를 수정했다. 파일을 삭제하지 않고 명세에서도 제외하며, 기존 release
테스트에 두 파일이 명세를 바꾸지 않는 회귀 검사를 추가했다. 실제 작업 디렉터리의
편집기 복구 파일도 패키지에 포함되지 않음을 확인했다.

버전은 0.2.0 그대로이며 commit/push, 실제 GitHub Actions 실행, 태그·Release 생성,
release 브랜치 갱신은 하지 않았다. 로컬 release readiness 통과는 원격 배포 성공을
뜻하지 않는다. 소유자가 버전을 정하고 main에 올린 뒤 수동 workflow를 실행해야 한다.
사용 순서는 [릴리스 가이드](../../references/contribution-release.md)를 따른다.

주요 재검토 근거:

- [React Render and Commit](https://react.dev/learn/render-and-commit)
- [React Keeping Components Pure](https://react.dev/learn/keeping-components-pure)
- [React Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React useEffect](https://react.dev/reference/react/useEffect)
- [React v19.2.0 ReactFiber](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiber.js)
- [React v19.2.0 ReactFiberHooks](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberHooks.js)
- [React v19.2.0 ReactFiberWorkLoop](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberWorkLoop.js)

상세 주장별 근거는 `knowledge/catalog.json`의 해당 sourceReview에 보존했다.
