import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { LogoReveal } from "./scenes/LogoReveal";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { FeaturesScene } from "./scenes/FeaturesScene";
import { CTAScene } from "./scenes/CTAScene";

/**
 * Main composition — Apple-style startup launch video.
 *
 * All black. Clean sans-serif type. Generous pacing.
 * Each scene fades into the next — no slides, no wipes.
 * Every transition is a slow fade because confidence is quiet.
 *
 * Timeline (30s @ 30fps = 900 frames):
 *   0:00 - 0:04  Logo reveal (4s)
 *   0:04 - 0:09  Problem (5s)
 *   0:09 - 0:15  Solution reveal (6s)
 *   0:15 - 0:25  Capabilities — 4 beats x 2.5s (10s)
 *   0:25 - 0:30  CTA (5s)
 */
export const OneraPromo = () => {
  const { fps } = useVideoConfig();
  const fadeDuration = Math.round(0.8 * fps); // 0.8s fades — slow, cinematic

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <TransitionSeries>
        {/* Scene 1: Logo */}
        <TransitionSeries.Sequence durationInFrames={4 * fps}>
          <LogoReveal />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: fadeDuration })}
        />

        {/* Scene 2: Problem */}
        <TransitionSeries.Sequence durationInFrames={5 * fps}>
          <ProblemScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: fadeDuration })}
        />

        {/* Scene 3: Solution */}
        <TransitionSeries.Sequence durationInFrames={6 * fps}>
          <SolutionScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: fadeDuration })}
        />

        {/* Scene 4: Capabilities (4 x 2.5s = 10s) */}
        <TransitionSeries.Sequence durationInFrames={10 * fps}>
          <FeaturesScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: fadeDuration })}
        />

        {/* Scene 5: CTA */}
        <TransitionSeries.Sequence durationInFrames={5 * fps}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
