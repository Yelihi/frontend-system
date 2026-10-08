import React from 'react';
import {cva} from 'class-variance-authority';
const classes = cva("rounded border",{"variants": {"tone": {"neutral": "border-slate-200 bg-white", "accent": "border-action bg-white"}, "density": {"compact": "p-2", "comfortable": "p-4"}}, "defaultVariants": {"tone": "neutral", "density": "comfortable"}});
export default function PanelCard({tone,density,className,...props}) {
  return <section {...props} className={classes({tone,density,className})}/>;
}
