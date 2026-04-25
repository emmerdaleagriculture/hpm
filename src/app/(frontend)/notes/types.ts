/**
 * Plain-shape Post for the /notes index. Server component fetches via
 * Payload (which returns nested objects with extra fields), then projects
 * down to this shape before passing to the client component, so the
 * payload-over-the-wire stays small and stable.
 */
export type NoteCard = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  primaryTag: string | null;
  tags: string[];
  hero: {
    url: string | null;
    alt: string;
    width: number | null;
    height: number | null;
  } | null;
};
