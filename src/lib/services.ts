/**
 * Shared service-category plumbing used by the footer and /services index.
 *
 * Ordering of the values in this object is the canonical display order — keep
 * it aligned with the order services should appear on the website.
 */

export const SERVICE_CATEGORIES = [
  { key: 'cutting-mowing',    label: 'Cutting & mowing' },
  { key: 'ground-care',       label: 'Ground care' },
  { key: 'treatment-upkeep',  label: 'Treatment & upkeep' },
] as const;

export type ServiceCategoryKey = (typeof SERVICE_CATEGORIES)[number]['key'];

export function categoryLabel(key: string | null | undefined): string | null {
  const hit = SERVICE_CATEGORIES.find((c) => c.key === key);
  return hit ? hit.label : null;
}
