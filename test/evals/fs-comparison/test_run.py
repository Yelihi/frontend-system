"""Run with python3 test/evals/fs-comparison/test_run.py; no model calls."""
from run import telemetry

events = [
    {'type': 'thread.started', 'thread_id': 'fresh'},
    {'type': 'turn.completed', 'usage': {'input_tokens': 100, 'cached_input_tokens': 40, 'output_tokens': 20, 'reasoning_output_tokens': 10}},
    {'type': 'turn.completed', 'usage': {'input_tokens': 50, 'cached_input_tokens': 20, 'output_tokens': 5}},
    {'type': 'item.started', 'item': {'id': 'x', 'type': 'mcp_tool_call', 'tool': 'save_revision'}},
    {'type': 'item.completed', 'item': {'id': 'x', 'type': 'mcp_tool_call', 'tool': 'save_revision'}},
]
result = telemetry(events)
assert result['threadId'] == 'fresh'
assert result['usage']['total_tokens'] == 175  # cached and reasoning are not added twice
assert result['usage']['uncached_input_tokens'] == 90
assert result['usage']['reasoning_output_tokens'] == 10
assert result['mcpCalls'] == 1
assert result['mcpTools'] == ['save_revision']
assert telemetry([])['usage'] is None  # missing evidence is not zero usage
print('PASS token accounting and completed-tool counting')
