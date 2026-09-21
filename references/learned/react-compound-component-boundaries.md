# React Compound Component의 상태 공유와 조합 경계

검토일: 2026-09-21 · concept · experience

## 참고 상황

관련 하위 컴포넌트의 상태를 공유하면서 호출자가 배치를 조합해야 하거나 cloneElement 기반 구현이 중첩에서 깨질 때.

## 판단에 사용할 내용

공유할 상태의 소유자와 자식 조합 계약을 정하고 Context 방식과 직접 자식 props 주입 방식의 제약을 비교한다.

## 적용하지 않는 경우

단순 props만으로 충분한 컴포넌트에 패턴을 강제하거나 원문의 클릭 div를 접근성 구현으로 복사하지 않는다.

## 개념과 근거

Compound Component는 함께 동작하는 부분들의 공유 상태와 조합 인터페이스를 표현한다. Context로 연결하는 방식과 직접 자식을 clone해 props를 주입하는 방식은 같은 중첩 제약을 갖지 않는다. 후자는 직접 자식 범위와 기존 prop 덮어쓰기를 확인한다.

원문의 일부 예제는 클릭 div와 서로 맞지 않는 clone/context 사용을 포함하므로 완성된 위젯 구현으로 배포하지 않는다. 키보드·이름·포커스는 별도 계약이다. Next.js 공식 문서는 Server Component에서 React context를 지원하지 않는다고 명시하므로 원문의 서버 호환성 표현을 그대로 채택하지 않는다. Context 값 메모이제이션은 성능 보장이 아니다.

## 검토한 출처와 범위

- [Patterns.dev — Compound Pattern](https://www.patterns.dev/react/compound-pattern/) — Context 기반 상태 공유, 직접 자식 clone 방식, Pros·Cons 및 표시된 예제 일부.
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — 공식 Markdown 전체 20,410문자의 서버·클라이언트 역할, 초기 HTML·hydration, import 경계·children·context·환경 분리. 버전 메타데이터 16.3.5, 수정일 2026-08-25.

적용 조건: React의 상호작용 컴포넌트. App Router의 context provider·consumer는 Client Component 조건을 확인한다.

읽은 범위의 개념 참조이며 제품 코드·예제 실행, 접근성·보안·성능 검증 완료를 뜻하지 않는다.
