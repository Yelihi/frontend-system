import React from 'react';
import {cva} from 'class-variance-authority';
const classes = cva("inline-flex rounded font-medium",{"variants": {"status": {"idle": "bg-slate-100 text-slate-900", "loading": "bg-amber-100 text-amber-900", "success": "bg-green-100 text-green-900", "error": "bg-red-100 text-red-900"}, "density": {"compact": "px-1 py-0.5 text-xs", "comfortable": "px-2 py-1 text-sm"}}, "defaultVariants": {"status": "idle", "density": "compact"}});
export default function StatusBadge({status,density,className,...props}) {
  return <span {...props} className={classes({status,density,className})}/>;
}
