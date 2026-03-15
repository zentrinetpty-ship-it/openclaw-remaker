import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const CAPTION_STYLES = {
  "bold-pop": { bg: "#FBBF24", color: "#000", fontWeight: 700, borderRadius: 8 },
  netflix: { bg: "transparent", color: "#fff", fontWeight: 700, textShadow: "2px 2px 4px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.6)" },
  minimal: { bg: "rgba(0,0,0,0.7)", color: "#fff", fontWeight: 400, borderRadius: 12 },
  tiktok: { bg: "#1a1a1a", color: "#FF2D55", fontWeight: 700, borderRadius: 8 },
  neon: { bg: "transparent", color: "#00F5FF", fontWeight: 700, textShadow: "0 0 10px #00F5FF, 0 0 20px #00F5FF, 0 0 40px #00F5FF" },
  glass: { bg: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 400, backdropFilter: "blur(8px)", borderRadius: 12 },
};

function splitIntoLines(text, maxWordsPerLine = 8) {
  const words = text.split(" ");
  const lines = [];
  let current = [];
  for (const word of words) {
    current.push(word);
    const joined = current.join(" ");
    if (current.length >= maxWordsPerLine || /[.!?;:]$/.test(word)) {
      lines.push(joined);
      current = [];
    }
  }
  if (current.length > 0) lines.push(current.join(" "));
  return lines;
}

function WordByWord({ text, style, durationInFrames, fontSize, fontFamily }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const framesPerWord = Math.max(3, Math.floor(durationInFrames / words.length));
  const currentWordIndex = Math.min(Math.floor(frame / framesPerWord), words.length - 1);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 10px", maxWidth: "80%", padding: style.bg !== "transparent" ? "14px 28px" : "14px 0", background: style.bg, borderRadius: style.borderRadius || 0, backdropFilter: style.backdropFilter || "none" }}>
      {words.map((word, i) => {
        const wordEnterFrame = i * framesPerWord;
        const isHighlighted = i <= currentWordIndex;
        const wordScale = spring({ frame: Math.max(0, frame - wordEnterFrame), fps, config: { damping: 50, stiffness: 300 }, durationInFrames: 8 });
        return (
          <span key={i} style={{ color: style.color, fontFamily, fontSize, fontWeight: style.fontWeight, textShadow: style.textShadow || "none", opacity: isHighlighted ? 1 : 0.3, transform: `scale(${interpolate(wordScale, [0, 1], [0.8, 1])})`, display: "inline-block" }}>
            {word}
          </span>
        );
      })}
    </div>
  );
}

function LineByLine({ text, style, durationInFrames, fontSize, fontFamily }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = splitIntoLines(text);
  const framesPerLine = Math.max(12, Math.floor(durationInFrames / lines.length));
  const currentLineIndex = Math.min(Math.floor(frame / framesPerLine), lines.length - 1);
  const currentLine = lines[currentLineIndex];
  const lineLocalFrame = frame - currentLineIndex * framesPerLine;

  const enterScale = spring({ frame: lineLocalFrame, fps, config: { damping: 40, stiffness: 250 }, durationInFrames: 10 });
  const enterOpacity = interpolate(lineLocalFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(lineLocalFrame, [framesPerLine - 8, framesPerLine], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ padding: style.bg !== "transparent" ? "14px 28px" : "14px 0", background: style.bg, borderRadius: style.borderRadius || 0, backdropFilter: style.backdropFilter || "none", textAlign: "center", maxWidth: "80%" }}>
      <span style={{ color: style.color, fontFamily, fontSize, fontWeight: style.fontWeight, textShadow: style.textShadow || "none", opacity: enterOpacity * exitOpacity, transform: `scale(${interpolate(enterScale, [0, 1], [0.9, 1])})`, display: "inline-block" }}>
        {currentLine}
      </span>
    </div>
  );
}

function Sentence({ text, style, durationInFrames, fontSize, fontFamily }) {
  const frame = useCurrentFrame();
  const enterOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const yOffset = interpolate(frame, [0, 15], [12, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ padding: style.bg !== "transparent" ? "16px 32px" : "16px 0", background: style.bg, borderRadius: style.borderRadius || 0, backdropFilter: style.backdropFilter || "none", textAlign: "center", maxWidth: "80%", opacity: enterOpacity * exitOpacity, transform: `translateY(${yOffset}px)` }}>
      <span style={{ color: style.color, fontFamily, fontSize, fontWeight: style.fontWeight, textShadow: style.textShadow || "none", lineHeight: 1.4 }}>
        {text}
      </span>
    </div>
  );
}

export const AnimatedCaption = ({
  text,
  styleId = "minimal",
  durationInFrames,
  captionMode = "words",
  customFont,
  customColor,
  customBgColor,
  position = "bottom",
  fontSize = 44,
}) => {
  const frame = useCurrentFrame();
  const baseStyle = CAPTION_STYLES[styleId] || CAPTION_STYLES.minimal;

  // Apply custom overrides
  const style = {
    ...baseStyle,
    ...(customColor ? { color: customColor } : {}),
    ...(customBgColor ? { bg: customBgColor } : {}),
  };

  const fontFamily = customFont
    ? `'${customFont}', 'Liberation Sans', Arial, sans-serif`
    : "'Liberation Sans', Arial, sans-serif";

  const containerOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOutOpacity = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Position mapping
  const positionStyles = {
    top: { justifyContent: "flex-start", padding: "80px 60px 0" },
    center: { justifyContent: "center", padding: "0 60px" },
    bottom: { justifyContent: "flex-end", padding: "0 60px 80px" },
  };

  const posStyle = positionStyles[position] || positionStyles.bottom;

  let CaptionComponent;
  if (captionMode === "lines") CaptionComponent = LineByLine;
  else if (captionMode === "sentence") CaptionComponent = Sentence;
  else CaptionComponent = WordByWord;

  return (
    <AbsoluteFill style={{ ...posStyle, alignItems: "center", opacity: containerOpacity * fadeOutOpacity }}>
      <CaptionComponent
        text={text}
        style={style}
        durationInFrames={durationInFrames}
        fontSize={fontSize}
        fontFamily={fontFamily}
      />
    </AbsoluteFill>
  );
};
