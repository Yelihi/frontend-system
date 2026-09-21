# 고주사율 모니터에서만 깜빡이던 시간표 셀을 잡기까지

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/debug/pages/contribute/css/css_backspace_opacity.html
- 확인한 URL: https://frontend-fundamentals.com/debug/pages/contribute/css/css_backspace_opacity.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 4500/4531문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

고주사율 Chrome에서 CSS-in-JS 변경과 깜빡임을 조사하고 스타일 변경 방식을 조정한 경험이다.

## 검토·해석 및 생략

당시 환경의 관측이다. 특정 CSS가 항상 GPU 합성을 보장한다거나 측정 수치를 일반 성능으로 볼 수 없다.
