import { CensoringConfig, ColumnMapping, KDEConfig } from '../types';

export function generatePythonScript(
  csvFilename: string,
  mapping: ColumnMapping,
  censoringConfig: CensoringConfig,
  kdeConfig: KDEConfig
): string {
  const depthCol = mapping.depthColumn || 'Depth_mm';
  const threshold = censoringConfig.threshold.toFixed(2);
  const kernel = kdeConfig.kernel;

  return `"""
================================================================================
PIPELINE OD CORROSION DEPTH ANALYSIS: LEFT-CENSORED KDE & THEORETICAL FITS
Theme: Technical Black & Safety-Orange Industrial Aesthetic
Method: Left-Censored Non-Parametric Kernel Density Estimation (Nominal Threshold = ${threshold} mm)
        + Censored Maximum Likelihood Estimation (Lognormal, Gamma, Weibull)
================================================================================
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from scipy import stats
from scipy.optimize import minimize

# 1. LOAD CSV DATA
csv_file = "${csvFilename}"
df = pd.read_csv(csv_file)
print(f"Loaded {len(df)} total rows from {csv_file}")

depth_column = "${depthCol}"
raw_depths = df[depth_column]

# 2. SEPARATE OBSERVED VS LEFT-CENSORED NOMINAL VALUES (< ${threshold} mm)
THRESHOLD = ${threshold}
nominal_keywords = ['NOMINAL', '<0.8', '< 0.80', 'UNSIZED', 'N/A']

observed = []
num_censored = 0

for val in raw_depths:
    val_str = str(val).strip().upper()
    if any(k in val_str for k in nominal_keywords):
        num_censored += 1
    else:
        try:
            # Clean numeric string
            num = float(''.join([c for c in val_str if c.isdigit() or c in '.-']))
            if num <= THRESHOLD:
                num_censored += 1
            else:
                observed.append(num)
        except ValueError:
            num_censored += 1

observed = np.array(observed)
n_obs = len(observed)
n_total = n_obs + num_censored
censored_fraction = (num_censored / n_total) * 100

print(f"Total Defects: {n_total}")
print(f"Left-Censored Nominal Defects (<= {THRESHOLD} mm): {num_censored} ({censored_fraction:.1f}%)")
print(f"Observed & Sized Defects (> {THRESHOLD} mm): {n_obs} ({100 - censored_fraction:.1f}%)")

# 3. NON-PARAMETRIC LEFT-CENSORED KDE (EM ALGORITHM)
# Bandwidth calculation (Silverman's rule adapted for censored spread)
sd_est = np.std(np.concatenate([observed, np.full(num_censored, THRESHOLD * 0.5)]))
iqr_est = np.percentile(observed, 75) - np.percentile(observed, 25)
spread = min(sd_est, iqr_est / 1.34) if iqr_est > 0 else sd_est
bandwidth = 0.9 * spread * (n_total ** (-0.2)) * ${kdeConfig.bandwidthMultiplier.toFixed(2)}
print(f"KDE Bandwidth (h): {bandwidth:.4f} mm, Kernel: '${kernel}'")

x_max = max(THRESHOLD * 4, np.max(observed) * 1.25)
x_grid = np.linspace(0.01, x_max, 400)

# Censored sub-grid for EM iterations
cens_grid = np.linspace(0, THRESHOLD, 50)
cens_weights = np.ones_like(cens_grid) / len(cens_grid)

# EM Iterations to redistribute censored probability mass over [0, THRESHOLD]
for em_iter in range(8):
    # Kernel density calculation
    def kde_eval(x_eval):
        # Observed contribution (Gaussian Kernel)
        diff_obs = (x_eval[:, None] - observed[None, :]) / bandwidth
        dens_obs = np.sum(np.exp(-0.5 * diff_obs**2) / np.sqrt(2 * np.pi), axis=1)
        
        # Censored contribution
        diff_cens = (x_eval[:, None] - cens_grid[None, :]) / bandwidth
        dens_cens = np.sum(cens_weights[None, :] * np.exp(-0.5 * diff_cens**2) / np.sqrt(2 * np.pi), axis=1)
        
        return (dens_obs + num_censored * dens_cens) / (n_total * bandwidth)

    # E-step
    cens_dens = kde_eval(cens_grid)
    cens_weights = cens_dens / np.sum(cens_dens)

kde_density = kde_eval(x_grid)
# Normalize integral to 1.0
dx = x_grid[1] - x_grid[0]
kde_density /= np.sum(kde_density) * dx

# 4. PARAMETRIC CANDIDATES VIA CENSORED MAXIMUM LIKELIHOOD ESTIMATION (MLE)

# A) Lognormal: LN(mu, sigma)
def lognormal_nll(params):
    mu, sigma = params
    if sigma <= 0.01: return 1e9
    # Censored: F(c) = Phi((ln c - mu)/sigma)
    z_c = (np.log(THRESHOLD) - mu) / sigma
    cens_ll = num_censored * np.log(stats.norm.cdf(z_c) + 1e-12)
    # Observed: f(x)
    obs_ll = np.sum(stats.lognorm.logpdf(observed, s=sigma, scale=np.exp(mu)))
    return -(cens_ll + obs_ll)

opt_ln = minimize(lognormal_nll, [np.mean(np.log(observed)), np.std(np.log(observed))], method='Nelder-Mead')
mu_ln, sigma_ln = opt_ln.x
pdf_lognormal = stats.lognorm.pdf(x_grid, s=sigma_ln, scale=np.exp(mu_ln))
aic_ln = 2 * 2 + 2 * opt_ln.fun

# B) Weibull: W(k, lambda)
def weibull_nll(params):
    k, lam = params
    if k <= 0.01 or lam <= 0.01: return 1e9
    # Censored: F(c) = 1 - exp(-(c/lam)^k)
    cens_ll = num_censored * np.log(1 - np.exp(-(THRESHOLD / lam)**k) + 1e-12)
    # Observed: f(x)
    obs_ll = np.sum(stats.weibull_min.logpdf(observed, c=k, scale=lam))
    return -(cens_ll + obs_ll)

opt_wb = minimize(weibull_nll, [1.5, np.mean(observed)], method='Nelder-Mead')
k_wb, lam_wb = opt_wb.x
pdf_weibull = stats.weibull_min.pdf(x_grid, c=k_wb, scale=lam_wb)
aic_wb = 2 * 2 + 2 * opt_wb.fun

# C) Gamma: Gamma(alpha, beta)
def gamma_nll(params):
    alpha, theta = params
    if alpha <= 0.01 or theta <= 0.01: return 1e9
    # Censored: F(c) = gamma_cdf(c, a=alpha, scale=theta)
    cens_ll = num_censored * np.log(stats.gamma.cdf(THRESHOLD, a=alpha, scale=theta) + 1e-12)
    # Observed: f(x)
    obs_ll = np.sum(stats.gamma.logpdf(observed, a=alpha, scale=theta))
    return -(cens_ll + obs_ll)

opt_gm = minimize(gamma_nll, [2.0, np.mean(observed) / 2.0], method='Nelder-Mead')
a_gm, th_gm = opt_gm.x
pdf_gamma = stats.gamma.pdf(x_grid, a=a_gm, scale=th_gm)
aic_gm = 2 * 2 + 2 * opt_gm.fun

print(f"Lognormal AIC: {aic_ln:.2f} (mu={mu_ln:.3f}, sigma={sigma_ln:.3f})")
print(f"Gamma AIC:     {aic_gm:.2f} (alpha={a_gm:.3f}, scale={th_gm:.3f})")
print(f"Weibull AIC:   {aic_wb:.2f} (k={k_wb:.3f}, lambda={lam_wb:.3f})")

# 5. PLOTTING - BLACK & SAFETY ORANGE INDUSTRIAL THEME
plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(12, 7), dpi=300)
fig.patch.set_facecolor('#0d0f11')
ax.set_facecolor('#13161a')

# Censored nominal region background
ax.axvspan(0, THRESHOLD, color='#ff5500', alpha=0.12, label=f'Nominal / Censored Zone (<= {THRESHOLD} mm)')
ax.axvline(THRESHOLD, color='#ff6b00', linestyle='--', linewidth=1.5, alpha=0.8, label=f'Nominal Threshold ({THRESHOLD} mm)')

# Empirical histogram of observed values
counts, bins, _ = ax.hist(
    observed,
    bins=25,
    density=True,
    color='#2d3748',
    edgecolor='#4a5568',
    alpha=0.65,
    label='Observed Sized Corrosions'
)

# 1. Non-Parametric Left-Censored KDE (Glowing Safety Orange)
ax.plot(x_grid, kde_density, color='#ff7700', linewidth=3.2, label='Non-Parametric Left-Censored KDE', zorder=5)

# 2. Lognormal Fit (Cyan)
ax.plot(x_grid, pdf_lognormal, color='#38bdf8', linewidth=2.0, linestyle='-', label=f'Lognormal MLE (AIC: {aic_ln:.1f})', zorder=4)

# 3. Gamma Fit (Emerald Green)
ax.plot(x_grid, pdf_gamma, color='#10b981', linewidth=2.0, linestyle='-.', label=f'Gamma MLE (AIC: {aic_gm:.1f})', zorder=3)

# 4. Weibull Fit (Golden Yellow)
ax.plot(x_grid, pdf_weibull, color='#eab308', linewidth=2.0, linestyle=':', label=f'Weibull MLE (AIC: {aic_wb:.1f})', zorder=3)

# Formatting
ax.set_title('Pipeline OD Corrosion Depth Distribution (Left-Censored Modeling)', fontsize=15, fontweight='bold', color='#f8fafc', pad=15)
ax.set_xlabel('Corrosion Pit Depth (mm)', fontsize=12, fontweight='semibold', color='#cbd5e1', labelpad=10)
ax.set_ylabel('Probability Density f(x)', fontsize=12, fontweight='semibold', color='#cbd5e1', labelpad=10)
ax.set_xlim(0, x_max)
ax.grid(True, linestyle=':', alpha=0.25, color='#718096')

# Premium Legend
legend = ax.legend(loc='upper right', frameon=True, facecolor='#1a202c', edgecolor='#ff7700', fontsize=10)
for text in legend.get_texts():
    text.set_color('#e2e8f0')

plt.tight_layout()
output_image = "pipeline_corrosion_censored_kde_model.png"
plt.savefig(output_image, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
print(f"\\nModel plot successfully saved to: {output_image}")
plt.show()
`;
}
