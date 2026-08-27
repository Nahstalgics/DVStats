import React from 'react';
import { BookOpen } from 'lucide-react';
import logo from '../assets/od-corrosion-logo.png';

interface HeaderProps {
  onOpenTheoryModal: () => void;
  isModelReady: boolean;
  totalRecords: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTheoryModal,
  isModelReady,
  totalRecords,
}) => {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-orange-900/40 bg-zinc-950 text-gray-300 font-sans sticky top-0 z-30 shadow-2xl backdrop-blur-md">
      {/* Brand / Title */}
      <div className="flex items-center space-x-4 mb-3 sm:mb-0">
        <img
          src={logo}
          alt="OD corrosion eye logo"
          className="h-10 w-10 object-contain drop-shadow-[0_0_14px_rgba(234,88,12,0.35)]"
        />
        <div>
          <h1 className="text-xl font-medium tracking-tight text-white flex items-center gap-2">
            <span className="text-orange-500 font-light italic">Statistical analysis for OD corrosion</span>
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
            CENSORED-KDE · Pipeline Analysis
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
