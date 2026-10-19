import { createRequire as __fsCreateRequire } from 'node:module'; import { fileURLToPath as __fsFileURLToPath } from 'node:url'; import { dirname as __fsDirname } from 'node:path'; const require = __fsCreateRequire(import.meta.url); const __filename = __fsFileURLToPath(import.meta.url); const __dirname = __fsDirname(__filename);
import {
  ZodISODate,
  ZodISODateTime,
  ZodISODuration,
  ZodISOTime,
  _isoDate,
  _isoDateTime,
  _isoDuration,
  _isoTime
} from "./chunk-MHL22X7X.js";
import {
  __export
} from "./chunk-2R6PZYWP.js";

// node_modules/zod/v4/classic/iso.js
var iso_exports = {};
__export(iso_exports, {
  ZodISODate: () => ZodISODate,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODuration: () => ZodISODuration,
  ZodISOTime: () => ZodISOTime,
  date: () => date,
  datetime: () => datetime,
  duration: () => duration,
  time: () => time
});
function datetime(params) {
  return _isoDateTime(ZodISODateTime, params);
}
function date(params) {
  return _isoDate(ZodISODate, params);
}
function time(params) {
  return _isoTime(ZodISOTime, params);
}
function duration(params) {
  return _isoDuration(ZodISODuration, params);
}

export {
  iso_exports
};
