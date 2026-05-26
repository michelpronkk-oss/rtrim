import React from "react";
import { Composition } from "remotion";
import { RunTrimDemo } from "./RunTrimDemo";
import { SocialRoot } from "./social/SocialRoot";

// Total duration: 750 frames = 25 seconds at 30fps
const DURATION = 870;
const FPS      = 30;

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="RunTrimDemoLandscape"
        component={RunTrimDemo}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ mode: "landscape" as const }}
      />
      <Composition
        id="RunTrimDemoSquare"
        component={RunTrimDemo}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={{ mode: "square" as const }}
      />
      <SocialRoot />
    </>
  );
}
