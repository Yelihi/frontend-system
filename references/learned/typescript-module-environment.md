# TypeScript 모듈 옵션과 실행 환경

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

TypeScript 검사는 통과했는데 배포한 Node 코드·라이브러리 import가 실패하거나 모듈 옵션을 선택할 때.

## 판단에 사용할 내용

누가 JS를 실행·변환하는지와 소비 환경을 확인하고 앱·라이브러리, 번들 내부·external 의존 및 선언 파일 경로를 나누어 판단한다.

## 적용하지 않는 경우

공식 예시를 모든 환경의 완성된 tsconfig로 복사하거나 단일 타입 검사로 ESM·CJS 출력 모두를 검증했다고 보지 않는다.

## 개념과 근거

모듈 탐색은 실제 실행 환경과 맞아야 한다. bundler가 허용한 확장자 생략이 Node ESM 배포물에서도 허용된다고 볼 수 없다. 라이브러리를 번들링해도 external import와 .d.ts에 남은 경로는 소비자의 환경에서 해석된다.

module·moduleResolution·package.json type·파일 확장자와 외부 emitter의 출력 형식을 함께 확인한다. 목표 환경이 둘 이상이면 각 산출물의 소비 경로를 확인한다. 가이드의 예시 옵션은 설치된 버전에 맞게 판단하며, 설정 구조를 바꾸기 전에 실제 오류와 출력 파일을 조사한다.

## 검토한 출처와 범위

- [TypeScript — Choosing Compiler Options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html) — 앱의 bundler·Node 실행 환경 선택, 라이브러리 외부 의존·선언 파일과 dual emit 설명. 문서 수정일 2026-09-18.

적용 조건: TypeScript 모듈 설정을 사용하는 프로젝트. 실제 설치 버전·Node·번들러와 배포 소비자를 확인한다.

읽은 범위의 개념 참조이며 제품 코드·예제 실행, 접근성·보안·성능 검증 완료를 뜻하지 않는다.
