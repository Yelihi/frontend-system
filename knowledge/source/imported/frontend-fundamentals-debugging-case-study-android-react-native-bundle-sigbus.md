# Android에서 React Native 번들 로딩 시 SIGBUS 크래시 발생

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/android/android_react_native_bundle_loading_sigbus_crash_debug.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/android/android_react_native_bundle_loading_sigbus_crash_debug.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 2193/2193문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

Android React Native 실행 중 번들 파일과 갱신 쓰기가 충돌한 SIGBUS 사례다.

## 검토·해석 및 생략

exists 후 write는 일반적인 원자적 동시성 제어가 아니다. 실제 파일 소유권과 교체 방식을 검증해야 하며 캐시 설정 소실도 별도 원인이었다.
