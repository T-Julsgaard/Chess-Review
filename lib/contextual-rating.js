// Original compact implementation of an owner-style recorded-rating comparison.
// It uses a compact peer-quality profile derived from the public calibration distribution,
// rather than copying the upstream source implementation.

const PEER_PROFILE = Object.freeze([
  { rating: 655, quality: 65.9198, weight: 0.5 },
  { rating: 772, quality: 74.3350, weight: 2.0 },
  { rating: 847, quality: 65.0803, weight: 5.0 },
  { rating: 962, quality: 67.9588, weight: 11.0 },
  { rating: 1055, quality: 72.5371, weight: 5.0 },
  { rating: 1146, quality: 74.3382, weight: 4.0 },
  { rating: 1234, quality: 74.9374, weight: 8.0 },
  { rating: 1341, quality: 69.9105, weight: 5.0 },
  { rating: 1451, quality: 77.3901, weight: 2.5 },
  { rating: 1551, quality: 73.5968, weight: 5.5 },
  { rating: 1670, quality: 73.8066, weight: 6.0 },
  { rating: 1735, quality: 77.7388, weight: 4.5 },
  { rating: 1850, quality: 73.0618, weight: 8.0 },
  { rating: 1964, quality: 83.7390, weight: 4.5 },
  { rating: 2043, quality: 77.5622, weight: 3.5 },
  { rating: 2165, quality: 80.3323, weight: 5.0 },
  { rating: 2243, quality: 79.7422, weight: 8.0 },
  { rating: 2344, quality: 85.1786, weight: 5.0 },
  { rating: 2434, quality: 84.1394, weight: 3.0 },
  { rating: 2550, quality: 86.8732, weight: 1.0 },
  { rating: 2623, quality: 84.9793, weight: 1.0 },
  { rating: 2755, quality: 89.8289, weight: 1.5 },
  { rating: 2801, quality: 85.0449, weight: 0.5 },
]);

const BANDWIDTH = 200;
const MIN_EFFECTIVE_PEERS = 20;
const MIN_RATING = 400;
const MAX_RATING = 5000;

const finite = Number.isFinite;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function estimateRecordedRating(recordedRating, quality, decisions = 0) {
  const rating = Number(recordedRating);
  const q = Number(quality);
  const n = Number(decisions);

  if (!finite(rating) || rating < MIN_RATING || rating > MAX_RATING) return null;
  if (!finite(q) || q < 0 || q > 100) return null;
  if (!Number.isInteger(n) || n < 0) return null;
  if (!n) {
    return {
      rating: Math.round(rating / 50) * 50,
      recordedRating: rating,
      deviation: 0,
      percentile: 0.5,
      effectivePeers: 0,
      adjusted: false,
      shortExcerpt: true,
    };
  }

  const logits = PEER_PROFILE.map(peer =>
    Math.log(Math.max(peer.weight, 1e-9))
      - 0.5 * ((peer.rating - rating) / BANDWIDTH) ** 2
  );

  const maximum = Math.max(...logits);
  const weights = logits.map(value => Math.exp(value - maximum));
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return null;

  const normalized = weights.map(value => value / total);
  const effectivePeers = 1 / normalized.reduce((sum, value) => sum + value * value, 0);

  if (effectivePeers < MIN_EFFECTIVE_PEERS) {
    return {
      rating: Math.round(rating / 50) * 50,
      recordedRating: rating,
      deviation: 0,
      percentile: 0.5,
      effectivePeers,
      adjusted: false,
      shortExcerpt: n < 10,
    };
  }

  let percentile = 0;
  for (let i = 0; i < PEER_PROFILE.length; i++) {
    const peer = PEER_PROFILE[i];
    if (peer.quality < q) percentile += normalized[i];
    else if (peer.quality === q) percentile += normalized[i] * 0.5;
  }

  percentile = (percentile * effectivePeers + 0.5) / (effectivePeers + 1);
  percentile = clamp(percentile, 0.01, 0.99);

  const deviation = (400 / Math.log(10))
    * (Math.log(percentile) - Math.log1p(-percentile));

  return {
    rating: Math.round((rating + deviation) / 50) * 50,
    recordedRating: rating,
    deviation,
    percentile,
    effectivePeers,
    adjusted: true,
    shortExcerpt: n < 10,
  };
}

export const RECORDED_RATING_MODEL_VERSION = "owner-context-compact-2026-10";
