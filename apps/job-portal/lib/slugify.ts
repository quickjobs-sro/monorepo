/** Maps Czech (and Slovak) diacritical characters to ASCII equivalents. */
const DIACRITICS_MAP: Record<string, string> = {
    "\u00e1": "a", "\u010d": "c", "\u010f": "d", "\u00e9": "e", "\u011b": "e",
    "\u00ed": "i", "\u0148": "n", "\u00f3": "o", "\u0159": "r", "\u0161": "s",
    "\u0165": "t", "\u00fa": "u", "\u016f": "u", "\u00fd": "y", "\u017e": "z",
    "\u00c1": "a", "\u010c": "c", "\u010e": "d", "\u00c9": "e", "\u011a": "e",
    "\u00cd": "i", "\u0147": "n", "\u00d3": "o", "\u0158": "r", "\u0160": "s",
    "\u0164": "t", "\u00da": "u", "\u016e": "u", "\u00dd": "y", "\u017d": "z",
};

/** Returns a URL-safe, SEO-friendly slug from an arbitrary string. */
export function slugify(name: string): string {
    return name
        .split("")
        .map((c) => DIACRITICS_MAP[c] ?? c)
        .join("")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

