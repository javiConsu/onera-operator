import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

// Single clean sans-serif — Inter is the closest to SF Pro available on Google Fonts
// Used at different weights for hierarchy, like Apple does with SF Pro
export const { fontFamily: sansFont } = loadInter("normal", {
  weights: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});
