# 추가 보완의 핵심 계약 검토

비교 담당자가 최종 정책·이슈·계획 설명을 직접 읽어 제공된 계약과 대조했다.
블라인드 설계 품질 평가나 구현 테스트가 아니다. 확인 기준은
[첫 수정의 검토 기준](../2026-10-07-grouped-records/quality-review.md)과 같다.

request 세 계획에서 인증/오류 경계, 서비스 토큰, interactive session-expired,
입력/헤더 불변, 기존 수량 검증과 무캐시/무요청 실패, 정상/실패 저장,
새 편집 dirty 보존, 페이지 오류/구독 해제와 무재시도를 확인했다.
styles 세 계획에서 Button-only JSX-direct/CVA, 필수 size/tone, 네 조합과 기본값 금지,
클릭/type/focus, 기존 팔레트, Indicator 제외, store/cleanup과 새 caller 보존을 확인했다.
Indicator 제외처럼 계획 본문·이슈 계약에 있고 별도 policy rule이 아닌 항목도 읽었다.

| 계획 | 읽은 정책 ID |
| --- | --- |
| [repeat-1/request-fs-K1](repeat-1/request-fs-K1/plan/project/plan.md) | auth-boundary, background-failure, interactive-failure, preserve-input, validation-order, draft-ownership, page-list-ownership, no-retry |
| [repeat-1/styles-fs-K1](repeat-1/styles-fs-K1/plan/project/plan.md) | button-static-jsx, button-cva-variants, button-behavior, palette-scope |
| [repeat-2/request-fs-K1](repeat-2/request-fs-K1/plan/project/plan.md) | preserve-input, call-policy, single-attempt, order-sequence, newer-draft |
| [repeat-2/styles-fs-K1](repeat-2/styles-fs-K1/plan/project/plan.md) | button-authoring-rule, variant-contract-rule, interaction-rule, palette-rule, scope-rule, verification-rule |
| [repeat-3/request-fs-K1](repeat-3/request-fs-K1/plan/project/plan.md) | auth-boundary, input-preservation, save-contract, effects |
| [repeat-3/styles-fs-K1](repeat-3/styles-fs-K1/plan/project/plan.md) | button-jsx-static, button-cva-axes, button-behavior, palette-scope, store-scope, verification-setup |

여섯 계획은 미승인 상태이며 현재 앱 검사 통과를 주장하지 않는다. 요구한 구현 검증은
후속 작업으로 남겼다. 일부 계획은 draft identity/version 같은 구현 선택과 검증 시나리오의
상세도가 다르다. 모든 이전 문장이나 반례가 동일하게 유지됐다는 의미 동등성 주장은 하지 않는다.
초기 분석과 main 문서는 [파일 내용 대조](narrative-changes.json)에서 6/6 유지됐다.
필요한 flow/finding은 갱신되었으며, 최종 계획이 참조하는 분석 history의 ID/해시와
저장 결과의 빈 contractDiagnostics는 report.py가 별도로 검사했다.

총 토큰은 최초 기준과 큰 차이가 없으며, 이 검토를 근거로 비용·설계 우위를 주장하지 않는다.
