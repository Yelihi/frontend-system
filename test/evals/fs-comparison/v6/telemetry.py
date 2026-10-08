#!/usr/bin/env python3
"""Reuse read-only v5 telemetry for all v6 product files."""
import importlib.util
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('shared_telemetry', HERE.parent / 'v5/telemetry.py')
telemetry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(telemetry)
telemetry.PRODUCT_FILES = tuple(json.loads((HERE / 'contract.json').read_text())['editable'])
if __name__ == '__main__': telemetry.main()
