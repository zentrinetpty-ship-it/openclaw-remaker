import React from "react";
import { AbsoluteFill, Sequence, Audio, useVideoConfig } from "remotion";
import { Slide } from "./components/Slide";
import { AnimatedCaption } from "./components/AnimatedCaption";

export const ExplainerVideo = ({ slides = [], captionStyleId, bgmUrl, bgmVolume = 0.4 }) => {
  const { fps } = useVideoConfig();
  const TRANSITION_FRAMES = 15;

  let frameOffset = 0;
  const slideSequences = [];

  slides.forEach((slide, idx) => {
    const slideDurationFrames = (slide.duration || 6) * fps;
    const startFrame = frameOffset;

    slideSequences.push({
      ...slide,
      startFrame,
      durationFrames: slideDurationFrames,
      index: idx,
    });

    frameOffset += slideDurationFrames;
    if (idx < slides.length - 1) frameOffset -= TRANSITION_FRAMES;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a1a" }}>
      {slideSequences.map((slide, idx) => (
        <Sequence key={idx} from={slide.startFrame} durationInFrames={slide.durationFrames}>
          <Slide
            imageUrl={slide.imageUrl}
            transition={slide.transition || "fade"}
            durationInFrames={slide.durationFrames}
            isFirst={idx === 0}
            isLast={idx === slides.length - 1}
            transitionFrames={TRANSITION_FRAMES}
          />

          {slide.voiceUrl && (
            <Audio src={slide.voiceUrl} volume={1} />
          )}

          {captionStyleId && slide.narration && (
            <AnimatedCaption
              text={slide.narration}
              styleId={captionStyleId}
              durationInFrames={slide.durationFrames}
            />
          )}
        </Sequence>
      ))}

      {bgmUrl && (
        <Audio src={bgmUrl} volume={bgmVolume} loop />
      )}
    </AbsoluteFill>
  );
};
