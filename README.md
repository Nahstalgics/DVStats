# DVStats

A small React + Vite app for left-censored corrosion depth analysis using a KDE-based model and parametric distribution comparisons.

## Features

- Upload a CSV file of corrosion depth measurements
- Select the depth column automatically or manually
- Treat values at or below the censoring threshold as nominal/left-censored
- Fit and compare:
  - Lognormal
  - Gamma
  - Weibull
  - Exponential
- View a KDE overlay and model metrics
- Export the chart image

## Quick start

1. Install dependencies:
   npm install

2. Run the dev server:
   npm run dev -- --host 0.0.0.0

3. Open the local app in your browser:
   http://localhost:5173/

## Sample data

A ready-to-use CSV is included at:
- sample-corrosion-data.csv

This file includes both measured corrosion depths and left-censored nominal markers such as `NOMINAL`, `<0.8`, `UNSIZED`, and `N/A`.

## Suggested workflow

1. Upload the sample CSV
2. Confirm the `Depth_mm` column is selected
3. Adjust the censoring threshold if needed
4. Click `Run KDE Model`
5. Review the chart and statistical table

## Build for production

npm run build

## Notes

- The default threshold is 0.80 mm
- Wall thickness and pipe OD can be updated from the data ingestion panel
- The app expects a single depth field as the modeling input
