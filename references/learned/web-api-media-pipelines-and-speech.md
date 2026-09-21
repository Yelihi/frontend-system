# 미디어 캡처·가공·재생·음성

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

녹화·재생·프레임 가공·음성 기능을 선택하거나 캡처 종료 후 자원이 남을 때.

## 판단에 사용할 내용

track·기록·코덱 변환·재생 청크 공급의 역할과 버퍼 수명, 권한·형식·처리 위치를 확인한다.

## 적용하지 않는 경우

모든 코덱 지원·하드웨어 가속이나 음성 인식의 로컬 처리를 보장하지 않는다.

## 개념과 근거

MediaStream은 track을 묶고 캡처는 사용자 장치·화면 선택과 권한을 따른다. Image Capture의 사진, MediaRecorder의 기록, WebCodecs의 프레임 변환, MSE의 재생 청크 공급은 목적이 다르다. 코덱·형식·하드웨어 가속·실행 문맥은 구성별로 확인한다. 캡처·프레임·버퍼 수명을 정리하고 임의 형식 지원이나 고정 성능을 보장하지 않는다.

Web Audio는 노드 그래프 처리, Media Session은 플랫폼 재생 UI, Audio Session은 다른 오디오와의 공존, Output Devices는 사용자가 고르는 출력 대상이다. EME는 보호 미디어의 키 시스템 계약을 필요로 한다. WebVTT cue로 자막 등 시간 연동 정보를 제공한다. 음성 인식의 처리 경로가 항상 로컬이라고 가정하지 않으며 Local Font Access 역시 사용자의 장치 데이터 접근으로서 별도 조건을 확인한다.

## 검토한 출처

- [Audio Output Devices API](https://developer.mozilla.org/en-US/docs/Web/API/Audio_Output_Devices_API)
- [Audio Session API](https://developer.mozilla.org/en-US/docs/Web/API/Audio_Session_API)
- [Encrypted Media Extensions API](https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API)
- [Insertable Streams for MediaStreamTrack API](https://developer.mozilla.org/en-US/docs/Web/API/Insertable_Streams_for_MediaStreamTrack_API)
- [Local Font Access API](https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API)
- [Media Capabilities API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capabilities_API)
- [Media Capture and Streams API (Media Stream)](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API)
- [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API)
- [Media Source API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API)
- [MediaStream Image Capture API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Image_Capture_API)
- [MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)
- [Remote Playback API](https://developer.mozilla.org/en-US/docs/Web/API/Remote_Playback_API)
- [Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [WebVTT API](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
