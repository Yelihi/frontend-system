#!/usr/bin/env python3
"""Generate descriptive tables from recorded executions, without model calls."""
import gzip
import json
from pathlib import Path
from statistics import median
import sys

folder = Path(sys.argv[1]).resolve()
manifest = json.loads((folder / 'manifest.json').read_text())
rows = []
for path in sorted(folder.glob('*/result.json')):
    run = json.loads(path.read_text())
    score_path = path.parent / 'checks/score.json'
    run['score'] = json.loads(score_path.read_text()) if score_path.exists() else None
    run['directory'] = path.parent.name
    rows.append(run)


def value(number, decimals=0):
    return '미확인' if number is None else format(number, ',.%df' % decimals)


def stat(numbers, decimals=0):
    numbers = [x for x in numbers if x is not None]
    if not numbers:
        return '미확인'
    return '%s (%s–%s)' % (value(median(numbers), decimals), value(min(numbers), decimals), value(max(numbers), decimals))


def passed(run, key, category=None):
    if run['score'] is None: return None
    return sum(item['passed'] for item in run['score'][key] if category is None or item.get('category') == category)


def changes(run, prefix):
    entries = [line.split('\t', 2) for line in run['numstat']]
    selected = [row for row in entries if len(row) == 3 and row[2].startswith(prefix)]
    return '%d / +%d −%d' % (len(selected), sum(int(row[0]) for row in selected if row[0].isdigit()), sum(int(row[1]) for row in selected if row[1].isdigit()))


