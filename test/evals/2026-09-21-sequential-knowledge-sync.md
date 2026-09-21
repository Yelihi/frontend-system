# 2026-09-21 전체 sources 순차 sync 기록

## 결과와 읽기 범위

사용자가 key별 범위 분할을 위임하여, 이미 처리한 접근성 24개 URL과 로컬 React 문서 2개를 유지하고 나머지 436개 URL을 순차 처리했다. 현재 등록된 URL 460개 모두에 imported 요약·catalog·처리 결과가 있다. 로컬 문서를 포함한 catalog 462개는 represented 461개, omitted 1개이며 미등록·변경·미반영·삭제·영향받은 참조는 모두 0개다.

**이는 등록 URL에서 확인한 범위의 sync 완료이며 사이트 전체나 모든 연결 문서의 완독이 아니다.** 이번 436개 중 115개는 Chrome에 표시된 main 텍스트 전체를, 321개는 개요와 앞부분을 확인했다. 접힌 코드 탭·미디어·실행 예제·모든 호환성 표 및 연결된 하위 문서는 포함하지 않는다. 각 imported 문서에 실제 확인 URL, 읽은 문자 수/전체 표시 문자 수, 요약, 적용 범위와 생략을 기록했다. 문자 수는 토큰 수가 아니며 표시 본문 전체를 읽었어도 예제 실행 검증을 뜻하지 않는다.

## 순차 처리 묶음

| 순서 | 범위 | 이번 URL | 새 concept 참조 |
| --- | --- | ---: | ---: |
| 1 | Frontend Fundamentals 코드 품질 | 19 | 2 |
| 2 | Frontend Fundamentals 번들링 | 26 | 3 |
| 3 | Frontend Fundamentals 디버깅 | 39 | 5 |
| 4 | MDN HTML·전역 속성 | 38 | 5 |
| 5 | MDN CSS | 97 | 8 |
| 6 | MDN JavaScript | 49 | 7 |
| 7 | MDN 웹 기술 개요 18개·WebAssembly 1개 | 19 | 4 |
| 8 | MDN Web API | 149 | 15 |
| 합계 | | 436 | 49 |

CSS는 문법·캐스케이드·레이아웃·위치와 스크롤·색과 효과·글꼴과 쓰기 방향·모션·Shadow DOM으로 나눴다. Web API는 통신, worker와 조정, 파일과 저장소, 백그라운드와 앱 통합, DOM과 편집, 입력, CSSOM과 관찰자, 장치와 화면, 미디어, 그래픽과 XR, 권한과 인증, 외부 장치, 관측, 브라우저 AI, 폐기 기능으로 나눴다.

기존 접근성·React 참조 9개를 포함한 최종 learned 참조는 58개다. 기존 스킬이 검색하는 concept 자료로 반영했으며 새 SKILL.md·런타임 도구·공용 필수 규칙·preset은 만들지 않았다. 개인 원본 2개와 관련 없는 프로젝트 fixture는 수정하지 않았다. 이전 접근성 처리의 playground 생략 1개는 유지했다.

## 주장 검토와 제외

- 코드 품질: 모든 조건의 추상화, 무조건적인 중복 제거, 폴더 배치만으로 의존 제한, Hook 분리만으로 렌더 감소 같은 일반화를 제외했다. 명명·계약·변경 이유의 개념으로 보존했다.
- 번들링: entry와 출력 파일 수를 동일시하지 않았다. 타입 변환과 검사, 개발 프록시와 배포 CORS, HMR과 상태 보존을 구분했다. `sideEffects: false` 일괄 적용으로 CSS·초기화가 사라질 수 있음을 보정했다. esbuild serve와 webpack tree shaking은 공식 문서로 추가 확인했다.
- 디버깅: 과거 사례의 측정치·버전 없는 라이브러리 결함·우회책을 현재의 보편적 계약으로 옮기지 않았다. 재부팅의 인과, `exists` 후 쓰기의 원자성, Suspense의 일괄 언마운트, 잠금 파일 삭제와 구버전 강제 같은 단정을 제외했다.
- HTML: 열거/불리언 속성, 키보드 힌트/입력 검증, hidden/inert, popover/dialog를 구분했다. microdata 페이지 사이에서 충돌하는 식별자 설명은 규범적 근거로 채택하지 않았다. 실험적 제목·앵커 속성은 지원 조건을 남겼다.
- CSS·JavaScript: 개요에서 확인한 개념을 묶고 세부 속성·메서드 예외는 생략했다. 사양 목록에 등장한다고 모든 브라우저에 구현되었다고 판단하지 않았다. CSS 믹스인, 새 정규식 문법, Date의 legacy 안내 등은 즉시 도입·일괄 교체 규칙으로 쓰지 않는다.
- Web API: fetch의 HTTP 상태 확인, BroadcastChannel의 저장소 파티션, WebSocket의 backpressure 부재, 권한 질의와 요청의 차이를 반영했다. 암호 원시 연산·Trusted Types·Sanitizer의 존재만으로 시스템 안전성을 보장하지 않는다. Beacon도 서버 수신·처리 성공의 절대 보장으로 해석하지 않는다.
- 폐기 기능: Attribution Reporting, Fenced Frame, Shared Storage, Topics는 MDN의 폐기·제거 예정 표시를 기록했다. WebVR은 비표준·폐기로 구분했다. 별도의 폐기 참조는 기존 코드 식별과 이관 검토용이며 신규 채택 근거가 아니다. Private State Token은 해당 페이지의 실험적 표시만 반영하고 같은 제거 상태라고 추정하지 않았다.

