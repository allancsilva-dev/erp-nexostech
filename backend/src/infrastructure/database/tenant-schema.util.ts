export function generateTenantSchema(
  tenantName: string,
  tenantId: string,
): string {
  const slug = tenantName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const safeSlug = slug.length > 0 ? slug : 'default';
  const suffix = tenantId.replace(/-/g, '').slice(0, 8);
  return `tenant_${safeSlug}_${suffix}`;
}
