import {
  CensoringConfig,
  KDEConfig,
  ModelRunResults,
  NonParametricKDEResult,
  ParametricDistributionType,
  ParametricModelFit,
} from '../types';

// ==========================================
// SPECIAL MATHEMATICAL FUNCTIONS
// ==========================================

/**
 * Standard error function approximation (Abramowitz and Stegun)
 */
export function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);

  // Constants
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);

  return sign * y;
}

/**
 * Standard Normal Cumulative Distribution Function (Phi)
 */
export function normalCdf(z: number): number {
  return 0.5 * (1.0 + erf(z / Math.SQRT2));
}

/**
 * Standard Normal Probability Density Function (phi)
 */
export function normalPdf(z: number): number {
  return (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
}

/**
 * Log-gamma function ln(Gamma(x)) using Lanczos approximation
 */
export function logGamma(x: number): number {
  if (x <= 0) return 0;
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.138571095856205,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }

  x -= 1;
  let a = p[0];
  const t = x + g + 0.5;
  for (let i = 1; i < p.length; i++) {
    a += p[i] / (x + i);
  }

  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Regularized lower incomplete gamma function P(a, x) = gamma(a, x) / Gamma(a)
 */
export function regularizedGammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (a <= 0) return 1;

  if (x < a + 1) {
    // Series representation
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum;
  } else {
    // Continued fraction representation (upper incomplete Q, then 1 - Q)
    let b = x + 1 - a;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 100; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    const q = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
    return 1 - q;
  }
}

// ==========================================
// KERNEL FUNCTIONS
// ==========================================

export function evaluateKernel(u: number, kernel: KDEConfig['kernel']): number {
  const absU = Math.abs(u);
  switch (kernel) {
    case 'epanechnikov':
      return absU <= 1 ? 0.75 * (1 - u * u) : 0;
    case 'triangular':
      return absU <= 1 ? 1 - absU : 0;
    case 'box':
      return absU <= 1 ? 0.5 : 0;
    case 'gaussian':
    default:
      return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
  }
}

// ==========================================
// OPTIMIZATION / ESTIMATION ENGINE
// ==========================================

/**
 * 2D Nelder-Mead Simplex optimization for finding MLE of 2-parameter distributions with censoring
 */
export function nelderMead2D(
  costFunc: (params: [number, number]) => number,
  initialGuess: [number, number],
  stepSizes: [number, number] = [0.1, 0.1],
  maxIter: number = 300,
  tol: number = 1e-6
): [number, number] {
  let p0: [number, number] = [...initialGuess];
  let p1: [number, number] = [initialGuess[0] + stepSizes[0], initialGuess[1]];
  let p2: [number, number] = [initialGuess[0], initialGuess[1] + stepSizes[1]];

  let simplex = [
    { p: p0, val: costFunc(p0) },
    { p: p1, val: costFunc(p1) },
    { p: p2, val: costFunc(p2) },
  ];

  const alpha = 1.0; // reflection
  const gamma = 2.0; // expansion
  const rho = 0.5;   // contraction
  const sigma = 0.5; // shrink

  for (let iter = 0; iter < maxIter; iter++) {
    simplex.sort((a, b) => a.val - b.val);

    const best = simplex[0];
    const worst = simplex[2];
    const secondWorst = simplex[1];

    if (Math.abs(worst.val - best.val) < tol) {
      break;
    }

    // Centroid of the two best points
    const x0: [number, number] = [
      0.5 * (simplex[0].p[0] + simplex[1].p[0]),
      0.5 * (simplex[0].p[1] + simplex[1].p[1]),
    ];

    // Reflection
    const xr: [number, number] = [
      x0[0] + alpha * (x0[0] - worst.p[0]),
      x0[1] + alpha * (x0[1] - worst.p[1]),
    ];
    const fr = costFunc(xr);

    if (fr < secondWorst.val && fr >= best.val) {
      simplex[2] = { p: xr, val: fr };
      continue;
    }

    // Expansion
    if (fr < best.val) {
      const xe: [number, number] = [
        x0[0] + gamma * (xr[0] - x0[0]),
        x0[1] + gamma * (xr[1] - x0[1]),
      ];
      const fe = costFunc(xe);
      if (fe < fr) {
        simplex[2] = { p: xe, val: fe };
      } else {
        simplex[2] = { p: xr, val: fr };
      }
      continue;
    }

    // Contraction
    const xc: [number, number] = [
      x0[0] + rho * (worst.p[0] - x0[0]),
      x0[1] + rho * (worst.p[1] - x0[1]),
    ];
    const fc = costFunc(xc);

    if (fc < worst.val) {
      simplex[2] = { p: xc, val: fc };
      continue;
    }

    // Shrink
    simplex[1] = {
      p: [best.p[0] + sigma * (simplex[1].p[0] - best.p[0]), best.p[1] + sigma * (simplex[1].p[1] - best.p[1])],
      val: costFunc([best.p[0] + sigma * (simplex[1].p[0] - best.p[0]), best.p[1] + sigma * (simplex[1].p[1] - best.p[1])]),
    };
    simplex[2] = {
      p: [best.p[0] + sigma * (simplex[2].p[0] - best.p[0]), best.p[1] + sigma * (simplex[2].p[1] - best.p[0])],
      val: costFunc([best.p[0] + sigma * (simplex[2].p[0] - best.p[0]), best.p[1] + sigma * (simplex[2].p[1] - best.p[0])]),
    };
  }

  simplex.sort((a, b) => a.val - b.val);
  return simplex[0].p;
}

