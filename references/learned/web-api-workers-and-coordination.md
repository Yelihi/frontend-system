# Worker·메시지·작업 예약·잠금

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

무거운 작업을 worker로 옮기거나 탭 간 메시지가 안 오고 공유 자원 경쟁이 생길 때.

## 판단에 사용할 내용

DOM 접근, 복제·transfer·공유 메모리, origin·저장소 파티션과 예약·잠금의 범위를 확인한다.

## 적용하지 않는 경우

scheduler를 별도 스레드로 보거나 Web Locks를 여러 기기의 분산 잠금으로 사용하지 않는다.

## 개념과 근거

worker는 메인 스레드 밖에서 실행하지만 DOM을 직접 조작하지 못하고 지원되는 API가 다르다. 메시지 복제·transfer와 공유 메모리는 서로 다른 전달 방식이다. MessagePort를 전송한 문맥에서 계속 같은 포트를 쓸 수 있다고 가정하지 않는다. BroadcastChannel은 origin뿐 아니라 저장소 파티션 경계도 고려한다.

requestIdleCallback은 사용자 유휴 감지가 아닌 실행 여유 시점의 예약이다. scheduler의 우선순위·yield도 별도 스레드나 실시간 마감 보장이 아니다. Web Locks는 해당 브라우저 저장 문맥의 공유 자원 조정이며 서버·여러 기기 전체를 잠그는 분산 잠금으로 해석하지 않는다. 취소·정리와 작업 완료 조건을 실제 API에서 추가 확인한다.

## 검토한 출처

- [Background Tasks API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Tasks_API)
- [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [Channel Messaging API](https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API)
- [Prioritized Task Scheduling API](https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API)
- [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
