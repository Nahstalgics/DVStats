import React from 'react';
import { BookOpen, Code } from 'lucide-react';

interface HeaderProps {
  onOpenPythonModal: () => void;
  onOpenTheoryModal: () => void;
  isModelReady: boolean;
  totalRecords: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPythonModal,
  onOpenTheoryModal,
  isModelReady,
  totalRecords,
}) => {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-orange-900/40 bg-zinc-950 text-gray-300 font-sans sticky top-0 z-30 shadow-2xl backdrop-blur-md">
      {/* Brand / Title */}
      <div className="flex items-center space-x-4 mb-3 sm:mb-0">
        <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.3)]">
          <span className="text-black font-bold text-xl">K</span>
        </div>
        <div>
          <h1 className="text-xl font-medium tracking-tight text-white flex items-center gap-2">
            <span>CENSORED-KDE</span>
            <span className="text-orange-500 font-light italic">Pipeline Analysis</span>
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
            OD Pipeline Integrity · 0.80mm Left-Censored Non-Parametric & MLE Framework
          </p>
        </div>
      </div>

      {/* Quick Actions & Telemetry */}
      <div className="flex flex-wrap items-center space-x-3 sm:space-x-4 w-full sm:w-auto justify-end">
        {/* Status Telemetry */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest text-orange-500/60 font-mono">Status</span>
          <span className="text-xs font-mono text-green-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {isModelReady ? `ENGINE_READY_${totalRecords}_PTS` : 'ENGINE_STANDBY'}
          </span>
        </div>

        {/* Python Code Export Button */}
        <button
          id="view-python-script-btn"
          type="button"
          onClick={onOpenPythonModal}
          className="px-3 py-1.5 border border-orange-500/50 text-orange-500 text-xs font-mono uppercase tracking-wider hover:bg-orange-500/10 transition-colors rounded flex items-center gap-1.5 cursor-pointer"
          title="Generate Python script using SciPy and Matplotlib"
        >
          <Code className="w-3.5 h-3.5 text-orange-500" />
          <span>Python (.py)</span>
        </button>

        {/* Theory / Methodology Button */}
        <button
          id="view-theory-btn"
          type="button"
          onClick={onOpenTheoryModal}
          className="px-3 py-1.5 border border-zinc-800 text-zinc-400 text-xs font-mono uppercase tracking-wider hover:bg-zinc-900 hover:text-zinc-200 transition-colors rounded flex items-center gap-1.5 cursor-pointer"
          title="Methodology & Theory"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Theory</span>
        </button>
      </div>
    </header>
  );
};
