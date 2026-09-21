# JavaScript 날짜와 국제화

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

동일한 날짜가 시간대마다 달라 보이거나 다국어 숫자·정렬·문자 분할이 필요할 때.

## 판단에 사용할 내용

시점 저장과 날짜만의 도메인 의미, 입력 파싱과 로캘·시간대별 표시를 구분해 적합한 Intl 기능을 찾는다.

## 적용하지 않는 경우

지역 날짜 문자열을 이식 가능한 형식으로 보거나 Date legacy 안내만으로 전면 교체하지 않는다.

## 개념과 근거

Date의 epoch 밀리초와 표시할 로캘·시간대는 다른 정보다. 문자열 파싱은 형식과 환경을 확인하고 임의의 지역 표기를 이식 가능한 입력으로 가정하지 않는다. Intl은 날짜·숫자 형식뿐 아니라 정렬·복수형·문자 분할을 목적별 객체로 제공한다. 원문의 Date legacy 안내만으로 전 코드 교체를 강제하지 않는다. 대체 API의 대상 런타임 지원과 도메인의 날짜/시각 요구를 확인한 후 선택한다.

## 검토한 출처

- [Internationalization](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Internationalization)
- [Representing dates & times](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Representing_dates_times)

적용 범위: 2026-09-21 MDN JavaScript 49개 등록 URL의 개요·표시 본문 일부. 상세 메서드·모든 예외·엔진 버전 호환성은 별도 검토 대상이다.

언어 개념을 검색 가능한 참조로 묶었다. 최신 제안이나 legacy 안내를 즉시 도입·교체 규칙으로 승격하지 않는다. 코드 실행·성능 실측·모든 하위 문서 검토는 수행하지 않았다.
