# Design System Specification: Precision Industrial / Titanium

> **Spec Version:** 1.0 (Google Stitch / Impeccable format)  
> **Brand Voice:** Utilitarian, precise, clinical, high-performance gym interface.  
> **Anti-References:** AI beige, purple gradients, generic 24px pill blobs, soft fuzzy drop shadows, nested cards in cards, italic serif display headings, vague copy.

---

## 1. Surface & Color Tokens

### Dark Mode (Primary Default)
| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--background` | `#000000` | Pure OLED pitch black canvas |
| `--surface` | `#090b10` | Ultra-deep primary card surface |
| `--surface-raised` | `#11141c` | Elevated inputs, active set rows |
| `--surface-muted` | `#171b26` | Secondary action tiles, chip surfaces |
| `--text-primary` | `#f8fafc` | Crisp high-contrast chalk white text |
| `--text-secondary` | `#8e96a7` | Technical slate secondary labels |
| `--text-tertiary` | `#5b6477` | Dimmed metadata / unit descriptors |
| `--primary` | `#f59e0b` | High-visibility Electric Amber (action / focus) |
| `--primary-strong` | `#fbbf24` | Hover / active state for primary |
| `--on-primary` | `#08090c` | Text on primary accent |
| `--success` | `#10b981` | Emerald green (completed sets, targets hit) |
| `--warning` | `#f59e0b` | Amber (caution, rest timer active) |
| `--danger` | `#ef4444` | Crimson (delete, discard, over-limit) |
| `--border-strong` | `rgba(255, 255, 255, 0.16)` | Active / focused element border |
| `--hairline` | `1px solid var(--border)` | Canonical divider |

### Telemetry & Chart Channels (`/colorize`)
| Metric Channel | Token | Value (Dark) | Character & Logic |
| :--- | :--- | :--- | :--- |
| **Weight** | `--chart-weight` | `#f59e0b` | Electric Amber (Primary anchor metric) |
| **Calories** | `--chart-calories` | `#38bdf8` | Precision Sky Blue (Energy flux telemetry) |
| **Protein** | `--chart-protein` | `#10b981` | Emerald Green (Nutrient & macro targets) |
| **Sleep** | `--chart-sleep` | `#818cf8` | Indigo Violet (Recovery / circadian rest) |
| **Body Fat** | `--chart-body-fat` | `#f43f5e` | Rose Crimson (Body composition / cut delta) |

### Geometry & Radii
| Token | Value | Rationale |
| :--- | :--- | :--- |
| `--radius` | `8px` | Crisp, precise card corners (no bloated bubbles) |
| `--radius-small` | `6px` | Compact buttons, inputs, pills |
| `--radius-xs` | `4px` | Badges, tags, metric indicators |

---

## 2. Typography & Numerical Rules

* **Base Font:** System Sans-Serif Stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`).
* **Tabular Numbers:** All numerical figures (weights, reps, calories, timers, macro grams, dates) MUST use `font-variant-numeric: tabular-nums` to prevent layout jitter.
* **Metric Hierarchy:**
  * Number: Heavy/Bold, large, clear (`font-weight: 700`, `--text-primary`).
  * Unit: Regular/Medium, smaller, subtle (`font-weight: 500`, `--text-tertiary`, `font-size: 0.85em`).
* **Headings:**
  * Clean, unpretentious uppercase kickers (`letter-spacing: 0.05em`, `text-transform: uppercase`, `font-size: 0.75rem`).
  * Concise, direct section titles without decorative serifs or filler adverbs.

---

## 3. Component Architecture (Slop-Free)

1. **Cards:**
   * Single-depth surfaces with 1px hairline borders (`--border`).
   * No cards nested inside cards. Sub-sections use simple flat rows with hairline dividers or grid layouts.
2. **Buttons:**
   * Tactile, distinct 1px bordered elements with crisp 6px radius.
   * Clear hierarchy: Primary (solid Amber), Secondary (subtle bordered surface), Ghost (transparent with hover).
3. **Data Displays:**
   * Monospaced/tabular alignment in stats strips and tables.
   * Clear label-above-value or inline key-value pairs.
4. **Workout Logging:**
   * High-contrast active set rows.
   * Instant tactile / visual feedback on set check without distracting animations.
