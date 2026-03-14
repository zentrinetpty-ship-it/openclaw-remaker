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

export const AnimatedCaption = ({ text, styleId = "minimal", durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = CAPTION_STYLES[styleId] || CAPTION_STYLES.minimal;

  const words = text.split(" ");
  const framesPerWord = Math.max(3, Math.floor(durationInFrames / words.length));

  // Fade in the caption container
  const containerOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  // Fade out near the end
  const fadeOutOpacity = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Word-by-word highlight
  const currentWordIndex = Math.min(Math.floor(frame / framesPerWord), words.length - 1);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 60px 80px" }}>
      <div
        style={{
          opacity: containerOpacity * fadeOutOpacity,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "6px 10px",
          maxWidth: "80%",
          padding: style.bg !== "transparent" ? "14px 28px" : "14px 0",
          background: style.bg,
          borderRadius: style.borderRadius || 0,
          backdropFilter: style.backdropFilter || "none",
        }}
      >
        {words.map((word, i) => {
          const wordEnterFrame = i * framesPerWord;
          const isHighlighted = i <= currentWordIndex;
          const wordScale = spring({
            frame: Math.max(0, frame - wordEnterFrame),
            fps,
            config: { damping: 50, stiffness: 300 },
            durationInFrames: 8,
          });
          const wordOpacity = isHighlighted ? 1 : 0.3;

          return (
            <span
              key={i}
              style={{
                color: style.color,
                fontFamily: "'Liberation Sans', Arial, sans-serif",
                fontSize: 44,
                fontWeight: style.fontWeight,
                textShadow: style.textShadow || "none",
                opacity: wordOpacity,
                transform: `scale(${interpolate(wordScale, [0, 1], [0.8, 1])})`,
                display: "inline-block",
                transition: "opacity 0.1s",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
