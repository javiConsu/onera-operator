import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { C } from "../colors";
import { sansFont } from "../fonts";

/**
 * Scene 1 — Logo Reveal
 *
 * Pure black. A thin horizontal line draws across center.
 * The word "onera" fades up through it — large, light, confident.
 * Then the tagline appears below, small and gray.
 *
 * Think: Apple Watch reveal, or a YC Demo Day title card.
 */
export const LogoReveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Line draws from center outward (0 → 160px half-width) ---
  const lineProgress = interpolate(frame, [0.4 * fps, 1.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const lineHalfWidth = lineProgress * 160;

  // --- Logo "onera" fades up ---
  const logoOpacity = interpolate(frame, [0.8 * fps, 1.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const logoY = interpolate(frame, [0.8 * fps, 1.8 * fps], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // --- Tagline fades in ---
  const tagOpacity = interpolate(frame, [2.0 * fps, 2.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const tagY = interpolate(frame, [2.0 * fps, 2.8 * fps], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.black,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          fontFamily: sansFont,
          fontSize: 96,
          fontWeight: 600,
          color: C.white,
          letterSpacing: "-0.03em",
          opacity: logoOpacity,
          transform: `translateY(${logoY}px)`,
        }}
      >
        onera
      </div>

      {/* Thin line */}
      <div
        style={{
          width: lineHalfWidth * 2,
          height: 1,
          backgroundColor: C.faintWhite,
          marginTop: 28,
          marginBottom: 28,
        }}
      />

      {/* Tagline */}
      <div
        style={{
          fontFamily: sansFont,
          fontSize: 20,
          fontWeight: 400,
          color: C.gray,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
        }}
      >
        The Autonomous Startup Operator
      </div>
    </AbsoluteFill>
  );
};
