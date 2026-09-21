# TypeScript — Choosing Compiler Options

## 출처와 수집 상태

- 요청·원문 URL: https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html
- 저자 / 발행처: TypeScript
- 수집·검토일: 2026-09-21
- 게시·수정일: 아래 확인 범위에 적힌 날짜 외에는 미확인
- 보존 방식: summary — AI가 작성한 요약. 전문 복제 아님
- 확인 범위: 앱의 bundler·Node 실행 환경 선택, 라이브러리 외부 의존·선언 파일과 dual emit 설명. 문서 수정일 2026-09-18.
- 원격 확인: needs-host · HTML은 호스트 웹 도구로 본문 확인; 텍스트 ACK 없음
- 누락 범위: 위에 명시한 부분 외의 하위 링크, 삽입 데모·영상·실행 검증은 포함하지 않음

## 출처 내용 요약

모듈 옵션은 실제 JS 실행·번들링 환경에 맞춰 선택한다. 라이브러리는 소비자의 환경과 외부 의존·선언 파일 경로도 고려한다.

## 검토 해석과 제외한 주장

설정 예시는 전체 tsconfig 템플릿이 아니다. 특정 옵션 조합·Node 버전을 모든 프로젝트에 강제하지 않고 설치된 TypeScript와 배포 산출물을 확인한다.
