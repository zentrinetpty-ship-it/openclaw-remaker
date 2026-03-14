import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const TitleCard = ({ title, subtitle, color = "#fff", accentColor = "#7c3aed", durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineWidth = spring({ frame, fps, config: { damping: 30, stiffness: 100 }, durationInFrames: 30 });
  const titleY = interpolate(spring({ frame, fps, config: { damping: 40, stiffness: 150 }, durationInFrames: 25 }), [0, 1], [40, 0]);
  const titleOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", opacity: exitOpacity }}>
        <div style={{ width: `${lineWidth * 200}px`, height: 3, background: accentColor, margin: "0 auto 24px", borderRadius: 2 }} />
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
          <h1 style={{ fontFamily: "'Liberation Sans', Arial, sans-serif", fontSize: 72, fontWeight: 800, color, margin: 0, lineHeight: 1.1, letterSpacing: -2 }}>
            {title}
          </h1>
        </div>
        {subtitle && (
          <p style={{ fontFamily: "'Liberation Sans', Arial, sans-serif", fontSize: 28, fontWeight: 400, color: `${color}99`, marginTop: 16, opacity: subtitleOpacity, letterSpacing: 1 }}>
            {subtitle}
          </p>
        )}
        <div style={{ width: `${lineWidth * 200}px`, height: 3, background: accentColor, margin: "24px auto 0", borderRadius: 2 }} />
      </div>
    </AbsoluteFill>
  );
};

export const LowerThird = ({ name, title, accentColor = "#7c3aed", durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({ frame, fps, config: { damping: 30, stiffness: 120 }, durationInFrames: 20 });
  const barWidth = interpolate(slideIn, [0, 1], [0, 100]);
  const textOpacity = interpolate(frame, [10, 20], [0, 1], { extrapolateRight: "clamp" });
  const exitSlide = interpolate(frame, [durationInFrames - 15, durationInFrames], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 80px 120px" }}>
      <div style={{ transform: `translateX(-${exitSlide}%)` }}>
        <div style={{ width: `${barWidth}%`, maxWidth: 500, height: 4, background: accentColor, borderRadius: 2, marginBottom: 12 }} />
        <div style={{ opacity: textOpacity }}>
          <p style={{ fontFamily: "'Liberation Sans', Arial, sans-serif", fontSize: 36, fontWeight: 700, color: "#fff", margin: 0, textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}>
            {name}
          </p>
          {title && (
            <p style={{ fontFamily: "'Liberation Sans', Arial, sans-serif", fontSize: 22, fontWeight: 400, color: "#ffffffcc", margin: "4px 0 0", textShadow: "1px 1px 4px rgba(0,0,0,0.8)" }}>
              {title}
            </p>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const KineticText = ({ text, color = "#fff", accentColor = "#7c3aed", durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  const exitOpacity = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exitOpacity }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px", maxWidth: "85%", padding: "0 40px" }}>
        {words.map((word, i) => {
          const delay = i * 3;
          const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 25, stiffness: 200, mass: 0.8 }, durationInFrames: 15 });
          const rotation = interpolate(s, [0, 1], [-8, 0]);
          const scale = interpolate(s, [0, 1], [0.3, 1]);
          const opacity = interpolate(s, [0, 1], [0, 1]);
          const isAccent = i % 4 === 1;
          return (
            <span key={i} style={{ fontFamily: "'Liberation Sans', Arial, sans-serif", fontSize: 64, fontWeight: 800, color: isAccent ? accentColor : color, display: "inline-block", transform: `scale(${scale}) rotate(${rotation}deg)`, opacity, textShadow: "2px 4px 12px rgba(0,0,0,0.5)" }}>
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const StatCounter = ({ value, label, suffix = "", prefix = "", color = "#fff", accentColor = "#7c3aed", durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const countProgress = spring({ frame, fps, config: { damping: 40, stiffness: 80 }, durationInFrames: 40 });
  const numericValue = parseFloat(value) || 0;
  const currentValue = Math.round(numericValue * countProgress);
  const scaleIn = spring({ frame, fps, config: { damping: 30, stiffness: 150 }, durationInFrames: 20 });
  const exitOpacity = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exitOpacity }}>
      <div style={{ textAlign: "center", transform: `scale(${interpolate(scaleIn, [0, 1], [0.5, 1])})` }}>
        <p style={{ fontFamily: "'Liberation Sans', Arial, sans-serif", fontSize: 120, fontWeight: 800, color: accentColor, margin: 0, lineHeight: 1, letterSpacing: -4 }}>
          {prefix}{currentValue.toLocaleString()}{suffix}
        </p>
        {label && (
          <p style={{ fontFamily: "'Liberation Sans', Arial, sans-serif", fontSize: 32, fontWeight: 400, color: `${color}cc`, marginTop: 12, letterSpacing: 2, textTransform: "uppercase" }}>
            {label}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
