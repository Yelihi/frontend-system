import React from 'react';
import {formatAmount} from '../shared/format.mjs';
export default function Amount({value}) {
  return <output aria-label="금액">{formatAmount(value)}</output>;
}
