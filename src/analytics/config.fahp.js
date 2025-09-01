import { invTFN } from './fahp.js';

export const TFN = {
  VL: [0.2, 0.25, 0.33],
  L: [0.33, 0.5, 0.67],
  M: [1, 1, 1],
  H: [2, 3, 4],
  VH: [3, 5, 7]
};

// WFA criteria: [location_type, distance_factor, amenity_score]
export const WFA_PAIRWISE_TFN = [
  [TFN.M, TFN.H, TFN.VH],
  [invTFN(TFN.H), TFN.M, TFN.H],
  [invTFN(TFN.VH), invTFN(TFN.H), TFN.M]
];

// Discipline criteria: [alpha_rate, lateness_severity, lateness_frequency, work_focus]
export const DISC_PAIRWISE_TFN = [
  [TFN.M, TFN.VH, TFN.VH, TFN.H],
  [invTFN(TFN.VH), TFN.M, TFN.H, TFN.M],
  [invTFN(TFN.VH), invTFN(TFN.H), TFN.M, TFN.M],
  [invTFN(TFN.H), invTFN(TFN.M), invTFN(TFN.M), TFN.M]
];

// Smart Auto Checkout criteria: [HIST, CHECKIN, CONTEXT, TRANSITION]
export const SMART_AC_PAIRWISE_TFN = [
  [TFN.M, TFN.H, TFN.VH, TFN.M],
  [invTFN(TFN.H), TFN.M, TFN.H, invTFN(TFN.M)],
  [invTFN(TFN.VH), invTFN(TFN.H), TFN.M, invTFN(TFN.VH)],
  [TFN.M, TFN.H, TFN.VH, TFN.M]
];
