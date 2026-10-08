// Read only the lifecycle field, not arbitrary YAML or instructions in the note.
export function sourceSelection(body: string): "pending" | "active" | undefined {
  if (!body.startsWith("---\n") && !body.startsWith("---\r\n")) return undefined;
  const header = body.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!header) throw new Error("Unclosed knowledge metadata header");
  const fields = header[1]!.split(/\r?\n/).filter(line => /^state\s*:/.test(line));
  if (!fields.length) return undefined;
  if (fields.length !== 1) throw new Error("Duplicate knowledge state metadata");
  const value = fields[0]!.match(/^state\s*:\s*(pending|active|'pending'|'active'|"pending"|"active")\s*(?:#.*)?$/)?.[1]?.replace(/['"]/g, "");
  if (value !== "pending" && value !== "active") throw new Error("Knowledge state must be pending or active; merged is derived from current review evidence");
  return value;
}

export function pendingNote(body: string): string {
  // Existing metadata is retained, but importing a note never opts it into review.
  sourceSelection(body);
  if (/^---\r?\n/.test(body)) {
    const end = body.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)![0].length;
    const header = body.slice(0, end);
    return (/^state\s*:/m.test(header)
      ? header.replace(/^state\s*:.*$/m, "state: pending")
      : header.replace(/^(---\r?\n)/, "$1state: pending\n")) + body.slice(end);
  }
  return `---\nstate: pending\n---\n\n${body}`;
}
