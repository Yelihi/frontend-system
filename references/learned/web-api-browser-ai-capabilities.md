# 브라우저 내 AI 기능의 적용 경계

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

브라우저 내 요약·번역·Prompt 기능의 도입이나 미지원 환경의 대체 동작을 검토할 때.

## 판단에 사용할 내용

모델 준비·다운로드·언어·정책·자원 조건과 결과 검증 경로를 확인한다.

## 적용하지 않는 경우

내장 모델이라는 이유로 즉시 오프라인 사용·동일 품질·출력의 사실성을 보장하지 않는다.

## 개념과 근거

이 API들은 브라우저가 제공하는 모델을 비동기로 호출한다. 지원 여부·모델 준비/다운로드·입출력 언어·정책·자원 조건을 구현 시 확인한다. 내장 모델이라는 설명만으로 모든 환경의 오프라인 준비나 동일한 모델·출력 품질을 보장하지 않는다. 결과는 사용자 입력과 같은 검증 경로를 거쳐 사용하고 요약·번역을 사실 검증이나 신뢰 경계의 우회 수단으로 삼지 않는다. 제한적·실험적 기능이며 Prompt에는 브라우저 공급자의 표준화 반대가 표시된다.

## 검토한 출처

- [Prompt API](https://developer.mozilla.org/en-US/docs/Web/API/Prompt_API)
- [Summarizer API](https://developer.mozilla.org/en-US/docs/Web/API/Summarizer_API)
- [Translator and Language Detector APIs](https://developer.mozilla.org/en-US/docs/Web/API/Translator_and_Language_Detector_APIs)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
