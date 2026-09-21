# iOS 웹뷰에서 스와이프 뒤로가기 시 회색 화면이 표시되는 현상 디버깅

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/ios/ios_webview_swipe_back_gray_screen_debug.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/ios/ios_webview_swipe_back_gray_screen_debug.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 1885/1885문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

WKWebView 스와이프 복귀 후 빈 화면에서 스크롤 복원을 조정한 경험이다.

## 검토·해석 및 생략

정확한 OS·라이브러리 버전 미확인이다. history.length만으로 모든 탐색 방향을 판단하거나 커스텀 라우터를 의무화하지 않는다.