원문별 추가 생략·보정은 `knowledge/source/imported/<source-id>.md`와 index outcomes에 있다. reviewed는 확인한 주장을 검토했다는 뜻이며 실행 결과나 보편적 정확성 인증이 아니다. 상세 구현이 필요할 때는 관련 참조의 출처를 따라 미검토 구간과 최신 조건을 추가 확인해야 한다.

## 검증

- `npm run check`: typecheck·lint·build 및 27개 테스트 통과.
- 실제 인덱스 검색 회귀 37개: 지정된 기대 참조 35건 모두 상위 5개에 포함. 반환 후보 총 72개, 사전 지정 기대 참조 비율 35/72 ≈ 0.4861, recall@5=1.0. 이 비율은 완전한 관련성 라벨이나 실제 사용자 검색 정확도가 아니다.
- 검색 메타데이터 합계 47,649문자. 한 번의 응답 크기나 모델 토큰 수가 아니다. 최대 5개 후보만 요청하고 본문은 필요할 때 별도로 읽는다.
- Vue 조건에 React 전용 참조가 반환되지 않음을 확인했다. 중립 Web API의 `Private State Token`이 `state snapshot`에 섞이는 등 단어·부분 문자열 중복의 오탐은 남는다. `Object.is`의 `is` 같은 짧은 토큰도 불필요한 후보를 만든다. 검색 엔진 변경은 이번 sync 범위에 포함하지 않았다.
- 기존 “무관한 질문”이었던 폰트는 이제 실제 자료가 있으므로 고유한 무일치 문자열로 바꿨다. MCP 테스트의 `unmatched-evaluation-query` 역시 `React Query`와 겹쳐 같은 방식으로 바꿨다. Vue 검사는 모든 중립 결과가 비어 있어야 한다는 가정 대신 React 전용 자료의 누출을 검사한다.
- 58개 참조의 bounded read·본문 해시·원본 해시 검증 통과. 가장 긴 본문은 2,742문자로 12,000문자 읽기 한도 안이다. 460개 등록 key의 URL, catalog, 현재 원본 해시, publishedHash, outcomes와 represented의 참조 연결을 전수 대조했다.
- 검증 후 처리 상태를 기록했고 최종 `knowledgeStatus`의 uncataloged/changed/unpublished/deleted/affectedReferences는 모두 0개다.
- `npm run test:package`: 로컬 패키지의 네 스킬, 원본 knowledge 제외, 소스 저장소 밖에서 독립 MCP 실행 검증 통과. 첫 시도는 샌드박스의 npm 로그 쓰기 제한으로 실패했고 권한 승인 후 재실행했다.
- `git diff --check` 통과.

새 URL 436개의 원격 변경 확인은 모두 `needs-host`였다. Chrome으로 확인했으며 원격 텍스트 스냅샷 승인이나 remoteHash는 생성하지 않았다. 다음 원격 확인에서도 HTML 자료는 호스트 검토가 필요할 수 있다. catalog의 sync 완료와 원격 텍스트 캐시 승인은 다른 상태다.

독립 모델 평가, 실제 제품 코드 적용, 모든 예제 실행, 브라우저별 호환성 시험은 수행하지 않았다. 저장소의 참조를 갱신한 결과이며 공유 설치 플러그인 갱신·커밋·푸시·배포는 수행하지 않았다.

## 검증 시점 해시

- `knowledge/sources.json`: `ea46557289318bfe07915172ccb679babf6f421d0e060b059ac36ebd0c399de3`
- `knowledge/catalog.json`: `43e2184a4d1e3f531c6b30a6560e2e10d0bfa1154fa2cb314a9b835dbe9e13f1`
- `references/learned/index.json`: `7b325bce2422a80be8ba114a0555b59efa11d637f37573fcaa05f46036487c37`

앞선 [접근성·로컬 sync 기록](2026-09-21-knowledge-sync.md)은 해당 단계의 과거 상태다. 이후 원본·인덱스가 바뀌면 이 기록도 과거 실행 결과로 해석한다.
