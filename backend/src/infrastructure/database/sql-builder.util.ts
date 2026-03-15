export function quoteIdent(identifier: string): string {
  const sanitized = identifier.replace(/[^a-zA-Z0-9_]/g, '_');
  return `"${sanitized}"`;
}

export function quoteLiteral(value: string | number | boolean | null): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${value.replace(/'/g, "''")}'`;
}
