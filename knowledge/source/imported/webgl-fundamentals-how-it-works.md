# WebGL Fundamentals — How It Works

## 출처와 수집 상태

- 요청·원문 URL: https://webglfundamentals.org/webgl/lessons/webgl-how-it-works.html
- 저자 / 발행처: WebGL Fundamentals
- 수집·검토일: 2026-09-21
- 게시·수정일: 아래 확인 범위에 적힌 날짜 외에는 미확인
- 보존 방식: summary — AI가 작성한 요약. 전문 복제 아님
- 확인 범위: vertex/fragment 단계, varying 보간, buffer·attribute 연결과 normalize 설명. 삽입 데모·전체 코드 실행·행렬 단원은 제외.
- 원격 확인: needs-host · HTML은 호스트 웹 도구로 본문 확인; 텍스트 ACK 없음
- 누락 범위: 위에 명시한 부분 외의 하위 링크, 삽입 데모·영상·실행 검증은 포함하지 않음

## 출처 내용 요약

정점 입력을 clip space로 변환한 뒤 래스터화된 fragment의 색을 계산한다. buffer와 attribute 설정이 정점 데이터를 셰이더 입력에 연결하고 varying 값이 보간된다.

## 검토 해석과 제외한 주장

WebGL 1 문법 설명으로 한정한다. WebGL2·WebGPU에 예제를 그대로 적용하거나 픽셀과 fragment 실행 횟수가 항상 일대일이라고 일반화하지 않는다. 일반 DOM UI에 그래픽 도입을 권하는 자료가 아니다.
