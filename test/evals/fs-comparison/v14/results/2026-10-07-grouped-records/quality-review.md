# 비용 비교의 계약 보존 검토

이 문서는 구현 테스트나 블라인드 설계 품질 평가가 아니다. 비교 담당자가 실제 저장된
수정 전/후 계획의 정책·이슈·설명과 제공된 계약을 대조한다. 근거 해시, 미승인 상태,
연결 진단은 report.py가 별도로 검사하며, 문서에 적혔다고 구현이 검증된 것은 아니다.

## 대조할 계약

- request: 호출자 객체/헤더 불변, 기존 quantity < 1 검증과 검증 실패 시 무요청·무캐시,
  낙관적 저장/성공/실패 처리, 최신 편집 dirty 보존(값이 되돌아오는 경우 포함),
  단일 요청 시도·무재시도, 페이지 오류 소유와 구독 해제.
- 후속 request: 동일 transport, 호출 경계에서 인증/오류 정책 선택, 서비스 토큰 보존,
  interactive session-expired 유지, background UI 부작용 금지와 caller의 로그 소유.
  임의의 동시 쓰기 지원이나 수량 도메인 확대를 추가하지 않는다.
- styles: Button에만 JSX-direct/CVA, 두 필수 variant 축과 네 조합의 기존 클래스,
  기본 variant로 필수 props를 선택적으로 바꾸지 않음, onClick/type/focus 보존,
  Indicator 제외, 기존 store 소유와 unsubscribe 유지.
- 후속 styles: BulkAction의 large/danger/select('bulk') 호출 보존,
  현재 palette 유지, theme token/dark mode/rebranding 추가 금지.
- 양쪽: 미승인 계획, 앱/검사 미실행을 통과로 표시하지 않음. 실제 제공되지 않은
  사용자 선택을 새로 확정하지 않음.

수정 전 여섯 계획의 정책/수용 조건을 확인했다. 수정 후 결과와 예외는 실행 완료 후
아래에 실제 파일 근거와 함께 기록한다. 항목 수나 문서 길이를 품질 점수로 삼지 않는다.

## 첫 수정의 여섯 최종 계획

| 반복/프로젝트 | 실제 정책에서 확인한 근거 | 판정 범위 |
| --- | --- | --- |
| 1/request | `auth-boundary`, `input-ownership`, `background-error`, `order-sequence`, `newer-draft`, `failure-ownership`, `one-attempt` | 위 핵심 계약을 유지. 인용·해시 연결은 별도 구조 검사 |
| 2/request | `r-auth`, `r-ownership`, `r-order`, `r-ui`; 되돌아온 값의 edit도 dirty 유지 명시 | 동일 |
| 3/request | 입력 불변, background/interactive 분리, validation/cache, newer dirty, no retry 정책 | 동일 |
| 1/styles | `button-static-direct`, `button-cva-required`, `button-behavior`, `scope-palette-store` | 필수 두 축·네 조합·기본값 금지·호출/상태 소유·제외 범위 유지 |
| 2/styles | `button-authoring-rule`, `button-compatibility-rule`, `palette-rule`, `boundary-rule` | 동일. t1/bulk 호출값도 명시 |
| 3/styles | `button-style`, `button-contract`, `button-interaction`, `palette-boundary`, `adjacent-boundary` | 동일 |

각 근거는 `repeat-N/<case>-fs-K1/plan/project/.frontend-system/plans/flow-refactor/revision.json`의
policy.rules 및 issues.acceptance와 동봉 plan.md에서 읽었다. 여섯 계획 모두 이후
검증을 요구하고 현재 앱 테스트가 통과했다고 주장하지 않는다. 이 검토는 핵심
요구의 보존 확인이며 모든 문장의 의미나 실제 구현 동작을 검증한 점수가 아니다.
원본 분석의 파일 위치 실패와 일반 AI의 계획 위치 실패는 비용/완료 표에서 유지한다.
