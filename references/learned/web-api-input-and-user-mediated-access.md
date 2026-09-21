# 입력 이벤트와 사용자 선택 기반 접근

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

터치·펜·키보드 이벤트를 통합하거나 몰입 입력·연락처·화면 색 선택 기능을 도입할 때.

## 판단에 사용할 내용

포인터와 문자·물리 키·IME, 사용자 선택·활성화·장치 지원 및 종료 경로를 확인한다.

## 적용하지 않는 경우

장치 특성 신호로 기종을 확정하거나 선택 API로 전체 사용자 데이터를 읽을 수 있다고 보지 않는다.

## 개념과 근거

Pointer Events는 마우스·펜·터치를 통합하며 Touch Events는 접점 목록을 다룬다. 물리 키 위치와 실제 생성 문자, IME 조합을 구분한다. InputDeviceCapabilities는 동작 특성이지 장치 종류의 확정값이 아니다. Pointer Lock과 키 잠금은 몰입 입력 용도이며 사용자가 종료할 수 있는 경로를 고려한다.

Ink는 가능한 OS 경로를 통한 낮은 지연, VirtualKeyboard는 키보드에 따른 배치 제어를 제공한다. 진동·gamepad·압력 지원은 장치에 달려 있으며 Force Touch는 비표준이다. 연락처·화면 색 선택은 사용자가 고른 데이터를 받는 기능이지 전체 내용을 몰래 수집하는 기능이 아니다. 바코드 검출 결과가 안전한 URL이나 결제 명령임을 보장하지 않는다.

## 검토한 출처

- [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API)
- [Contact Picker API](https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API)
- [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API)
- [Force Touch events](https://developer.mozilla.org/en-US/docs/Web/API/Force_Touch_events)
- [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)
- [Ink API](https://developer.mozilla.org/en-US/docs/Web/API/Ink_API)
- [InputDeviceCapabilities API](https://developer.mozilla.org/en-US/docs/Web/API/InputDeviceCapabilities_API)
- [Keyboard API](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard_API)
- [Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)
- [Touch events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [UI Events](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events)
- [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- [VirtualKeyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
