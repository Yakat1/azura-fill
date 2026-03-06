# Azura AutoFill Studio

## 🇪🇸 Introducción
**Azura AutoFill Studio** es una herramienta diseñada para agilizar el llenado de formularios de somatometría y notas clínicas en el sistema Azura. Consiste en un editor de parámetros offline y un script de Tampermonkey que automatiza la transferencia de datos.

### Características Principales:
- **Editor Directo**: Ingresa valores numéricos y notas detalladas con facilidad.
- **Importación Inteligente**: Pega notas de texto libre y deja que el sistema extraiga los valores automáticamente.
- **Gestión de Sesiones**: Guarda y renombra tus sesiones de trabajo para uso futuro.
- **Llenado Automatizado**: El script de Tampermonkey detecta el formulario en Azura y lo rellena por ti.
- **Privacidad Total**: Funciona localmente en tu navegador; no se envían datos a servidores externos.

---

| File | Purpose |
|---|---|
| `index.html` | **The Editor**: All-in-one app (CSS, JS, Parser included) — Open locally. |
| `azura-autofill.user.js` | **The Bridge**: Tampermonkey userscript — Install in browser. |
| `normal-session.json` | **Sample Data**: A healthy patient profile to test the system. |

---

## 📦 How to Share / Cómo Compartir

### Option 1: The ZIP Bundle (Easiest for most)
1. Select `index.html` and `azura-autofill.user.js`.
2. Right-click → **Compress to ZIP file**.
3. Send the ZIP to your colleague. 
4. **Recuerda**: Dile que extraiga todo antes de abrir el HTML.

### Option 2: GitHub (Best for updates)
If you have a GitHub account:
1. Create a repository (e.g., `azura-autofill`).
2. Upload `index.html` and `azura-autofill.user.js`.
3. Enable **GitHub Pages** for the repository to host the editor online.
4. Share the link to the `index.html` and the "Raw" link of the `.user.js` file.

---

---

## Fields Supported

| Campo | ID | Unidad | Notas |
|---|---|---|---|
| Temperatura | `temperatura` | °C | Max 5 chars |
| Frec. Respiratoria | `frecresp` | /min | Max 3 chars |
| Frec. Cardíaca | `freccard` | /min | Max 3 chars |
| Glucometría | `glucometria` | mg/dl | Max 5 chars |
| Tensión Arterial | `tensart` | — | Formato: `000/000` |
| Saturación O₂ | `saturacion` | % | Max 3 chars |
| Peso | `peso` | Kg | Dispara AJAX Wicket |
| Talla | `talla` | m | Dispara AJAX Wicket |
| IMC | `imc` | Kg/m² | 🔒 Solo lectura (calculado) |
| Superficie Corporal | `superficie` | m² | 🔒 Solo lectura (calculado) |
| **Resultados** | `resultados` | — | Clínico (2000 ch max) |
| **Tratamiento** | `tratamiento` | — | Clínico (2000 ch max) |
| **Pronóstico** | `pronostico` | — | Clínico (2000 ch max) |

---

## Quick Start

### 1 — Install Tampermonkey

Install [Tampermonkey](https://www.tampermonkey.net/) for Chrome, Firefox, or Edge.

### 2 — Install the Script

1. Open Tampermonkey → **Create new script**
2. Paste the contents of `azura-autofill.user.js`
3. Save — the script runs automatically on Azura pages

### 3 — Open the Editor

Open `index.html` in your browser (no internet connection required).

### 4 — Enter Values & Apply

1. Enter clinical values in the **Somatometría** fields
2. Add **Notas clínicas** (Resultados, Tratamiento, Pronóstico)
   - Use **Snippets** for common phrases
   - Use **Limpiar texto ✨** to normalize punctuation and spaces
3. Or use **Importar desde notas** — paste free-form text, click **Parsear**
   - Supports multiline blocks for clinical notes
4. Click **⚡ Aplicar en Azura** (or `Ctrl+Enter`)
5. Navigate to the Azura patient page — fields fill automatically

### 5 — Read the Overlay

On the Azura page, a floating badge shows `⚕ S:8/8 | N:3/3`.  
Click it to see grouped status for Somatometría and Notas Clínicas. Click **↺ Re-ejecutar** to retry.

---

## Technical Notes

- **Apache Wicket**: `peso` and `talla` fire server-side AJAX on `change` — the script waits **1500ms** after each for `imc`/`superficie` to compute.
- **tensart**: triggers `focus` first to activate the `agregarPresion()` handler, then fills the value.
- **Native setter**: uses `HTMLInputElement.prototype.value` descriptor to bypass framework state tracking.
- **IMC / Superficie**: never filled by the script — server-computed after `peso` + `talla` AJAX.
- **One-shot trigger**: the script reads `azuraAutoFill` flag from localStorage and clears it immediately to prevent re-filling on page reload.

---

## Paste-to-Parse Keywords

The parser recognizes these patterns (case-insensitive):

| Campo | Palabras clave (reconoce tildes y mayúsculas) |
|---|---|
| Temperatura | `temp`, `temperatura`, `t°`, `t:`, `tª`, `c°` |
| Frec. Resp. | `fr`, `frecresp`, `frecuencia respiratoria`, `rr`, `rpm`, `f.r.` |
| Frec. Card. | `fc`, `freccard`, `frecuencia cardiaca`, `hr`, `bpm`, `lpm`, `latidos`, `f.c.` |
| Glucometría | `gluc`, `glucometria`, `glucometría`, `glucosa`, `glucemia`, `hgt`, `capilar`, `azúcar` |
| Tensión Art. | `ta`, `tensart`, `tensión arterial`, `presión`, `t/a`, `p.a.`, `bp`, `pa` |
| Saturación | `sat`, `saturación de oxígeno`, `spo2`, `o2`, `%o2`, `oxígeno`, `saturando` |
| Peso | `peso`, `weight`, `kg`, `wt`, `p:`, `kg.` |
| Talla | `talla`, `height`, `estatura`, `ht`, `alt` |
| **Resultados** | `resultados`, `estudios`, `auxiliares` |
| **Tratamiento** | `tratamiento`, `plan`, `indicaciones`, `tx` |
| **Pronóstico** | `pronostico`, `pronóstico`, `evolucion`, `px` |
