export type Transition = "fade" | "dissolve" | "wipeleft" | "wiperight" | "slideleft" | "slideright";

const TRANSITIONS: Transition[] = ["fade", "dissolve", "wipeleft", "wiperight", "slideleft", "slideright"];

export const TRANSITION_DURATION = 0.5; // seconds

export function randomTransition(seed: number): Transition {
  return TRANSITIONS[seed % TRANSITIONS.length]!;
}

/**
 * Builds ffmpeg filter_complex for N video+audio streams with crossfade transitions.
 *
 * xfade offset = cumulative_duration_of_preceding_clips - transition_duration
 * acrossfade handles the audio crossfade symmetrically.
 *
 * Returns { filterComplex, videoOut, audioOut } where videoOut/audioOut are
 * the final stream labels to map into the output.
 */
export function buildConcatFilter(
  clipDurations: number[],  // per-clip duration in seconds
  transitions?: Transition[],
): { filterComplex: string; videoOut: string; audioOut: string } {
  const n = clipDurations.length;
  if (n === 1) {
    return { filterComplex: "", videoOut: "0:v", audioOut: "0:a" };
  }

  const td = TRANSITION_DURATION;
  const parts: string[] = [];
  let cumulativeDur = 0;
  let prevV = "0:v";
  let prevA = "0:a";

  for (let i = 0; i < n - 1; i++) {
    const transition = transitions?.[i] ?? randomTransition(i);
    const offset = Math.max(0, cumulativeDur + clipDurations[i]! - td);
    cumulativeDur += clipDurations[i]! - td;

    const vOut = i === n - 2 ? "vfinal" : `v${i}`;
    const aOut = i === n - 2 ? "afinal" : `a${i}`;
    const nextV = `${i + 1}:v`;
    const nextA = `${i + 1}:a`;

    parts.push(
      `[${prevV}][${nextV}]xfade=transition=${transition}:duration=${td}:offset=${offset.toFixed(3)}[${vOut}]`,
    );
    parts.push(
      `[${prevA}][${nextA}]acrossfade=d=${td}[${aOut}]`,
    );

    prevV = vOut;
    prevA = aOut;
  }

  return {
    filterComplex: parts.join(";"),
    videoOut: "vfinal",
    audioOut: "afinal",
  };
}
