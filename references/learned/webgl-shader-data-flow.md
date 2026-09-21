# WebGL 정점 입력과 fragment 색 계산의 연결

검토일: 2026-09-21 · concept · experience

## 참고 상황

WebGL 삼각형의 위치·색이 예상과 다르거나 buffer 데이터가 셰이더 입력에 어떻게 연결되는지 조사할 때.

## 판단에 사용할 내용

buffer 바인딩·attribute 설정·clip space 변환과 varying 보간을 따라 정점 입력에서 fragment 색까지 데이터 흐름을 확인한다.

## 적용하지 않는 경우

일반 DOM UI의 대체 구현으로 권하거나 WebGL 1 예제를 WebGL2·WebGPU에 그대로 적용하지 않는다.

## 개념과 근거

정점 셰이더는 입력을 clip space 위치로 변환하고 래스터화 과정에서 보간된 값이 fragment 계산으로 전달된다. buffer에 데이터가 있어도 attribute의 위치·형식·stride·offset 연결이 맞아야 의도한 입력을 읽는다.

원문은 파이프라인 이해를 위한 단순화된 설명이다. fragment를 항상 화면 픽셀과 일대일 실행으로 일반화하거나 해당 데모의 성능·완전한 렌더러 정확성을 보장하지 않는다. 삽입 데모와 코드의 실행 검증은 하지 않았다.

## 검토한 출처와 범위

- [WebGL Fundamentals — How It Works](https://webglfundamentals.org/webgl/lessons/webgl-how-it-works.html) — vertex/fragment 단계, varying 보간, buffer·attribute 연결과 normalize 설명. 삽입 데모·전체 코드 실행·행렬 단원은 제외.

적용 조건: WebGL 1 중심의 교육 자료. 실제 버전·GLSL·장치 상태와 오류를 확인한다.

읽은 범위의 개념 참조이며 제품 코드·예제 실행, 접근성·보안·성능 검증 완료를 뜻하지 않는다.
