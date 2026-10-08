import React from 'react';
import {cva} from 'class-variance-authority';
const classes = cva("inline-flex items-center justify-center rounded font-medium disabled:opacity-50",{"variants": {"tone": {"primary": "bg-action text-on-action", "quiet": "bg-slate-100 text-slate-900"}, "size": {"sm": "px-3 py-1 text-sm", "lg": "px-4 py-2 text-base"}}, "defaultVariants": {"tone": "primary", "size": "sm"}});
export default function ActionButton({tone,size,className,...props}) {
  return <button {...props} className={classes({tone,size,className})}/>;
}
