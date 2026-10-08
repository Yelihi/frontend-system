# v7 C1 — 모델 capacity 중단, 미검증

일반 AI는 첫 시도 93/93, 총 537,508토큰·181.736초였다. FS prepare는 226,513토큰·100.410초이며 정상 종료했으나 work는 389.493초 뒤 모델 서비스의 `Selected model is at capacity. Please try a different model.`로 종료됐다. timeout=false, exitCode=1, completedTurns=0이다. 권한 승인이나 평가기 시간 제한 문제가 아니다.

FS work의 누적 usage와 최종 외부 채점은 없다. FS 전체 토큰을 0으로 두거나 prepare 토큰만으로 비용을 비교하지 않는다. 완주율과 비용 평균에서 성공으로 처리하지 않는다. 원본 summary에는 완료된 일반 AI journey만 있으므로 FS의 실패 근거는 tailwind-authorship-fs/work/0/record.json 및 model/events.jsonl을 함께 확인해야 한다.

FS의 빈 evidence.statements 저장은 거부됐고 다음 저장에서 근거를 추가했다. 기준 스타일 위반과 수정 중 unresolved-class-helper/cva-variants 진단도 기록됐다. 중간 소스의 모든 diff가 저장된 것은 아니므로 helper의 의미적 정확성까지 역추정하지 않는다. final 구현/절차 성공을 주장하지 않는다.

같은 모델과 같은 manifest로 새 세션의 paired run을 재실행한다. 실패한 회차는 보존하며 정상 표본으로 교체하지 않는다.
