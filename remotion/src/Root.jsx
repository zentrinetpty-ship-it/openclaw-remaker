import React from "react";
import { Composition } from "remotion";
import { ExplainerVideo } from "./ExplainerVideo";

export const Root = () => {
  return (
    <Composition
      id="ExplainerVideo"
      component={ExplainerVideo}
      width={1920}
      height={1080}
      fps={24}
      durationInFrames={240}
      defaultProps={{
        slides: [],
        captionStyleId: null,
        captionMode: "words",
        captionFont: null,
        captionColor: null,
        captionBgColor: null,
        captionPosition: "bottom",
        captionSize: 44,
        bgmUrl: null,
        bgmVolume: 0.4,
        musicTracks: [],
      }}
      calculateMetadata={({ props }) => {
        const fps = 24;
        const transitionFrames = 15;
        const slides = props.slides || [];
        let totalFrames = 0;
        slides.forEach((s, idx) => {
          totalFrames += (s.duration || 6) * fps;
          if (idx < slides.length - 1) totalFrames -= transitionFrames;
        });
        return { durationInFrames: Math.round(Math.max(totalFrames, 1)), fps, width: 1920, height: 1080 };
      }}
    />
  );
};
