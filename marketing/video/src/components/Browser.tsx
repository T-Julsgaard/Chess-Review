import React from 'react';
import { Img, staticFile } from 'remotion';
import type { Cam } from '../lib/camera';
import { rectToScreen } from '../lib/camera';
import { PAGE } from '../lib/captures';
import { C, FONT } from '../theme';

const BAR = 40; // title bar height, page pixels

// A plain browser window around a full-page capture. It lives in page coordinates, so the
// camera moves over it like a physical window and a close-up pushes the frame out of view.
export const Browser: React.FC<{ cam: Cam; children: React.ReactNode; opacity?: number; title?: string }> = ({
  cam, children, opacity = 1, title = 'Chess Review',
}) => {
  const outer = rectToScreen(cam, { x: 0, y: -BAR, w: PAGE.w, h: PAGE.h + BAR });
  const page = rectToScreen(cam, { x: 0, y: 0, w: PAGE.w, h: PAGE.h });
  const k = cam.k;
  return (
    <div style={{ position: 'absolute', left: outer.x, top: outer.y, width: outer.w, height: outer.h, borderRadius: 16 * k, overflow: 'hidden',
      opacity, background: '#1c1b18', boxShadow: '0 0 0 1.5px rgba(255,255,255,0.08), 0 60px 140px -50px rgba(0,0,0,0.95)' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: outer.w, height: BAR * k, background: '#141310', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 9 * k, padding: `0 ${18 * k}px`, alignSelf: 'center' }}>
          {['#4a4842', '#4a4842', '#4a4842'].map((c, i) => (
            <div key={i} style={{ width: 12 * k, height: 12 * k, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ height: 31 * k, width: 230 * k, marginLeft: 8 * k, borderRadius: `${10 * k}px ${10 * k}px 0 0`, background: '#1f1e1b',
          display: 'flex', alignItems: 'center', gap: 9 * k, padding: `0 ${12 * k}px`, boxSizing: 'border-box' }}>
          <div style={{ width: 16 * k, height: 16 * k, borderRadius: 4.6 * k, background: `linear-gradient(160deg, ${C.accent}, ${C.accentStrong})`,
            display: 'grid', placeItems: 'center' }}>
            <Img src={staticFile('shared/pieces/wN.svg')} style={{ width: 12 * k, height: 12 * k }} />
          </div>
          <div style={{ fontFamily: FONT.sans, fontSize: 14 * k, fontWeight: 500, color: C.ink2, whiteSpace: 'nowrap' }}>{title}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: BAR * k, width: page.w, height: page.h, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -page.x, top: -page.y, width: 1920, height: 1080 }}>{children}</div>
      </div>
    </div>
  );
};
