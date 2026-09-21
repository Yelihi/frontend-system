# 장치 신호·화면·탐색 환경

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

센서·위치·화면 유지가 실패하거나 탭 가시성·PiP·다중 화면 기능을 판단할 때.

## 판단에 사용할 내용

인터페이스 존재와 권한·장치 가용성, 근사 신호와 실제 상태, 기능별 사용자 동작 조건을 비교한다.

## 적용하지 않는 경우

연결 정보를 서버 접근 성공으로 보거나 화면 유지 요청의 영구 성공을 가정하지 않는다.

## 개념과 근거

장치 메모리와 연결 정보는 신호이며 정밀 사용 가능량이나 서버 접근 성공 보장이 아니다. 센서 인터페이스 존재와 실제 장치의 연결·권한·측정 가능성은 다르다. Geolocation은 사용자 허용을 필요로 하고, 장치 운동과 화면 방향·접힘 상태·viewport segments는 다른 정보를 제공한다.

Page Visibility는 요소의 교차나 iframe CSS 표시 여부와 다르다. Idle Detection은 사용자 활동 상태이며 작업 스케줄러의 idle과 구분한다. Wake Lock은 화면 유지 요청으로 언제나 유지된다고 가정하지 않는다. video PiP와 Document PiP, Fullscreen과 외부 Presentation, 여러 화면 창 관리는 별도 지원·사용자 동작 조건이 있다. History·Navigation은 현재 앱 탐색 관리이고 브라우저 전체 기록 열람이 아니다. 사용자 선호 재정의는 사용자의 선택을 반영하는 범위에서 검토한다.

## 검토한 출처

- [Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API)
- [Device Memory API](https://developer.mozilla.org/en-US/docs/Web/API/Device_Memory_API)
- [Device orientation events](https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events)
- [Device Posture API](https://developer.mozilla.org/en-US/docs/Web/API/Device_Posture_API)
- [Document Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API)
- [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- [Idle Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Idle_Detection_API)
- [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/Picture-in-Picture_API)
- [Presentation API](https://developer.mozilla.org/en-US/docs/Web/API/Presentation_API)
- [Screen Orientation API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Orientation_API)
- [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- [Sensor APIs](https://developer.mozilla.org/en-US/docs/Web/API/Sensor_APIs)
- [User-Agent Client Hints API](https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API)
- [User Preferences API](https://developer.mozilla.org/en-US/docs/Web/API/User_Preferences_API)
- [Viewport Segments API](https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API)
- [Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
