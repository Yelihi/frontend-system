# Iframe에서 mousemove가 동작하지 않는 이슈

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/javascript/iframe_mousemove.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/javascript/iframe_mousemove.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 2646/2646문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

iframe 경계를 넘는 드래그에서 부모 문서의 mousemove 수신이 끊긴 사례를 설명한다.

## 검토·해석 및 생략

드래그 오버레이와 정리 시점을 검토할 수 있다. iframe 제거와 강제 mouseup은 보편적 해법이 아니다.
