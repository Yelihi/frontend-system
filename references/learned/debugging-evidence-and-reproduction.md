# 디버깅 증거와 최소 재현

검토일: 2026-09-21 · concept · experience

## 참고 상황

간헐적 오류가 재현되지 않거나 여러 원인 가설을 구분할 근거가 부족할 때.

## 판단에 사용할 내용

입력·버전·행동 순서·기대 결과를 보존하고 최소 사례에서 가설 하나씩 비교한다.

## 적용하지 않는 경우

로그 추가나 반복 실행만으로 원인을 증명했다고 판단하지 않는다.

## 개념과 근거

증상과 기대 결과를 먼저 구분하고, 오류 메시지와 데이터 흐름으로 가설을 세운다. 입력·버전·행동 순서를 보존한 최소 사례에서 가설 하나씩 비교한다. 반복 실행은 간헐적 증상을 관찰하는 방법이지 원인 증명 자체는 아니다. 콘솔 출력과 중단점이 타이밍에 미치는 영향도 기록한다.

## 검토한 출처

- [시작하기](https://frontend-fundamentals.com/debug/pages/introduce.html)
- [효과적인 디버깅을 위한 4가지 단계](https://frontend-fundamentals.com/debug/pages/start.html)
- [진단하기](https://frontend-fundamentals.com/debug/pages/diagnose/index.html)
- [에러 메시지로 진단하기](https://frontend-fundamentals.com/debug/pages/diagnose/error-message.html)
- [작업 지도 그리기](https://frontend-fundamentals.com/debug/pages/diagnose/map.html)
- [재현하기](https://frontend-fundamentals.com/debug/pages/reproduce/index.html)
- [최대한 간단한 코드로 재현하기](https://frontend-fundamentals.com/debug/pages/reproduce/simply.html)
- [디버거와 콘솔로그 활용하기](https://frontend-fundamentals.com/debug/pages/reproduce/debugger.html)
- [일반적인 범위에서 벗어나도록 재현하기](https://frontend-fundamentals.com/debug/pages/reproduce/out-range.html)
- [반복적인 재현 과정을 자동화하기](https://frontend-fundamentals.com/debug/pages/reproduce/repeat.html)
- [버그 발생 경로를 추적하기](https://frontend-fundamentals.com/debug/pages/reproduce/trace.html)

적용 범위: Frontend Fundamentals 디버깅 절차와 2025년 경험 사례. 현재 엔진·도구 버전의 재현 검증이나 실행 가능한 수정안은 포함하지 않는다.

원문 사례와 검토 해석을 분리했다. 버전이 없는 원인 설명·수치·우회책은 현재의 보편적 계약이나 필수 규칙으로 승격하지 않는다.
