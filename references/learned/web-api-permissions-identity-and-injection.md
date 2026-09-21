# 권한·인증·결제 통합과 안전한 삽입

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

권한 조회는 성공하지만 기능이 거부되거나 인증·결제·HTML 삽입 API의 보호 범위를 판단할 때.

## 판단에 사용할 내용

권한 질의와 요청, 신원 입력과 서버 검증, Trusted Types 정책과 실제 정화·키 관리의 책임을 구분한다.

## 적용하지 않는 경우

클라이언트 API나 암호 원시 연산만으로 인증·결제 승인·XSS 방어가 완성되었다고 판단하지 않는다.

## 개념과 근거

Permissions의 질의 결과와 기능별 권한 요청·사용자 활성화·정책 제한은 구분한다. Credential Management는 자격 증명 연결이고 WebAuthn은 공개 키 인증, WebOTP는 서버가 검증할 일회성 코드의 입력 경로, FedCM은 연합 신원 연동이다. Private State Token은 실험적 신뢰 전달이며 실제 신원 검증을 대체하지 않는다. 이 개요만으로 인증 프로토콜의 서버 검증을 구현하지 않는다.

Trusted Types는 정책 함수를 통과했다는 구분이지 정책 자체가 안전하다는 보장이 아니다. Sanitizer에는 안전한 경로와 잠재적으로 unsafe한 경로가 있으므로 정확한 메서드·구성을 확인한다. Web Crypto 원시 연산만으로 키 관리·암호 프로토콜이 안전해지지 않는다. Payment Request의 정보 선택 UI와 Payment Handler 통합이 실제 결제 승인·서버 검증을 대신하지 않는다.

## 검토한 출처

- [Credential Management API](https://developer.mozilla.org/en-US/docs/Web/API/Credential_Management_API)
- [Federated Credential Management (FedCM) API](https://developer.mozilla.org/en-US/docs/Web/API/FedCM_API)
- [HTML Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API)
- [Payment Request API](https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API)
- [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API)
- [Private State Token API](https://developer.mozilla.org/en-US/docs/Web/API/Private_State_Token_API)
- [Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
- [Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [Web-based Payment Handler API](https://developer.mozilla.org/en-US/docs/Web/API/Web-Based_Payment_Handler_API)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [WebOTP API](https://developer.mozilla.org/en-US/docs/Web/API/WebOTP_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
