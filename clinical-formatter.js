// ─── CLINICAL TERMINOLOGY FORMATTER ─────────────────────────────────────────
// Deterministic rules mapping numeric lab values to standardized Spanish
// medical terminology. NO diagnostic claims — only objective descriptions.
// Guided by clinical-reports & clinical-decision-support skill principles.

const CLINICAL_RULES = [
    // ─── Biometría Hemática ──────────────────────────────────────────────
    { key: 'bh_wbc', check: v => v > 11, term: val => `leucocitosis de ${val}` },
    { key: 'bh_wbc', check: v => v < 4.5, term: val => `leucopenia de ${val}` },
    { key: 'bh_hb', check: (v, sex) => sex === 'F' ? v < 12 : v < 13.5, term: val => `anemia (Hb ${val})` },
    { key: 'bh_hb', check: (v, sex) => sex === 'F' ? v > 16 : v > 17.5, term: val => `policitemia (Hb ${val})` },
    { key: 'bh_plt', check: v => v < 150, term: val => `trombocitopenia de ${val}` },
    { key: 'bh_plt', check: v => v > 450, term: val => `trombocitosis de ${val}` },
    { key: 'bh_neu_pct', check: v => v > 70, term: val => `neutrofilia de ${val}%` },
    { key: 'bh_lin_pct', check: v => v > 40, term: val => `linfocitosis de ${val}%` },

    // ─── Química Sanguínea ───────────────────────────────────────────────
    { key: 'qs_glu', check: v => v > 110, term: val => `hiperglicemia de ${val}` },
    { key: 'qs_glu', check: v => v < 70, term: val => `hipoglicemia de ${val}` },
    { key: 'qs_cre', check: v => v > 1.2, term: val => `elevación de azoados (Cre ${val})` },
    { key: 'qs_bun', check: v => v > 25, term: val => `elevación de BUN (${val})` },
    { key: 'qs_alt', check: v => v > 56, term: val => `hipertransaminasemia (ALT ${val})` },
    { key: 'qs_ast', check: v => v > 40, term: val => `hipertransaminasemia (AST ${val})` },
    { key: 'qs_col', check: v => v > 200, term: val => `hipercolesterolemia de ${val}` },
    { key: 'qs_trig', check: v => v > 150, term: val => `hipertrigliceridemia de ${val}` },
    { key: 'qs_ua', check: v => v > 7, term: val => `hiperuricemia de ${val}` },
    { key: 'qs_tb', check: v => v > 1.2, term: val => `hiperbilirrubinemia (BT ${val})` },
    { key: 'qs_alb', check: v => v < 3.5, term: val => `hipoalbuminemia de ${val}` },

    // ─── EGO / Orina ────────────────────────────────────────────────────
    { key: 'ego_glu', check: v => v > 0, term: () => 'glucosuria' },
    { key: 'ego_prot', check: v => v > 0, term: () => 'proteinuria' },
    { key: 'ego_bact', check: v => v > 0, term: () => 'bacteriuria' },

    // ─── Coagulación ─────────────────────────────────────────────────────
    { key: 'cg_inr', check: v => v > 1.2, term: val => `prolongación de tiempos de coagulación (INR ${val})` },
    { key: 'cg_dd', check: v => v > 0.5, term: val => `elevación de D-Dímero (${val})` },
    { key: 'cg_fib', check: v => v > 400, term: val => `hiperfibrinogenemia (${val})` },
    { key: 'cg_fib', check: v => v < 200, term: val => `hipofibrinogenemia (${val})` },
];

/**
 * Generate a Spanish clinical summary sentence from current lab values.
 * Returns null if all parameters are within normal limits.
 * @param {Object} values - key/value map from getValues()
 * @returns {string|null}
 */
function generateClinicalSummary(values) {
    const findings = [];
    const sex = values.hc_sexo || 'M';

    for (const rule of CLINICAL_RULES) {
        const rawVal = values[rule.key];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
            const num = parseFloat(rawVal);
            if (!isNaN(num) && rule.check(num, sex)) {
                findings.push(rule.term(rawVal));
            }
        }
    }

    if (findings.length === 0) return null;

    // Join with commas and "y" before the last item
    let joined;
    if (findings.length === 1) {
        joined = findings[0];
    } else {
        joined = findings.slice(0, -1).join(', ') + ' y ' + findings[findings.length - 1];
    }

    return `A la valoración de laboratorios, paciente cursa con ${joined}. Resto de parámetros reportados dentro de límites de referencia.`;
}
