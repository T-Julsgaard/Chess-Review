// Small, decorative drawings keep the mode picker sharp at every display scale.
export function puzzleModeArt(document, mode) {
  const svg = (tag, attrs, ...children) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    node.append(...children);
    return node;
  };
  const path = (d, attrs = {}) => svg('path', {d, ...attrs});
  const drawings = {
    'solve-puzzle': () => [
      svg('g', {class:'mode-board', transform:'translate(60 48) rotate(-28)'},
        svg('rect', {x:-32,y:-22,width:64,height:64,rx:3,fill:'currentColor','fill-opacity':'.08'}),
        path('M-32-22H32V42H-32Z M-11-22V42 M11-22V42 M-32-1H32 M-32 20H32')),
      svg('g', {class:'mode-piece'},
        path('M60 13 79 3 98 14 79 25Z', {fill:'currentColor','fill-opacity':'.18'}),
        path('M60 13V28L79 40 98 29V14 M79 25V40')),
      path('M26 12V20 M22 16H30 M105 51V59 M101 55H109', {'stroke-width':1.5})
    ],
    timeAttack: () => [
      svg('g', {class:'mode-speed-lines'},path('M14 38H31 M8 49H27 M17 60H30')),
      svg('g', {class:'mode-timer'},
        svg('circle', {cx:68,cy:47,r:29,fill:'currentColor','fill-opacity':'.08'}),
        path('M61 9H75 M68 9V18 M91 22 96 17 M51 27 54 31 M83 27 80 31 M88 47H84 M52 64 55 61 M85 64 82 61'),
        path('M71 28 56 49H67L63 66 81 42H69Z', {fill:'currentColor',stroke:'none'}))
    ],
    knockout: () => [
      svg('g', {class:'mode-crown'},
        path('M31 33 43 42 51 23 63 39 80 22 82 43 97 30 87 63 42 67Z', {fill:'currentColor','fill-opacity':'.1'}),
        path('M46 74 85 70 M70 32 61 47 70 51 59 66', {'stroke-width':3})),
      path('M22 22 29 27 M98 12 93 20 M107 44 114 43', {'stroke-width':1.5})
    ]
  };
  return svg('svg', {class:'puzzle-mode-art',viewBox:'0 0 124 88',fill:'none',stroke:'currentColor','stroke-width':2.2,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}, ...drawings[mode]());
}
