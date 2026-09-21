# DOM·편집·컴포넌트 상호작용

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

IME 편집·선택·클립보드가 어긋나거나 custom element와 popover의 책임을 나눌 때.

## 판단에 사용할 내용

문서 트리·편집 상태·사용자 입력 경로와 선언형 표시·컴포넌트 캡슐화의 역할을 구분한다.

## 적용하지 않는 경우

키 이벤트 하나로 모든 편집 입력을 대체하거나 Shadow DOM을 보안 경계로 사용하지 않는다.

## 개념과 근거

DOM은 문서의 객체 트리이며 JavaScript 언어 자체와 분리된 플랫폼 기능이다. 선택 영역, 클립보드, 드래그 데이터, IME 조합을 하나의 키 이벤트로 대체하지 않는다. EditContext는 커스텀 렌더링과 플랫폼 편집을 연결하므로 텍스트 상태·선택·접근성을 포함한 상세 계약이 필요하다.

Invoker Commands의 선언형 button 동작과 Popover의 비모달 표시를 활용할 수 있지만 모든 위젯 의미가 자동 생성되지는 않는다. 모달 동작은 dialog 등 해당 계약을 확인한다. Web Components의 custom element·shadow·template/slot은 서로 다른 역할이며 shadow 캡슐화는 보안 경계가 아니다. 전체 API 목록에 실린 항목을 일괄 지원으로 해석하지 않는다.

## 검토한 출처

- [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
- [EditContext API](https://developer.mozilla.org/en-US/docs/Web/API/EditContext_API)
- [HTML DOM API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API)
- [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- [Selection API](https://developer.mozilla.org/en-US/docs/Web/API/Selection_API)
- [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