// ==========================================
// LEFT-CENSORED PARAMETRIC FITTING (MLE)
// ==========================================

/**
 * Fit Lognormal distribution with left censoring at threshold c
 */
export function fitLeftCensoredLognormal(
  observed: number[],
  numCensored: number,
  c: number
): ParametricModelFit {
  const nObs = observed.length;
  const nTotal = nObs + numCensored;

  // Initial estimate from observed log values
  const logObs = observed.map((x) => Math.log(Math.max(x, 1e-4)));
  const obsMeanLog = logObs.reduce((a, b) => a + b, 0) / nObs;
  const obsVarLog =
    logObs.reduce((acc, val) => acc + (val - obsMeanLog) ** 2, 0) / (nObs > 1 ? nObs - 1 : 1);
  const obsSdLog = Math.sqrt(obsVarLog) || 0.5;

  const logC = Math.log(Math.max(c, 1e-4));

  // Objective function: Negative Log-Likelihood
  const negLogLikelihood = ([mu, sigma]: [number, number]): number => {
    if (sigma <= 1e-4) return 1e9;

    let nll = 0;
    // Censored part: F(c) = Phi((ln(c) - mu) / sigma)
    if (numCensored > 0) {
      const zc = (logC - mu) / sigma;
      const probC = normalCdf(zc);
      if (probC <= 1e-12) return 1e9 + Math.abs(zc) * 1000;
      nll -= numCensored * Math.log(probC);
    }

    // Observed part: f(x) = (1 / (x * sigma * sqrt(2pi))) * exp(-0.5 * ((ln x - mu)/sigma)^2)
    for (let i = 0; i < nObs; i++) {
      const x = observed[i];
      const lx = logObs[i];
      const z = (lx - mu) / sigma;
      const logDensity = -Math.log(x * sigma * Math.sqrt(2 * Math.PI)) - 0.5 * z * z;
      nll -= logDensity;
    }

    return isFinite(nll) ? nll : 1e9;
  };

  const [mu, sigma] = nelderMead2D(
    negLogLikelihood,
    [obsMeanLog - (numCensored > 0 ? 0.2 : 0), Math.max(obsSdLog, 0.2)],
    [0.1, 0.1]
  );

  const logLikelihood = -negLogLikelihood([mu, sigma]);
  const numParams = 2;
  const aic = 2 * numParams - 2 * logLikelihood;
  const bic = Math.log(nTotal) * numParams - 2 * logLikelihood;

  const mean = Math.exp(mu + 0.5 * sigma * sigma);
  const median = Math.exp(mu);
  const variance = (Math.exp(sigma * sigma) - 1) * Math.exp(2 * mu + sigma * sigma);

  const quantile = (p: number) => {
    // Inverse standard normal approximation (Winitzki / Acklam)
    const z = invNormalCdf(p);
    return Math.exp(mu + sigma * z);
  };

  return {
    type: 'lognormal',
    name: 'Lognormal Distribution',
    color: '#38bdf8', // Cyan / Light Blue
    enabled: true,
    parameters: { mu, sigma },
    parameterLabels: { mu: 'Location (μ)', sigma: 'Scale (σ)' },
    logLikelihood,
    aic,
    bic,
    mean,
    median,
    variance,
    percentiles: {
      p50: quantile(0.5),
      p75: quantile(0.75),
      p90: quantile(0.9),
      p95: quantile(0.95),
      p99: quantile(0.99),
    },
    evaluatePdf: (x: number) => {
      if (x <= 0) return 0;
      const z = (Math.log(x) - mu) / sigma;
      return (1.0 / (x * sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
    },
    evaluateCdf: (x: number) => {
      if (x <= 0) return 0;
      return normalCdf((Math.log(x) - mu) / sigma);
    },
    evaluateSurvival: (x: number) => {
      if (x <= 0) return 1;
      return 1 - normalCdf((Math.log(x) - mu) / sigma);
    },
  };
}

/**
 * Fit Weibull distribution with left censoring at threshold c
 */
export function fitLeftCensoredWeibull(
  observed: number[],
  numCensored: number,
  c: number
): ParametricModelFit {
  const nObs = observed.length;
  const nTotal = nObs + numCensored;

  const obsMean = observed.reduce((a, b) => a + b, 0) / nObs;
  const obsVar =
    observed.reduce((acc, val) => acc + (val - obsMean) ** 2, 0) / (nObs > 1 ? nObs - 1 : 1);
  const obsSd = Math.sqrt(obsVar);

  // Initial estimate for Weibull shape k and scale lambda
  let initK = 1.2;
  if (obsSd > 0) {
    initK = Math.max(0.5, Math.min(5, (obsMean / obsSd) ** 1.08));
  }
  let initScale = obsMean;

  const negLogLikelihood = ([k, lambda]: [number, number]): number => {
    if (k <= 0.01 || lambda <= 0.01) return 1e9;

    let nll = 0;
    // Censored: F(c) = 1 - exp(-(c/lambda)^k)
    if (numCensored > 0) {
      const zc = Math.pow(c / lambda, k);
      const probC = 1 - Math.exp(-zc);
      if (probC <= 1e-12) return 1e9 + zc * 100;
      nll -= numCensored * Math.log(probC);
    }

    // Observed: f(x) = (k/lambda) * (x/lambda)^(k-1) * exp(-(x/lambda)^k)
    for (let i = 0; i < nObs; i++) {
      const x = observed[i];
      const ratio = x / lambda;
      const logDensity =
        Math.log(k) - Math.log(lambda) + (k - 1) * Math.log(ratio) - Math.pow(ratio, k);
      nll -= logDensity;
    }

    return isFinite(nll) ? nll : 1e9;
  };

  const [k, lambda] = nelderMead2D(
    negLogLikelihood,
    [initK, initScale],
    [0.1, 0.2]
  );

  const logLikelihood = -negLogLikelihood([k, lambda]);
  const numParams = 2;
  const aic = 2 * numParams - 2 * logLikelihood;
  const bic = Math.log(nTotal) * numParams - 2 * logLikelihood;

  const mean = lambda * Math.exp(logGamma(1 + 1 / k));
  const median = lambda * Math.pow(Math.LN2, 1 / k);
  const variance =
    lambda * lambda * (Math.exp(logGamma(1 + 2 / k)) - Math.exp(2 * logGamma(1 + 1 / k)));

  const quantile = (p: number) => {
    return lambda * Math.pow(-Math.log(1 - p), 1 / k);
  };

  return {
    type: 'weibull',
    name: 'Weibull Distribution',
    color: '#eab308', // Amber / Yellow
    enabled: true,
    parameters: { shape: k, scale: lambda },
    parameterLabels: { shape: 'Shape (k)', scale: 'Scale (λ)' },
    logLikelihood,
    aic,
    bic,
    mean,
    median,
    variance,
    percentiles: {
      p50: quantile(0.5),
      p75: quantile(0.75),
      p90: quantile(0.9),
      p95: quantile(0.95),
      p99: quantile(0.99),
    },
    evaluatePdf: (x: number) => {
      if (x <= 0) return 0;
      const ratio = x / lambda;
      return (k / lambda) * Math.pow(ratio, k - 1) * Math.exp(-Math.pow(ratio, k));
    },
    evaluateCdf: (x: number) => {
      if (x <= 0) return 0;
      return 1 - Math.exp(-Math.pow(x / lambda, k));
    },
    evaluateSurvival: (x: number) => {
      if (x <= 0) return 1;
      return Math.exp(-Math.pow(x / lambda, k));
    },
  };
}

/**
 * Fit Gamma distribution with left censoring at threshold c
 */
export function fitLeftCensoredGamma(
  observed: number[],
  numCensored: number,
  c: number
): ParametricModelFit {
  const nObs = observed.length;
  const nTotal = nObs + numCensored;

  const obsMean = observed.reduce((a, b) => a + b, 0) / nObs;
  const obsVar =
    observed.reduce((acc, val) => acc + (val - obsMean) ** 2, 0) / (nObs > 1 ? nObs - 1 : 1);

  // Method of moments initial guesses
  let initAlpha = Math.max(0.5, (obsMean * obsMean) / (obsVar || 1));
  let initTheta = Math.max(0.1, (obsVar || 1) / obsMean); // scale theta = 1 / beta

  const negLogLikelihood = ([alpha, theta]: [number, number]): number => {
    if (alpha <= 0.01 || theta <= 0.01) return 1e9;

    let nll = 0;
    const beta = 1 / theta;

    // Censored: F(c) = P(alpha, beta * c)
    if (numCensored > 0) {
      const probC = regularizedGammaP(alpha, beta * c);
      if (probC <= 1e-12) return 1e9 + (beta * c) * 100;
      nll -= numCensored * Math.log(probC);
    }

    // Observed: f(x) = (1 / (Gamma(alpha) * theta^alpha)) * x^(alpha - 1) * exp(-x / theta)
    const logNormConst = -logGamma(alpha) - alpha * Math.log(theta);
    for (let i = 0; i < nObs; i++) {
      const x = observed[i];
      const logDensity = logNormConst + (alpha - 1) * Math.log(x) - x / theta;
      nll -= logDensity;
    }

    return isFinite(nll) ? nll : 1e9;
  };

  const [alpha, theta] = nelderMead2D(
    negLogLikelihood,
    [initAlpha, initTheta],
    [0.1, 0.1]
  );

  const beta = 1 / theta;
  const logLikelihood = -negLogLikelihood([alpha, theta]);
  const numParams = 2;
  const aic = 2 * numParams - 2 * logLikelihood;
  const bic = Math.log(nTotal) * numParams - 2 * logLikelihood;

  const mean = alpha * theta;
  const variance = alpha * theta * theta;
  const median = alpha >= 1 ? theta * (alpha - 1 / 3) : alpha * theta * 0.7; // Wilson-Hilferty approx

  // Numerical quantile solver via bisection
  const quantile = (p: number) => {
    let low = 0.001;
    let high = Math.max(mean * 5, 20);
    for (let iter = 0; iter < 40; iter++) {
      const mid = 0.5 * (low + high);
      const cdfVal = regularizedGammaP(alpha, beta * mid);
      if (cdfVal < p) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return 0.5 * (low + high);
  };

  return {
    type: 'gamma',
    name: 'Gamma Distribution',
    color: '#10b981', // Emerald / Green
    enabled: true,
    parameters: { shape: alpha, scale: theta, rate: beta },
    parameterLabels: { shape: 'Shape (α)', scale: 'Scale (θ)', rate: 'Rate (β)' },
    logLikelihood,
    aic,
    bic,
    mean,
    median,
    variance,
    percentiles: {
      p50: quantile(0.5),
      p75: quantile(0.75),
      p90: quantile(0.9),
      p95: quantile(0.95),
      p99: quantile(0.99),
    },
    evaluatePdf: (x: number) => {
      if (x <= 0) return 0;
      return (
        (1 / (Math.exp(logGamma(alpha)) * Math.pow(theta, alpha))) *
        Math.pow(x, alpha - 1) *
        Math.exp(-x / theta)
      );
    },
    evaluateCdf: (x: number) => {
      if (x <= 0) return 0;
      return regularizedGammaP(alpha, x / theta);
    },
    evaluateSurvival: (x: number) => {
      if (x <= 0) return 1;
      return 1 - regularizedGammaP(alpha, x / theta);
    },
  };
}

/**
 * Fit Exponential distribution with left censoring at threshold c
 */
export function fitLeftCensoredExponential(
  observed: number[],
  numCensored: number,
  c: number
): ParametricModelFit {
  const nObs = observed.length;
  const nTotal = nObs + numCensored;
  const sumObs = observed.reduce((a, b) => a + b, 0);

  // Solves for lambda: d/dlambda [ nCens * ln(1 - e^(-lambda*c)) + nObs * ln lambda - lambda * sumObs ] = 0
  let lambda = nObs / sumObs;
  for (let iter = 0; iter < 50; iter++) {
    const expC = Math.exp(-lambda * c);
    const g =
      numCensored * (c * expC / (1 - expC + 1e-12)) + (nObs / lambda) - sumObs;
    const gPrime =
      numCensored * (-c * c * expC / Math.pow(1 - expC + 1e-12, 2)) - (nObs / (lambda * lambda));
    if (Math.abs(gPrime) < 1e-12) break;
    const nextLambda = lambda - g / gPrime;
    if (nextLambda <= 0) {
      lambda = lambda * 0.5;
    } else {
      lambda = nextLambda;
    }
  }

  const logLikelihood =
    (numCensored > 0 ? numCensored * Math.log(1 - Math.exp(-lambda * c)) : 0) +
    nObs * Math.log(lambda) -
    lambda * sumObs;

  const numParams = 1;
  const aic = 2 * numParams - 2 * logLikelihood;
  const bic = Math.log(nTotal) * numParams - 2 * logLikelihood;

  return {
    type: 'exponential',
    name: 'Exponential Distribution',
    color: '#a855f7', // Purple
    enabled: false,
    parameters: { rate: lambda, mean: 1 / lambda },
    parameterLabels: { rate: 'Rate (λ)', mean: 'Mean (1/λ)' },
    logLikelihood,
    aic,
    bic,
    mean: 1 / lambda,
    median: Math.LN2 / lambda,
    variance: 1 / (lambda * lambda),
    percentiles: {
      p50: -Math.log(1 - 0.5) / lambda,
      p75: -Math.log(1 - 0.75) / lambda,
      p90: -Math.log(1 - 0.9) / lambda,
      p95: -Math.log(1 - 0.95) / lambda,
      p99: -Math.log(1 - 0.99) / lambda,
    },
    evaluatePdf: (x: number) => {
      if (x <= 0) return 0;
      return lambda * Math.exp(-lambda * x);
    },
    evaluateCdf: (x: number) => {
      if (x <= 0) return 0;
      return 1 - Math.exp(-lambda * x);
    },
    evaluateSurvival: (x: number) => {
      if (x <= 0) return 1;
      return Math.exp(-lambda * x);
    },
  };
}

// ==========================================
// NON-PARAMETRIC LEFT-CENSORED KDE ENGINE
// ==========================================

/**
 * Calculate optimal bandwidth using Silverman or Scott rule
 */
export function calculateBandwidth(
  observed: number[],
  numCensored: number,
  threshold: number,
  method: KDEConfig['bandwidthMethod'] = 'silverman'
): number {
  const nObs = observed.length;
  const nTotal = nObs + numCensored;
  if (nTotal <= 1) return 0.2;

  // Approximate mean and standard deviation including censored mass
  const obsSum = observed.reduce((a, b) => a + b, 0);
  const approxCensSum = numCensored * (threshold * 0.5);
  const totalMean = (obsSum + approxCensSum) / nTotal;

  let totalVarSum = 0;
  for (let i = 0; i < nObs; i++) {
    totalVarSum += (observed[i] - totalMean) ** 2;
  }
  totalVarSum += numCensored * (threshold * 0.5 - totalMean) ** 2;
  const sd = Math.sqrt(totalVarSum / (nTotal - 1));

  // Compute IQR
  const sorted = [...observed].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(0.25 * nObs)] || threshold;
  const q3 = sorted[Math.floor(0.75 * nObs)] || threshold * 2;
  const iqr = Math.max(q3 - q1, 0.1);

  const spread = Math.min(sd, iqr / 1.34) || sd || 0.5;

  if (method === 'scott') {
    return 1.06 * spread * Math.pow(nTotal, -0.2);
  }
  // Silverman's rule of thumb
  return 0.9 * spread * Math.pow(nTotal, -0.2);
}

/**
 * EM-Algorithm for Left-Censored Kernel Density Estimation
 * Correctly assigns censored probability mass to the interval [0, threshold]
 */
export function computeLeftCensoredKDE(
  observed: number[],
  numCensored: number,
  threshold: number,
  kdeConfig: KDEConfig,
  maxX: number = 10
): NonParametricKDEResult {
  const nObs = observed.length;
  const nTotal = nObs + numCensored;
  const censoredFraction = nTotal > 0 ? numCensored / nTotal : 0;

  // Determine bandwidth
  let baseBandwidth =
    kdeConfig.bandwidthMethod === 'manual'
      ? kdeConfig.manualBandwidth
      : calculateBandwidth(observed, numCensored, threshold, kdeConfig.bandwidthMethod);

  baseBandwidth = Math.max(0.02, baseBandwidth * (kdeConfig.bandwidthMultiplier || 1.0));

  // Setup evaluation grid
  const numEval = kdeConfig.numEvaluationPoints || 250;
  const xGrid: number[] = [];
  const dx = maxX / (numEval - 1);
  for (let i = 0; i < numEval; i++) {
    xGrid.push(i * dx);
  }

  // Setup sub-grid for censored region [0, threshold]
  const numCensGrid = 40;
  const censSubGrid: number[] = [];
  const dCens = threshold / numCensGrid;
  for (let j = 0; j <= numCensGrid; j++) {
    censSubGrid.push(j * dCens);
  }

  // EM Weights for censored region (start with uniform on [0, threshold])
  let censWeights = new Array(censSubGrid.length).fill(1 / censSubGrid.length);

  const maxEmIterations = numCensored > 0 ? 8 : 1;

  for (let emIter = 0; emIter < maxEmIterations; emIter++) {
    // Current density function given observed data + weighted censored points
    const currentPdf = (x: number): number => {
      let sumObs = 0;
      for (let i = 0; i < nObs; i++) {
        const u = (x - observed[i]) / baseBandwidth;
        sumObs += evaluateKernel(u, kdeConfig.kernel);
      }

      let sumCens = 0;
      if (numCensored > 0) {
        for (let j = 0; j < censSubGrid.length; j++) {
          const u = (x - censSubGrid[j]) / baseBandwidth;
          sumCens += censWeights[j] * evaluateKernel(u, kdeConfig.kernel);
        }
      }

      const totalKernelSum = sumObs + numCensored * sumCens;
      return totalKernelSum / (nTotal * baseBandwidth);
    };

    // E-Step: update censWeights proportional to current density on [0, threshold]
    if (numCensored > 0 && emIter < maxEmIterations - 1) {
      let weightSum = 0;
      for (let j = 0; j < censSubGrid.length; j++) {
        censWeights[j] = Math.max(1e-8, currentPdf(censSubGrid[j]));
        weightSum += censWeights[j];
      }
      for (let j = 0; j < censSubGrid.length; j++) {
        censWeights[j] /= weightSum;
      }
    }
  }

  // Final density evaluation on grid
  const rawDensities: number[] = [];
  for (let i = 0; i < numEval; i++) {
    const x = xGrid[i];
    let sumObs = 0;
    for (let o = 0; o < nObs; o++) {
      const u = (x - observed[o]) / baseBandwidth;
      sumObs += evaluateKernel(u, kdeConfig.kernel);
    }
    let sumCens = 0;
    if (numCensored > 0) {
      for (let j = 0; j < censSubGrid.length; j++) {
        const u = (x - censSubGrid[j]) / baseBandwidth;
        sumCens += censWeights[j] * evaluateKernel(u, kdeConfig.kernel);
      }
    }
    const val = (sumObs + numCensored * sumCens) / (nTotal * baseBandwidth);
    rawDensities.push(Math.max(0, val));
  }

  // Normalize density so total integral is 1.0 (trapezoidal rule)
  let integral = 0;
  for (let i = 0; i < numEval - 1; i++) {
    integral += 0.5 * (rawDensities[i] + rawDensities[i + 1]) * dx;
  }
  const normFactor = integral > 0 ? 1 / integral : 1;

  // Build points with CDF and Survival
  let cumulative = 0;
  const points = rawDensities.map((d, i) => {
    const normD = d * normFactor;
    if (i > 0) {
      cumulative += 0.5 * (rawDensities[i - 1] * normFactor + normD) * dx;
    }
    const cdf = Math.min(1, Math.max(0, cumulative));
    return {
      x: xGrid[i],
      density: normD,
      cdf,
      survival: Math.max(0, 1 - cdf),
    };
  });

  // Calculate percentiles from KDE CDF
  const getQuantileFromPoints = (targetP: number): number => {
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i + 1].cdf >= targetP) {
        const p0 = points[i].cdf;
        const p1 = points[i + 1].cdf;
        const fraction = p1 > p0 ? (targetP - p0) / (p1 - p0) : 0;
        return points[i].x + fraction * (points[i + 1].x - points[i].x);
      }
    }
    return points[points.length - 1].x;
  };

  // Mean estimate
  let mean = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const midX = 0.5 * (points[i].x + points[i + 1].x);
    const dArea = 0.5 * (points[i].density + points[i + 1].density) * dx;
    mean += midX * dArea;
  }

  const evaluatePdf = (x: number): number => {
    if (x < 0) return 0;
    if (x >= maxX) return 0;
    const idx = Math.floor(x / dx);
    if (idx >= points.length - 1) return points[points.length - 1].density;
    const frac = (x - points[idx].x) / dx;
    return points[idx].density + frac * (points[idx + 1].density - points[idx].density);
  };

  const evaluateCdf = (x: number): number => {
    if (x <= 0) return 0;
    if (x >= maxX) return 1;
    const idx = Math.floor(x / dx);
    if (idx >= points.length - 1) return 1;
    const frac = (x - points[idx].x) / dx;
    return points[idx].cdf + frac * (points[idx + 1].cdf - points[idx].cdf);
  };

  const evaluateSurvival = (x: number): number => {
    return Math.max(0, 1 - evaluateCdf(x));
  };

  return {
    bandwidth: baseBandwidth,
    points,
    censoredFraction,
    totalPoints: nTotal,
    observedPoints: nObs,
    censoredPoints: numCensored,
    mean,
    median: getQuantileFromPoints(0.5),
    percentiles: {
      p50: getQuantileFromPoints(0.5),
      p75: getQuantileFromPoints(0.75),
      p90: getQuantileFromPoints(0.9),
      p95: getQuantileFromPoints(0.95),
      p99: getQuantileFromPoints(0.99),
    },
    evaluatePdf,
    evaluateCdf,
    evaluateSurvival,
  };
}

