import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Sequence,
} from "remotion";
import { C } from "../colors";
import { sansFont } from "../fonts";

/**
 * Scene 4 — Capabilities
 *
 * Each capability gets its own beat. One word/phrase appears huge,
 * with a quiet descriptor below it. No cards, no icons.
 * Just kinetic typography on black — each replacing the last.
 *
 * Think: Apple "Shot on iPhone" or "M1" chip reveals.
 */

type Capability = {
  word: string;
  detail: string;
};

const CAPABILITIES: Capability[] = [
  {
    word: "Outreach",
    detail: "Finds leads. Writes emails. Sends them. Every day.",
  },
  {
    word: "Social",
    detail: "Posts on-brand content to Twitter. Consistently. Effortlessly.",
  },
  {
    word: "Research",
    detail: "Monitors competitors, markets, and trends in real time.",
  },
  {
    word: "Planning",
    detail: "Coordinates every agent. Prioritizes what matters.",
  },
];

const CapabilityBeat = ({ cap }: { cap: Capability }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big word entrance
  const wordOpacity = interpolate(frame, [0.1 * fps, 0.7 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const wordY = interpolate(frame, [0.1 * fps, 0.7 * fps], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Detail line
  const detailOpacity = interpolate(frame, [0.6 * fps, 1.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const detailY = interpolate(frame, [0.6 * fps, 1.2 * fps], [14, 0], {
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
          gap: 20,
        }}
      >
        <div
          style={{
            fontFamily: sansFont,
            fontSize: 100,
            fontWeight: 700,
            color: C.white,
            letterSpacing: "-0.03em",
            opacity: wordOpacity,
            transform: `translateY(${wordY}px)`,
          }}
        >
          {cap.word}
        </div>
        <div
          style={{
            fontFamily: sansFont,
            fontSize: 26,
            fontWeight: 400,
            color: C.gray,
            textAlign: "center",
            maxWidth: 650,
            lineHeight: 1.4,
            opacity: detailOpacity,
            transform: `translateY(${detailY}px)`,
          }}
        >
          {cap.detail}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const FeaturesScene = () => {
  const { fps } = useVideoConfig();
  const beatDuration = Math.round(2.5 * fps); // 2.5s per capability

  return (
    <AbsoluteFill>
      {CAPABILITIES.map((cap, i) => (
        <Sequence
          key={i}
          from={i * beatDuration}
          durationInFrames={beatDuration}
        >
          <CapabilityBeat cap={cap} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
