import React from 'react';
import { Award, BarChart3, ChevronRight, Gauge, ShieldAlert, Table } from 'lucide-react';
import { ModelRunResults, ParametricDistributionType, ParametricModelFit } from '../types';

interface ModelMetricsTableProps {
  results: ModelRunResults;
  wallThickness: number;
}

export const ModelMetricsTable: React.FC<ModelMetricsTableProps> = ({
  results,
  wallThickness,
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
          <div className="flex items-center space-x-2 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
            <Gauge className="w-4 h-4 text-orange-500" />
            <span>95th Percentile Depth (P95)</span>
          </div>
          <div className="text-xl font-bold text-orange-400 font-mono mt-2">
            {results.kde.percentiles.p95.toFixed(2)} mm
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            95% of all outer surface corrosions (including nominals) do not exceed this depth.
          </p>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="flex items-center space-x-2 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            <span>Severe Corrosion Risk (&gt; 2.0 mm)</span>
          </div>
          <div className="text-xl font-bold text-orange-400 font-mono mt-2">
            {(results.kde.evaluateSurvival(2.0) * 100).toFixed(1)}%
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            Estimated probability of encountering a defect depth greater than 2.0 mm across the line.
          </p>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="flex items-center space-x-2 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
            <BarChart3 className="w-4 h-4 text-orange-500" />
            <span>50% Wall Loss Exceedance</span>
          </div>
          <div className="text-xl font-bold text-orange-400 font-mono mt-2">
            {(results.kde.evaluateSurvival(criticalDepthWT50) * 100).toFixed(2)}%
          </div>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            Probability of exceeding 50% Nominal Wall Thickness ({criticalDepthWT50.toFixed(2)} mm).
          </p>
        </div>
      </div>
    </div>
  );
};
