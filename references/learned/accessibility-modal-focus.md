# 모달의 배경 차단과 포커스 생명주기

검토일: 2026-09-21 · 분류: concept · 근거: 공개 문서와 검토한 원본 요약

## 참고 상황

모달 밖으로 Tab이 빠지거나 모달을 닫은 뒤 포커스를 잃을 때.

## 판단에 사용할 내용

초기 포커스, 배경 비활성화, 내부 순환, Escape 종료와 복귀 위치를 모달 생명주기별로 점검한다.

## 적용하지 않는 경우

비모달 팝오버·메뉴에 모달 포커스 제한을 일괄 적용하지 않는다.

## 개념과 근거

HTML dialog의 showModal()은 모달로 열어 배경을 inert로 만든다. show() 또는 open 속성만으로 표시한 dialog는 비모달이며 동일한 동작을 보장하지 않는다. [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

모달의 생명주기는 열릴 때 적절한 내부 위치로 포커스를 이동하고, 열린 동안 배경 조작을 막고, 닫힐 때 다음 작업 위치로 돌려주는 과정이다. 첫 번째 버튼이 늘 최선인 것은 아니다. 긴 내용은 제목 등 정적 요소가 시작점일 수 있고, 호출 요소가 삭제되었다면 다른 논리적인 위치로 돌아간다. APG 패턴은 내부 Tab 순환과 Escape 닫기를 설명한다. [APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

role=dialog와 aria-modal=true는 이 동작을 JavaScript나 브라우저 대신 구현하지 않는다. 커스텀 구현은 실제 배경 비활성화, 이름, 초기 포커스, 순환, 종료 처리가 필요하다. 원문의 main.inert 예제는 모달이 그 main 안에 있는지와 기존 inert 상태 복구를 고려하지 않은 채 복사할 수 없다. 네이티브 dialog의 Escape 기본 동작도 cancel 처리 등으로 달라질 수 있다. [검토한 원문](https://frontend-fundamentals.com/a11y/ui-foundation/modal.html).

비모달 팝오버·메뉴·툴팁을 모두 모달로 바꾸는 근거로 사용하지 않는다. 현재 동작이 요구사항을 충족하는 기존 컴포넌트는 유지할 수 있다. 이 자료는 포커스 문제의 진단용 개념이며 실제 제품에서 키보드·스크린리더를 실행해 검증한 결과가 아니다.

원본 catalog ID: `frontend-fundamentals-accessibility-components-modal`.

## 추가 검토한 원문

[WAI APG — Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

APG 원문을 등록 출처로 연결했다. 참고할 절은 Keyboard Interaction과 초기·복귀 포커스 Notes, Roles·States·Properties다. 긴 구조화 콘텐츠는 설명 문자열 하나로 합치는 대신 내용 탐색과 시작 포커스를 검토한다. APG는 구현 지침이며 예제 실행·제품 준수 인증과 구분한다.
