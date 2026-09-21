# 상태 지정하기 ​

## 출처와 수집 상태

- 원문·요청 URL: https://frontend-fundamentals.com/a11y/basic-guide/state.html
- 발행처: Frontend Fundamentals
- 개별 저자·게시일·수정일: 미확인
- 수집·검토일: 2026-09-21
- 보존 방식: summary — 전문을 복제하지 않은 AI 요약
- 접근 범위: Chrome에서 해당 페이지 main의 표시 텍스트와 코드 확인. 음성·동영상·삽입 체험·예제 실행 및 스크린리더 실기 검증은 제외.
- 적용 범위: 웹 HTML/ARIA. React·JSX 예제는 해당 환경에서 별도 검증.
- 원격 상태: HTML needs-host. 브라우저 본문 검토로 보완했으며 원격 텍스트 스냅샷 승인이나 전체 사이트 수집을 뜻하지 않음.

## 작성자 내용 요약

checked, selected, expanded, disabled 및 live region으로 상태 변화를 전달하는 예를 소개한다.

## AI 검토와 반영 범위

aria-disabled는 동작 차단을 구현하지 않는다. live off를 절대 무음으로, alert/status를 aria-live 한 속성과 완전히 같은 것으로 보지 않는다. 선택 상태는 React의 실제 제어 방식과 맞춰야 하므로 예제를 그대로 배포하지 않는다.

자료의 주장과 예제에 대한 검토 기록이다. 새 공용 필수 규칙의 승인이나 제품의 접근성 인증으로 사용하지 않는다.

