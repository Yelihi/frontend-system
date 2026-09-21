# 폐기·제거 예정 Web API 기록

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

기존 코드에 Topics·Shared Storage·Attribution Reporting·Fenced Frame·WebVR가 남아 있는지 점검할 때.

## 판단에 사용할 내용

기록된 폐기 상태로 이관 조사 대상을 식별하고 대상 브라우저의 최신 일정과 대안을 다시 확인한다.

## 적용하지 않는 경우

신규 기능 채택이나 모든 브라우저에서 이미 제거되었다는 결론의 근거로 사용하지 않는다.

## 개념과 근거

2026-09-21 확인한 MDN은 Attribution Reporting·Fenced Frame·Shared Storage·Topics를 폐기 및 제거 예정으로 표시한다. WebVR도 비표준·폐기 상태이며 WebXR로 개발이 이동했다고 안내한다. 이 자료는 기존 코드 식별과 이관 검토를 위한 기록이다. 신규 기능 채택의 근거나 현재 모든 버전에서 이미 제거되었다는 증거가 아니다. 실제 이관 시 대상 브라우저와 해당 기능의 최신 제거 일정·대안을 별도로 확인한다.

## 검토한 출처

- [Attribution Reporting API](https://developer.mozilla.org/en-US/docs/Web/API/Attribution_Reporting_API)
- [Fenced Frame API](https://developer.mozilla.org/en-US/docs/Web/API/Fenced_frame_API)
- [Shared Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Shared_Storage_API)
- [Topics API](https://developer.mozilla.org/en-US/docs/Web/API/Topics_API)
- [WebVR API](https://developer.mozilla.org/en-US/docs/Web/API/WebVR_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

폐기 상태 식별·이관 검토 전용. 신규 채택 근거로 사용하지 않는다. 제거 완료 여부와 일정은 브라우저별로 재확인한다.
