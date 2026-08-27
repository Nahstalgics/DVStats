export interface CorrosionRecord {
  id: string | number;
  depth: number; // in mm
  isCensored: boolean; // true if <= threshold or nominal
  rawDepth?: string | number;
  chainage?: number; // distance / odometer in meters
  clockPos?: string; // e.g. "12:30" or degrees
  featureLength?: number; // mm
  featureWidth?: number; // mm
  wallThickness?: number; // mm
  pipeOD?: number; // mm or inches
  location?: 'OD' | 'ID' | 'Internal' | 'External';
  [key: string]: any;
}

export interface ColumnMapping {
  depthColumn: string;
}

export interface CensoringConfig {
  threshold: number; // default 0.80 mm
  autoCensorBelowThreshold: boolean; // if true, any numeric value <= threshold is censored
  nominalKeywords: string[]; // e.g., ["NOMINAL", "<0.8", "< 0.80", "N/A", "UNSIZED"]
}

export type KernelType = 'gaussian' | 'epanechnikov' | 'triangular' | 'box';
export type BandwidthMethod = 'silverman' | 'scott' | 'manual';

export interface KDEConfig {
  kernel: KernelType;
  bandwidthMethod: BandwidthMethod;
  manualBandwidth: number;
  numEvaluationPoints: number;
  bandwidthMultiplier: number;
  boundaryMethod: 'em-censored' | 'turnbull-smooth' | 'reflection';
}

export type ParametricDistributionType = 'lognormal' | 'gamma' | 'weibull' | 'exponential';
export type DistributionType = ParametricDistributionType | 'kde';

export interface ParametricModelFit {
  type: ParametricDistributionType;
  name: string;
  color: string;
  enabled: boolean;
  parameters: { [key: string]: number };
  parameterLabels: { [key: string]: string };
  logLikelihood: number;
  aic: number;
  bic: number;
  ksStatistic?: number;
  pValues?: number;
  mean: number;
  median: number;
  variance: number;
  percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  evaluatePdf: (x: number) => number;
  evaluateCdf: (x: number) => number;
  evaluateSurvival: (x: number) => number;
}

export interface NonParametricKDEResult {
  bandwidth: number;
  points: { x: number; density: number; cdf: number; survival: number }[];
  censoredFraction: number;
  totalPoints: number;
  observedPoints: number;
  censoredPoints: number;
  mean: number;
  median: number;
  percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  evaluatePdf: (x: number) => number;
  evaluateCdf: (x: number) => number;
  evaluateSurvival: (x: number) => number;
}

export interface ModelRunResults {
  timestamp: Date;
  kde: NonParametricKDEResult;
  parametricFits: Record<ParametricDistributionType, ParametricModelFit>;
  bestFitType: ParametricDistributionType;
  histogramBins: {
    x0: number;
    x1: number;
    mid: number;
    count: number;
    density: number;
    isCensoredBin: boolean;
  }[];
  threshold: number;
  observedDepths: number[];
  censoredCount: number;
  totalCount: number;
  wallThicknessRef: number;
  pipeODRef: number;
}

export type PlotType = 'pdf' | 'histogram' | 'survival';
