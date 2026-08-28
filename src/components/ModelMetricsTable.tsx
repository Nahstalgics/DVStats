import React, { useState } from 'react';
import { Award, BarChart3, ChevronRight, Gauge, ShieldAlert, Table } from 'lucide-react';
import { ModelRunResults, ParametricDistributionType, ParametricModelFit } from '../types';

interface ModelMetricsTableProps {
  results: ModelRunResults;
  wallThickness: number;
  maxApprovedObservedDepth: number;
}

export const ModelMetricsTable: React.FC<ModelMetricsTableProps> = ({
  results,
  wallThickness,
  maxApprovedObservedDepth,
}) => {
  const candidateTypes: ParametricDistributionType[] = ['lognormal', 'gamma', 'weibull', 'exponential'];
  const validFits = candidateTypes
    .map((t) => results.parametricFits[t])
    .filter((f): f is ParametricModelFit => f !== null && f !== undefined);

  // Sort fits by AIC (lower is better)
  const sortedFits = [...validFits].sort((a, b) => a.aic - b.aic);
  const bestFit = sortedFits[0];

  const criticalDepth1 = 2.0; // mm
  const criticalDepth2 = 3.5; // mm
  const criticalDepthWT50 = wallThickness * 0.5; // 50% WT
  const maxObservedDepth = maxApprovedObservedDepth;
  const [displayMode, setDisplayMode] = useState<'percent' | 'count'>('percent');
  const [thresholds, setThresholds] = useState<number[]>([1.6]);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const formatExceedance = (probability: number) => {
    if (displayMode === 'count') {
      const estimatedCount = results.totalCount * probability;
      return `${estimatedCount.toFixed(0)} defects`;
    }
    return `${(probability * 100).toFixed(1)}%`;
  };

  const formatProbabilityRange = (lower: number, upper: number) => {
    if (displayMode === 'count') {
      const countLower = results.totalCount * lower;
      const countUpper = results.totalCount * upper;
      return `${countLower.toFixed(0)}–${countUpper.toFixed(0)} defects`;
    }
    return `${(lower * 100).toFixed(1)}–${(upper * 100).toFixed(1)}%`;
  };

  const approximateExceedanceCi = (threshold: number) => {
    const p = results.kde.evaluateSurvival(threshold);
    const se = Math.sqrt(Math.max(p * (1 - p) / Math.max(results.totalCount, 1), 0));
    const z = 1.96;
    const lower = clamp(p - z * se, 0, 1);
    const upper = clamp(p + z * se, 0, 1);
    return { lower, upper };
  };

  const approximateQuantileCi = (probability: number, estimate: number) => {
    const density = Math.max(results.kde.evaluatePdf(estimate), 1e-4);
    const n = Math.max(results.totalCount, 1);
    const variance = (probability * (1 - probability)) / (n * density * density);
    const se = Math.sqrt(Math.max(variance, 0));
    const z = 1.96;
    return {
      lower: Math.max(0, estimate - z * se),
      upper: estimate + z * se,
    };
  };

  const updateThreshold = (index: number, nextValue: string) => {
    const parsed = Number.parseFloat(nextValue);
    setThresholds((current) =>
      current.map((value, i) => (i === index ? (Number.isFinite(parsed) ? parsed : 0) : value))
    );
  };

  const addThreshold = () => {
    setThresholds((current) => [...current, current[current.length - 1] + 0.5]);
  };

  const removeThreshold = (index: number) => {
    setThresholds((current) => current.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-zinc-950 border border-orange-900/40 rounded-lg shadow-xl p-5 sm:p-6 text-gray-300 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-widest text-zinc-300 border-l-2 border-orange-500 pl-3 font-semibold">
              4. Statistical Goodness-of-Fit & Percentile Depth Estimates
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono mt-1 pl-3.5">
              Left-censored Log-Likelihood, AIC/BIC rankings, and percentile depth estimates
            </p>
          </div>
        </div>

        {bestFit && (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-orange-400 text-xs font-mono font-bold">
            <Award className="w-4 h-4 text-orange-500" />
            <span>Optimal Fit: {bestFit.name}</span>
          </div>
        )}
      </div>

      {/* Executive Summary */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
            Censored Fraction
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-400 font-mono">
            {((results.censoredCount / results.totalCount) * 100).toFixed(1)}%
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            Share of values treated as left-censored below the reporting threshold.
          </p>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
            Median Depth (P50)
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-400 font-mono">
            {results.kde.percentiles.p50.toFixed(2)} mm
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            The depth at which half of the corrosion distribution is below.
          </p>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
            90th Percentile (P90)
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-400 font-mono">
            {results.kde.percentiles.p90.toFixed(2)} mm
          </div>
          <div className="mt-1 text-[10px] text-zinc-400 font-mono">
            95% CI: {approximateQuantileCi(0.9, results.kde.percentiles.p90).lower.toFixed(2)}–{approximateQuantileCi(0.9, results.kde.percentiles.p90).upper.toFixed(2)} mm
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            The upper-tail depth exceeded by only about 10% of the distribution.
          </p>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
            Exceedance (1.6 mm)
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-400 font-mono">
            {formatExceedance(results.kde.evaluateSurvival(1.6))}
          </div>
          <div className="mt-1 text-[10px] text-zinc-400 font-mono">
            95% CI: {formatProbabilityRange(
              approximateExceedanceCi(1.6).lower,
              approximateExceedanceCi(1.6).upper
            )}
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            Estimated share of defects above a common screening threshold.
          </p>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
            Largest Approved Observed Corrosion
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-400 font-mono">
            {maxObservedDepth > 0 ? `${maxObservedDepth.toFixed(2)} mm` : '—'}
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            Largest exact depth among approved corrosion rows after filtering invalid wall locations and non-approved statuses.
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="mt-4 overflow-x-auto border border-zinc-800 rounded bg-zinc-950">
        <table className="min-w-full divide-y divide-zinc-800 text-left text-xs font-mono">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-3.5 py-2.5 font-semibold text-zinc-300">Model / Distribution</th>
              <th className="px-3.5 py-2.5 font-semibold text-zinc-300">Fitted Parameters</th>
              <th className="px-3.5 py-2.5 font-semibold text-zinc-300">Log-Likelihood (ln L)</th>
              <th className="px-3.5 py-2.5 font-semibold text-zinc-300">AIC Score</th>
              <th className="px-3.5 py-2.5 font-semibold text-zinc-300">BIC Score</th>
              <th className="px-3.5 py-2.5 font-semibold text-zinc-300">Median (P50)</th>
              <th className="px-3.5 py-2.5 font-semibold text-zinc-300">P90 (mm)</th>
              <th className="px-3.5 py-2.5 font-semibold text-zinc-300">P95 (mm)</th>
              <th className="px-3.5 py-2.5 font-semibold text-zinc-300">P99 (mm)</th>
              <th className="px-3.5 py-2.5 font-semibold text-zinc-300">P(D &gt; 2.0mm)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-200">
            {/* Non-Parametric Left-Censored KDE Row */}
            <tr className="bg-orange-950/20 hover:bg-orange-950/30 font-semibold">
              <td className="px-3.5 py-2.5 text-orange-400 flex items-center gap-2 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded bg-orange-500" />
                <span>Non-Parametric Censored KDE</span>
              </td>
              <td className="px-3.5 py-2.5 text-zinc-300">
                h = {results.kde.bandwidth.toFixed(3)} mm (EM)
              </td>
              <td className="px-3.5 py-2.5 text-zinc-500">Non-Parametric</td>
              <td className="px-3.5 py-2.5 text-zinc-500">—</td>
              <td className="px-3.5 py-2.5 text-zinc-500">—</td>
              <td className="px-3.5 py-2.5 font-bold text-white">
                {results.kde.percentiles.p50.toFixed(2)} mm
              </td>
              <td className="px-3.5 py-2.5 text-orange-400">
                {results.kde.percentiles.p90.toFixed(2)} mm
              </td>
              <td className="px-3.5 py-2.5 text-orange-400">
                {results.kde.percentiles.p95.toFixed(2)} mm
              </td>
              <td className="px-3.5 py-2.5 text-orange-300 font-bold">
                {results.kde.percentiles.p99.toFixed(2)} mm
              </td>
              <td className="px-3.5 py-2.5 text-zinc-200">
                {(results.kde.evaluateSurvival(criticalDepth1) * 100).toFixed(1)}%
              </td>
            </tr>

            {/* Parametric Fits Rows */}
            {validFits.map((fit) => {
              const isBest = fit.type === results.bestFitType;
              const paramStr = Object.entries(fit.parameters)
                .map(([k, v]) => `${k} = ${v.toFixed(3)}`)
                .join(', ');

              return (
                <tr
                  key={fit.type}
                  className={`hover:bg-zinc-900 transition-colors ${
                    isBest ? 'bg-zinc-900/60' : 'bg-zinc-950'
                  }`}
                >
                  <td className="px-3.5 py-2.5 flex items-center gap-2 whitespace-nowrap">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: fit.color }}
                    />
                    <span className="font-semibold text-zinc-100">{fit.name}</span>
                    {isBest && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800">
                        Best Fit
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-zinc-300">{paramStr}</td>
                  <td className="px-3.5 py-2.5 text-zinc-300">
                    {fit.logLikelihood.toFixed(2)}
                  </td>
                  <td
                    className={`px-3.5 py-2.5 font-bold ${
                      isBest ? 'text-orange-400' : 'text-zinc-300'
                    }`}
                  >
                    {fit.aic.toFixed(2)}
                  </td>
                  <td className="px-3.5 py-2.5 text-zinc-300">
                    {fit.bic.toFixed(2)}
                  </td>
                  <td className="px-3.5 py-2.5 font-semibold text-zinc-100">
                    {fit.percentiles.p50.toFixed(2)} mm
                  </td>
                  <td className="px-3.5 py-2.5 text-zinc-300">
                    {fit.percentiles.p90.toFixed(2)} mm
                  </td>
                  <td className="px-3.5 py-2.5 text-zinc-300">
                    {fit.percentiles.p95.toFixed(2)} mm
                  </td>
                  <td className="px-3.5 py-2.5 text-zinc-200">
                    {fit.percentiles.p99.toFixed(2)} mm
                  </td>
                  <td className="px-3.5 py-2.5 text-zinc-300">
                    {(fit.evaluateSurvival(criticalDepth1) * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Engineering Insights & Failure Assessment */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              <span>Action-Threshold Exceedance</span>
            </div>
            <div className="flex items-center rounded border border-zinc-700 bg-zinc-950 p-0.5 text-[9px] font-mono">
              <button
                type="button"
                onClick={() => setDisplayMode('percent')}
                className={`px-2 py-1 rounded ${displayMode === 'percent' ? 'bg-orange-600 text-black font-bold' : 'text-zinc-400'}`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('count')}
                className={`px-2 py-1 rounded ${displayMode === 'count' ? 'bg-orange-600 text-black font-bold' : 'text-zinc-400'}`}
              >
                Count
              </button>
            </div>
          </div>
          <div className="mt-2 space-y-2 font-mono">
            {thresholds.map((threshold, index) => {
              const exceedance = results.kde.evaluateSurvival(threshold);
              return (
                <div key={`${threshold}-${index}`} className="flex items-center gap-2 text-[11px] text-zinc-200">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={threshold}
                    onChange={(e) => updateThreshold(index, e.target.value)}
                    className="w-16 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-orange-300 text-right outline-none focus:border-orange-500"
                    aria-label={`Threshold ${index + 1} in mm`}
                  />
                  <span className="flex-1">mm</span>
                  <span className="flex-1 text-right text-orange-400 font-bold">{formatExceedance(exceedance)}</span>
                  {thresholds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeThreshold(index)}
                      className="text-zinc-500 hover:text-zinc-200"
                      aria-label={`Remove threshold ${index + 1}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={addThreshold}
              className="px-2 py-1 border border-zinc-700 bg-zinc-950 text-[9px] uppercase tracking-wider text-zinc-300 hover:border-orange-500 hover:text-orange-300 transition-colors rounded"
            >
              Add Threshold
            </button>
            <p className="text-[11px] text-zinc-500 font-mono flex-1 text-right">
              {displayMode === 'percent'
                ? 'Estimated share above each action level.'
                : 'Modeled defect count above each action level.'}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="flex items-center space-x-2 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
            <Gauge className="w-4 h-4 text-orange-500" />
            <span>90th Percentile Depth (P90)</span>
          </div>
          <div className="text-xl font-bold text-orange-400 font-mono mt-2">
            {results.kde.percentiles.p90.toFixed(2)} mm
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            90% of corrosion depths are below this level; the upper tail is more severe than the median.
          </p>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span>50% Wall Loss Exceedance</span>
            </div>
            <div className="flex items-center rounded border border-zinc-700 bg-zinc-950 p-0.5 text-[9px] font-mono">
              <button
                type="button"
                onClick={() => setDisplayMode('percent')}
                className={`px-2 py-1 rounded ${displayMode === 'percent' ? 'bg-orange-600 text-black font-bold' : 'text-zinc-400'}`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('count')}
                className={`px-2 py-1 rounded ${displayMode === 'count' ? 'bg-orange-600 text-black font-bold' : 'text-zinc-400'}`}
              >
                Count
              </button>
            </div>
          </div>
          <div className="text-xl font-bold text-orange-400 font-mono mt-2">
            {formatExceedance(results.kde.evaluateSurvival(criticalDepthWT50))}
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            {displayMode === 'percent'
              ? `Probability of exceeding 50% Nominal Wall Thickness (${criticalDepthWT50.toFixed(2)} mm).`
              : `Estimated defect count above 50% Nominal Wall Thickness (${criticalDepthWT50.toFixed(2)} mm) based on modeled exceedance.`}
          </p>
        </div>
      </div>
    </div>
  );
};
