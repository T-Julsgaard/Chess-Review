// The supplied PNG is the single source for every thumbnail preview and export.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';

export const Thumbnail: React.FC = () => (
  <AbsoluteFill>
    <Img src={staticFile('shared/chess-review-thumbnail.png')} style={{ width: '100%', height: '100%' }} />
  </AbsoluteFill>
);
