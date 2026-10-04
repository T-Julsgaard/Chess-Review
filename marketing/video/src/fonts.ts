// Inter and Fira Mono come from the extension's own fonts/ folder (SIL OFL), copied into
// public/shared by tools/prepare-assets.mjs. No network fonts.
import { continueRender, delayRender, staticFile } from 'remotion';

const faces = [
  new FontFace('Inter', `url(${staticFile('shared/fonts/inter.ttf')})`, { weight: '100 900' }),
  new FontFace('Fira Mono', `url(${staticFile('shared/fonts/firamono.ttf')})`, { weight: '400' }),
];
const handle = delayRender('Loading fonts');
Promise.all(faces.map((f) => f.load()))
  .then((loaded) => {
    loaded.forEach((f) => document.fonts.add(f));
    continueRender(handle);
  })
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
