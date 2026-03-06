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
 * Scene 5 — CTA
 *
 * Clean, confident close. "Start operating smarter."
 * The URL appears below — no button, no box, just the URL underlined.
 * Then the brand mark + handle at the bottom, very subtle.
 *
 * Apple-style: quiet confidence. The product speaks for itself.
 */
export const CTAScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Headline
  const headOpacity = interpolate(frame, [0.3 * fps, 1.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const headScale = interpolate(frame, [0.3 * fps, 1.2 * fps], [0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // URL
  const urlOpacity = interpolate(frame, [1.6 * fps, 2.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const urlY = interpolate(frame, [1.6 * fps, 2.4 * fps], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Bottom info
  const bottomOpacity = interpolate(frame, [2.8 * fps, 3.6 * fps], [0, 1], {
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
          gap: 36,
        }}
      >
        {/* Headline */}
        <div
          style={{
            fontFamily: sansFont,
            fontSize: 72,
            fontWeight: 600,
            color: C.white,
            textAlign: "center",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            opacity: headOpacity,
            transform: `scale(${headScale})`,
          }}
        >
          Start operating smarter.
        </div>

        {/* URL */}
        <div
          style={{
            fontFamily: sansFont,
            fontSize: 24,
            fontWeight: 500,
            color: C.accent,
            letterSpacing: "0.02em",
            opacity: urlOpacity,
            transform: `translateY(${urlY}px)`,
          }}
        >
          operator.onera.chat
        </div>
      </div>

      {/* Bottom: handle + contact */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          display: "flex",
          gap: 48,
          opacity: bottomOpacity,
        }}
      >
        <div
          style={{
            fontFamily: sansFont,
            fontSize: 15,
            fontWeight: 400,
            color: C.gray,
          }}
        >
          @onerachat
        </div>
        <div
          style={{
            fontFamily: sansFont,
            fontSize: 15,
            fontWeight: 400,
            color: C.gray,
          }}
        >
          contact@onera.chat
        </div>
      </div>
    </AbsoluteFill>
  );
};
