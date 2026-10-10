# v16 — PR 판단의 재사용과 예외 구분

같은 과거 결정과 지식을 받은 일반 AI(raw), 여기에 실제 PR 피드백 절차와 FS 검색을
제공한 AI(fs)를 비교한다. [고정 프로토콜](protocol.md) · [8개 사례와 기준](cases.json).
전체 플러그인이나 실사용자 연구가 아닌 절차·검색의 제한된 재생 평가다.

```sh
python3 test/evals/fs-comparison/v16/test_runner.py
python3 test/evals/fs-comparison/v16/run.py prepare --output test/evals/fs-comparison/v16/results/<run-id>
python3 test/evals/fs-comparison/v16/run.py run --output test/evals/fs-comparison/v16/results/<run-id>
```

prepare는 모델 호출 없이 파일 격리를 검사한다. run은 기본 16회 유료 모델 호출을 한다.
`--repeats 2`는 prepare 단계에서 고정하며 32개 독립 실행이 된다. 결과 폴더는 Git 제외 대상이다.
원문·결정·학습 자료는 양쪽에 동일하게 제공하고, 이후 댓글과 정답은 모델에 노출하지 않는다.

반복 설명은 이미 답이 있는 질문의 횟수를 대리지표로 사용한다. 실제 사람의 시간 절감으로
바꾸어 해석하지 않는다. 결정 재사용·예외 구분은 근거와 이유를 읽고 판정하며 단순 enum/인용
일치로 성공을 선언하지 않는다. 실제 PR은 소유자가 의도와 평가 기준을 확인한 뒤 추가한다.

## 2026-10-09 첫 실행

gpt-6-sol medium, 8개 사례 × 2조건 = 16회. 16개 서로 다른 thread에서 모두 완료했고,
입력 파일 변경 없이 인용 위치 검사를 통과했다. 실제 응답의 이유·범위·예외를 구현 담당
Codex가 직접 판정했다. 독립적이거나 맹검인 평가가 아니며 실제 사용자 평가를 대신하지 않는다.

| 지표 | 같은 원문을 받은 일반 AI | FS 절차 + 검색 |
| --- | ---: | ---: |
| 이미 답한 질문 반복 — 해당 3사례 | 0회 | 0회 |
| 기존 결정의 적합한 재사용 | 3/3 | 3/3 |
| 조건이 달라진 예외 구분 | 2/2 | 2/2 |
| 잘못된 주장·미확정 의도·과한 일반화 방어 | 4/4 | 4/4 |
| 총 토큰 | 779,532 | 846,688 |
| 비캐시 입력 + 출력 | 167,180 | 204,128 |
| 명령 도구 호출 | 52 | 113 |

**이번 사례에서도 설계 판단 우위나 반복 설명 감소를 입증하지 못했다.** 반복 질문은 양쪽
모두 0회이므로 감소량 역시 0회다. FS는 총 토큰 약 8.6%, 비캐시 입력+출력 약 22.1%를
더 사용했다. 토큰은 실행의 누적 사용량이며 한 번의 context 크기나 청구 금액이 아니다.

상태 수명·재시도 조건이 짧은 명시적 결정 문서에 이미 정리되어 있어 양쪽 모두 쉽게
판단했다. 사전 중단 조건인 **천장 효과**에 해당하므로 같은 사례를 더 반복하거나 FS만
유리해지도록 요구사항을 추가하지 않았다. 다음 평가에는 시간순으로 분리한 실제 PR의
상충하는 댓글·결정 변경·예외와 소유자가 확인한 의도가 필요하다.

FS 조건은 실제 PR-feedback 지시문과 제품 검색 함수를 사용했지만, 검색 helper는 상위
5개 본문까지 반환하는 v15 진단 도구다. FS는 13회 검색을 호출했고 양쪽의 읽기·명령 수가
달랐다. 전체 플러그인의 선택적 본문 읽기 비용으로 일반화하거나, 추가 비용 전부를 단일
원인으로 단정할 수 없다. 더 많은 검색·기록이 더 나은 판단을 뜻하지 않는 결과다.

`disposition`만으로 점수화하지 않았다. 예를 들어 일반 AI는 잘못된 deep-freeze 주장을
명시적으로 기각한 뒤 올바르게 고친 지식을 reusable로 제안했다. 이를 원래 주장에 찬성한
것으로 오판하지 않았다. 스타일 사례에서 일반 AI가 참조 ID를 decision ID 배열에도 넣은
출처 형식 오류는 보존했으며, 올바른 D-variants 재사용과 별도로 기록했다.

- [전체 응답·완료·토큰](measurements/model-results.json)
- [의미 판정의 근거와 답변 해시](measurements/semantic-review.json)
- [세 지표와 방어 항목 집계](measurements/metrics.json)
- [명령·검색 호출 수](measurements/tool-calls.json)
- [실험에서 실제로 읽은 지시문](measurements/evaluated-pr-feedback.md)

의미 판정은 응답 해시에 묶이며, 응답이 바뀌면 다시 판정해야 한다. 미실행·인용 실패·미판정은
분모에서 제거하지 않고 unverified로 남긴다. 단순 질문 0회·인용 일치를 성공으로 바꾸지 않는다.

```sh
python3 test/evals/fs-comparison/v16/test_score.py
python3 test/evals/fs-comparison/v16/score.py test/evals/fs-comparison/v16/results/2026-10-09-round1 test/evals/fs-comparison/v16/measurements/semantic-review.json
```

## 제품 검사와 모델 효과의 구분

`test/pr-readiness.test.ts`는 실제 Git 저장소·실행 기록·검사·의미 검토를 연결하여 전체 PR
범위, 삭제 파일, 누락된 범위 검토, 미커밋 변경, 검사 누락, 새 실패, 새 리뷰를 통한 복구,
head/base 변경을 검증한다. CLI의 blocked 종료 코드도 확인한다. 이 gate 검사는 기계적
기록 계약의 검증이며, 테스트 픽스처에 작성한 host review가 실제 코드 의미를 이해했다는
증거는 아니다. 모델 효과는 위 표와 그 한계를 따로 읽어야 한다.
