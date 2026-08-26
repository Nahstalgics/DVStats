import React, { useState } from 'react';
import { Check, Code, Copy, Download, Terminal, X } from 'lucide-react';
import { CensoringConfig, ColumnMapping, KDEConfig } from '../types';
import { generatePythonScript } from '../utils/pythonExport';

interface PythonCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  columnMapping: ColumnMapping;
  censoringConfig: CensoringConfig;
  kdeConfig: KDEConfig;
}

export const PythonCodeModal: React.FC<PythonCodeModalProps> = ({
  isOpen,
  onClose,
  fileName,
  columnMapping,
  censoringConfig,
  kdeConfig,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scriptCode = generatePythonScript(
    fileName || 'pipeline_corrosion_data.csv',
    columnMapping,
    censoringConfig,
    kdeConfig
  );

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPy = () => {
    const blob = new Blob([scriptCode], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipeline_left_censored_kde_model.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans">
      <div className="bg-zinc-950 border border-orange-900/40 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-semibold border-l-2 border-orange-500 pl-2.5">
                  Standalone Python Modeling Script
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 text-orange-400 border border-zinc-800">
                  scipy + matplotlib
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5 pl-3">
                Executable Python code to reproduce this Left-Censored KDE and MLE analysis locally
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="copy-python-code-btn"
              type="button"
              onClick={handleCopyCode}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-orange-600 hover:bg-orange-500 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Script!' : 'Copy Code'}</span>
            </button>

            <button
              id="download-python-file-btn"
              type="button"
              onClick={handleDownloadPy}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-500" />
              <span>Download .py</span>
            </button>

            <button
              id="close-python-modal-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-900 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-zinc-950 font-mono text-xs text-zinc-300">
          <pre className="text-zinc-300 leading-relaxed select-all">
            <code>{scriptCode}</code>
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-zinc-800 bg-zinc-950 text-xs text-zinc-400 font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[11px] text-zinc-500">
              Requires: <code className="text-orange-400">pip install numpy scipy pandas matplotlib</code>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
