# 웹의 외부 장치 통신

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

웹에서 USB·BLE·직렬·HID·MIDI·NFC 장치를 연결할 API를 선택할 때.

## 판단에 사용할 내용

실제 장치 프로토콜, 권한·드라이버·연결 해제와 브라우저 지원을 기준으로 후보를 좁힌다.

## 적용하지 않는 경우

USB 연결이라는 이유만으로 WebUSB를 고르거나 Web NFC를 모든 저수준 NFC 접근으로 해석하지 않는다.

## 개념과 근거

실제 장치가 노출한 프로토콜에 맞춰 API를 고른다. BLE GATT, 직렬 포트, HID 보고서, 장치별 USB 서비스, MIDI 메시지, NFC의 NDEF는 서로 대체 가능한 통로가 아니다. Web NFC가 모든 저수준 NFC 기능을 제공하거나 USB로 연결되었다는 이유로 WebUSB를 써야 한다고 가정하지 않는다. 장치 권한·운영체제 드라이버·연결 해제·worker 노출·브라우저 지원을 구현 전에 확인한다.

## 검토한 출처

- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [Web NFC API](https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API)
- [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [WebHID API](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API)
- [WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
