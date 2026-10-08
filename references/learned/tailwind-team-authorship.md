# Tailwind: 이 팀의 클래스 작성·변형·테마 결정

## 참고 상황

적용 조건: Tailwind를 사용하고 사용자가 이 팀의 작성 규칙을 채택한 변경 범위. 패키지 존재나 className만으로 전역 강제하지 않는다. 코드를 조사해 정적 스타일, prop 변형, 도메인 데이터와 테마 의도를 구분한다.

## 판단에 사용할 내용

- 고정 클래스는 해당 JSX className에 직접 작성한다. `const styles={root:'p-4'}`를 거쳐 참조하지 않는다. 일반 데이터 객체는 무관하다.
- 여러 공개 prop이 스타일을 변형하는 재사용 컴포넌트는 승인된 대상/축을 열거하고 CVA의 variants/defaultVariants를 사용한다. 실제 JSX가 반환 클래스를 사용해야 한다. 변형 결과를 지역 변수에 담아 전달해도 된다. CVA 설정 객체는 허용한다. 단순 boolean 토글/조건부 텍스트에 CVA를 강제하지 않는다.
- Tailwind 클래스 토큰 일부를 보간하지 않는다. 완전한 클래스 문자열을 선택한다. 객체 매핑 자체는 Tailwind에서 허용되며 위의 제한은 팀 선호다.

## 사용자 결정

설정과 기존 결정을 읽고 테마 전략이 미결정이면 질문한다. 기존 팔레트를 유지할지, 색 자체를 바꾸지 않고 의미 토큰을 도입할지, 브랜드/dark mode 재설계를 할지 비용과 범위를 구분한다. 선택을 모델이 대신 정하지 않고 답변을 계획과 검사에 연결한다. 이미 확정된 내용은 재질문하지 않는다.

## 실행 가능한 검사

프로젝트가 이 규칙을 승인했을 때만 프로젝트 상대 파일 목록으로 style-policy.json을 작성한다.

```json
{"version":1,"files":["ui/Button.jsx","App.jsx"],"inlineStaticClasses":true,"completeClassTokens":true,"variants":[{"file":"ui/Button.jsx","axes":["tone","size"]}]}
```

`node <plugin-root>/bundle/style-check.js <project> style-policy.json`은 위치와 규칙 ID를 JSON으로 반환하고 위반 시 exit 1이다. 기존 lint/test script와 연결하고 정책 파일·검사 script를 계획의 guard로 보호한다. 실제 구현/테스트를 작성하기 전 승인된 필수 스타일 규칙과 검사 연결을 확인한다. 사후 리뷰에서만 선택적으로 보는 권고로 낮추지 않는다.

이 검사기의 범위는 지역 바인딩과 같은 파일의 CVA 정의다. 조건식의 데이터/판단 함수는 클래스 객체가 아니다. CSS 생성, 임의의 로컬·외부 helper, 실제 화면과 React 동작은 별도 검증한다. unresolved-class-helper는 검사 범위 밖이라는 뜻이며 코드 결함의 확정 판정이 아니다. 자동 고침은 하지 않는다. 불확실한 맥락을 일괄 치환하지 않는다.

근거: fs-tailwind-team-policy(사용자 팀 정책), Tailwind 클래스 감지/테마 공식 문서, CVA variants 공식 문서. 보편적인 클린 코드 정답이 아니라 이 팀에서 승인한 범위의 기준이다.

## 적용하지 않는 경우

팀 정책을 채택하지 않은 프로젝트, 단순 boolean 토글, 일반 데이터 객체에는 객체 금지나 CVA를 강제하지 않는다. CVA 설정 객체는 예외다. 테마 결정이 확정되어 있으면 다시 묻지 않는다.
