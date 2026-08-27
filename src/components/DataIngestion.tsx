import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { ColumnMapping } from '../types';

interface DataIngestionProps {
  csvData: any[];
  columns: string[];
  columnMapping: ColumnMapping;
  onUpdateMapping: (mapping: ColumnMapping) => void;
  onRawCsvLoaded: (data: any[], filename: string) => void;
  fileName: string;
  threshold: number;
  wallThickness: number;
  pipeOD: number;
  onUpdateWallThickness: (value: number) => void;
  onUpdatePipeOD: (value: number) => void;
}

export const DataIngestion: React.FC<DataIngestionProps> = ({
  csvData,
  columns,
  columnMapping,
  onUpdateMapping,
  onRawCsvLoaded,
  fileName,
  threshold,
  wallThickness,
  pipeOD,
  onUpdateWallThickness,
  onUpdatePipeOD,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [wallThicknessDraft, setWallThicknessDraft] = useState<string>(String(wallThickness));
  const [pipeODDraft, setPipeODDraft] = useState<string>(String(pipeOD));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWallThicknessDraft(String(wallThickness));
  }, [wallThickness]);

  useEffect(() => {
    setPipeODDraft(String(pipeOD));
  }, [pipeOD]);

  const commitWallThickness = () => {
    const trimmed = wallThicknessDraft.trim();
    const parsed = trimmed === '' ? 0 : Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setWallThicknessDraft(String(wallThickness));
      return;
    }
    onUpdateWallThickness(parsed);
    setWallThicknessDraft(String(parsed));
  };

  const commitPipeOD = () => {
    const trimmed = pipeODDraft.trim();
    const parsed = trimmed === '' ? 0 : Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setPipeODDraft(String(pipeOD));
      return;
    }
    onUpdatePipeOD(parsed);
    setPipeODDraft(String(parsed));
  };

  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
        if (results.data && results.data.length > 0) {
          onRawCsvLoaded(results.data as any[], file.name);
        }
      },
      error: (err: Error) => {
        console.error('CSV Parsing error:', err);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Quick statistics calculation on currently selected depth column
  const depthValues = csvData.map((r) => r[columnMapping.depthColumn]);
  let observedCount = 0;
  let censoredCount = 0;

  for (const v of depthValues) {
    if (v === undefined || v === null) continue;
    const str = String(v).trim().toUpperCase();
    if (str.includes('NOMINAL') || str.includes('<0.8') || str.includes('< 0.8') || str.includes('UNSIZED')) {
      censoredCount++;
    } else {
      const num = typeof v === 'number' ? v : parseFloat(str.replace(/[^\d.-]/g, ''));
      if (!isNaN(num)) {
        if (num <= threshold) censoredCount++;
        else observedCount++;
      }
    }
  }

  const totalEvaluated = observedCount + censoredCount;
  const censoredPercent = totalEvaluated > 0 ? ((censoredCount / totalEvaluated) * 100).toFixed(1) : '0';

  return (
    <div className="bg-zinc-950 border border-orange-900/40 rounded-lg shadow-xl p-5 sm:p-6 transition-all text-gray-300 font-sans">
      <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between pb-4 border-b border-zinc-800">
        {/* Left Title & Status */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs uppercase tracking-widest text-zinc-300 border-l-2 border-orange-500 pl-3 font-semibold">
                1. Data Ingestion & Depth Variable
              </h2>
              {fileName && (
                <span className="px-2 py-0.5 text-[10px] font-mono bg-zinc-900 text-orange-400 rounded border border-zinc-800">
                  {fileName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <button
            id="browse-csv-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 border border-orange-500/50 text-orange-500 text-xs font-mono uppercase tracking-wider hover:bg-orange-500/10 transition-colors rounded cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-orange-500" />
            <span>{csvData.length === 0 ? 'Upload CSV File' : 'Replace CSV File'}</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Area if no data */}
      {csvData.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-orange-500 bg-orange-950/20'
              : 'border-zinc-700 hover:border-orange-500/50 bg-zinc-900/50'
          }`}
        >
          <div className="mx-auto w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500 mb-3">
            <Upload className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300">
            Drag and drop your Pipeline Corrosion CSV file here
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-md mx-auto font-mono">
            Upload any CSV containing depth measurements (mm or % loss, supports numeric values and nominal strings like "NOMINAL", "&lt;0.8", "UNSIZED").
          </p>
          <div className="mt-4">
            <span className="inline-block px-4 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-orange-400 font-mono text-xs hover:border-orange-500/50 transition-colors">
              Click to select CSV file from your computer
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Focused Depth Column Selection */}
          <div className="bg-zinc-900/50 p-4 rounded border border-orange-900/40 max-w-xl">
            <label className="block text-[10px] uppercase tracking-widest text-orange-500 mb-1.5 flex items-center justify-between font-mono">
              <span className="font-semibold">Depth Column (Only Input Variable) *</span>
              <span className="text-[9px] text-orange-400 font-mono bg-orange-950/40 px-1.5 py-0.5 rounded border border-orange-900/40">SELECTED DEPTH</span>
            </label>
            <select
              id="select-depth-column"
              value={columnMapping.depthColumn}
              onChange={(e) =>
                onUpdateMapping({
                  depthColumn: e.target.value,
                })
              }
              className="w-full bg-zinc-900 border border-zinc-700 text-xs p-2.5 rounded focus:border-orange-500 outline-none text-zinc-100 font-mono mt-1"
            >
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-zinc-400 font-mono mt-1.5">
              Corrosion pit depth values (mm). Numeric depths &le; {threshold.toFixed(2)}mm and nominal flags are automatically treated as left-censored.
            </p>
          </div>

          {/* Real-time Ingestion Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-zinc-950 p-3.5 border border-zinc-800 rounded">
              <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-1">
                Sample Size (N)
              </p>
              <p className="text-lg font-mono text-orange-500">
                {totalEvaluated.toLocaleString()}
              </p>
            </div>

            <div className="bg-zinc-950 p-3.5 border border-orange-900/40 rounded">
              <p className="text-[10px] text-orange-500 uppercase font-mono tracking-widest mb-1 flex items-center justify-between">
                <span>Left-Censored (&le; {threshold}mm)</span>
                <span className="text-[9px] text-orange-400 font-mono">{censoredPercent}%</span>
              </p>
              <p className="text-lg font-mono text-orange-400">
                {censoredCount.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-zinc-500">nominal</span>
              </p>
            </div>

            <div className="bg-zinc-950 p-3.5 border border-zinc-800 rounded">
              <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-1">
                Sized Observed (&gt; {threshold}mm)
              </p>
              <p className="text-lg font-mono text-green-400">
                {observedCount.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-zinc-500">pits</span>
              </p>
            </div>

            <div className="bg-zinc-950 p-3.5 border border-zinc-800 rounded">
              <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-1">
                Censoring Threshold
              </p>
              <p className="text-lg font-mono text-zinc-200">
                {threshold.toFixed(2)}{' '}
                <span className="text-[10px] font-normal text-zinc-500">mm limit</span>
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div className="bg-zinc-900/50 p-3.5 rounded border border-zinc-800">
              <label className="block text-[10px] uppercase tracking-widest text-orange-500 mb-1.5 font-mono">
                Wall thickness (mm)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={wallThicknessDraft}
                onChange={(e) => setWallThicknessDraft(e.target.value)}
                onBlur={commitWallThickness}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs p-2.5 rounded focus:border-orange-500 outline-none text-zinc-100 font-mono"
              />
            </div>
            <div className="bg-zinc-900/50 p-3.5 rounded border border-zinc-800">
              <label className="block text-[10px] uppercase tracking-widest text-orange-500 mb-1.5 font-mono">
                Pipe OD (mm)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={pipeODDraft}
                onChange={(e) => setPipeODDraft(e.target.value)}
                onBlur={commitPipeOD}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs p-2.5 rounded focus:border-orange-500 outline-none text-zinc-100 font-mono"
              />
            </div>
          </div>

          {/* Toggleable Data Table Preview */}
          <div className="pt-1">
            <button
              id="toggle-preview-btn"
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-mono py-1 transition-colors cursor-pointer"
            >
              {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showPreview ? 'Hide Raw CSV Rows' : 'View Sample Data Rows (5 Rows)'}</span>
            </button>

            {showPreview && (
              <div className="mt-2 overflow-x-auto border border-zinc-800 rounded bg-black">
                <table className="min-w-full divide-y divide-zinc-800 text-left text-xs font-mono">
                  <thead className="bg-zinc-900 text-zinc-400">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className={`px-3 py-2 text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap ${
                            col === columnMapping.depthColumn ? 'text-orange-500 bg-orange-950/20' : ''
                          }`}
                        >
                          {col} {col === columnMapping.depthColumn && '★ (DEPTH)'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {csvData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/50">
                        {columns.map((col) => (
                          <td
                            key={col}
                            className={`px-3 py-1.5 whitespace-nowrap ${
                              col === columnMapping.depthColumn ? 'text-orange-400 font-bold bg-orange-950/10' : ''
                            }`}
                          >
                            {row[col] !== undefined ? String(row[col]) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
