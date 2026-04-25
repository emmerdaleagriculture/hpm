/**
 * Maps a post's primaryTag to a service for the in-article CTA panel.
 *
 * Mapped → render the green-deep CTA pointing at that service.
 * Unmapped (or null) → render no CTA panel. Don't fall back to a generic
 * "Get a quote" — the value of this pattern is its specificity.
 *
 * verb is the conjugated phrase used in the headline:
 *   "I ${verb} across Hampshire and surrounding counties"
 */
export type TagService = {
  slug: string;
  label: string;
  verb: string;
};

export const tagToService: Record<string, TagService | null> = {
  topping:       { slug: 'paddock-topping',     label: 'Paddock topping',  verb: 'top paddocks' },
  weeds:         { slug: 'weed-control',        label: 'Weed control',     verb: 'tackle weeds' },
  drainage:      { slug: 'mole-ploughing',      label: 'Mole ploughing',   verb: 'sort drainage' },
  'ground-care': { slug: 'harrowing',           label: 'Harrowing',        verb: 'look after paddocks' },
  // Informational tags — no service CTA.
  equipment:     null,
  seasonal:      null,
  advice:        null,
  kit:           null,
};

export function serviceForTag(tag: string | null | undefined): TagService | null {
  if (!tag) return null;
  return tagToService[tag] ?? null;
}
