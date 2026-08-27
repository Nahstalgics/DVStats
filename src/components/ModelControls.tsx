import React from 'react';
import {
  Activity,
  BarChart2,
  Check,
  CheckSquare,
  Cpu,
  Layers,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Square,
  TrendingUp,
} from 'lucide-react';
import {
  CensoringConfig,
  KDEConfig,
  ParametricDistributionType,
  ParametricModelFit,
  PlotType,
} from '../types';

interface ModelControlsProps {
  censoringConfig: CensoringConfig;
  onUpdateCensoringConfig: (config: CensoringConfig) => void;
  kdeConfig: KDEConfig;
  onUpdateKdeConfig: (config: KDEConfig) => void;
  parametricFits: Record<ParametricDistributionType, ParametricModelFit> | null;
  onToggleParametricDistribution: (type: ParametricDistributionType) => void;
  plotType: PlotType;
  onChangePlotType: (type: PlotType) => void;
  onRunModel: () => void;
  isCalculating: boolean;
}

export const ModelControls: React.FC<ModelControlsProps> = ({
  censoringConfig,
  onUpdateCensoringConfig,
  kdeConfig,
  onUpdateKdeConfig,
  parametricFits,
  onToggleParametricDistribution,
  plotType,
  onChangePlotType,
  onRunModel,
  isCalculating,
}) => {
  return (
    <div className="bg-zinc-950 border border-orange-900/40 rounded-lg shadow-xl p-5 sm:p-6 text-gray-300 font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-widest text-zinc-300 border-l-2 border-orange-500 pl-3 font-semibold">
              2. Censoring Threshold & Modeling Parameters
            </h2>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          id="run-kde-model-btn"
          type="button"
          onClick={onRunModel}
          disabled={isCalculating}
          className="w-full md:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-black font-bold rounded text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isCalculating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Computing Models...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Run KDE Model</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Left-Censoring Nominal Threshold (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900/50 p-4 rounded border border-orange-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-widest text-orange-500 font-mono">
                Censoring Threshold
              </label>
              <span className="font-mono text-xs text-orange-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {censoringConfig.threshold.toFixed(2)}mm
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
                  <span>0.20mm</span>
                  <span className="text-orange-500 font-bold">0.80mm (Nominal Limit)</span>
                  <span>2.00mm</span>
                </div>
                <input
                  id="threshold-slider"
                  type="range"
                  min="0.20"
                  max="2.00"
                  step="0.05"
                  value={censoringConfig.threshold}
                  onChange={(e) =>
                    onUpdateCensoringConfig({
                      ...censoringConfig,
                      threshold: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-orange-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  id="auto-censor-checkbox"
                  type="checkbox"
                  checked={censoringConfig.autoCensorBelowThreshold}
                  onChange={(e) =>
                    onUpdateCensoringConfig({
                      ...censoringConfig,
                      autoCensorBelowThreshold: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded accent-orange-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                />
                <label
                  htmlFor="auto-censor-checkbox"
                  className="text-[11px] font-mono text-zinc-300 cursor-pointer select-none"
                >
                  Auto-censor numeric values &le; threshold
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Middle Column: Non-Parametric KDE Engine (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900/50 p-4 rounded border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-widest text-orange-500 font-mono">
                KDE Kernel & Smoothing
              </label>
              <span className="text-[9px] uppercase font-mono text-orange-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                EM Algorithm
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {/* Bandwidth Selector */}
              <div>
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-1">
                  <span>Bandwidth Rule</span>
                  <span className="text-orange-400 font-mono">
                    {kdeConfig.bandwidthMultiplier.toFixed(2)}x
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="bw-silverman-btn"
                    type="button"
                    onClick={() =>
                      onUpdateKdeConfig({
                        ...kdeConfig,
                        bandwidthMethod: 'silverman',
                      })
                    }
                    className={`py-1.5 px-2 text-xs font-mono uppercase tracking-wider rounded border transition-colors ${
                      kdeConfig.bandwidthMethod === 'silverman'
                        ? 'bg-zinc-900 border-orange-500 text-orange-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Silverman's Rule
                  </button>
                  <button
                    id="bw-scott-btn"
                    type="button"
                    onClick={() =>
                      onUpdateKdeConfig({
                        ...kdeConfig,
                        bandwidthMethod: 'scott',
                      })
                    }
                    className={`py-1.5 px-2 text-xs font-mono uppercase tracking-wider rounded border transition-colors ${
                      kdeConfig.bandwidthMethod === 'scott'
                        ? 'bg-zinc-900 border-orange-500 text-orange-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Scott's Rule
                  </button>
                </div>

                {/*
                  Tidbit: the bandwidth multiplier acts like a narrowing factor.
                  Values below 1.0 make the KDE curve tighter and more responsive to local variation;
                  values above 1.0 smooth the density more aggressively for a cleaner executive view.
                */}
                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                    <span>Narrow (0.5x)</span>
                    <span>Smooth (2.5x)</span>
                  </div>
                  <input
                    id="bw-multiplier-slider"
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={kdeConfig.bandwidthMultiplier}
                    onChange={(e) =>
                      onUpdateKdeConfig({
                        ...kdeConfig,
                        bandwidthMultiplier: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-orange-500 cursor-pointer h-1.5 bg-zinc-800 rounded mt-1"
                  />
                  <div className="mt-1 text-[9px] text-zinc-500 font-mono">
                    Narrowing factor: lower = tighter fit, higher = smoother curve. Typical start: 1.0–1.5x.
                  </div>
                </div>
              </div>

              {/* Kernel Function */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono block mb-1">
                  Kernel Smoothing Shape
                </label>
                <select
                  id="select-kernel-type"
                  value={kdeConfig.kernel}
                  onChange={(e) =>
                    onUpdateKdeConfig({
                      ...kdeConfig,
                      kernel: e.target.value as any,
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs p-2 rounded focus:border-orange-500 outline-none text-zinc-200 font-mono"
                >
                  <option value="gaussian">Gaussian Kernel (Standard / Smooth)</option>
                  <option value="epanechnikov">Epanechnikov Kernel (Optimal MSE)</option>
                  <option value="triangular">Triangular Kernel</option>
                  <option value="box">Uniform / Box Kernel</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Comparative Models (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900/50 p-4 rounded border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-widest text-orange-500 font-mono">
              Comparative Models (MLE)
            </label>
            <span className="text-[10px] text-zinc-500 font-mono">Censored Fit</span>
          </div>

          <div className="space-y-2 mt-3">
            {/* Lognormal */}
            <label
              onClick={() => onToggleParametricDistribution('lognormal')}
              className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                parametricFits?.lognormal?.enabled
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                <span className="text-xs text-white font-light">Log-Normal</span>
              </div>
              <input
                type="checkbox"
                checked={!!parametricFits?.lognormal?.enabled}
                onChange={() => {}}
                className="accent-orange-500"
              />
            </label>

            {/* Gamma */}
            <label
              onClick={() => onToggleParametricDistribution('gamma')}
              className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                parametricFits?.gamma?.enabled
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-xs text-white font-light">Gamma Dist.</span>
              </div>
              <input
                type="checkbox"
                checked={!!parametricFits?.gamma?.enabled}
                onChange={() => {}}
                className="accent-orange-500"
              />
            </label>

            {/* Weibull */}
            <label
              onClick={() => onToggleParametricDistribution('weibull')}
              className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                parametricFits?.weibull?.enabled
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                <span className="text-xs text-white font-light">Weibull Dist.</span>
              </div>
              <input
                type="checkbox"
                checked={!!parametricFits?.weibull?.enabled}
                onChange={() => {}}
                className="accent-orange-500"
              />
            </label>

            {/* Exponential */}
            <label
              onClick={() => onToggleParametricDistribution('exponential')}
              className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                parametricFits?.exponential?.enabled
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
                <span className="text-xs text-white font-light">Exponential</span>
              </div>
              <input
                type="checkbox"
                checked={!!parametricFits?.exponential?.enabled}
                onChange={() => {}}
                className="accent-orange-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Plot Type Tabs (Density / Histogram / Exceedance) */}
      <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] uppercase tracking-widest text-orange-500 font-mono mr-1">
            Display Mode:
          </span>
          <div className="flex p-1 bg-zinc-900 rounded border border-zinc-800">
            <button
              id="plot-tab-pdf"
              type="button"
              onClick={() => onChangePlotType('pdf')}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer ${
                plotType === 'pdf'
                  ? 'bg-orange-600 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Density f(x)
            </button>
            <button
              id="plot-tab-histogram"
              type="button"
              onClick={() => onChangePlotType('histogram')}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer ${
                plotType === 'histogram'
                  ? 'bg-orange-600 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Histogram
            </button>
            <button
              id="plot-tab-survival"
              type="button"
              onClick={() => onChangePlotType('survival')}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors cursor-pointer ${
                plotType === 'survival'
                  ? 'bg-orange-600 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Exceedance P(X &gt; x)
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm" />
            <span>KDE (Censored)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
            <span>Lognormal</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span>Gamma</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
            <span>Weibull</span>
          </div>
        </div>
      </div>
    </div>
  );
};
