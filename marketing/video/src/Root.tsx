import React from 'react';
import { Composition, Still } from 'remotion';
import './fonts';
import { Intro } from './Intro';
import { Thumbnail } from './Thumbnail';
import { DURATION, FPS } from './lib/narration';

export const Root: React.FC = () => (
  <>
    <Composition id="Intro" component={Intro} durationInFrames={Math.round(DURATION * FPS)} fps={FPS} width={1920} height={1080}
      defaultProps={{}} />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
  </>
);
