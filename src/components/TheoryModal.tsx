import React from 'react';
import { BookOpen, CheckCircle, Info, ShieldCheck, X } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans">
      <div className="bg-zinc-950 border border-orange-900/40 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-semibold border-l-2 border-orange-500 pl-2.5">
                Pipeline Integrity & Left-Censored KDE Methodology
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5 pl-3">
                Mathematical basis for 0.80 mm threshold handling & censored distribution fitting
              </p>
            </div>
          </div>

          <button
            id="close-theory-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-5 text-xs text-zinc-300 space-y-4 leading-relaxed font-sans">
          {/* Section 1 */}
          <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
            <h4 className="text-xs font-mono uppercase tracking-wider text-orange-400 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
              <span>1. Why Left-Censoring at 0.80 mm?</span>
            </h4>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              In oil & gas pipeline integrity (ILI tool specifications such as MFL and Ultrasonic tools), shallow external surface anomalies below <strong>0.80 mm (or nominal sizing resolution)</strong> are classified as <em>nominal wall roughness or unsized etching</em>. 
            </p>
            <p className="mt-2 text-zinc-500 font-mono text-[11px] leading-relaxed">
              Discarding these points causes severe <strong>selection bias</strong> (over-predicting failure rates and mean depth), while replacing them with 0 or 0.80 mm distorts the variance. Left-censoring treats these observations as existing in the interval <code className="text-orange-400">[0, 0.80 mm]</code> with known probability mass without false precision.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
            <h4 className="text-xs font-mono uppercase tracking-wider text-orange-400">
              2. Non-Parametric Left-Censored KDE (EM-Algorithm)
            </h4>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              Standard Kernel Density Estimation assumes exact coordinates for all points. For left-censored data, an <strong>Expectation-Maximization (EM) algorithm</strong> iteratively distributes the censored mass <code className="text-orange-400 font-mono">N_cens</code> over the nominal interval <code className="text-orange-400 font-mono">[0, c]</code> proportional to the estimated conditional density:
            </p>
            <div className="mt-2 p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-orange-400">
              f^(t+1)(x) = (1 / N) * [ Σ K_h(x - x_i) + N_cens * ∫_0^c w^(t)(u) * K_h(x - u) du ]
            </div>
            <p className="mt-2 text-zinc-500 font-mono text-[11px] leading-relaxed">
              This guarantees that the resulting non-parametric model integrates to exactly 1.0 and smoothly reflects the true underlying defect distribution across both nominal and severe pitting regimes.
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
            <h4 className="text-xs font-mono uppercase tracking-wider text-orange-400">
              3. Censored Maximum Likelihood Estimation (MLE)
            </h4>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              Theoretical candidates (<strong>Lognormal</strong>, <strong>Gamma</strong>, and <strong>Weibull</strong>) are fitted by maximizing the censored log-likelihood function:
            </p>
            <div className="mt-2 p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-orange-400">
              ln L(θ) = N_cens * ln F(c; θ) + Σ_(obs) ln f(x_i; θ)
            </div>
            <p className="mt-2 text-zinc-500 font-mono text-[11px] leading-relaxed">
              Models are ranked using <strong>Akaike Information Criterion (AIC)</strong> and <strong>Bayesian Information Criterion (BIC)</strong> to identify which parametric form best reflects pipeline degradation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
