# 백그라운드 작업·알림·PWA 통합

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

앱을 닫은 뒤 작업·알림이 안 되거나 service worker 반복 실행이 예정 시각과 다를 때.

## 판단에 사용할 내용

이벤트 수명, 동기화 기회와 다운로드, Push 수신·알림 표시, 설치 플랫폼별 통합 조건을 나누어 확인한다.

## 적용하지 않는 경우

백그라운드 API를 상시 프로세스나 정확한 주기 타이머로 취급하지 않는다.

## 개념과 근거

service worker는 origin·경로 범위의 이벤트 기반 작업이며 DOM이나 무제한 실행 수명을 제공하지 않는다. Background Sync의 연결 후 처리, Background Fetch의 장기 다운로드, Periodic Sync의 정책에 따른 반복 기회는 다르다. 등록한 최소 간격을 정확한 타이머로 간주하지 않는다. Content Index는 이미 캐시한 콘텐츠의 발견을 돕고 자동 다운로드·영구 보존을 수행하는 것은 아니다.

Push 수신과 시스템 Notifications 표시는 별개 단계이며 사용자 권한·구독 보호·해지 흐름을 확인한다. badge는 상태 표시다. Web Share는 사용자 활성화와 선택 대상을 사용하고, Launch Handler·Window Controls Overlay는 설치 플랫폼과 manifest 조건이 있다. 미지원 시 기본 웹 동작을 유지하도록 실제 제품 요구에 맞춰 선택한다.

## 검토한 출처

- [Background Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API)
- [Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [Badging API](https://developer.mozilla.org/en-US/docs/Web/API/Badging_API)
- [Content Index API](https://developer.mozilla.org/en-US/docs/Web/API/Content_Index_API)
- [Launch Handler API](https://developer.mozilla.org/en-US/docs/Web/API/Launch_Handler_API)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Periodic Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API)
- [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [Window Controls Overlay API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Controls_Overlay_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
