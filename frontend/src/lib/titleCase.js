/** "london-blue-topaz" -> "London Blue Topaz" (stone, metal and collection slugs) */
export const titleCase = (slug) => String(slug).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
