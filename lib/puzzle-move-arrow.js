/** Draw the board overlay used for puzzle hints and analysis. */
export function puzzleMoveArrow(doc, move, flipped, drawBestArrow, label = 'Hint') {
  const from = move.slice(0, 2), to = move.slice(2, 4);
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'best-arrow ' + (label === 'Hint' ? 'puzzle-hint-arrow' : 'puzzle-analysis-arrow'));
  svg.setAttribute('viewBox', '0 0 8 8');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${label}: ${from} to ${to}`);

  if (drawBestArrow) {
    svg.append(drawBestArrow(from, to, flipped));
  } else {
    const point = square => {
      const file = square.charCodeAt(0) - 96.5, rank = Number(square[1]) - .5;
      return flipped ? [8 - file, rank] : [file, 8 - rank];
    };
    const [x, y] = point(from), [tx, ty] = point(to), length = Math.hypot(tx - x, ty - y);
    const path = doc.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', `M0,-.12 H${length - .5} V-.35 L${length},0 L${length - .5},.35 V.12 H0 Z`);
    path.setAttribute('transform', `translate(${x} ${y}) rotate(${Math.atan2(ty - y, tx - x) * 180 / Math.PI})`);
    path.setAttribute('fill', 'var(--accent)');
    path.setAttribute('opacity', '.8');
    svg.append(path);
  }
  return svg;
}
