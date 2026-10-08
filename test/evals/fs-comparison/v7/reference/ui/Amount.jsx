import React from 'react';
import {formatAmount} from '../shared/format.mjs';
export default function Amount({value}) {
  return <output className="tabular-nums font-medium" aria-label="금액">{formatAmount(value)}</output>;
}
