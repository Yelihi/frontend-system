# HTML 포커스·숨김·popover의 구분

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

숨긴 영역이 여전히 조작되거나 Tab 순서가 꼬이고 popover를 모달처럼 써도 되는지 판단할 때.

## 판단에 사용할 내용

hidden·inert·tabindex와 top layer·닫힘 정책을 분리해 표시·포커스·모달 요구를 대조한다.

## 적용하지 않는 경우

popover 또는 aria 속성만으로 모달 의미와 전체 키보드 동작이 완성되었다고 보지 않는다.

## 개념과 근거

순차 포커스 참여와 프로그램적 포커스를 구분한다. autofocus는 사용자의 문맥을 건너뛸 수 있고 양수 tabindex는 탐색 순서 유지 비용을 만든다. hidden은 표시 관련 상태, inert는 하위 상호작용과 접근성 참여 제한이므로 같은 기능이 아니다. until-found는 탐색 시 공개되는 별도 상태다. popover의 top layer 배치와 닫힘 정책만으로 모달 의미나 완전한 위젯 접근성이 생기지는 않는다. title과 단축키에만 필수 정보·조작을 의존하지 않는다.

## 검토한 출처

- [accesskey HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/accesskey)
- [autofocus HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/autofocus)
- [hidden HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden)
- [inert HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert)
- [popover HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/popover)
- [tabindex HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex)
- [title HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title)

적용 범위: 2026-09-21 MDN HTML 개요 및 전역 속성. 현재 대상 브라우저의 세부 호환성과 실행 동작은 도입 시 재확인한다.

MDN 표시 본문의 개요·값·사용 주의 범위를 요약했다. 실행 예제·호환성 표의 모든 버전·연결 문서는 미검증이다. Limited availability·Experimental·Non-standard 표시는 도입 허가가 아니라 추가 확인 조건이다.
