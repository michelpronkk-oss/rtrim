import React from "react";
import { Composition } from "remotion";
import { XPost }    from "./XPost";
import { IGSquare } from "./IGSquare";
import { X_POSTS, IG_SQUARES } from "./content";

// Remotion's LooseComponentType requires Record<string,unknown>-compatible props.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const XPostComp    = XPost    as React.ComponentType<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IGSquareComp = IGSquare as React.ComponentType<any>;

// Still images: 1 frame each. Export with: remotion render … --still=0
const FPS = 30;

export function SocialRoot() {
  return (
    <>
      {/* ── X / Twitter — 1600×900 ──────────────────────────────────────── */}
      {X_POSTS.map((post) => (
        <Composition
          key={post.compositionId}
          id={post.compositionId}
          component={XPostComp}
          durationInFrames={1}
          fps={FPS}
          width={1600}
          height={900}
          defaultProps={post}
        />
      ))}

      {/* ── X / Twitter — 1200×675 (smaller canvas, same content) ──────── */}
      {X_POSTS.map((post) => (
        <Composition
          key={`${post.compositionId}-SM`}
          id={`${post.compositionId}-SM`}
          component={XPostComp}
          durationInFrames={1}
          fps={FPS}
          width={1200}
          height={675}
          defaultProps={post}
        />
      ))}

      {/* ── Instagram square — 1080×1080 ────────────────────────────────── */}
      {IG_SQUARES.map((post) => (
        <Composition
          key={post.compositionId}
          id={post.compositionId}
          component={IGSquareComp}
          durationInFrames={1}
          fps={FPS}
          width={1080}
          height={1080}
          defaultProps={post}
        />
      ))}
    </>
  );
}
