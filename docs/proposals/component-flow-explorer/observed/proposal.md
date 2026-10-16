# 실제 주문 프로젝트로 확인한 화면 연결

[화면 열기](preview.html) · [fs-project 보고서](project.md) · [기본 FS 흐름도](fs-flow.html)

기존 `test/fixtures/frontend`를 고정한 복사본에서 fs-project 절차를 수행했다.
제품 코드는 변경하지 않았다. 24개 파일 중 23개 본문을 확인하고 생성 lockfile 1개를
제외했다. 현재 플러그인의 저장 도구를 사용했으며 코드 해석은 이번 작업의 AI가 수행했다.

## 자료를 읽는 순서

| 파일 | 의미 |
|---|---|
| [ai-context.json](ai-context.json) | 영역별 요약과 저장된 flow 참조 |
| [flow.json](flow.json) | 코드 근거가 연결된 7개 노드, 12개 관계, 6개 시나리오 |
| [runtime-trace.json](runtime-trace.json) | 원본 도메인 함수를 실행하여 수집한 콜백 값·호출 인자·결과 |
| [view-model.json](view-model.json) | 저장 flow의 hash, 인스턴스·화면·배치·변수 변화가 결합된 렌더 입력 |
| [receipts.json](receipts.json) | 실제 FS 도구가 반환한 저장 hash와 산출물 경로 |
| [verification.json](verification.json) | 검사 결과와 검증 범위 |

렌더 입력은 다음처럼 실제 소유자 ID와 변수를 연결한다.

```json
{
  "ownerNode": "form",
  "owner": "OrderForm",
  "field": "status.pending",
  "before": true,
  "after": false
}
```

각 단계에는 `edge`, `measurement`, `evidence`가 있다. `measurement`가 콜백 실측이면
원본 함수의 `changed` 인자를 수집한 값이다. 클로저의 `pending`은 내부 변수를 직접
계측하지 않았으므로 코드 해석으로 표시한다. React commit 시각과 콜백 시각은 구별한다.
모든 state owner는 그래프 노드를 참조해야 하며 이름만 있는 변경 기록은 거부한다.

## 화면에서 확인할 내용

1. 2단계: `status.pending: false → true`, 실제 버튼은 `Submitting`으로 표시된다.
2. 4단계: 중복 호출의 반환은 false, 전송 횟수는 1로 유지된다.
3. 5단계: `status.error`에 오류가 전달되고 실제 오류 문구가 표시된다.
4. 6단계: 별도 클로저 변수 `pending`이 finally에서 해제된다.
5. 7~9단계: 오류 초기화 → 재시도 성공 → 클로저 해제.

이미지는 Next.js 앱의 브라우저 화면을 좌측 상단 760×570으로 캡처했다. 페이지를 다시
디자인한 이미지가 아니다. 오류/대기 상태는 로컬 프록시가 응답을 보류한 뒤 500으로
반환하여 만들었고 성공 재시도는 원래 API로 전달했다. JSX의 section과 DOM 영역을
대응시켰으며 DOM만으로 컴포넌트 경계를 추정하지 않았다.

이 예제의 POST는 `{accepted:true}`를 반환하는 테스트용 API다. DB/store/cache는 없으므로
시각화에도 만들지 않았다. 다중 페이지 전파는 상위 [설계 시안](../preview.html)에서 확인한다.

## 재현

- `node docs/proposals/component-flow-explorer/check.mjs`: 렌더 결정성 및 잘못된 참조/변화 입력 거부.
- `node docs/proposals/component-flow-explorer/observed/trace.mjs`: 원본 도메인 함수의 실제 콜백 검사.
- `npm --prefix test/fixtures/frontend run test:unit`: 기존 단위 테스트.
- `analyze.mjs`: `dist/observed-order-project`의 고정 snapshot과 읽은 source 입력을 기반으로
  검토한 분석을 FS 도구에 저장한다. 임의 프로젝트용 자동 분석기가 아니다.
- `project-view.mjs`: 저장 flow와 runtime trace, 캡처 자산으로 화면을 생성한다.
  대상 파일 hash가 바뀌면 거부한다. 새 캡처가 필요하면 원본 앱을 실행하고
  `capture-server.mjs`를 통해 초기/대기/실패/성공 화면을 다시 수집한다.

현재 fs-project의 기본 출력은 `fs-flow.html`과 같은 논리 흐름도다. `preview.html`은
그 저장 자료에 화면·실측 자료를 연결한 실험용 추가 출력이다. 전체 프로젝트 자동 캡처,
실행 중 모든 변수 추적은 아직 포함하지 않는다. 별도의 추가 전용 계획 합성 예제는 아래에서 확인한다.

## 기존 분석 위에 새 계획 추가

상단 목록에는 저장된 6개 시나리오(초기 화면, 성공, 실패, 중복 제출, 잘못된 수량,
재고 확인)와 실패→재시도 실측 흐름이 모두 포함된다. 초기 화면은 라이프사이클로 분류한다.

[계획 포함 화면](preview-with-plan.html)은 [planned-addition.json](planned-addition.json)을
기준 [view-model.json](view-model.json)에 추가한 결과다. 기존 흐름 7개를 유지하면서
‘주문 완료 메시지 닫기’ 1개를 계획으로 표시한다. 원본 제품·관측 기록은 변경하지 않았다.
이 계획은 사용자 승인이나 구현 결과를 뜻하지 않는다. 이미지는 기존 성공 화면이며,
제안된 onDismissConfirmation 및 status.submitted 변경은 미구현 계약이다.

```sh
node docs/proposals/component-flow-explorer/observed/project-view.mjs docs/proposals/component-flow-explorer/observed/planned-addition.json
```

기준 hash가 달라지거나 기존 ID를 대체하려는 추가분은 거부한다. 자동 hash 갱신은 하지 않는다.
