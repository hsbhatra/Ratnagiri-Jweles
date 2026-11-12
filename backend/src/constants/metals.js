/**
 * Metals / finishes a piece can be made in. Provisional until the owner confirms the
 * exact list (OWNER_QUESTIONS.md) — editing this list is all it takes to change them.
 */
export const METALS = [
  { slug: '925-sterling-silver', name: '925 Sterling Silver' },
  { slug: 'gold-plated-silver', name: 'Gold-plated Silver' },
  { slug: 'rose-gold-plated-silver', name: 'Rose Gold-plated Silver' },
  { slug: 'rhodium-plated-silver', name: 'Rhodium-plated Silver' },
  { slug: 'oxidised-silver', name: 'Oxidised Silver' },
]

export const METAL_SLUGS = METALS.map((m) => m.slug)
