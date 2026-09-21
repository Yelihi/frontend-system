# JSX 접근성 lint가 확인하는 범위와 디자인 시스템 매핑

검토일: 2026-09-21 · 분류: concept · 근거: 공개 문서와 검토한 원본 요약

## 참고 상황

접근성 lint를 통과했는데 조작이 안 되거나 디자인 시스템 컴포넌트에서 경고가 어긋날 때.

## 판단에 사용할 내용

JSX 정적 검사 범위와 실제 DOM을 비교하고 컴포넌트·다형성 prop 매핑 및 별도 실행 검증 필요성을 판단한다.

## 적용하지 않는 경우

recommended·strict preset을 프로젝트 확인 없이 강제하거나 lint 통과를 스크린리더 검증으로 보고하지 않는다.

## 개념과 근거

eslint-plugin-jsx-a11y는 JSX AST에서 의미·속성 등의 문제를 찾는다. 키보드 동작, 화면의 포커스, 전체 사용자 흐름과 보조 기술 출력은 정적 분석만으로 증명할 수 없다. recommended/strict 구성도 프로젝트의 기존 설정과 규칙 지원 버전에 맞춰 선택할 대상이다. [유지관리자 README](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), [가이드 규칙 소개](https://frontend-fundamentals.com/a11y/eslint/rules.html).

디자인 시스템의 Button 같은 이름을 HTML 태그로 매핑하려면 실제 구현이 그 태그와 속성을 전달하는지 확인한다. as 같은 다형성 prop을 해석하는 polymorphicPropName과 적용 대상을 한정하는 polymorphicAllowList가 있다. prop 이름을 라벨 정보로 인정하는 설정 또한 최종 DOM에 해당 이름이 전달된다는 전제가 필요하다. [디자인 시스템 가이드](https://frontend-fundamentals.com/a11y/eslint/design-system.html).

lint 통과는 검사 범위 안에서 위반을 찾지 못했다는 의미다. 예를 들어 div에 role과 tabindex만 추가하면 경고 일부는 사라져도 키보드 동작은 여전히 빠질 수 있다. 반대로 초기 포커스를 위한 제목의 tabindex=-1 같은 상황을 무조건 결함으로 취급하지 않는다.

검토할 질문: 규칙이 무엇을 검사하며 무엇을 놓치는가, 래퍼 컴포넌트 매핑이 실제 구현과 맞는가, 실행 검증이 필요한 부분은 무엇인가? 기존 설정이 이 범위를 이미 검사한다면 새 설정을 중복 추가할 필요가 없다. 이번 sync는 제품에 lint를 설치하거나 preset을 필수 정책으로 채택한 작업이 아니다.

원본 catalog ID: `frontend-fundamentals-accessibility-eslint-rules`, `frontend-fundamentals-accessibility-eslint-design-system-integration`.

