# 웹 미디어·벡터·수학 표기·Wasm

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

영상·벡터·수식 표시 또는 계산 작업을 Wasm으로 옮길지 기술 탐색이 필요할 때.

## 판단에 사용할 내용

콘텐츠 표현과 계산 실행을 구분해 해당 형식·플랫폼의 상세 가이드와 지원 조건을 찾는다.

## 적용하지 않는 경우

Wasm이나 특정 형식을 선택했다는 이유로 성능·자동 재생·장치 연동을 보장하지 않는다.

## 개념과 근거

오디오·영상 전달과 가공, SVG 벡터 표현, MathML Core 수식 배치는 서로 다른 목적을 가진다. 자동 재생과 장치 연동은 사용자·브라우저 정책을 따른다. Wasm은 JavaScript와 함께 실행하는 컴파일 대상이며 언어 선택 자체가 모든 작업의 성능 향상을 보장하지 않는다. 콘텐츠·계산 경계와 실제 지원 조건을 확인한 후 상세 가이드로 이동한다.

## 검토한 출처

- [MathML](https://developer.mozilla.org/en-US/docs/Web/MathML)
- [Media technologies on the web](https://developer.mozilla.org/en-US/docs/Web/Media)
- [SVG: Scalable Vector Graphics](https://developer.mozilla.org/en-US/docs/Web/SVG)
- [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)

적용 범위: 2026-09-21 MDN 웹 기술 허브 18개와 WebAssembly 허브 1개의 개요. 연결된 전체 표준·API·보안 가이드는 미검토이다.

탐색과 개념 구분에 한정했다. 보안 완결성·성능 보장·모든 브라우저 지원·PWA 설치 자격은 이 자료만으로 판단하지 않는다.
