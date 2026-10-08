# 이 팀의 Tailwind 코드 작성 기준

출처: 2026-10-05 사용자가 FS에 요청한 코드 작성 정책. Tailwind의 보편적 오류 규정과 팀의 유지보수 선호를 구분한다.

Tailwind 공식 자료는 완전한 클래스 문자열의 객체 매핑도 허용한다. 문자열 일부를 동적으로 조립하는 것과 완전한 문자열 선택은 다르다. https://tailwindcss.com/docs/detecting-classes-in-source-files

이 팀이 명시적으로 채택한 범위에서는 변하지 않는 유틸리티를 일반 styles 객체의 value에 숨기지 않고 실제 JSX className에 직접 작성한다. 다른 도메인 데이터 객체는 대상이 아니다. 패키지 채택만으로 모든 프로젝트에 이 규칙을 강제하지 않는다.

두 개 이상의 독립적인 공개 prop으로 재사용 컴포넌트의 스타일이 바뀌는 경우, 해당 컴포넌트를 계획에 열거하고 class-variance-authority의 cva variants/defaultVariants로 표현한다. CVA가 반환한 변형 클래스를 실제 JSX className에 전달해야 한다. 그 변형 결과를 지역 변수에 담아 전달하는 것은 허용한다. 단지 cva import나 사용되지 않는 정의를 추가하는 것은 준수가 아니다. CVA 설정 객체는 일반 styles 객체 금지의 예외다. 하나의 단순 boolean 토글, 조건부 텍스트, 비스타일 분기는 CVA 강제 대상이 아니다. https://cva.style/getting-started/variants/

테마의 의미 토큰·기존 팔레트 유지·브랜드 재설계·dark mode 범위는 사용자 의도다. 기존 설정과 적용된 결정을 먼저 읽는다. 확정되지 않았다면 기존 팔레트 유지와 의미 토큰 도입의 유지보수 비용을 비교해 질문하고, 답변 전 임의의 브랜드/테마/다크 모드를 도입하지 않는다. 이미 답한 결정을 반복해서 묻지 않는다. https://tailwindcss.com/docs/theme

적용 방법: 프로젝트에 승인된 범위와 축을 담은 style-policy.json을 두고 bundle/style-check.js로 검사한다. 이 검사는 지역 클래스 바인딩과 같은 파일의 CVA 연결만 다룬다. 외부 helper/복잡한 동적 코드에는 추가 검토가 필요하다. 자동 스타일 교정이 화면 동등성을 입증하지는 않는다. 정책과 검사 파일을 plan의 guard에 고정하고, 기능/상호작용 검증도 유지한다.
