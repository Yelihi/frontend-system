# 2026-09-21 접근성·로컬 지식 sync 기록

## 범위와 결과

- 등록 URL 460개 중 Frontend Fundamentals 접근성 23개와 MDN 접근성 개요 1개를 선택했다. 다른 URL 436개는 이번 sync 범위 밖이다.
- 로컬 React 노트 2개도 함께 검토했다. 원본 두 파일은 변경하지 않았다.
- imported 요약 24개를 새로 작성하고 catalog에 등록했다. 전체 원문 복제나 사이트 전체 수집이 아니다.
- 접근성 6개, React 3개의 concept 참조를 작성했다. 문서마다 스킬·도구를 생성하지 않았으며 공용 rule/preset 채택이나 프로젝트 정책 변경은 없다.
- 처리 결과: represented 25개, omitted 1개. playground는 체험·음성을 실행하지 않았고 독립적인 구현 근거가 없어 요약만 보존했다.
- 원문별 보정·부분 생략 사유는 imported 파일과 index outcomes에 기록했다. 원격 HTML 24개는 needs-host였으며 Chrome으로 본문을 확인했다. 원격 텍스트 캐시 승인 및 remoteHash 연결은 하지 않았다.

## 의미 검토

- 숨겨진 switch 입력, 선택된 radio의 해제, 탭의 키보드 처리 누락, 모달 show/open과 showModal의 혼동은 그대로 배포하지 않았다. WAI APG와 MDN으로 보완했다.
- 모든 interactive 중첩 금지, 모든 input의 form 강제, 이미지 내부 글자가 alt를 대체한다는 일반화, lint preset의 무조건적 의무화를 제외했다.
- React 상태·정체성·render/commit/paint를 구분했다. 내부 구현은 v19.2.0 alternate와 Hook 연결 구간을 확인했다. 상세 WorkLoop 순서·DOM 내부 함수·그림은 이번 배포에서 생략하고 원본을 보존했다.
- 공식 근거 링크와 적용 조건은 각 learned 본문에도 포함했다. review=reviewed는 근거 검토 상태이며 제품 검증이나 보편적 정확성 인증이 아니다.

## 실행 검증

- npm run check: typecheck, lint, build, 27개 테스트 통과.
- 실제 learned 인덱스의 한국어·영어 증상 질문 10개: 지정한 관련 자료 9개 모두 상위 5개 안에서 검색. 반환 12개 중 관련 9개로 retrieved precision@5=0.75, recall@5=1.0. Vue 영역에 React 전용 참조가 노출되지 않았고 무관한 질문은 빈 결과였다.
- 반환 메타데이터 합계 8,013문자는 실제 모델 토큰 수가 아니다. 추가 후보 3개는 이름·버튼·입력 같은 겹치는 단어 때문에 검색되었다. 후보를 찾은 뒤 적용 조건과 본문을 읽어 판단해야 한다.
- 모든 참조를 bounded read로 읽어 본문 해시를 검증하고 연결된 원본 파일 해시를 확인했다. 검증 후 markKnowledgeSynced를 호출하여 26개의 처리 상태를 기록했다. 현재 catalog의 uncataloged/changed/unpublished/affectedReferences는 비어 있다. URL 목록의 미수집 436개까지 완료되었다는 뜻은 아니다.
- 아래 사례는 작성자가 정의한 합성 회귀 확인이다. 독립 모델 평가, 실제 사용자 검색 정확도, 스크린리더·키보드 예제 실행, 모든 WCAG 기준의 평가는 수행하지 않았다. 공유 설치 플러그인은 갱신하지 않았다.

### 검색 실행 기록

```text
ℹ {"query":"아이콘 삭제 버튼 이름","ids":["accessibility-names-and-alternatives","accessibility-native-controls-and-forms","accessibility-semantics"]}
ℹ {"query":"선택한 radio 다시 누르면 해제","ids":["accessibility-widget-interactions"]}
ℹ {"query":"modal focus trap","ids":["accessibility-modal-focus"]}
ℹ {"query":"재정렬 뒤 입력 값 남음","ids":["react-identity-and-state","accessibility-widget-interactions"]}
ℹ {"query":"state snapshot","ids":["react-rendering-state-model","react-fiber-work-in-progress"]}
ℹ {"query":"state snapshot","ids":[]}
ℹ {"query":"alternate memoizedState","ids":["react-fiber-work-in-progress"]}
ℹ {"query":"행 클릭 table","ids":["accessibility-native-controls-and-forms"]}
ℹ {"query":"polymorphic as","ids":["accessibility-static-validation"]}
ℹ {"query":"폰트 설치","ids":[]}
ℹ {"cases":10,"retrievedPrecisionAt5":0.75,"recallAt5":1,"returnedCharacters":8013,"synthetic":true}
```

### 검증한 해시

- learned/index.json: f9fe6c50f11a8bf2ef0a8efefe5db729e035fcb161e5298eae3d33e5476db4b6
- React 기초 원본: d8ce7e534e85b9cbcb1d9e31e69128ca70e2a8f7e1ec3b265c8c4fd6a4909513
- React Fiber 원본: be797a1096952bf6f5f3aff5c64f9c8efb0f3850087a029cc483fe83bd71ba52

참조별 본문 해시와 원본 연결 해시는 index.json에 기록했다. 이후 자료가 바뀌면 이 실행 기록은 과거 결과로만 읽는다.
