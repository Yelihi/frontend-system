# Web API 요청·스트림·실시간 통신

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

fetch가 resolve됐는데 HTTP 오류이거나 실시간 데이터가 쌓여 메모리·응답성이 나빠질 때.

## 판단에 사용할 내용

HTTP 상태·본문 소비·취소·backpressure를 나누고 WebSocket·SSE 등 통신 방식의 방향과 요구를 비교한다.

## 적용하지 않는 경우

Beacon 전송을 서버 처리 완료로 보거나 URL 파싱만으로 신뢰할 수 있는 목적지라고 판단하지 않는다.

## 개념과 근거

fetch의 Promise 이행은 HTTP 성공 상태나 본문 처리 완료와 같지 않다. 상태 확인과 본문 파싱 실패를 분리한다. XHR은 이벤트 기반 요청이고 Beacon은 응답이 필요 없는 전송 용도다. Beacon의 예약·전송 설명을 네트워크 실패에서도 서버 수신·처리가 반드시 성공한다는 보장으로 해석하지 않는다.

Streams는 청크 단위 소비·취소·흐름 제어를, Compression Streams는 지원 형식 압축을, Encoding은 UTF-8 인코딩과 지원 인코딩 디코딩을 제공한다. 기본 WebSocket에는 자동 backpressure가 없으며 비표준 WebSocketStream과 구분한다. SSE는 서버 이벤트 수신, WebRTC는 피어 미디어·데이터, WebTransport는 스트림·datagram 요구를 나누어 검토한다. WebRTC가 언제나 중계·연결 설정 서버 없이 동작한다고 가정하지 않는다. URL 파싱과 URLPattern 매칭이 URL의 신뢰성·허용 여부 검증을 대신하지 않는다.

## 검토한 출처

- [Beacon API](https://developer.mozilla.org/en-US/docs/Web/API/Beacon_API)
- [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API)
- [Encoding API](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL_API)
- [URL Fragment Text Directives](https://developer.mozilla.org/en-US/docs/Web/API/URL_Fragment_Text_Directives)
- [URL Pattern API](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [WebSocket API (WebSockets)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [WebTransport API](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API)
- [XMLHttpRequest API](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
