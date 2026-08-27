/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CensoringConfig,
  ColumnMapping,
  KDEConfig,
  ModelRunResults,
  ParametricDistributionType,
  PlotType,
} from './types';
import { runCorrosionStatisticalAnalysis } from './utils/statistics';
import { Header } from './components/Header';
import { DataIngestion } from './components/DataIngestion';
import { ModelControls } from './components/ModelControls';
import { VisualizationCanvas } from './components/VisualizationCanvas';
import { ModelMetricsTable } from './components/ModelMetricsTable';
import { TheoryModal } from './components/TheoryModal';

export default function App() {
  // Data State
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [wallThickness, setWallThickness] = useState<number>(12.7);
  const [pipeOD, setPipeOD] = useState<number>(914.4);

  // Column Mapping (Only Depth)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    depthColumn: '',
  });

  const updateWallThickness = (value: number) => {
    const nextValue = Number.isFinite(value) ? value : 0;
    setWallThickness(nextValue);
    executeAnalysis(csvData, columnMapping, censoringConfig, kdeConfig, nextValue, pipeOD);
  };

  const updatePipeOD = (value: number) => {
    const nextValue = Number.isFinite(value) ? value : 0;
    setPipeOD(nextValue);
    executeAnalysis(csvData, columnMapping, censoringConfig, kdeConfig, wallThickness, nextValue);
  };

  // Censoring Configuration (Default: 0.80 mm)
  const [censoringConfig, setCensoringConfig] = useState<CensoringConfig>({
    threshold: 0.8,
    autoCensorBelowThreshold: true,
    nominalKeywords: ['NOMINAL', '<0.8', '< 0.80', 'UNSIZED', 'N/A'],
  });

  // Non-Parametric KDE Configuration
  const [kdeConfig, setKdeConfig] = useState<KDEConfig>({
    kernel: 'gaussian',
    bandwidthMethod: 'silverman',
    manualBandwidth: 0.25,
    numEvaluationPoints: 250,
    bandwidthMultiplier: 1.0,
    boundaryMethod: 'em-censored',
  });

  // Model Results
  const [results, setResults] = useState<ModelRunResults | null>(null);
  const [plotType, setPlotType] = useState<PlotType>('pdf');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Modals
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState(false);

  // Execute Left-Censored KDE & Parametric Fits
  const executeAnalysis = (
    dataToUse = csvData,
    mappingToUse = columnMapping,
    cConfigToUse = censoringConfig,
    kConfigToUse = kdeConfig,
    wt = wallThickness,
    od = pipeOD
  ) => {
    if (!dataToUse || dataToUse.length === 0 || !mappingToUse.depthColumn) {
      return;
    }

    setIsCalculating(true);

    // Extract raw depth values
    const rawValues = dataToUse
      .map((row) => row[mappingToUse.depthColumn])
      .filter((v) => v !== undefined && v !== null && v !== '');

    // Allow UI tick to show spinner
    setTimeout(() => {
      try {
        const computedResults = runCorrosionStatisticalAnalysis(
          rawValues,
          cConfigToUse,
          kConfigToUse,
          wt,
          od
        );

        // Preserve user distribution toggle states if existing
        if (results?.parametricFits) {
          Object.keys(computedResults.parametricFits).forEach((key) => {
            const dtype = key as ParametricDistributionType;
            if (results.parametricFits[dtype]) {
              computedResults.parametricFits[dtype].enabled =
                results.parametricFits[dtype].enabled;
            }
          });
        }

        setResults(computedResults);
      } catch (err) {
        console.error('Model calculation error:', err);
      } finally {
        setIsCalculating(false);
      }
    }, 50);
  };

  // Handle Raw CSV file loaded from computer
  const handleRawCsvLoaded = (data: any[], name: string) => {
    if (!data || data.length === 0) return;
    const parsedCols = Object.keys(data[0] as object);
    setColumns(parsedCols);
    setCsvData(data);
    setFileName(name);

    // Auto-detect depth column
    const depthCol =
      parsedCols.find((c) => /depth/i.test(c)) ||
      parsedCols.find((c) => /pit|corros|loss|value/i.test(c)) ||
      parsedCols[0];

    const newMapping: ColumnMapping = {
      depthColumn: depthCol,
    };

    setColumnMapping(newMapping);
    executeAnalysis(data, newMapping, censoringConfig, kdeConfig, wallThickness, pipeOD);
  };

  // Toggle parametric distribution line on the chart
  const handleToggleParametricDistribution = (type: ParametricDistributionType) => {
    if (!results || !results.parametricFits[type]) return;

    setResults({
      ...results,
      parametricFits: {
        ...results.parametricFits,
        [type]: {
          ...results.parametricFits[type],
          enabled: !results.parametricFits[type].enabled,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-black text-gray-300 font-sans selection:bg-orange-500 selection:text-black">
      {/* Technical Industrial Header */}
      <Header
        onOpenTheoryModal={() => setIsTheoryModalOpen(true)}
        isModelReady={results !== null}
        totalRecords={results?.totalCount || csvData.length}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Section 1: Data Ingestion & Depth Variable */}
        <DataIngestion
          csvData={csvData}
          columns={columns}
          columnMapping={columnMapping}
          onUpdateMapping={(mapping) => {
            setColumnMapping(mapping);
            executeAnalysis(csvData, mapping, censoringConfig, kdeConfig, wallThickness, pipeOD);
          }}
          onRawCsvLoaded={handleRawCsvLoaded}
          fileName={fileName}
          threshold={censoringConfig.threshold}
          wallThickness={wallThickness}
          pipeOD={pipeOD}
          onUpdateWallThickness={updateWallThickness}
          onUpdatePipeOD={updatePipeOD}
        />

        {/* Section 2: Left-Censoring & Model Configuration */}
        <ModelControls
          censoringConfig={censoringConfig}
          onUpdateCensoringConfig={(config) => {
            setCensoringConfig(config);
            executeAnalysis(csvData, columnMapping, config, kdeConfig, wallThickness, pipeOD);
          }}
          kdeConfig={kdeConfig}
          onUpdateKdeConfig={(config) => {
            setKdeConfig(config);
            executeAnalysis(csvData, columnMapping, censoringConfig, config, wallThickness, pipeOD);
          }}
          parametricFits={results?.parametricFits || null}
          onToggleParametricDistribution={handleToggleParametricDistribution}
          plotType={plotType}
          onChangePlotType={setPlotType}
          onRunModel={() =>
            executeAnalysis(csvData, columnMapping, censoringConfig, kdeConfig, wallThickness, pipeOD)
          }
          isCalculating={isCalculating}
        />

        {/* Section 3: High-Resolution Visualization & Copyable/Saveable Image Canvas */}
        <VisualizationCanvas
          results={results}
          plotType={plotType}
          wallThickness={wallThickness}
        />

        {/* Section 4: Quantitative Metrics & Theoretical Model Comparison Table */}
        {results && (
          <ModelMetricsTable
            results={results}
            wallThickness={wallThickness}
          />
        )}
      </main>

      {/* Theory & Left-Censoring Methodology Modal */}
      <TheoryModal
        isOpen={isTheoryModalOpen}
        onClose={() => setIsTheoryModalOpen(false)}
      />
    </div>
  );
}
