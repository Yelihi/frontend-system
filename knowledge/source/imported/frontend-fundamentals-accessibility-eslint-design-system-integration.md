# 디자인 시스템과 결합하기 ​

## 출처와 수집 상태

- 원문·요청 URL: https://frontend-fundamentals.com/a11y/eslint/design-system.html
- 발행처: Frontend Fundamentals
- 개별 저자·게시일·수정일: 미확인
- 수집·검토일: 2026-09-21
- 보존 방식: summary — 전문을 복제하지 않은 AI 요약
- 접근 범위: Chrome에서 해당 페이지 main의 표시 텍스트와 코드 확인. 음성·동영상·삽입 체험·예제 실행 및 스크린리더 실기 검증은 제외.
- 적용 범위: 웹 HTML/ARIA. React·JSX 예제는 해당 환경에서 별도 검증.
- 원격 상태: HTML needs-host. 브라우저 본문 검토로 보완했으며 원격 텍스트 스냅샷 승인이나 전체 사이트 수집을 뜻하지 않음.

## 작성자 내용 요약

디자인 시스템의 컴포넌트 이름·다형성·라벨 prop을 lint 설정에 연결하는 방법을 설명한다.

## AI 검토와 반영 범위

설정은 실제 렌더링 태그와 prop 전달을 확인한 뒤 사용한다. polymorphicPropName과 필요시 polymorphicAllowList의 범위를 맞춘다. 이름 매핑만으로 컴포넌트 동작이 구현되지는 않는다.

확인한 보완 근거:

- [공식 근거 1](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)

자료의 주장과 예제에 대한 검토 기록이다. 새 공용 필수 규칙의 승인이나 제품의 접근성 인증으로 사용하지 않는다.

