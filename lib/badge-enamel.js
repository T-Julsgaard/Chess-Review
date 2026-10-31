// A pale face, saturated rim and deep ink keep the same category readable at
// small sizes, independently of the board square behind it.
export const ENAMEL_PALETTE = Object.freeze({
  brilliant: {rim:'#277cc5', ink:'#185185', face:'#e1e9eb'},
  great: {rim:'#438caa', ink:'#285a70', face:'#e4ebea'},
  best: {rim:'#258671', ink:'#205b4b', face:'#e0eae1'},
  excellent: {rim:'#4c9271', ink:'#345f49', face:'#e5ece1'},
  good: {rim:'#799558', ink:'#4b5e32', face:'#ebecde'},
  book: {rim:'#a7805b', ink:'#715035', face:'#f0e9de'},
  inacc: {rim:'#d0a331', ink:'#785817', face:'#f5eed9'},
  mistake: {rim:'#d37a32', ink:'#86491f', face:'#f5e9d9'},
  miss: {rim:'#c46862', ink:'#863e3a', face:'#f4e7df'},
  blunder: {rim:'#ba4257', ink:'#822c40', face:'#f2e2de'},
  checkmate: {rim:'#a83e4c', ink:'#702737', face:'#f0e2dc'},
});

export function enamelBadgeDisc(category) {
  const {rim, face} = ENAMEL_PALETTE[category];
  return `<circle cx="50" cy="50" r="46" fill="${face}" stroke="${rim}" stroke-width="7"/>`;
}
