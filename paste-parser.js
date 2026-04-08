/**
 * paste-parser.js
 * Standalone ES module for parsing freeform pasted text into key-value pairs.
 * Handles: "Key: Value", "key=value", JSON objects, and mixed freeform text.
 */

/**
 * Normalizes a key string for matching (lowercase, trim, strip punctuation).
 * @param {string} key
 * @returns {string}
 */
function normalizeKey(key) {
  return key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Attempts to extract key-value pairs from a JSON block within the text.
 * @param {string} text
 * @returns {Object|null}
 */
function tryParseJSON(text) {
  // Find outermost JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_) { /* not valid JSON */ }
  return null;
}

/**
 * Parses "Key: Value" or "key=value" lines from text.
 * Multi-line values are not supported here; each line is one entry.
 * @param {string} text
 * @returns {Object}
 */
function parseKeyValueLines(text) {
  const result = {};
  const lines = text.split('\n');
  for (const line of lines) {
    // Match "Key: Value" or "Key = Value"
    const match = line.match(/^([^:=\n]{1,80}?)[:=]\s*(.+)$/);
    if (match) {
      const rawKey = match[1].trim();
      const value = match[2].trim();
      if (rawKey && value) {
        result[rawKey] = value;
      }
    }
  }
  return result;
}

/**
 * Main parse function. Tries JSON first, then key-value line parsing.
 *
 * @param {string} text - Raw pasted text from user
 * @param {string[]} knownKeys - Array of known parameter keys from the editor
 * @returns {{ found: Object, missing: string[], unmatched: Object }}
 *   found    - { originalKey: value } pairs that matched known keys
 *   missing  - known keys that were NOT found in the pasted text
 *   unmatched - extracted pairs that did not match any known key
 */
export function parseText(text, knownKeys = []) {
  if (!text || !text.trim()) {
    return { found: {}, missing: [...knownKeys], unmatched: {} };
  }

  let extracted = {};

  // 1. Try JSON first
  const jsonResult = tryParseJSON(text);
  if (jsonResult) {
    // Flatten one level deep
    for (const [k, v] of Object.entries(jsonResult)) {
      if (typeof v !== 'object') {
        extracted[k] = String(v);
      } else {
        extracted[k] = JSON.stringify(v);
      }
    }
  }

  // 2. Also parse key-value lines (even if JSON was found, merge)
  const kvResult = parseKeyValueLines(text);
  extracted = { ...kvResult, ...extracted }; // JSON takes precedence

  // 3. Match against known keys (case-insensitive, normalized)
  const found = {};
  const unmatched = { ...extracted };

  function levenshtein(a, b) {
    if (!a || !b) return (a || b).length;
    let m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        m[i][j] = b.charAt(i - 1) === a.charAt(j - 1) ? m[i - 1][j - 1] : Math.min(
          m[i - 1][j - 1] + 1,
          m[i][j - 1] + 1,
          m[i - 1][j] + 1
        );
      }
    }
    return m[b.length][a.length];
  }

  for (const knownKey of knownKeys) {
    const normalizedKnown = normalizeKey(knownKey);
    let matched = false;

    for (const [extractedKey, value] of Object.entries(extracted)) {
      const normalizedExtracted = normalizeKey(extractedKey);
      if (normalizedExtracted === normalizedKnown ||
        normalizedExtracted.includes(normalizedKnown) ||
        normalizedKnown.includes(normalizedExtracted) ||
        (normalizedKnown.length > 4 && levenshtein(normalizedExtracted, normalizedKnown) <= 2)) {
        found[knownKey] = value;
        delete unmatched[extractedKey];
        matched = true;
        break;
      }
    }

    if (!matched) {
      // leave it missing
    }
  }

  function extractBH(txt) {
    const getVal = (regex) => { const match = txt.match(regex); return match ? match[1].trim() : ''; };
    const getDual = (regex) => { const match = txt.match(regex); return match ? { p: match[1]?.trim(), a: match[2]?.trim() } : { p: '', a: '' }; };
    const res = {
      bh_rbc: getVal(/(?:Eritrocitos|RBC)[^\d]*([\d\.]+)/i),
      bh_hb: getVal(/(?:Hemoglobina|HGB|Hb(?!\w))[^\d]*([\d\.]+)/i),
      bh_hto: getVal(/(?:Hematocrito|HCT|Hto(?!\w))[^\d]*([\d\.]+)/i),
      bh_vcm: getVal(/VCM[^\d]*([\d\.]+)/i),
      bh_hcm: getVal(/HCM[^\d]*([\d\.]+)/i),
      bh_cmhc: getVal(/CMHC[^\d]*([\d\.]+)/i),
      bh_rdw: getVal(/(?:ADE|RDW)[^\d]*([\d\.]+)/i),
      bh_wbc: getVal(/(?:Leucocitos|WBC)[^\d]*([\d\.]+)/i),
      bh_neu: getDual(/Neutr[oó]filos[^\d]*([\d\.]+)(?:[^\d]+([\d\.]+))?/i),
      bh_lin: getDual(/Linfocitos[^\d]*([\d\.]+)(?:[^\d]+([\d\.]+))?/i),
      bh_mon: getDual(/Monocitos[^\d]*([\d\.]+)(?:[^\d]+([\d\.]+))?/i),
      bh_eos: getDual(/Eosin[oó]filos[^\d]*([\d\.]+)(?:[^\d]+([\d\.]+))?/i),
      bh_bas: getDual(/Bas[oó]filos[^\d]*([\d\.]+)(?:[^\d]+([\d\.]+))?/i),
      bh_plt: getVal(/(?:Plaquetas|PLT)[^\d]*([\d\.]+)/i),
      bh_vpm: getVal(/VPM[^\d]*([\d\.]+)/i)
    };

    for (const [k, v] of Object.entries(res)) {
      if (v && typeof v === 'string') found[k] = v;
      else if (v && typeof v === 'object') {
        if (v.p) found[k + '_p'] = v.p;
        if (v.a) found[k + '_a'] = v.a;
      }
    }
  }

  extractBH(text);

  const missing = knownKeys.filter(k => !(k in found));

  return { found, missing, unmatched };
}

/**
 * Formats a found/missing diff as a human-readable string.
 * @param {{ found: Object, missing: string[], unmatched: Object }} diffResult
 * @returns {string}
 */
export function formatDiff(diffResult) {
  const { found, missing, unmatched } = diffResult;
  const lines = [];

  if (Object.keys(found).length > 0) {
    lines.push('✓ MATCHED FIELDS:');
    for (const [k, v] of Object.entries(found)) {
      const preview = v.length > 60 ? v.slice(0, 57) + '...' : v;
      lines.push(`  ${k}: ${preview}`);
    }
  }

  if (missing.length > 0) {
    lines.push('');
    lines.push('⚠ MISSING (not found in pasted text):');
    for (const k of missing) {
      lines.push(`  ${k}`);
    }
  }

  if (Object.keys(unmatched).length > 0) {
    lines.push('');
    lines.push('ℹ UNMATCHED (extracted but no known field):');
    for (const [k, v] of Object.entries(unmatched)) {
      const preview = v.length > 40 ? v.slice(0, 37) + '...' : v;
      lines.push(`  ${k}: ${preview}`);
    }
  }

  return lines.join('\n') || 'No data extracted.';
}