lines = ['# FS 통제 실험 결과 — ' + folder.name, '',
         '원본 커밋: `' + manifest['sourceCommit'] + '`. 요청 모델, medium 추론, 동일 프롬프트·초기 소스. 중앙값 뒤 괄호는 최솟값–최댓값이다.', '',
         '## 모델·조건별 요약', '',
         '| 모델 | 조건 | 정상 종료/실행 | 총 토큰 | 비캐시 입력 | 출력 | 작업 시간(초) | 계약 통과/33 | 원본 검사/6 | 기존 검사 파일 변경 실행 |',
         '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
for model in manifest['models']:
    for arm in ['plain', 'fs']:
        group = [r for r in rows if r['model'] == model and r['arm'] == arm]
        if not group: continue
        usage = lambda field: [r['usage'][field] if r['usage'] else None for r in group]
        complete = sum(r['exitCode'] == 0 and not r['timedOut'] and r['completedTurns'] > 0 for r in group)
        lines.append('| %s | %s | %d/%d | %s | %s | %s | %s | %s | %s | %d/%d |' % (
            model, arm, complete, len(group), stat(usage('total_tokens')), stat(usage('uncached_input_tokens')),
            stat(usage('output_tokens')), stat([r['elapsedSeconds'] for r in group], 1),
            stat([passed(r, 'requirements') for r in group]), stat([passed(r, 'checks') for r in group]),
            sum(bool(r['changedProtectedFiles']) for r in group), len(group)))
lines += ['', '## 실행별 토큰과 결과', '',
          '| 순서 | 모델 | 조건·회차 | 입력 | 캐시 입력 | 출력 | reasoning 출력 | 총 토큰 | 계약/33 | 검사/6 | MCP 호출 |',
          '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
for r in rows:
    usage = r['usage'] or {}
    lines.append('| %d | %s | %s·%d | %s | %s | %s | %s | %s | %s | %s | %d |' % (
        r['order'], r['model'], r['arm'], r['repeat'], value(usage.get('input_tokens')),
        value(usage.get('cached_input_tokens')), value(usage.get('output_tokens')),
        value(usage.get('reasoning_output_tokens')), value(usage.get('total_tokens')),
        value(passed(r, 'requirements')), value(passed(r, 'checks')), r['mcpCalls']))
lines += ['', '## 결과물 상세', '',
          '| 실행 | 도메인/12 | API/10 | 브라우저/11 | pageerror | JS gzip 합계(KiB) | 기존 검사·설정 변경 파일 수 |',
          '| --- | --- | --- | --- | --- | --- | --- |']
for r in rows:
    score = r['score'] or {}
    size = score.get('gzipJavaScriptBytes')
    lines.append('| [%s](%s/result.json) | %s | %s | %s | %s | %s | %d |' % (
        r['directory'], r['directory'], value(passed(r, 'requirements', 'domain')),
        value(passed(r, 'requirements', 'api')), value(passed(r, 'requirements', 'browser')),
        value(len(score['pageErrors']) if 'pageErrors' in score else None),
        value(size / 1024 if size is not None else None, 2), len(r['changedProtectedFiles'])))
lines += ['', '각 실행 폴더에 JSONL 원문(gzip), 최종 답변, 변경 diff, FS 기록, 외부 채점 로그와 mobile screenshot을 보관한다.',
          'input에는 cached input이 포함된다. 총 토큰은 input + output이며 reasoning을 중복 합산하지 않는다. 토큰 누락은 0이 아닌 미확인이다.',
          '새 대화·새 파일 사본은 서버 프롬프트 캐시 초기화를 뜻하지 않는다. 단일 과제 3회 반복은 일반적인 우열이나 장기 추세를 증명하지 않는다.', '']
lines += ['원본 검사/6은 원본 설정·기존 테스트를 복원한 별도 사본의 결과다. 추가한 테스트는 포함될 수 있다. 선택자나 오류 문구 호환성 실패를 새 기능 결함과 구분해야 한다. 파일 변경 수만으로 검사 약화를 판단하지 않는다.',
          'JS gzip은 production build의 모든 정적 JS 파일 합계이며 초기 페이지 전송량이 아니다. pageerror와 브라우저 검사는 고정 시나리오·Chromium에 한정된다.', '']
for r in rows:
    diagnostic = folder / r['directory'] / 'selector-diagnostic/score.json'
    if diagnostic.exists():
        score = json.loads(diagnostic.read_text())
        lines += ['**사후 선택자 진단:** `%s`의 고정 점수는 %d/33이다. 구현의 이름이 Total인 output은 role=group이며, 고정 채점기는 기본 status 역할을 요구해 두 사례를 실패 처리했다. 프롬프트의 output 요소·이름 요구보다 강한 가정이다. 동일 제품 해시에서 역할 제한만 제거한 [진단](%s/selector-diagnostic/score.json)은 %d/33이었다. 모델을 재실행하거나 본 비교 점수를 수정하지 않았다.' % (
            r['directory'], passed(r, 'requirements'), r['directory'], sum(x['passed'] for x in score['requirements'])), '']
lines += ['## 변경량과 FS 절차 수행', '',
          '| 실행 | 제품 파일 / 추가·삭제 줄 | 테스트 파일 / 추가·삭제 줄 | FS 기록 파일 / 추가·삭제 줄 | FS 실행 상태 | MCP 거부/실패 |',
          '| --- | --- | --- | --- | --- | --- |']
for r in rows:
    records = folder / r['directory'] / 'project-records'
    statuses = [json.loads(p.read_text()).get('execution', {}).get('status', 'unknown') for p in records.glob('plans/*/execution.json')]
    raw = folder / r['directory'] / 'events.jsonl.gz'
    open_events = lambda: gzip.open(raw, 'rt') if raw.exists() else raw.with_suffix('').open()
    with open_events() as events:
        items = [event.get('item', {}) for event in map(json.loads, events) if event.get('type') == 'item.completed']
    failed_tools = sum(item.get('type') == 'mcp_tool_call' and item.get('status') == 'failed' for item in items)
    lines.append('| %s | %s | %s | %s | %s | %d |' % (r['directory'], changes(r, ('app/', 'src/')), changes(r, ('tests/', 'e2e/')),
                                               changes(r, '.frontend-system/'), ', '.join(statuses) or '없음', failed_tools))
excluded = manifest.get('excludedRuns', [])
if excluded:
    lines += ['', '## 인프라 영향으로 분리한 실행', '',
              '아래 원자료는 삭제하지 않았다. FS 임시 문서 유실이 관측된 Astra 세 번째 일반/FS 쌍을 분리하고 두 조건을 새로 실행했다. [사건 기록](runtime-integrity-incident.json)과 [재측정 환경](retry-manifest.json)을 함께 확인한다.', '',
              '| 실행 | 총 토큰 | 작업 시간(초) | 기능/33 | FS 상태 | 분리 이유 |',
              '| --- | --- | --- | --- | --- | --- |']
    for directory in excluded:
        item = json.loads((folder / directory / 'result.json').read_text())
        score = json.loads((folder / directory / 'checks/score.json').read_text())
        statuses = [json.loads(p.read_text()).get('execution', {}).get('status', 'unknown')
                    for p in (folder / directory).glob('project-records/plans/*/execution.json')]
        lines.append('| [%s](%s/result.json) | %s | %s | %d | %s | %s |' % (
            directory, directory, value((item['usage'] or {}).get('total_tokens')), value(item['elapsedSeconds'], 1),
            sum(x['passed'] for x in score['requirements']), ', '.join(statuses) or '없음',
            'FS 문서 유실 실행' if item['arm'] == 'fs' else '같은 회차의 비교 쌍'))
trees = set(r['initialTree'] for r in rows)
threads = [r['threadId'] for r in rows if r['threadId']]
lines += ['', '초기 소스 tree 종류: %d. 확인한 고유 세션: %d/%d. 집계 실행: %d/%d. 별도 보존한 인프라 제외 실행: %d.' % (
    len(trees), len(set(threads)), len(rows), len(rows), len(manifest['schedule']) - len(excluded), len(excluded)), '']
(folder / 'report.md').write_text('\n'.join(lines))
print('\n'.join(lines))
