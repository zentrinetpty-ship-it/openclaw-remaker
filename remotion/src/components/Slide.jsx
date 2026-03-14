import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const TRANSITION_TYPES = {
  fade: { enter: "opacity", exit: "opacity" },
  slide: { enter: "translateX", exit: "translateX" },
  zoom: { enter: "scale", exit: "scale" },
  wipe: { enter: "clipPath", exit: "clipPath" },
  blur: { enter: "blur", exit: "blur" },
};

export const Slide = ({ imageUrl, transition = "fade", durationInFrames, isFirst, isLast, transitionFrames = 15 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ken Burns: slow zoom and pan
  const kenBurnsScale = interpolate(frame, [0, durationInFrames], [1.0, 1.15], { extrapolateRight: "clamp" });
  const kenBurnsPanX = interpolate(frame, [0, durationInFrames], [0, -15], { extrapolateRight: "clamp" });
  const kenBurnsPanY = interpolate(frame, [0, durationInFrames], [0, -8], { extrapolateRight: "clamp" });

  // Entry transition
  let enterOpacity = 1;
  let enterTransform = "";
  let enterFilter = "";
  let enterClipPath = "";

  if (!isFirst) {
    const enterProgress = interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const enterSpring = spring({ frame, fps, config: { damping: 80, stiffness: 200 }, durationInFrames: transitionFrames });

    switch (transition) {
      case "slide":
        enterTransform = `translateX(${interpolate(enterSpring, [0, 1], [100, 0])}%)`;
        break;
      case "zoom":
        enterOpacity = enterProgress;
        enterTransform = `scale(${interpolate(enterSpring, [0, 1], [0.5, 1])})`;
        break;
      case "wipe":
        enterClipPath = `inset(0 ${interpolate(enterProgress, [0, 1], [100, 0])}% 0 0)`;
        break;
      case "blur":
        enterOpacity = enterProgress;
        enterFilter = `blur(${interpolate(enterProgress, [0, 1], [20, 0])}px)`;
        break;
      case "fade":
      default:
        enterOpacity = enterProgress;
        break;
    }
  }

  // Exit transition
  let exitOpacity = 1;
  let exitTransform = "";
  let exitFilter = "";

  if (!isLast) {
    const exitStart = durationInFrames - transitionFrames;
    const exitAmount = interpolate(frame, [exitStart, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    switch (transition) {
      case "slide":
        exitTransform = `translateX(${interpolate(exitAmount, [0, 1], [0, -100])}%)`;
        exitOpacity = 1 - exitAmount;
        break;
      case "zoom":
        exitOpacity = 1 - exitAmount;
        exitTransform = `scale(${1 + exitAmount * 0.5})`;
        break;
      case "blur":
        exitOpacity = 1 - exitAmount;
        exitFilter = `blur(${exitAmount * 20}px)`;
        break;
      case "fade":
      default:
        exitOpacity = 1 - exitAmount;
        break;
    }
  }

  const opacity = enterOpacity * exitOpacity;
  const transform = `scale(${kenBurnsScale}) translate(${kenBurnsPanX}px, ${kenBurnsPanY}px) ${enterTransform} ${exitTransform}`.trim();
  const filter = [enterFilter, exitFilter].filter(Boolean).join(" ") || "none";
  const clipPath = enterClipPath || "none";

  return (
    <AbsoluteFill style={{ opacity, clipPath }}>
      {imageUrl ? (
        <Img
          src={imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform,
            filter,
          }}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            transform,
            filter,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
