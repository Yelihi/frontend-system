# Patterns.dev — Compound Pattern

## 출처와 수집 상태

- 요청·원문 URL: https://www.patterns.dev/react/compound-pattern/
- 저자 / 발행처: Patterns.dev
- 수집·검토일: 2026-09-21
- 게시·수정일: 아래 확인 범위에 적힌 날짜 외에는 미확인
- 보존 방식: summary — AI가 작성한 요약. 전문 복제 아님
- 확인 범위: Context 기반 상태 공유, 직접 자식 clone 방식, Pros·Cons 및 표시된 예제 일부.
- 원격 확인: needs-host · HTML은 호스트 웹 도구로 본문 확인; 텍스트 ACK 없음
- 누락 범위: 위에 명시한 부분 외의 하위 링크, 삽입 데모·영상·실행 검증은 포함하지 않음

## 출처 내용 요약

함께 동작하는 하위 컴포넌트가 상태를 공유하면서 호출자가 배치를 조합하는 패턴이다. 직접 자식에 props를 주입하는 방식에는 중첩·이름 충돌 제약이 있다.

## 검토 해석과 제외한 주장

클릭 div와 clone/context가 혼재한 예제를 완성품으로 배포하지 않는다. React context를 Server Component에서도 쓸 수 있다는 식의 설명은 Next.js 공식 문서와 충돌해 제외한다. 메모이제이션은 실측 없이 강제하지 않는다.
