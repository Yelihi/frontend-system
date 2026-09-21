# 데이터 식별자·공유 자원·도구체인 사례

검토일: 2026-09-21 · concept · experience

## 참고 상황

큰 숫자 ID가 변하거나 동시 파일 작업·파서·HMR·에디터에서만 오류가 발생할 때.

## 판단에 사용할 내용

전송 타입과 정밀도, 공유 자원 경쟁, 실제 바이너리·확장·설정 경로를 대조한다.

## 적용하지 않는 경우

재부팅·lockfile 삭제·존재 확인 후 쓰기를 원인 해결이나 원자성 보장으로 취급하지 않는다.

## 개념과 근거

숫자처럼 보이는 식별자는 전송 계약에 따라 문자열로 보존해야 손실을 피할 수 있다. 공유 브라우저와 실행 중 파일을 동시에 변경하는지 조사한다. 존재 확인 후 쓰기만으로 경쟁이 사라진다고 가정하지 않는다. 긴 생성 코드 실패는 해당 파서 환경에서 재현하고, HMR은 해석 경로·감시 범위·서버 연결을 나눠 본다. 에디터 확장과 실제 바이너리의 버전·경로를 로그로 대조하며 재부팅 성공만으로 원인을 확정하지 않는다.

## 검토한 출처

- [MAX_SAFE_INTEGER 정밀도 손실 디버깅](https://frontend-fundamentals.com/debug/pages/contribute/javascript/javascript_max_number_error_debug.html)
- [Android에서 React Native 번들 로딩 시 SIGBUS 크래시 발생](https://frontend-fundamentals.com/debug/pages/contribute/android/android_react_native_bundle_loading_sigbus_crash_debug.html)
- [토스아이디 OG 이미지에 타인의 프로필이 표시되는 현상 디버깅](https://frontend-fundamentals.com/debug/pages/contribute/public/tossid_og_image_other_profile_debug.html)
- [ESLint/TSC 파싱 콜스택 오버플로우 디버깅](https://frontend-fundamentals.com/debug/pages/contribute/compile/codegen_callstack_overflow_debug.html)
- [yarn Workspace에서 공통 패키지 수정 시 HMR이 동작하지 않는 문제 디버깅](https://frontend-fundamentals.com/debug/pages/contribute/yarn/yarn_workspace_hmr_debug.html)
- [Cursor에서 Biome 포맷팅이 동작하지 않는 현상 디버깅](https://frontend-fundamentals.com/debug/pages/contribute/cursor/cursor_biome_formatting_debug.html)

적용 범위: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.

원문 사례와 검토 해석을 분리했다. 버전이 없는 원인 설명·수치·우회책은 현재의 보편적 계약이나 필수 규칙으로 승격하지 않는다.
