import { loadFont as loadGeist,    fontFamily as geistFamily    } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono, fontFamily as geistMonoFamily } from "@remotion/google-fonts/GeistMono";

// Load at module level so fonts are ready before any frame renders
loadGeist("normal",    { weights: ["400", "500", "600", "700", "800", "900"], subsets: ["latin"] });
loadGeistMono("normal", { weights: ["400", "500"],                             subsets: ["latin"] });

export const FONT_SANS_FAMILY = geistFamily;    // "Geist"
export const FONT_MONO_FAMILY = geistMonoFamily; // "Geist Mono"
