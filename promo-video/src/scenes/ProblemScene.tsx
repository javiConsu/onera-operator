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
 * Scene 2 — The Problem
 *
 * Three short punchy lines appear one after another, centered.
 * Each line fades up with a slight Y offset, then the previous dims.
 * No bullet points, no icons, no cards.
 * Just stark white text on black that tells a story.
 */

const LINES = [
  "You're the founder.",
  "The marketer. The SDR. The content team.",
  "You can't scale what only you can do.",
];

export const ProblemScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
          gap: 16,
        }}
      >
        {LINES.map((line, i) => {
          const enterStart = (0.3 + i * 1.4) * fps;
          const enterEnd = enterStart + 0.7 * fps;

          const opacity = interpolate(frame, [enterStart, enterEnd], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          });

          const y = interpolate(frame, [enterStart, enterEnd], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          });

          // Previous lines dim when next appears (last line stays bright)
          const isLast = i === LINES.length - 1;
          let dimFactor = 1;
          if (!isLast) {
            const dimStart = enterEnd + 0.6 * fps;
            const dimEnd = dimStart + 0.4 * fps;
            dimFactor = interpolate(frame, [dimStart, dimEnd], [1, 0.35], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
          }

          const finalOpacity = opacity * dimFactor;

          return (
            <div
              key={i}
              style={{
                fontFamily: sansFont,
                fontSize: i === 2 ? 56 : 48,
                fontWeight: i === 2 ? 600 : 300,
                color: i === 2 ? C.white : C.white,
                textAlign: "center",
                lineHeight: 1.3,
                opacity: finalOpacity,
                transform: `translateY(${y}px)`,
                maxWidth: 1200,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
