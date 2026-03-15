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

const SlideTitleOverlay = ({ title, position = "bottom-center", durationInFrames }) => {
  if (!title || position === "hidden") return null;

  const isTop = position.includes("top");
  const isLeft = position.includes("left");

  const positionStyle = {
    position: "absolute",
    left: isLeft ? 40 : "50%",
    transform: isLeft ? "none" : "translateX(-50%)",
    ...(isTop ? { top: 40 } : { bottom: 60 }),
  };

  return (
    <div style={positionStyle}>
      <div style={{
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        padding: "8px 20px",
        borderRadius: 4,
      }}>
        <span style={{
          color: "#fff",
          fontSize: 28,
          fontWeight: 700,
          fontFamily: "'Liberation Sans', Arial, sans-serif",
        }}>
          {title}
        </span>
      </div>
    </div>
  );
};

export const ExplainerVideo = ({
  slides = [],
  captionStyleId,
  captionMode = "words",
  captionFont,
  captionColor,
  captionBgColor,
  captionPosition = "bottom",
  captionSize = 44,
  bgmUrl,
  bgmVolume = 0.4,
  accentColor,
}) => {
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

          {slide.sfxUrl && (
            <Audio src={slide.sfxUrl} volume={0.7} />
          )}

          {captionStyleId && slide.narration && (
            <AnimatedCaption
              text={slide.narration}
              styleId={captionStyleId}
              durationInFrames={slide.durationFrames}
              captionMode={captionMode}
              customFont={captionFont}
              customColor={captionColor}
              customBgColor={captionBgColor}
              position={captionPosition}
              fontSize={captionSize}
            />
          )}

          <SlideTitleOverlay
            title={slide.title}
            position={slide.titlePosition}
            durationInFrames={slide.durationFrames}
          />

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
