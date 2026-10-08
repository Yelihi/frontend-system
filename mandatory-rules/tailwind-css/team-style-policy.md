# Tailwind 팀 정책의 적용 경계

## 승인된 작성 규칙을 필수 검사로 연결

사용자가 이 팀의 Tailwind 작성 규칙을 채택한 범위에서만 references/learned/tailwind-team-authorship.md를 적용한다. 고정 클래스의 JSX 직접 표기, 열거된 복수 prop 변형의 CVA 사용, 완전한 클래스 토큰을 계획의 필수 규칙과 검사에 연결한다. CVA 설정 객체·일반 데이터 객체·단순 boolean 토글은 각각의 예외를 유지한다. Tailwind 설치만으로 팀 정책 채택을 추론하지 않는다. 기존 lint가 있으면 활용하고 없으면 승인된 style-policy.json으로 bundle/style-check.js를 실행 가능한 프로젝트 script에 연결한다.

## 미결정 테마는 질문으로 분리

기존 설정과 사용자 결정을 읽고 미정인 테마/브랜드/dark mode만 질문한다. 의도 확인 없이 테마 재설계를 하지 않는다. 필수 코드 작성 규칙과 미결정 제품 선택을 혼동하지 않는다.
