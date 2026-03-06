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
 * Scene 3 — The Solution: "What if you didn't have to?"
 *
 * Big cinematic reveal. The transition from problem to answer.
 * One massive line, then "Onera" appears in accent blue,
 * followed by a clean one-liner describing what it does.
 *
 * Think Apple: "This changes everything. Again."
 */
export const SolutionScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "What if you didn't have to?"
  const hookOpacity = interpolate(frame, [0.2 * fps, 1.0 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const hookY = interpolate(frame, [0.2 * fps, 1.0 * fps], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  // Dim hook when answer appears
  const hookDim = interpolate(frame, [2.6 * fps, 3.2 * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "Onera" big reveal
  const brandOpacity = interpolate(frame, [2.8 * fps, 3.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const brandScale = interpolate(frame, [2.8 * fps, 3.6 * fps], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Description line
  const descOpacity = interpolate(frame, [4.0 * fps, 4.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const descY = interpolate(frame, [4.0 * fps, 4.8 * fps], [16, 0], {
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Hook question — fades out */}
        <div
          style={{
            fontFamily: sansFont,
            fontSize: 56,
            fontWeight: 300,
            color: C.white,
            textAlign: "center",
            opacity: hookOpacity * hookDim,
            transform: `translateY(${hookY}px)`,
            position: "absolute",
          }}
        >
          What if you didn't have to?
        </div>

        {/* Brand name — massive */}
        <div
          style={{
            fontFamily: sansFont,
            fontSize: 140,
            fontWeight: 700,
            color: C.white,
            letterSpacing: "-0.04em",
            textAlign: "center",
            opacity: brandOpacity,
            transform: `scale(${brandScale})`,
          }}
        >
          onera
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: sansFont,
            fontSize: 28,
            fontWeight: 400,
            color: C.gray,
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.5,
            marginTop: 24,
            opacity: descOpacity,
            transform: `translateY(${descY}px)`,
          }}
        >
          AI agents that run your outreach, social, research,
          <br />
          and growth — autonomously.
        </div>
      </div>
    </AbsoluteFill>
  );
};
