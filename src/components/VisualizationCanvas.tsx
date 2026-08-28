import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Clipboard,
  Copy,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  RefreshCw,
  Share2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  ModelRunResults,
  ParametricDistributionType,
  ParametricModelFit,
  PlotType,
} from '../types';

interface VisualizationCanvasProps {
  results: ModelRunResults | null;
  plotType: PlotType;
  wallThickness: number;
}

export const VisualizationCanvas: React.FC<VisualizationCanvasProps> = ({
  results,
  plotType,
  wallThickness,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [exportTheme, setExportTheme] = useState<'dark' | 'light' | 'transparent'>('dark');
  const [exportScale, setExportScale] = useState<number>(2); // 2x default for crisp export
  const [hoverData, setHoverData] = useState<{
    x: number;
    density: number;
    models: { name: string; color: string; val: number }[];
  } | null>(null);

  // Re-draw chart on canvas whenever results, plotType, or dimensions change
  const drawChart = (targetCanvas: HTMLCanvasElement, theme: 'dark' | 'light' | 'transparent', scale: number = 2) => {
    if (!results) return;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const width = targetCanvas.width / scale;
    const height = targetCanvas.height / scale;

    ctx.save();
    ctx.scale(scale, scale);

    // Color Palette based on theme
    const isDark = theme === 'dark';
    const isTransparent = theme === 'transparent';
    
    const bgColor = isTransparent ? 'transparent' : isDark ? '#0d0f14' : '#ffffff';
    const plotBgColor = isTransparent ? 'rgba(19, 22, 29, 0.7)' : isDark ? '#12151d' : '#f8fafc';
    const textColor = isDark || isTransparent ? '#f1f5f9' : '#0f172a';
    const textMuted = isDark || isTransparent ? '#94a3b8' : '#64748b';
    const gridColor = isDark || isTransparent ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.15)';
    const histFillColor = isDark || isTransparent ? 'rgba(51, 65, 85, 0.45)' : 'rgba(203, 213, 225, 0.6)';
    const histBorderColor = isDark || isTransparent ? 'rgba(100, 116, 139, 0.6)' : '#94a3b8';
    const censoredZoneColor = isDark || isTransparent ? 'rgba(255, 107, 0, 0.14)' : 'rgba(255, 107, 0, 0.12)';
    const censoredLineColor = '#ff6b00';

    // Clear background
    ctx.clearRect(0, 0, width, height);
    if (!isTransparent) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Chart margins
    const margin = { top: 60, right: 140, bottom: 65, left: 68 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const candidateTypes: ParametricDistributionType[] = ['lognormal', 'gamma', 'weibull', 'exponential'];

    // Draw Plot Background
    ctx.fillStyle = plotBgColor;
    ctx.fillRect(margin.left, margin.top, chartWidth, chartHeight);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(margin.left, margin.top, chartWidth, chartHeight);

    // Calculate Domain (X) & Range (Y)
    const threshold = results.threshold;
    const maxObserved = results.observedDepths.length > 0 ? Math.max(...results.observedDepths) : threshold * 3;
    const xMax = Math.max(threshold * 4, maxObserved * 1.25);
    const xMin = 0;

    let yMax = 0.5;
    if (plotType === 'pdf') {
      const kdeMax = Math.max(...results.kde.points.map((p) => p.density));
      const histMax = Math.max(...results.histogramBins.map((b) => b.density));
      yMax = Math.max(kdeMax, histMax, 0.1) * 1.25;
    } else if (plotType === 'histogram') {
      const histMax = Math.max(...results.histogramBins.map((b) => b.density));
      yMax = Math.max(histMax, 0.1) * 1.35;
    } else {
      yMax = 1.05; // for Survival / Exceedance
    }

    // Coordinate transforms
    const scaleX = (x: number) => margin.left + ((x - xMin) / (xMax - xMin)) * chartWidth;
    const scaleY = (y: number) => margin.top + chartHeight - (y / yMax) * chartHeight;

    // 1. Shaded Left-Censored Nominal Zone [0, threshold]
    const censX0 = scaleX(0);
    const censX1 = scaleX(threshold);
    ctx.fillStyle = censoredZoneColor;
    ctx.fillRect(censX0, margin.top, censX1 - censX0, chartHeight);

    // Subtle hatch lines in censored zone
    ctx.save();
    ctx.beginPath();
    ctx.rect(censX0, margin.top, censX1 - censX0, chartHeight);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 107, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let h = -chartHeight; h < chartWidth + chartHeight; h += 14) {
      ctx.beginPath();
      ctx.moveTo(margin.left + h, margin.top);
      ctx.lineTo(margin.left + h + chartHeight, margin.top + chartHeight);
      ctx.stroke();
    }
    ctx.restore();

    // Nominal Threshold Vertical Line
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = censoredLineColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(censX1, margin.top);
    ctx.lineTo(censX1, margin.top + chartHeight);
    ctx.stroke();
    ctx.restore();

    // Text annotation for Censored Zone
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillStyle = censoredLineColor;
    ctx.textAlign = 'center';
    ctx.fillText(`NOMINAL / CENSORED (≤ ${threshold.toFixed(2)}mm)`, (censX0 + censX1) / 2, margin.top + 18);

    // 2. Gridlines & Ticks
    const numXTicks = 8;
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = textMuted;
    ctx.textAlign = 'center';

    for (let i = 0; i <= numXTicks; i++) {
      const val = (i / numXTicks) * xMax;
      const xPos = scaleX(val);
      
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xPos, margin.top);
      ctx.lineTo(xPos, margin.top + chartHeight);
      ctx.stroke();

      ctx.fillText(`${val.toFixed(1)}`, xPos, margin.top + chartHeight + 16);
    }

    const numYTicks = 5;
    ctx.textAlign = 'right';
    for (let i = 0; i <= numYTicks; i++) {
      const val = (i / numYTicks) * yMax;
      const yPos = scaleY(val);

      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, yPos);
      ctx.lineTo(margin.left + chartWidth, yPos);
      ctx.stroke();

      ctx.fillText(val.toFixed(2), margin.left - 8, yPos + 3.5);
    }

    // 3. Wall Thickness Reference Markers (e.g. 20% WT, 50% WT)
    if (wallThickness > 0) {
      const wt20 = wallThickness * 0.2;
      const wt50 = wallThickness * 0.5;

      [
        { val: wt20, label: '20% WT', color: 'rgba(234, 179, 8, 0.45)' },
        { val: wt50, label: '50% WT (Critical)', color: 'rgba(239, 68, 68, 0.6)' },
      ].forEach((wtRef) => {
        if (wtRef.val <= xMax) {
          const xPos = scaleX(wtRef.val);
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = wtRef.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(xPos, margin.top);
          ctx.lineTo(xPos, margin.top + chartHeight);
          ctx.stroke();

          ctx.font = 'bold 9px system-ui, sans-serif';
          ctx.fillStyle = wtRef.color;
          ctx.textAlign = 'left';
          ctx.fillText(wtRef.label, xPos + 4, margin.top + 34);
          ctx.restore();
        }
      });
    }

    // 4. Histogram Bars (PDF and Histogram modes)
    if (plotType === 'pdf' || plotType === 'histogram') {
      results.histogramBins.forEach((bin) => {
        const x0 = scaleX(bin.x0);
        const x1 = scaleX(bin.x1);
        const yTop = scaleY(bin.density);
        const barWidth = Math.max(1, x1 - x0 - 1);
        const barHeight = margin.top + chartHeight - yTop;

        ctx.fillStyle = bin.isCensoredBin ? 'rgba(255, 107, 0, 0.25)' : histFillColor;
        ctx.fillRect(x0 + 0.5, yTop, barWidth, barHeight);

        ctx.strokeStyle = bin.isCensoredBin ? 'rgba(255, 107, 0, 0.6)' : histBorderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, yTop, barWidth, barHeight);
      });
    }

    // 5. Draw Parametric Models First (Background layers) - skip in histogram mode to keep it simple
    if (plotType !== 'histogram') {
      candidateTypes.forEach((dtype) => {
        const fit = results.parametricFits[dtype];
        if (fit && fit.enabled) {
          ctx.save();
          ctx.strokeStyle = fit.color;
          ctx.lineWidth = 2.2;

          if (dtype === 'gamma') ctx.setLineDash([6, 3]);
          else if (dtype === 'weibull') ctx.setLineDash([3, 3]);
          else if (dtype === 'exponential') ctx.setLineDash([8, 2, 2, 2]);

          ctx.beginPath();
          let isFirst = true;

          for (let i = 0; i <= 200; i++) {
            const x = (i / 200) * xMax;
            let yVal = 0;
            if (plotType === 'pdf') yVal = fit.evaluatePdf(x);
            else yVal = fit.evaluateSurvival(x);

            const px = scaleX(x);
            const py = scaleY(yVal);

            if (isFirst) {
              ctx.moveTo(px, py);
              isFirst = false;
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // 6. Draw Primary Non-Parametric Left-Censored KDE Curve (Highlighted in Safety Orange)
    if (plotType !== 'histogram') {
      ctx.save();
      ctx.strokeStyle = '#ff7700'; // Safety orange
      ctx.lineWidth = 3.6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Outer glow for dark theme
      if (isDark || isTransparent) {
        ctx.shadowColor = 'rgba(255, 107, 0, 0.45)';
        ctx.shadowBlur = 10;
      }

      ctx.beginPath();
      let isFirstKde = true;

      results.kde.points.forEach((pt) => {
        if (pt.x <= xMax) {
          let yVal = 0;
          if (plotType === 'pdf') yVal = pt.density;
          else yVal = pt.survival;

          const px = scaleX(pt.x);
          const py = scaleY(yVal);

          if (isFirstKde) {
            ctx.moveTo(px, py);
            isFirstKde = false;
          } else {
            ctx.lineTo(px, py);
          }
        }
      });
      ctx.stroke();
      ctx.restore();
    }

    // 7. Title and Axis Labels
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    const viewTitle =
      plotType === 'pdf'
        ? 'Left-Censored Probability Density Function f(d)'
        : plotType === 'histogram'
          ? 'Simple Depth Histogram (Censored Observations Included)'
          : 'Exceedance Reliability / Burst Survival P(D > d)';

    ctx.fillText(`Pipeline OD Corrosion Depth: ${viewTitle}`, margin.left, margin.top - 32);

    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = textMuted;
    ctx.fillText(
      `Total: ${results.totalCount} defects | Left-Censored Nominal (≤ ${threshold.toFixed(2)}mm): ${results.censoredCount} (${((results.censoredCount / results.totalCount) * 100).toFixed(1)}%) | Bandwidth: ${results.kde.bandwidth.toFixed(3)}mm`,
      margin.left,
      margin.top - 14
    );

    // X-Axis Label
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText('Corrosion Pit Depth d (mm)', margin.left + chartWidth / 2, height - 18);

    // Y-Axis Label (Rotated)
    ctx.save();
    ctx.translate(margin.left - 46, margin.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    const yAxisLabel =
      plotType === 'pdf'
        ? 'Probability Density f(d) [1/mm]'
        : plotType === 'histogram'
          ? 'Relative Frequency Density'
          : 'Exceedance Probability P(D > d)';
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    // 8. Legend Box (Right side)
    const legendX = width - margin.right + 12;
    let legendY = margin.top + 8;

    ctx.fillStyle = isDark || isTransparent ? '#171a23' : '#f1f5f9';
    ctx.fillRect(legendX - 6, legendY - 6, margin.right - 14, 150);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 6, legendY - 6, margin.right - 14, 150);

    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillStyle = textMuted;
    ctx.textAlign = 'left';
    ctx.fillText('ACTIVE MODELS', legendX, legendY + 8);
    legendY += 22;

    // Non-Parametric KDE Legend item
    ctx.strokeStyle = '#ff7700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY);
    ctx.lineTo(legendX + 16, legendY);
    ctx.stroke();

    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillStyle = '#ff922b';
    ctx.fillText('Censored KDE', legendX + 22, legendY + 3.5);
    legendY += 20;

    // Parametric Legend items
    candidateTypes.forEach((dtype) => {
      const fit = results.parametricFits[dtype];
      if (fit && fit.enabled) {
        ctx.strokeStyle = fit.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(legendX, legendY);
        ctx.lineTo(legendX + 16, legendY);
        ctx.stroke();

        ctx.font = '9px system-ui, sans-serif';
        ctx.fillStyle = textColor;
        const nameShort =
          dtype === 'lognormal'
            ? 'Lognormal'
            : dtype === 'gamma'
            ? 'Gamma'
            : dtype === 'weibull'
            ? 'Weibull'
            : 'Exponential';
        ctx.fillText(`${nameShort} (AIC: ${fit.aic.toFixed(0)})`, legendX + 22, legendY + 3.5);
        legendY += 18;
      }
    });

    if (plotType === 'pdf' || plotType === 'histogram') {
      ctx.fillStyle = histFillColor;
      ctx.fillRect(legendX, legendY - 4, 14, 10);
      ctx.strokeStyle = histBorderColor;
      ctx.strokeRect(legendX, legendY - 4, 14, 10);
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = textMuted;
      ctx.fillText('Observed Pits', legendX + 22, legendY + 4);
    }

    ctx.restore();
  };

  // Re-draw main preview canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !results) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;

    const width = rect.width > 200 ? rect.width : 800;
    const height = 480;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    drawChart(canvas, 'dark', dpr);
  }, [results, plotType, wallThickness]);

  // Handle Copy to Clipboard as PNG
  const handleCopyToClipboard = async () => {
    if (!results) return;

    const exportCanvas = document.createElement('canvas');
    const width = 1200;
    const height = 700;
    const scale = exportScale;

    exportCanvas.width = width * scale;
    exportCanvas.height = height * scale;

    drawChart(exportCanvas, exportTheme, scale);

    try {
      exportCanvas.toBlob(async (blob) => {
        if (!blob) return;
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }, 'image/png');
    } catch (err) {
      console.error('Clipboard copy error:', err);
      // Fallback: create temporary download link
      handleDownloadImage();
    }
  };

  // Handle Download High-Res PNG
  const handleDownloadImage = () => {
    if (!results) return;

    const exportCanvas = document.createElement('canvas');
    const width = 1200;
    const height = 700;
    const scale = exportScale;

    exportCanvas.width = width * scale;
    exportCanvas.height = height * scale;

    drawChart(exportCanvas, exportTheme, scale);

    const link = document.createElement('a');
    link.download = `pipeline_corrosion_censored_kde_${plotType}_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  // Mouse hover tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!results || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const xMouse = e.clientX - rect.left;
    const width = rect.width;
    const margin = { top: 60, right: 140, bottom: 65, left: 68 };
    const chartWidth = width - margin.left - margin.right;

    if (xMouse < margin.left || xMouse > margin.left + chartWidth) {
      setHoverData(null);
      return;
    }

    const threshold = results.threshold;
    const maxObserved = results.observedDepths.length > 0 ? Math.max(...results.observedDepths) : threshold * 3;
    const xMax = Math.max(threshold * 4, maxObserved * 1.25);

    const depthVal = ((xMouse - margin.left) / chartWidth) * xMax;

    const activeModels: { name: string; color: string; val: number }[] = [];

    // KDE value
    let kdeVal = 0;
    if (plotType === 'pdf') kdeVal = results.kde.evaluatePdf(depthVal);
    else kdeVal = results.kde.evaluateSurvival(depthVal);
    activeModels.push({ name: 'Censored KDE', color: '#ff7700', val: kdeVal });

    // Parametric models
    const candidateTypes: ParametricDistributionType[] = ['lognormal', 'gamma', 'weibull', 'exponential'];
    candidateTypes.forEach((t) => {
      const fit = results.parametricFits[t];
      if (fit && fit.enabled) {
        let v = 0;
        if (plotType === 'pdf') v = fit.evaluatePdf(depthVal);
        else v = fit.evaluateSurvival(depthVal);
        activeModels.push({ name: fit.name, color: fit.color, val: v });
      }
    });

    setHoverData({
      x: depthVal,
      density: kdeVal,
      models: activeModels,
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div className="bg-zinc-950 border border-orange-900/40 rounded-lg shadow-xl p-5 text-gray-300 font-sans">
      {/* Header bar with Copy / Download controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs uppercase tracking-widest text-zinc-300 border-l-2 border-orange-500 pl-3 font-semibold">
                3. Non-Parametric Model & Candidate Distribution Comparison
              </h3>
              <span className="text-[10px] uppercase font-mono font-bold text-black bg-orange-500 px-2 py-0.5 rounded">
                Saveable / Copyable
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-1 pl-3.5">
              High-resolution density visualization with left-censored region annotation and parametric overlays
            </p>
          </div>
        </div>

        {/* Action Buttons: Copy Image & Download */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Copy Image Button */}
          <button
            id="copy-image-btn"
            type="button"
            onClick={handleCopyToClipboard}
            className={`flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer ${
              copied
                ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : 'bg-orange-600 hover:bg-orange-500 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Copied PNG!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Image</span>
              </>
            )}
          </button>

          {/* Download Image Button */}
          <button
            id="download-image-btn"
            type="button"
            onClick={handleDownloadImage}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-mono rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-500" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      {/* Canvas Display */}
      <div
        ref={containerRef}
        className="mt-4 relative bg-zinc-950 rounded border border-zinc-800 overflow-hidden flex items-center justify-center min-h-[480px]"
      >
        {!results ? (
          <div className="text-center p-8">
            <div className="w-12 h-12 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500 mx-auto mb-3 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">Awaiting Model Execution</h4>
            <p className="text-xs text-zinc-500 font-mono mt-1 max-w-sm">
              Click <strong className="text-orange-500">"Run KDE Model"</strong> above to compute the left-censored non-parametric density and parametric candidates.
            </p>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="cursor-crosshair w-full block"
            />

            {/* Hover Telemetry Overlay */}
            {hoverData && (
              <div className="absolute top-3 left-4 bg-zinc-950/95 backdrop-blur-md border border-orange-500/50 rounded p-2.5 text-xs text-zinc-200 font-mono shadow-2xl pointer-events-none z-20">
                <div className="text-orange-400 font-bold border-b border-zinc-800 pb-1 mb-1.5 flex items-center justify-between gap-4">
                  <span>Depth: {hoverData.x.toFixed(3)} mm</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    {hoverData.x <= results.threshold ? '⚠ Nominal Zone' : 'Sized Pit'}
                  </span>
                </div>
                <div className="space-y-1">
                  {hoverData.models.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                      <span className="flex items-center space-x-1.5 text-zinc-400">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                        <span>{m.name}:</span>
                      </span>
                      <span className="font-bold text-white">{m.val.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Model Footnote & Interpretation */}
      {results && (
        <div className="mt-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] font-mono text-zinc-500 gap-2 px-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>
              Left-Censored at <strong className="text-zinc-300">{results.threshold.toFixed(2)}mm</strong> (nominal sizing threshold). Censored density mass is redistributed via EM.
            </span>
          </div>
          <div className="text-zinc-500 font-mono">
            Lowest AIC Model:{' '}
            <span className="text-orange-400 font-bold uppercase">{results.bestFitType}</span>
          </div>
        </div>
      )}
    </div>
  );
};
