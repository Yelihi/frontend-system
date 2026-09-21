# Patterns.dev — Dynamic Import

## 출처와 수집 상태

- 요청·원문 URL: https://www.patterns.dev/vanilla/dynamic-import/
- 저자 / 발행처: Patterns.dev
- 수집·검토일: 2026-09-21
- 게시·수정일: 아래 확인 범위에 적힌 날짜 외에는 미확인
- 보존 방식: summary — AI가 작성한 요약. 전문 복제 아님
- 확인 범위: EmojiPicker 지연 로딩과 fallback, 청크 예시 및 SSR 설명의 검토.
- 원격 확인: needs-host · HTML은 호스트 웹 도구로 본문 확인; 텍스트 ACK 없음
- 누락 범위: 위에 명시한 부분 외의 하위 링크, 삽입 데모·영상·실행 검증은 포함하지 않음

## 출처 내용 요약

첫 화면에 필요 없는 코드를 사용 시점에 불러와 초기 작업을 줄이는 예시다. 나중에 발생하는 로딩 지연과 사용자 피드백을 함께 다룬다.

## 검토 해석과 제외한 주장

고정 번들 크기·성능 수치를 일반화하지 않는다. SSR이 Suspense를 지원하지 않는다는 설명은 현재 React 공식 Suspense 문서와 맞지 않아 제외한다. 예제와 CodeSandbox는 실행하지 않았다.

보정 근거: https://react.dev/reference/react/Suspense
