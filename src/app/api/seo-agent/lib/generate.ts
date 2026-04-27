/**
 * Draft generation — Opus 4.7 for all three opportunity types.
 *
 * Each function returns the structured draft or `null` if generation
 * failed twice. The caller persists null drafts as `pending` so Tom
 * still sees the candidate.
 */

import { callJson, OPUS_MODEL, type TokenBudget } from './anthropic';
import type {
  MetaRewriteDraft,
  OnPageTweakDraft,
  NewArticleDraft,
} from './types';

const ARTICLE_SYSTEM = `You are writing a draft article for Hampshire Paddock Management's website. Tom Oswald, the owner, will review and edit before publishing. Your draft should be ready for him to refine, not perfect.

VOICE:
- Practical, plain English, contractor-confident.
- Tom runs the machinery himself — write as someone who knows the work, not a marketing copywriter.
- No hype, no superlatives, no "in today's fast-paced world" openings.
- British English spelling.

CONSTRAINTS:
- 700-1200 words.
- One H1 (the title), then H2/H3 only. No deeper.
- Never invent statistics, case studies, customer quotes, or regulatory citations.
- Never quote prices or promise specific timelines/outcomes.
- Geography: Hampshire and surrounding counties only. Do not write as if national.
- Mention relevant HPM services where natural, with internal link suggestions in markdown link syntax pointing to the slugs provided.
- End with a soft CTA paragraph pointing to the contact page, not a hard sales pitch.

OUTPUT (strict JSON, no preamble):
{
  "title": "...",
  "metaDescription": "max 155 chars",
  "slug": "kebab-case",
  "bodyMarkdown": "...",
  "suggestedInternalLinks": [{"anchor": "...", "slug": "..."}]
}`;

const META_SYSTEM = `You write title tags and meta descriptions for Hampshire Paddock Management. Produce three alternatives that improve CTR for the target query while staying truthful and on-brand.

CONSTRAINTS:
- Title: max 60 characters including spaces.
- Meta: max 155 characters including spaces.
- British English.
- Do not promise prices, speed, or guarantees.
- Include the geographic qualifier (Hampshire / South of England) where it fits naturally.

OUTPUT (strict JSON):
{
  "alternatives": [
    {"title": "...", "meta": "...", "rationale": "why this might lift CTR"},
    {"title": "...", "meta": "...", "rationale": "..."},
    {"title": "...", "meta": "...", "rationale": "..."}
  ]
}`;

const ONPAGE_SYSTEM = `You suggest specific, surgical content additions for a page that ranks in striking distance for a query but isn't winning. Suggestions must be applicable without restructuring the page.

CONSTRAINTS:
- Hampshire Paddock Management voice: plain English, contractor-confident, no hype.
- British English. No invented stats, quotes, or prices.
- Internal link suggestions must use slugs from the site map provided.

OUTPUT (strict JSON):
{
  "newH2": "an H2 to add to the page",
  "newH2Body": "1-2 paragraphs of body copy under the H2, markdown",
  "internalLinksToAdd": [{"anchor": "...", "slug": "...", "reason": "..."}],
  "faqAdditions": [{"question": "...", "answer": "..."}],
  "rationale": "why these additions should help the page rank for the query"
}`;

export type GenerateArticleArgs = {
  query: string;
  intent: string;
  serviceSlugs: string[];
  existingPostsSummary: string;
  rationale: string;
};

export async function generateArticle(
  args: GenerateArticleArgs,
  budget?: TokenBudget,
): Promise<NewArticleDraft | null> {
  try {
    const draft = await callJson<NewArticleDraft>({
      model: OPUS_MODEL,
      system: ARTICLE_SYSTEM,
      user: [
        `Target query: ${args.query}`,
        `Search intent: ${args.intent}`,
        `Available service pages (for internal linking): ${args.serviceSlugs.join(', ')}`,
        `Existing posts to avoid duplicating: ${args.existingPostsSummary || 'none'}`,
        `Why this query was selected: ${args.rationale}`,
      ].join('\n'),
      maxTokens: 4000,
      budget,
    });
    return validateArticle(draft);
  } catch (err) {
    console.error('[seo-agent] generateArticle failed', err);
    return null;
  }
}

export type GenerateMetaArgs = {
  query: string;
  url: string;
  currentTitle: string;
  currentMeta: string;
  ctr: number;
  expectedCtr: number;
};

export async function generateMetaRewrite(
  args: GenerateMetaArgs,
  budget?: TokenBudget,
): Promise<MetaRewriteDraft | null> {
  try {
    const draft = await callJson<MetaRewriteDraft>({
      model: OPUS_MODEL,
      system: META_SYSTEM,
      user: [
        `Target query: ${args.query}`,
        `Current page URL: ${args.url}`,
        `Current title: ${args.currentTitle}`,
        `Current meta: ${args.currentMeta}`,
        `Current CTR: ${(args.ctr * 100).toFixed(2)}% (expected at this position: ${(args.expectedCtr * 100).toFixed(0)}%)`,
      ].join('\n'),
      maxTokens: 1200,
      budget,
    });
    return validateMeta(draft);
  } catch (err) {
    console.error('[seo-agent] generateMetaRewrite failed', err);
    return null;
  }
}

export type GenerateOnPageArgs = {
  query: string;
  url: string;
  excerpt: string;
  position: number;
  siteMap: Array<{ slug: string; title: string }>;
};

export async function generateOnPageTweak(
  args: GenerateOnPageArgs,
  budget?: TokenBudget,
): Promise<OnPageTweakDraft | null> {
  try {
    const draft = await callJson<OnPageTweakDraft>({
      model: OPUS_MODEL,
      system: ONPAGE_SYSTEM,
      user: [
        `Target query: ${args.query}`,
        `Page URL: ${args.url}`,
        `Page current H1 + first 500 words: ${args.excerpt}`,
        `Current position: ${args.position.toFixed(1)}`,
        `Other pages on the site (for internal linking): ${args.siteMap
          .map((p) => `${p.slug} — ${p.title}`)
          .join('; ')}`,
      ].join('\n'),
      maxTokens: 1500,
      budget,
    });
    return draft;
  } catch (err) {
    console.error('[seo-agent] generateOnPageTweak failed', err);
    return null;
  }
}

// --- validators ---------------------------------------------------------

function validateArticle(d: NewArticleDraft): NewArticleDraft | null {
  if (!d.title || !d.bodyMarkdown || !d.slug) return null;
  if (d.metaDescription && d.metaDescription.length > 200) {
    d.metaDescription = d.metaDescription.slice(0, 197) + '...';
  }
  if (!Array.isArray(d.suggestedInternalLinks)) d.suggestedInternalLinks = [];
  return d;
}

function validateMeta(d: MetaRewriteDraft): MetaRewriteDraft | null {
  if (!Array.isArray(d.alternatives) || d.alternatives.length === 0) return null;
  d.alternatives = d.alternatives
    .filter((a) => a.title && a.meta)
    .map((a) => ({
      title: a.title.length > 60 ? a.title.slice(0, 60) : a.title,
      meta: a.meta.length > 155 ? a.meta.slice(0, 152) + '...' : a.meta,
      rationale: a.rationale ?? '',
    }));
  return d.alternatives.length > 0 ? d : null;
}
