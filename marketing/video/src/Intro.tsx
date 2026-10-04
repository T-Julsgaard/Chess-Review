import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Brand } from './scenes/Brand';
import { Hook } from './scenes/Hook';
import { OneClick } from './scenes/OneClick';
import { EndCard, Trust } from './scenes/Outro';
import { Personal } from './scenes/Personal';
import { Practice } from './scenes/Practice';
import { Review } from './scenes/Review';
import type { Stem } from './Soundtrack';
import { Soundtrack } from './Soundtrack';
import { DURATION, FPS } from './lib/narration';
import { C } from './theme';

// Warm dark ground with a faint green light behind the action, as in the store screenshots.
const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(1200px 800px at 62% 45%, rgba(127,180,95,0.07), rgba(127,180,95,0) 70%), ${C.bg}` }}>
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)' }} />
  </AbsoluteFill>
);

export type IntroProps = { stem?: Stem };
export const Intro: React.FC<IntroProps> = ({ stem }) => {
  const t = useCurrentFrame() / FPS;
  const fadeIn = interpolate(t, [0, 0.45], [1, 0], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <Backdrop />
      {t < 10.1 && <Hook t={t} />}
      {t >= 9.9 && t < 17.4 && <Brand t={t} />}
      {t >= 16.9 && t < 23.1 && <OneClick t={t} />}
      {t >= 22.7 && t < 46.4 && <Review t={t} />}
      {t >= 45.9 && t < 53.5 && <Practice t={t} />}
      {t >= 53.3 && t < 57.5 && <Personal t={t} />}
      {t >= 57.3 && t < 60.9 && <Trust t={t} />}
      {t >= 60.5 && <EndCard t={t} duration={DURATION} />}
      <AbsoluteFill style={{ background: '#000', opacity: fadeIn, pointerEvents: 'none' }} />
      <Soundtrack stem={stem} />
    </AbsoluteFill>
  );
};