// ==========================================
// COMPREHENSIVE MODEL EXECUTION RUNNER
// ==========================================

export function runCorrosionStatisticalAnalysis(
  rawValues: (number | string)[],
  censoringConfig: CensoringConfig,
  kdeConfig: KDEConfig,
  wallThicknessRef: number = 12.7,
  pipeODRef: number = 914.4
): ModelRunResults {
  const threshold = censoringConfig.threshold;
  const observed: number[] = [];
  let censoredCount = 0;

  for (const item of rawValues) {
    if (typeof item === 'string') {
      const trimmed = item.trim().toUpperCase();
      const isNominalKeyword = censoringConfig.nominalKeywords.some((k) =>
        trimmed.includes(k.toUpperCase())
      );
      if (isNominalKeyword) {
        censoredCount++;
        continue;
      }
      const parsedNum = parseFloat(trimmed.replace(/[^\d.-]/g, ''));
      if (!isNaN(parsedNum)) {
        if (censoringConfig.autoCensorBelowThreshold && parsedNum <= threshold) {
          censoredCount++;
        } else {
          observed.push(parsedNum);
        }
      }
    } else if (typeof item === 'number' && !isNaN(item)) {
      if (censoringConfig.autoCensorBelowThreshold && item <= threshold) {
        censoredCount++;
      } else {
        observed.push(item);
      }
    }
  }

  const totalCount = observed.length + censoredCount;
  const maxObs = observed.length > 0 ? Math.max(...observed) : threshold * 3;
  const domainMax = Math.max(threshold * 4, maxObs * 1.25);

  // Compute Left-Censored KDE
  const kdeResult = computeLeftCensoredKDE(
    observed,
    censoredCount,
    threshold,
    kdeConfig,
    domainMax
  );

  // Fit Left-Censored Parametric Distributions
  const lognormalFit = fitLeftCensoredLognormal(observed, censoredCount, threshold);
  const weibullFit = fitLeftCensoredWeibull(observed, censoredCount, threshold);
  const gammaFit = fitLeftCensoredGamma(observed, censoredCount, threshold);
  const exponentialFit = fitLeftCensoredExponential(observed, censoredCount, threshold);

  const parametricFits: Record<ParametricDistributionType, ParametricModelFit> = {
    lognormal: lognormalFit,
    gamma: gammaFit,
    weibull: weibullFit,
    exponential: exponentialFit,
  };

  // Determine best parametric fit by lowest AIC
  const candidates: ParametricModelFit[] = [lognormalFit, gammaFit, weibullFit, exponentialFit];
  candidates.sort((a, b) => a.aic - b.aic);
  const bestFitType: ParametricDistributionType = candidates[0].type;

  // Build empirical histogram bins with a tighter bin width for a more detailed view.
  // 24 bins was a bit coarse; 40 provides a noticeably smoother/simple histogram without becoming noisy.
  const numBins = 40;
  const binWidth = domainMax / numBins;
  const histogramBins: ModelRunResults['histogramBins'] = [];

  for (let b = 0; b < numBins; b++) {
    const x0 = b * binWidth;
    const x1 = (b + 1) * binWidth;
    const mid = 0.5 * (x0 + x1);
    const isCensoredBin = x1 <= threshold || (x0 < threshold && x1 >= threshold);

    let count = 0;
    if (x0 <= threshold && x1 >= threshold) {
      // Includes the censored batch + any observed within this slice
      count += censoredCount;
      count += observed.filter((v) => v >= x0 && v < x1).length;
    } else {
      count = observed.filter((v) => v >= x0 && v < x1).length;
    }

    const density = totalCount > 0 ? count / (totalCount * binWidth) : 0;

    histogramBins.push({
      x0,
      x1,
      mid,
      count,
      density,
      isCensoredBin: mid <= threshold,
    });
  }

  return {
    timestamp: new Date(),
    kde: kdeResult,
    parametricFits,
    bestFitType,
    histogramBins,
    threshold,
    observedDepths: observed,
    censoredCount,
    totalCount,
    wallThicknessRef,
    pipeODRef,
  };
}

/**
 * Inverse Standard Normal CDF approximation (Acklam's algorithm)
 */
function invNormalCdf(p: number): number {
  if (p <= 0) return -8;
  if (p >= 1) return 8;

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const q = p < 0.5 ? p : 1 - p;
  let r: number;

  if (q > 0.02425) {
    const u = q - 0.5;
    const r2 = u * u;
    r =
      (u *
        (((((a[0] * r2 + a[1]) * r2 + a[2]) * r2 + a[3]) * r2 + a[4]) * r2 + a[5])) /
      (((((b[0] * r2 + b[1]) * r2 + b[2]) * r2 + b[3]) * r2 + b[4]) * r2 + 1);
  } else {
    const u = Math.sqrt(-2 * Math.log(q));
    r =
      (((((c[0] * u + c[1]) * u + c[2]) * u + c[3]) * u + c[4]) * u + c[5]) /
      ((((d[0] * u + d[1]) * u + d[2]) * u + d[3]) * u + 1);
    if (p < 0.5) r = -r;
  }

  return p < 0.5 ? -r : r;
}
