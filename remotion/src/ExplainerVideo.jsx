import React from "react";
import { AbsoluteFill, Sequence, Audio, useVideoConfig } from "remotion";
import { Slide } from "./components/Slide";
import { AnimatedCaption } from "./components/AnimatedCaption";
import { TitleCard, LowerThird, KineticText, StatCounter } from "./components/MotionGraphics";

const GraphicsOverlay = ({ graphics, durationInFrames, accentColor }) => {
  if (!graphics || graphics.length === 0) return null;

  return graphics.map((g, i) => {
    const startFrame = Math.round((g.startTime || 0) * 24);
    const gDuration = Math.round((g.duration || 3) * 24);

    const props = {
      ...g,
      accentColor: accentColor || "#7c3aed",
      durationInFrames: gDuration,
    };

    let Component;
    switch (g.type) {
      case "title-card": Component = TitleCard; break;
      case "lower-third": Component = LowerThird; break;
      case "kinetic-text": Component = KineticText; break;
      case "stat-counter": Component = StatCounter; break;
      default: return null;
    }

    return (
      <Sequence key={i} from={startFrame} durationInFrames={gDuration}>
        <Component {...props} />
      </Sequence>
    );
  });
};

export const ExplainerVideo = ({ slides = [], captionStyleId, captionMode = "words", bgmUrl, bgmVolume = 0.4, accentColor }) => {
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
              captionMode={captionMode}
            />
          )}

          <GraphicsOverlay
            graphics={slide.graphics}
            durationInFrames={slide.durationFrames}
            accentColor={accentColor}
          />
        </Sequence>
      ))}

      {bgmUrl && (
        <Audio src={bgmUrl} volume={bgmVolume} loop />
      )}
    </AbsoluteFill>
  );
};
