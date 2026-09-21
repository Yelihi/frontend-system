# HTML 입력 보조·언어·방향

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

모바일 입력 키보드·Enter 표시, 편집 영역의 줄바꿈 또는 다국어 문자 방향이 예상과 다를 때.

## 판단에 사용할 내용

inputmode·enterkeyhint의 힌트와 검증·제출 동작을 구분하고 lang·dir·translate·contenteditable의 역할을 확인한다.

## 적용하지 않는 경우

입력 힌트를 데이터 유효성 검사로 사용하거나 실험적 키보드 제어의 지원을 가정하지 않는다.

## 개념과 근거

inputmode와 enterkeyhint는 입력 경험을 위한 힌트이며 유효성 검사나 submit 동작을 대신하지 않는다. contenteditable은 열거 속성이고 plaintext-only 여부와 중첩 요소의 탐색 동작을 확인한다. 언어(lang), 기본 문자 방향(dir), 번역 허용(translate)은 서로 다른 정보다. 교정·철자 검사·문장 제안은 브라우저와 장치에 의존하며 민감한 편집 내용에는 처리 위치를 고려한다. 실험적 가상 키보드 제어는 지원 여부와 대체 동작을 확인한 후 적용한다.

## 검토한 출처

- [autocapitalize HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/autocapitalize)
- [autocorrect HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/autocorrect)
- [contenteditable HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/contenteditable)
- [dir HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/dir)
- [enterkeyhint HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/enterkeyhint)
- [inputmode HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode)
- [lang HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/lang)
- [spellcheck HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/spellcheck)
- [translate HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/translate)
- [virtualkeyboardpolicy HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/virtualkeyboardpolicy)
- [writingsuggestions HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/writingsuggestions)

적용 범위: 2026-09-21 MDN HTML 개요 및 전역 속성. 현재 대상 브라우저의 세부 호환성과 실행 동작은 도입 시 재확인한다.

MDN 표시 본문의 개요·값·사용 주의 범위를 요약했다. 실행 예제·호환성 표의 모든 버전·연결 문서는 미검증이다. Limited availability·Experimental·Non-standard 표시는 도입 허가가 아니라 추가 확인 조건이다.
