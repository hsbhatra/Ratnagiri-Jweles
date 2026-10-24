/**
 * Gemstones RatnaGiri Jewels sets in its (mainly silver) pieces — supplied by the owner.
 * Single source of truth for the catalog (Module 3): product `stones[]` are validated
 * against these slugs, and the storefront's "shop by stone" / colour filters read it via
 * the API. `colour` groups stones for the colour filter.
 */
export const GEMS = [
  { slug: 'alexandrite', name: 'Alexandrite', colour: 'colour-change' },
  { slug: 'amethyst', name: 'Amethyst', colour: 'purple' },
  { slug: 'aquamarine', name: 'Aquamarine', colour: 'blue' },
  { slug: 'ametrine', name: 'Ametrine', colour: 'multi' },
  { slug: 'blue-sapphire', name: 'Blue Sapphire', colour: 'blue' },
  { slug: 'blue-topaz', name: 'Blue Topaz', colour: 'blue' },
  { slug: 'black-onyx', name: 'Black Onyx', colour: 'black' },
  { slug: 'citrine', name: 'Citrine', colour: 'yellow' },
  { slug: 'champagne-quartz', name: 'Champagne Quartz', colour: 'brown' },
  { slug: 'clear-quartz', name: 'Clear Quartz', colour: 'clear' },
  { slug: 'cubic-zirconia', name: 'Cubic Zirconia', colour: 'clear' },
  { slug: 'diopside', name: 'Diopside', colour: 'green' },
  { slug: 'emerald', name: 'Emerald', colour: 'green' },
  { slug: 'green-amethyst', name: 'Green Amethyst', colour: 'green' },
  { slug: 'green-tourmaline', name: 'Green Tourmaline', colour: 'green' },
  { slug: 'iolite', name: 'Iolite', colour: 'blue' },
  { slug: 'london-blue-topaz', name: 'London Blue Topaz', colour: 'blue' },
  { slug: 'mint-green', name: 'Mint Green', colour: 'green' }, // TODO confirm full name with owner
  { slug: 'morganite', name: 'Morganite', colour: 'pink' },
  { slug: 'moissanite', name: 'Moissanite', colour: 'clear' },
  { slug: 'moonstone', name: 'Moonstone', colour: 'white' },
  { slug: 'moss-agate', name: 'Moss Agate', colour: 'green' },
  { slug: 'rainbow-opal', name: 'Rainbow Opal', colour: 'multi' },
  { slug: 'peridot', name: 'Peridot', colour: 'green' },
  { slug: 'pink-tourmaline', name: 'Pink Tourmaline', colour: 'pink' },
  { slug: 'paraiba-tourmaline', name: 'Paraiba Tourmaline', colour: 'blue' },
  { slug: 'red-garnet', name: 'Red Garnet', colour: 'red' },
  { slug: 'ruby', name: 'Ruby', colour: 'red' },
  { slug: 'smoky-quartz', name: 'Smoky Quartz', colour: 'brown' },
  { slug: 'teal-sapphire', name: 'Teal Sapphire', colour: 'blue' },
  { slug: 'tanzanite', name: 'Tanzanite', colour: 'purple' },
  { slug: 'tsavorite-garnet', name: 'Tsavorite Garnet', colour: 'green' },
]

export const GEM_SLUGS = GEMS.map((g) => g.slug)
