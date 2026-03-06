// ==UserScript==
// @name         Azura Auto-Fill (Ingreso + Evolución)
// @namespace    http://tampermonkey.net/
// @version      3.7
// @description  Auto-fills Azura fields on both Ingreso and Nota de Evolución pages. Syncs cross-origin via GM_storage.
// @author       AutoFill Studio
// @match        https://cqs.hospisoft.mx/*
// @match        https://yakat1.github.io/azura-fill/*
// @match        http://localhost:*/*
// @match        file://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Yakat1/azura-fill/main/azura-autofill.user.js
// @downloadURL  https://raw.githubusercontent.com/Yakat1/azura-fill/main/azura-autofill.user.js
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_VERSION = '3.7';
    const SCRIPT_START = performance.now();

    const IS_EDITOR = location.pathname.includes('index.html')
        || location.href.includes('index.html')
        || location.hostname === 'yakat1.github.io';

    // ─── ANTECEDENTES DEFAULT TEMPLATE ──────────────────────────────────────────
    const ANTE_TEMPLATE = `ANTECEDENTES PERSONALES PATOLÓGICOS
Enf crónico degenerativas: niega antecedentes de enfermedades crónico degenerativas
Alergias: niega antecedentes de alergias a medicamentos y alimentos
Traumatismos: niega antecedentes de fracturas
Quirúrgicos: niega antecedentes de cirugías
Transfusiones: niega antecedentes transfusionales
Alcohol: niega consumo de alcohol / refiere alcoholismo social
Tabaco: niega consumo de tabaco / refiere consumir ___ cigarros diariamente con un índice tabáquico de ___
Toxicomanías: niega el consumo de otras sustancias

GINECO-OBSTÉTRICOS
G:0 P:0 A:0 C:0
Menarca: 12 años
FUM:`;

    // ─── PAGE DETECTION ──────────────────────────────────────────────────────────
    function detectPage() {
        const h1s = [...document.querySelectorAll('h1')].map(el => el.textContent.trim());
        if (h1s.some(t => t.includes('Historia clínica') || t.includes('Historia Clínica'))) return 'historia';
        if (h1s.some(t => t.includes('Nota de evolución') || t.includes('Nota de Evolución'))) return 'evolucion';
        if (h1s.some(t => t.includes('Nota de ingreso'))) return 'notaIngreso';
        if (h1s.some(t => t.includes('Nota de urgencias') || t.includes('Nota de Urgencias'))) return 'ingreso';
        return null;
    }

    // ─── FIELD MAPS (vitals) ─────────────────────────────────────────────────────
    const FIELD_MAPS = {
        ingreso: {
            temperatura: { id: 'temperatura', triggerFocus: false, triggerAjax: false },
            frecresp: { id: 'frecresp', triggerFocus: false, triggerAjax: false },
            freccard: { id: 'freccard', triggerFocus: false, triggerAjax: false },
            glucometria: { id: 'glucometria', triggerFocus: false, triggerAjax: false },
            tensart: { id: 'tensart', triggerFocus: true, triggerAjax: false },
            saturacion: { id: 'saturacion', triggerFocus: false, triggerAjax: false },
            peso: { id: 'peso', triggerFocus: false, triggerAjax: true },
            talla: { id: 'talla', triggerFocus: false, triggerAjax: true },
        },
        notaIngreso: {
            temperatura: { id: 'temperatura', triggerFocus: false, triggerAjax: false },
            frecresp: { id: 'frecresp', triggerFocus: false, triggerAjax: false },
            freccard: { id: 'freccard', triggerFocus: false, triggerAjax: false },
            glucometria: { id: 'glucometria', triggerFocus: false, triggerAjax: false },
            tensart: { id: 'tensart', triggerFocus: true, triggerAjax: false },
            saturacion: { id: 'saturacion', triggerFocus: false, triggerAjax: false },
            peso: { id: 'peso', triggerFocus: false, triggerAjax: true },
            talla: { id: 'talla', triggerFocus: false, triggerAjax: true },
        },
        evolucion: {
            temperatura: { id: 'temperatura', triggerFocus: false, triggerAjax: false },
            frecresp: { id: 'respiratoria', triggerFocus: false, triggerAjax: false },
            freccard: { id: 'cardiaca', triggerFocus: false, triggerAjax: false },
            glucometria: { id: 'glucometria', triggerFocus: false, triggerAjax: false },
            tensart: { selector: '[name="signosVitales:contenedorSignoVital2:tensionArterialString"]', triggerFocus: true, triggerAjax: false },
            saturacion: { id: 'saturacion', triggerFocus: false, triggerAjax: false },
            peso: { id: 'peso', triggerFocus: false, triggerAjax: true },
            talla: { id: 'talla', triggerFocus: false, triggerAjax: true },
        },
        historia: {
            temperatura: { selector: '[name="exploracionFisicaSignosVitales:contenedorSomatometria:temperaturaString"]', triggerFocus: false, triggerAjax: false },
            frecresp: { selector: '[name="exploracionFisicaSignosVitales:contenedorSomatometria:respiracionesString"]', triggerFocus: false, triggerAjax: false },
            freccard: { selector: '[name="exploracionFisicaSignosVitales:contenedorSomatometria:frecuenciaCardiaca"]', triggerFocus: false, triggerAjax: false },
            glucometria: { id: 'glucometria', triggerFocus: false, triggerAjax: false },
            tensart: { selector: '[name="exploracionFisicaSignosVitales:contenedorSomatometria:presion"]', triggerFocus: true, triggerAjax: false },
            saturacion: { selector: '[name="exploracionFisicaSignosVitales:contenedorSomatometria:saturacionOxigeno"]', triggerFocus: false, triggerAjax: false },
            peso: { id: 'peso', triggerFocus: false, triggerAjax: true },
            talla: { id: 'talla', triggerFocus: false, triggerAjax: true },
        },
    };

    // ─── TEXT MAPS (clinical text fields) ─────────────────────────────────────
    const TEXT_MAPS = {
        ingreso: {
            motivoIngreso: { selector: '[name="contenedorMotivo:motivoIngreso"]' },
            antecedentes: { id: 'antecedentes', defaultValue: ANTE_TEMPLATE },
            resultados: { id: 'resultados' },
            tratamiento: { id: 'tratamiento' },
            pronostico: { id: 'pronostico' },
        },
        notaIngreso: {
            ni_alergiasPac: { selector: '[name="alergias:alergiasVVFrom:alergiaAgregar:alergiasPac"]' },
            ni_falloRenalSelect: { selector: '[name="falloRenalSelect"]' },
            ni_evaluacionAdicional: { selector: '[name="evaluacionAdicionalNutricionRadioGroup"]' },
            ni_especificarCuando: { selector: '[name="especificarCuandoRadioGroup"]' },
            ni_especificarEvaluacion: { selector: '[name="especificarEvaluacionAdNut"]' },
            ni_antecedentes: { selector: '[name="antecedentes"]', defaultValue: ANTE_TEMPLATE },
            ni_motivo: { selector: '[name="motivo"]' },
            ni_padecimientoActual: { selector: '[name="padecimientoActual"]' },
            ni_resumen: { selector: '[name="resumen"]' },
            ni_resultados: { selector: '[name="resultados"]' },
            ni_impresionDiagnostica: { selector: '[name="impresionDiagnostica"]' },
            ni_tratamiento: { selector: '[name="tratamiento"]' },
            ni_pronostico: { selector: '[name="pronostico"]' },
            ni_plan: { selector: '[name="plan"]' },
        },
        evolucion: {
            padecimientoActual: { selector: '[name="padecimientoActual"]' },
            objetivo: { selector: '[name="objetivo"]' },
            analisisEvolucion: { selector: '[name="analisisEvolucion"]' },
            planEstudio: { selector: '[name="planEstudio"]' },
            resultadoLabImg: { selector: '[name="resultadoLabImg"]' },
            pronostico: { selector: '[name="pronostico"]' },
        },
        historia: {
            // ── Section 2: Heredo Familiares
            hf_cronico: {
                rowLabel: { container: '[name="antecedentesFanNoPat:herdoFamiliares:containerTabla:formaTabla:tabla:body"]', text: 'ENF. CRONICO DEGENERATIVAS' },
                defaultValue: '',
            },
            hf_neoplasias: {
                rowLabel: { container: '[name="antecedentesFanNoPat:herdoFamiliares:containerTabla:formaTabla:tabla:body"]', text: 'NEOPLASIAS' },
                defaultValue: 'NO REFIERE EL ANTECEDENTE DE ALGUNA NEOPLASIA DE IMPORTANCIA',
            },
            hf_otras: {
                rowLabel: { container: '[name="antecedentesFanNoPat:herdoFamiliares:containerTabla:formaTabla:tabla:body"]', text: 'OTRAS' },
                defaultValue: '',
            },
            // ── Section 3: No Patológicos
            np_casa: {
                rowLabel: { container: '[name="antecedentesFanNoPat:antecedentesNoPatologicos:containerTabla:formaTabla:tabla:body"]', text: '1 CASA HABITACIÓN' },
                defaultValue: 'REFIERE HABITAR EN CASA PROPIA EN MEDIO URBANO, EN LA QUE CONVIVE CON * PERSONAS Y CUENTA CON TODOS LOS SERVICIOS BÁSICOS DE URBANIZACIÓN PARA LA BUENA VIVIENDA CON UNA ADECUADA ILUMINACIÓN Y VENTILACIÓN',
            },
            np_alimentacion: {
                rowLabel: { container: '[name="antecedentesFanNoPat:antecedentesNoPatologicos:containerTabla:formaTabla:tabla:body"]', text: '2 ALIMENTACIÓN' },
                defaultValue: 'REFIERE UNA DIETA BUENA EN CALIDAD Y CANTIDAD RESPECTO EL PLATO DEL BUEN COMER DE FRUTAS Y VERDURAS 5/7, CARNES ROJAS 2/7, CARNES BLANCAS COMO POLLO Y PESCADO 4/7. CONSUMO HÍDRICO DE AGUA NATURAL DIARIA DE 1 LITRO Y MEDIO DIARIAMENTE',
            },
            np_deporte: {
                rowLabel: { container: '[name="antecedentesFanNoPat:antecedentesNoPatologicos:containerTabla:formaTabla:tabla:body"]', text: '3 DEPORTE' },
                defaultValue: 'NO REQUIERE REALIZAR ACTIVIDAD FÍSICA DE MANERA RECURRENTE, POR LO QUE SE CONSIDERA PERSONA SEDENTARIA',
            },
            np_animales: {
                rowLabel: { container: '[name="antecedentesFanNoPat:antecedentesNoPatologicos:containerTabla:formaTabla:tabla:body"]', text: '4 EXPOSICIÓN A ANIMALES' },
                defaultValue: 'NIEGA LA CONVIVENCIA RECURRENTE CON ANIMALES Y/O MASCOTAS',
            },
            np_religion: {
                rowLabel: { container: '[name="antecedentesFanNoPat:antecedentesNoPatologicos:containerTabla:formaTabla:tabla:body"]', text: '5 RELIGIÓN' },
                defaultValue: 'NO REFIERE PRACTICAR ALGUNA RELIGIÓN O SER CREYENTE DE UN GRUPO',
            },
            np_trabajo: {
                rowLabel: { container: '[name="antecedentesFanNoPat:antecedentesNoPatologicos:containerTabla:formaTabla:tabla:body"]', text: '6 TRABAJO / ESTRÉS' },
                defaultValue: 'REFIERE MANEJAR NIVELES MODERADOS DE ESTRÉS A RAZÓN DE',
            },
            np_alcoholismo: {
                rowLabel: { container: '[name="antecedentesFanNoPat:antecedentesNoPatologicos:containerTabla:formaTabla:tabla:body"]', text: '7 ALCOHOLISMO' },
                defaultValue: 'NIEGA EL CONSUMO DE BEBIDAS ALCOHÓLICAS',
            },
            np_farmacodep: {
                rowLabel: { container: '[name="antecedentesFanNoPat:antecedentesNoPatologicos:containerTabla:formaTabla:tabla:body"]', text: '8 FARMACODEPENDENCIA' },
                defaultValue: 'NIEGA EL CONSUMO DE OTRAS SUSTANCIAS',
            },
            np_tabaquismo: {
                rowLabel: { container: '[name="antecedentesFanNoPat:antecedentesNoPatologicos:containerTabla:formaTabla:tabla:body"]', text: '9 TABAQUISMO' },
                defaultValue: 'NIEGA EL CONSUMO DE TABACO',
            },
            np_otro: {
                rowLabel: { container: '[name="antecedentesFanNoPat:antecedentesNoPatologicos:containerTabla:formaTabla:tabla:body"]', text: 'OTRO' },
                defaultValue: '',
            },
            // ── Section 4: Patológicos
            pat_alergias: {
                rowLabel: { container: '[name="interrogatorio:contenedorAntecedente:antecedentePatologico:containerTabla:formaTabla:tabla:body"]', text: 'ALERGICAS' },
                defaultValue: 'NO REFIERE SER ALÉRGICA A MEDICAMENTOS, ALIMENTOS O ALGÚN OTRO FACTOR DEL ENTORNO',
            },
            pat_cronicos: {
                rowLabel: { container: '[name="interrogatorio:contenedorAntecedente:antecedentePatologico:containerTabla:formaTabla:tabla:body"]', text: 'ENF. CRONICO DEGENERATIVAS' },
                defaultValue: 'NO REFIERE EL ANTECEDENTE',
            },
            pat_infancia: {
                rowLabel: { container: '[name="interrogatorio:contenedorAntecedente:antecedentePatologico:containerTabla:formaTabla:tabla:body"]', text: 'ENF. P. INFANCIA' },
                defaultValue: 'INTERROGADOS Y NEGADAS',
            },
            pat_neoplasias: {
                rowLabel: { container: '[name="interrogatorio:contenedorAntecedente:antecedentePatologico:containerTabla:formaTabla:tabla:body"]', text: 'NEOPLASIAS' },
                defaultValue: 'INTERROGADOS Y NEGADOS',
            },
            pat_otras: {
                rowLabel: { container: '[name="interrogatorio:contenedorAntecedente:antecedentePatologico:containerTabla:formaTabla:tabla:body"]', text: 'OTRAS' },
                defaultValue: '',
            },
            pat_quirurgicos: {
                rowLabel: { container: '[name="interrogatorio:contenedorAntecedente:antecedentePatologico:containerTabla:formaTabla:tabla:body"]', text: 'QUIRURGICOS' },
                defaultValue: 'NO REFIERE EL ANTECEDENTE',
            },
            pat_transfusiones: {
                rowLabel: { container: '[name="interrogatorio:contenedorAntecedente:antecedentePatologico:containerTabla:formaTabla:tabla:body"]', text: 'TRANSFUSIONALES' },
                defaultValue: 'INTERROGADOS Y NEGADOS',
            },
            pat_traumaticos: {
                rowLabel: { container: '[name="interrogatorio:contenedorAntecedente:antecedentePatologico:containerTabla:formaTabla:tabla:body"]', text: 'TRAUMATICOS' },
                defaultValue: 'INTERROGADOS Y NEGADOS',
            },
            // ── Section 6: Aparatos y Sistemas
            ap_cardiovascular: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'CARDIOVASCULAR' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_dermatologico: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'DERMATOLOGICO' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_digestivo: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'DIGESTIVO' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_endocrino: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'ENDOCRINO' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_hematologico: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'HEMATOLOGICO' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_linfatico: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'LINFATICO' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_muscular: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'MUSCULAR' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_nervioso: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'NERVIOSO' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_oseo: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'OSEO' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_psiquiatrico: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'PSIQUIATRICO' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_reproductor: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'REPRODUCTOR' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_respiratorio: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'RESPIRATORIO' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_sentidos: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'SENTIDOS' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            ap_urinario: { rowLabel: { container: '[name="interrogatorio:aparatoSistemaTI:containerTabla:formaTabla:tabla:body"]', text: 'URINARIO' }, defaultValue: 'INTERROGADOS Y NEGADOS' },
            // ── Section 6: Exploración Física
            ef_inspeccion: {
                selector: '[name="exploracionFisica:inspeccionGral"]',
                defaultValueM: 'PACIENTE MASCULINO DE EDAD APARENTE A LA CRONOLÓGICA CON UN ADECUADO ESTADO DE ALERTA Y ORIENTACIÓN EN SUS TRES ESFERAS NEUROLÓGICAS, BUEN ESTADO NUTRICIONAL, CON BUENAS FASCIAS Y LENGUAJE. COOPERADOR AL INTERROGATORIO Y EXPLORACIÓN FÍSICA',
                defaultValueF: 'PACIENTE FEMENINO DE EDAD APARENTE A LA CRONOLÓGICA CON UN ADECUADO ESTADO DE ALERTA Y ORIENTACIÓN EN SUS TRES ESFERAS NEUROLÓGICAS, BUEN ESTADO NUTRICIONAL, CON BUENAS FASCIAS Y LENGUAJE. COOPERADOR AL INTERROGATORIO Y EXPLORACIÓN FÍSICA',
            },
            ef_piel: {
                selector: '[name="exploracionFisica:piel"]',
                defaultValue: 'ADECUADA IMPLANTACIÓN DEL PABELLÓN AURICULAR ACORDE A SU EDAD Y GÉNERO, MUCOSA ORAL HIDRATADA CON ADECUADA COLORACIÓN DE PIEL Y TEGUMENTOS',
            },
            ef_linfatico: {
                selector: '[name="exploracionFisica:sistemaLinfatico"]',
                defaultValue: 'SIN PRESENCIA DE FIEBRE, NI ADENOMEGALIAS O MASAS PALPABLES EN REGIÓN RETROAURICULAR, CUELLO, CLAVICULAR, AXILAR, INGUINAL, RETRO POPLÍTEA',
            },
            ef_general: {
                selector: '[name="exploracionFisica:exploracionFisicaGeneral"]',
                defaultValue: 'CRÁNEO NORMOCÉFALO SIN PRESENCIA DE ENDO NI EXOSTOSIS, PUPILAS ISOCÓRICAS NORMOREFLEXICAS, NARINAS PERMEABLES, MUCOSA ORAL HIDRATADA. CUELLO CILÍNDRICO SIN PRESENCIA DE ADENOMEGALIAS O MASAS PALPABLES SIN DATOS DE INGURGITACIÓN YUGULAR. TÓRAX NORMOLÍNEO, SIMÉTRICO, MURMULLO VESICULAR PRESENTE, CON ADECUADOS MOVIMIENTOS DE AMPLEXIÓN Y AMPLEXACIÓN, RUIDOS CARDIACOS RÍTMICOS DE BUEN TONO E INTENSIDAD SIN AGREGADOS. ABDOMEN GLOBOSO A EXPENSAS DE PANÍCULO ADIPOSO, PERISTALSIS NORMOACTIVA, BLANDO DEPRESIBLE NO DOLOROSO A LA PALPACIÓN SUPERFICIAL, MEDIA Y PROFUNDA, SIN DATOS DE IRRITACIÓN PERITONEAL. EXTREMIDADES ÍNTEGRAS Y SIMÉTRICAS SIN LIMITACIÓN EN LOS ARCOS DE MOVIMIENTO. PULSOS PERIFÉRICOS PRESENTES. LLENADO CAPILAR DE 2 SEGUNDOS',
            },
            // ── Section 7: Padecimiento Actual
            hc_padecimientoActual: {
                selector: '[name="interrogatorio:padecimientoActual"]',
                defaultValue: '',
            },
            // ── Section 8: Resultados y Diagnóstico
            hc_resultados: {
                selector: '[name="serviciosAuxiliares:resultados"]',
                defaultValue: '',
            },
            hc_impresionDiagnostica: {
                selector: '[name="impresionDiagnostica"]',
                defaultValue: '',
            },
            hc_terapeutica: {
                selector: '[name="serviciosAuxiliares:terapeutica:terapeutica"]',
                defaultValue: '',
            },
            hc_pronostico: {
                selector: '[name="pronostico"]',
                defaultValue: '',
            },
        },
    };

    // Fill order per page
    const VITAL_ORDER = ['temperatura', 'frecresp', 'freccard', 'glucometria', 'tensart', 'saturacion', 'peso', 'talla'];
    const TEXT_ORDER = {
        ingreso: ['antecedentes', 'motivoIngreso', 'resultados', 'tratamiento', 'pronostico'],
        notaIngreso: [
            'ni_alergiasPac', 'ni_falloRenalSelect', 'ni_evaluacionAdicional',
            'ni_especificarCuando', 'ni_especificarEvaluacion', 'ni_antecedentes',
            'ni_motivo', 'ni_padecimientoActual', 'ni_resumen', 'ni_resultados',
            'ni_impresionDiagnostica', 'ni_tratamiento', 'ni_pronostico', 'ni_plan'
        ],
        evolucion: ['padecimientoActual', 'objetivo', 'analisisEvolucion', 'planEstudio', 'resultadoLabImg', 'pronostico'],
        historia: [
            "hf_cronico", "hf_neoplasias", "hf_otras",
            "np_casa", "np_alimentacion", "np_deporte",
            "np_animales", "np_religion", "np_trabajo", "np_alcoholismo", "np_farmacodep",
            "np_tabaquismo", "np_otro",
            "pat_alergias", "pat_cronicos", "pat_infancia", "pat_neoplasias", "pat_otras",
            "pat_quirurgicos", "pat_transfusiones", "pat_traumaticos", "ap_cardiovascular",
            "ap_dermatologico", "ap_digestivo", "ap_endocrino", "ap_hematologico",
            "ap_linfatico", "ap_muscular", "ap_nervioso", "ap_oseo", "ap_psiquiatrico",
            "ap_reproductor", "ap_respiratorio", "ap_sentidos", "ap_urinario",
            "ef_inspeccion", "ef_piel", "ef_linfatico", "ef_general", "hc_padecimientoActual",
            "hc_resultados", "hc_impresionDiagnostica", "hc_terapeutica", "hc_pronostico"
        ],
    };

    const AJAX_WAIT_MS = 1500;

    // ─── OVERLAY LABELS ──────────────────────────────────────────────────────────
    const LABELS_INGRESO = {
        temperatura: 'Temperatura', frecresp: 'Frec. resp.', freccard: 'Frec. card.',
        glucometria: 'Glucometría', tensart: 'Tensión art.', saturacion: 'Saturación',
        peso: 'Peso', talla: 'Talla',
        motivoIngreso: 'Motivo ingreso', antecedentes: 'Antecedentes',
        resultados: 'Resultados', tratamiento: 'Tratamiento', pronostico: 'Pronóstico',
    };
    const LABELS_EVOLUCION = {
        temperatura: 'Temperatura', frecresp: 'Frec. resp.', freccard: 'Frec. card.',
        glucometria: 'Glucometría', tensart: 'Tensión art.', saturacion: 'Saturación',
        peso: 'Peso', talla: 'Talla',
        padecimientoActual: 'Padecimiento actual', objetivo: 'Objetivo', analisisEvolucion: 'Evolución/Análisis',
        planEstudio: 'Plan de estudio', resultadoLabImg: 'Resultados auxiliares',
        pronostico: 'Pronóstico',
    };
    const LABELS_HISTORIA = {
        temperatura: 'Temperatura', frecresp: 'Frec. resp.', freccard: 'Frec. card.',
        glucometria: 'Glucometría', tensart: 'Tensión art.', saturacion: 'Saturación',
        peso: 'Peso', talla: 'Talla',
        hf_cronico: 'Crónicos (HF)', hf_neoplasias: 'Neoplasias (HF)', hf_otras: 'Otras (HF)',
        np_casa: 'Casa', np_alimentacion: 'Alimentación', np_deporte: 'Deporte',
        np_animales: 'Animales', np_religion: 'Religión', np_trabajo: 'Trabajo',
        np_alcoholismo: 'Alcoholismo', np_farmacodep: 'Farmacodep.', np_tabaquismo: 'Tabaquismo',
        pat_alergias: 'Alergias', pat_cronicos: 'Crónicos', pat_infancia: 'Infancia',
        pat_neoplasias: 'Neoplasias', pat_otras: 'Otras', pat_quirurgicos: 'Qx',
        pat_transfusiones: 'Transfusiones', pat_traumaticos: 'Trauma',
        ap_cardiovascular: 'Cardiovascular', ap_dermatologico: 'Dermatológico',
        ap_digestivo: 'Digestivo', ap_endocrino: 'Endocrino', ap_hematologico: 'Hematológico',
        ap_linfatico: 'Linfático', ap_muscular: 'Muscular', ap_nervioso: 'Nervioso',
        ap_oseo: 'Óseo', ap_psiquiatrico: 'Psiquiátrico', ap_reproductor: 'Reproductor',
        ap_respiratorio: 'Respiratorio', ap_sentidos: 'Sentidos', ap_urinario: 'Urinario',
        ef_inspeccion: 'Inspección', ef_piel: 'Piel y Faneras', ef_linfatico: 'S. Linfático',
        ef_general: 'Ex. Física', hc_padecimientoActual: 'Padecimiento Act.',
        hc_resultados: 'Resultados', hc_impresionDiagnostica: 'Impresión Dx',
        hc_terapeutica: 'Terapéutica', hc_pronostico: 'Pronóstico'
    };

    // ─── BRIDGE & STORAGE ────────────────────────────────────────────────────────
    function installLocalStorageInterceptor() {
        const _origSet = localStorage.__proto__.setItem;
        localStorage.__proto__.setItem = function (key, value) {
            _origSet.call(this, key, value);
            if (key === 'azuraParams' || key === 'azuraAutoFill') {
                syncToGM();
            }
        };
    }

    function syncToGM() {
        try {
            const params = localStorage.getItem('azuraParams');
            const flag = localStorage.getItem('azuraAutoFill');
            if (params) GM_setValue('azuraParams', params);
            if (flag) GM_setValue('azuraAutoFill', flag);
        } catch (_) { }
    }

    function loadFromGM() {
        try {
            const params = GM_getValue('azuraParams', null);
            const flag = GM_getValue('azuraAutoFill', null);
            if (params) localStorage.setItem('azuraParams', params);
            if (flag) localStorage.setItem('azuraAutoFill', flag);
        } catch (_) { }
    }

    function getLatestParams() {
        loadFromGM(); // Ensure local is synced
        let params = null;
        try { params = JSON.parse(localStorage.getItem('azuraParams')); } catch (_) { }
        return params || window.__azuraParams;
    }

    // ─── SLEEP ───────────────────────────────────────────────────────────────────
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // ─── WAIT FOR PAGE MARKER ────────────────────────────────────────────────────
    function waitForMarker(test, timeoutMs = 15000) {
        return new Promise((resolve, reject) => {
            if (test()) { resolve(); return; }
            const obs = new MutationObserver(() => { if (test()) { obs.disconnect(); resolve(); } });
            obs.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeoutMs);
        });
    }

    // ─── HELPER: find element ────────────────────────────────────────────────────
    function findField(cfg) {
        if (cfg.selector) {
            const el = document.querySelector(cfg.selector);
            if (el) {
                console.log('[AzuraFill] ✓ selector MATCH:', cfg.selector);
            } else {
                console.warn('[AzuraFill] ✕ selector MISS:', cfg.selector);
            }
            return el || null;
        }
        if (cfg.rowLabel) {
            // The live page tbody elements have NO name attribute.
            // Only the textarea children do. So we extract the name prefix
            // from the container selector and query textareas by name^=prefix.
            const containerNameMatch = cfg.rowLabel.container.match(/\[name\^?="([^"]+)"\]/);
            if (!containerNameMatch) {
                console.warn('[AzuraFill] ✕ invalid rowLabel container selector:', cfg.rowLabel.container);
                return null;
            }
            const namePrefix = containerNameMatch[1];

            // CSS attribute prefix selector: textarea[name^="...:body"]
            const textareas = document.querySelectorAll('textarea[name^="' + namePrefix + '"]');
            if (!textareas.length) {
                console.warn('[AzuraFill] ✕ no textareas found with prefix:', namePrefix);
                return null;
            }

            const cleanText = (str) => {
                return str.toUpperCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // remove accents
                    .replace(/[0-9]/g, '')           // remove numbers (e.g. "9 TABAQUISMO")
                    .replace(/\s+/g, ' ')            // compress whitespace/newlines
                    .trim();
            };
            const labelsStr = cleanText(cfg.rowLabel.text);

            for (const ta of textareas) {
                const row = ta.closest('tr');
                if (!row) continue;
                const rowCleaned = cleanText(row.textContent);
                if (rowCleaned.includes(labelsStr)) {
                    console.log('[AzuraFill] ✓ rowLabel MATCH:', cfg.rowLabel.text, '→', ta.name);
                    return ta;
                }
            }
            console.warn('[AzuraFill] ✕ rowLabel NO ROW matched for:', cfg.rowLabel.text, '| target:', labelsStr, '| textareas found:', textareas.length);
            return null;
        }
        let el = cfg.id ? document.getElementById(cfg.id) : null;
        if (!el && cfg.name) el = document.querySelector(`[name="${CSS.escape(cfg.name)}"]`);
        if (el) {
            console.log('[AzuraFill] ✓ id/name MATCH:', cfg.id || cfg.name);
        } else {
            console.warn('[AzuraFill] ✕ id/name MISS:', cfg.id || cfg.name);
        }
        return el || null;
    }

    // ─── HELPER: fill element ─────────────────────────────────────────────────────
    function fillElement(el, value, isRadio = false) {
        if (isRadio) {
            // Find the specific radio inside the group
            const radio = document.querySelector(`input[name="${CSS.escape(el.name)}"][value="${CSS.escape(value)}"]`);
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            } else {
                console.warn('[AzuraFill] ✕ Radio option not found for value:', value);
            }
        } else if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // ─── OVERLAY ─────────────────────────────────────────────────────────────────
    let badge, badgeText, badgeDot, panel;

    function createOverlay() {
        const css = `
            .azf-wrap{position:fixed;bottom:18px;right:18px;z-index:99999;font-family:system-ui,sans-serif;}
            .azf-badge{display:flex;align-items:center;gap:6px;background:#13162080;backdrop-filter:blur(8px);
              border:1px solid #2e3450;border-radius:8px;padding:6px 12px;cursor:pointer;user-select:none;
              box-shadow:0 4px 16px #0008;color:#e8ecf5;font-size:12px;}
            .azf-dot{width:7px;height:7px;border-radius:50%;background:#4a7ff7;transition:background .3s;}
            .azf-dot.ok{background:#2dc96a;} .azf-dot.warn{background:#f05a5a;} .azf-dot.idle{background:#f0a12a;}
            .azf-panel{display:none;position:absolute;bottom:calc(100% + 8px);right:0;min-width:280px;max-height:420px;
              overflow-y:auto;background:#12151ef2;backdrop-filter:blur(10px);border:1px solid #2e3450;
              border-radius:10px;padding:10px 12px;box-shadow:0 8px 32px #000a;}
            .azf-panel.show{display:block;}
            .azf-row{display:grid;grid-template-columns:18px auto 1fr;gap:4px 6px;font-size:11px;margin-bottom:3px;
              align-items:baseline;color:#8892a4;}
            .azf-ico{font-size:10px;text-align:center;} .azf-lbl{font-weight:500;}
            .c-ok{color:#2dc96a;} .c-miss{color:#f05a5a;} .c-skip{color:#f0a12a;}
            .azf-val{color:#525d72;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
            .azf-btn{margin-top:8px;width:100%;background:#1e2236;border:1px solid #2e3450;border-radius:6px;
              color:#8892a4;padding:5px 0;cursor:pointer;font-size:11px;}
            .azf-btn:hover{background:#252b42;color:#e8ecf5;}
            .azf-page-tag{font-size:10px;color:#4a7ff7;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #2e3450;}
        `;
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        badge = document.createElement('div');
        badge.className = 'azf-wrap';
        badge.innerHTML = `
            <div class="azf-badge" id="azfBadge">
                <div class="azf-dot" id="azfDot"></div>
                <span id="azfText">⚕ Iniciando…</span>
            </div>
            <div class="azf-panel" id="azfPanel"></div>
        `;
        document.body.appendChild(badge);
        badgeText = document.getElementById('azfText');
        badgeDot = document.getElementById('azfDot');
        panel = document.getElementById('azfPanel');
        document.getElementById('azfBadge').addEventListener('click', () => panel.classList.toggle('show'));
    }

    function updateOverlay(results, page) {
        const LABELS = page === 'evolucion' ? LABELS_EVOLUCION : page === 'historia' ? LABELS_HISTORIA : LABELS_INGRESO;
        const ok = results.filter(r => r.status === 'ok').length;
        const tot = results.length;
        const allOk = ok === tot && tot > 0;
        badgeDot.className = 'azf-dot ' + (allOk ? 'ok' : 'warn');
        badgeText.textContent = `⚕ ${allOk ? '✓' : '!'} ${ok}/${tot} campos`;
        panel.innerHTML = '';

        const tag = document.createElement('div');
        tag.className = 'azf-page-tag';
        tag.textContent = page === 'evolucion' ? '📋 Nota de Evolución' : page === 'historia' ? '📋 Historia Clínica' : '🏥 Nota de Urgencias';
        panel.appendChild(tag);

        for (const r of results) {
            const row = document.createElement('div');
            row.className = 'azf-row';
            const icon = r.status === 'ok' ? '✓' : r.status === 'skip' ? '↷' : '✕';
            const cls = r.status === 'ok' ? 'c-ok' : r.status === 'skip' ? 'c-skip' : 'c-miss';
            const msg = r.status === 'miss' ? 'no encontrado' : r.status === 'skip' ? 'ya tiene valor' : r.value || '';
            row.innerHTML = `<span class="azf-ico ${cls}">${icon}</span><span class="azf-lbl ${cls}">${LABELS[r.key] || r.key}</span><span class="azf-val">${msg}</span>`;
            panel.appendChild(row);
        }
        const btn = document.createElement('button');
        btn.className = 'azf-btn'; btn.textContent = '↺ Re-ejecutar';
        btn.addEventListener('click', () => { panel.classList.remove('show'); runFill(page); });
        panel.appendChild(btn);
    }

    // ─── MAIN FILL LOGIC ─────────────────────────────────────────────────────────
    async function runFill(page) {
        const params = getLatestParams();
        if (!params) { toastError(page, 'Sin datos para llenar'); return; }

        badgeText.textContent = '⚕ Llenando…';
        badgeDot.className = 'azf-dot idle';
        const results = [];
        const fieldMap = FIELD_MAPS[page] || FIELD_MAPS.ingreso;
        const textMap = TEXT_MAPS[page] || TEXT_MAPS.ingreso;
        const textKeys = TEXT_ORDER[page] || TEXT_ORDER.ingreso;

        // 1. Fill vitals
        for (const key of VITAL_ORDER) {
            const cfg = fieldMap[key];
            const value = params?.[key];
            if (!value?.toString().trim()) continue; // skip empty

            const el = findField(cfg);
            if (!el) { results.push({ key, status: 'miss' }); continue; }

            if (cfg.triggerFocus) {
                el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
                await sleep(80);
            }
            fillElement(el, value.toString());
            results.push({ key, status: 'ok', value: value.toString() });
            if (cfg.triggerAjax) await sleep(AJAX_WAIT_MS);
        }

        // 2. Fill text fields
        const sexo = params?.hc_sexo || 'M';
        for (const key of textKeys) {
            const cfg = textMap[key];
            if (!cfg) continue;
            const value = params?.[key];
            const hasUserValue = value?.toString().trim();

            // Resolve the default value (may be sex-dependent)
            const resolvedDefault = (sexo === 'F' && cfg.defaultValueF)
                ? cfg.defaultValueF
                : (cfg.defaultValueM || cfg.defaultValue || '');

            // antecedentes: template-fallback logic (Ingreso page only)
            if (key === 'antecedentes') {
                const el = findField(cfg);
                if (!el) { results.push({ key, status: 'miss' }); continue; }
                if (hasUserValue) {
                    fillElement(el, value.toString());
                    results.push({ key, status: 'ok', value: value.toString().slice(0, 30) + '…' });
                } else if (!el.value.trim() && resolvedDefault) {
                    fillElement(el, resolvedDefault);
                    results.push({ key, status: 'ok', value: 'plantilla insertada' });
                } else {
                    results.push({ key, status: 'skip', value: el.value.slice(0, 20) + '…' });
                }
                continue;
            }

            // For HC page: fill with user value, or fall back to preset if field is empty
            if (page === 'historia') {
                const el = findField(cfg);
                if (!el) { results.push({ key, status: 'miss' }); continue; }
                if (hasUserValue) {
                    fillElement(el, value.toString());
                    results.push({ key, status: 'ok', value: value.toString().slice(0, 40) });
                } else if (!el.value.trim() && resolvedDefault) {
                    fillElement(el, resolvedDefault);
                    results.push({ key, status: 'ok', value: 'preset' });
                } else if (el.value.trim()) {
                    results.push({ key, status: 'skip', value: el.value.slice(0, 20) + '…' });
                }
                // skip fields with no user value AND no default
                continue;
            }

            // All other text fields (ingreso/evolucion): only fill if user has a value
            if (!hasUserValue) continue;
            const el = findField(cfg);
            if (!el) { results.push({ key, status: 'miss' }); continue; }
            fillElement(el, value.toString());
            results.push({ key, status: 'ok', value: value.toString().slice(0, 40) });
        }

        // H1 Extraction: extract patient name from span#nombrePaciente only
        const nombreSpan = document.querySelector('span#nombrePaciente');
        if (nombreSpan) {
            const extractedName = nombreSpan.textContent.trim();
            if (extractedName) {
                console.log('[Azura Fill] Patient name extracted:', extractedName);
                try { localStorage.setItem('azuraCurrentPatient', extractedName); } catch (_) { }
                try { GM_setValue('azuraCurrentPatient', extractedName); } catch (_) { }
            }
        }

        updateOverlay(results, page);
    }

    // ─── CROSS-ORIGIN SYNC (GM_storage ↔ localStorage) ──────────────────────────
    // These functions enable the editor (on any origin: file://, GitHub Pages, etc.)
    // to communicate with Hospisoft (https://cqs.hospisoft.mx) via Tampermonkey's
    // GM_setValue/GM_getValue, which work across all origins.

    /**
     * Called on the EDITOR page. Intercepts localStorage.setItem so that whenever
     * the editor writes azuraParams or azuraAutoFill, we mirror it to GM_storage.
     */
    function installLocalStorageInterceptor() {
        const origSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function (key, value) {
            origSetItem(key, value);
            if (key === 'azuraParams' || key === 'azuraAutoFill') {
                try {
                    GM_setValue(key, value);
                    console.log(`[Azura Fill] Synced ${key} → GM_storage`);
                } catch (e) {
                    console.warn('[Azura Fill] GM_setValue failed:', e);
                }
            }
        };
        console.log('[Azura Fill] localStorage interceptor installed.');
    }

    /**
     * Called on the EDITOR page. Reads current localStorage values and pushes
     * them into GM_storage so that Hospisoft can read them on the next page load.
     */
    function syncToGM() {
        try {
            const params = localStorage.getItem('azuraParams');
            const flag = localStorage.getItem('azuraAutoFill');
            if (params) GM_setValue('azuraParams', params);
            if (flag) GM_setValue('azuraAutoFill', flag);
            console.log('[Azura Fill] Existing localStorage synced → GM_storage');
        } catch (e) {
            console.warn('[Azura Fill] syncToGM failed:', e);
        }
    }

    /**
     * Called on the HOSPISOFT page. Reads from GM_storage and writes into
     * Hospisoft's localStorage so the fill logic can read them normally.
     */
    function loadFromGM() {
        try {
            const params = GM_getValue('azuraParams', null);
            const flag = GM_getValue('azuraAutoFill', null);
            if (params) localStorage.setItem('azuraParams', params);
            if (flag) localStorage.setItem('azuraAutoFill', flag);
            console.log('[Azura Fill] GM_storage → localStorage loaded');
        } catch (e) {
            console.warn('[Azura Fill] loadFromGM failed:', e);
        }
    }

    /**
     * Reads the azuraParams from localStorage (which loadFromGM may have populated).
     */
    function getLatestParams() {
        try {
            const raw = localStorage.getItem('azuraParams');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('[Azura Fill] getLatestParams parse error:', e);
            return null;
        }
    }

    // ─── ENTRY POINT ─────────────────────────────────────────────────────────────
    async function main() {
        const loadTimeMs = (performance.now() - SCRIPT_START).toFixed(0);
        console.log(`[Azura Fill] v${SCRIPT_VERSION} loaded in ${loadTimeMs}ms | IS_EDITOR: ${IS_EDITOR} | URL: ${location.href}`);

        if (IS_EDITOR) {
            console.log(`[Azura Fill] v${SCRIPT_VERSION} — Editor detected (${loadTimeMs}ms) — installing localStorage interceptor.`);
            installLocalStorageInterceptor();
            syncToGM();
            return;
        }

        // Always try to load from GM_storage (cross-origin bridge)
        loadFromGM();

        const flag = localStorage.getItem('azuraAutoFill');
        console.log('[Azura Fill] azuraAutoFill flag:', flag);
        if (flag !== 'true') {
            console.log('[Azura Fill] No fill flag set — exiting.');
            return;
        }

        let params = getLatestParams();
        console.log('[Azura Fill] Params loaded:', params ? Object.keys(params).length + ' keys' : 'null');
        if (!params) return;

        window.__azuraParams = params;
        createOverlay();

        // Detect which page we're on — wait up to 10s for the page to render
        let page = detectPage();
        if (!page) {
            badgeText.textContent = '⚕ Esperando página…';
            try {
                await waitForMarker(() => detectPage() !== null, 10000);
                page = detectPage();
            } catch (_) {
                badgeText.textContent = `⚕ Azura v${SCRIPT_VERSION}`;
                badgeDot.className = 'azf-dot idle';
                console.log(`[Azura Fill] v${SCRIPT_VERSION} — No compatible page detected. Standing by.`);
                return;
            }
        }

        // For ingreso page, wait for the page H1 to appear
        if (page === 'ingreso' || page === 'notaIngreso') {
            badgeText.textContent = `⚕ Esperando página de ${page === 'ingreso' ? 'urgencias' : 'ingreso'}…`;
            try {
                await waitForMarker(() => {
                    const h1s = [...document.querySelectorAll('h1')].map(el => el.textContent.trim());
                    if (page === 'ingreso') return h1s.some(t => t.includes('Nota de urgencias') || t.includes('Nota de Urgencias'));
                    if (page === 'notaIngreso') return h1s.some(t => t.includes('Nota de ingreso'));
                    return false;
                }, 15000);
            } catch (_) {
                badgeText.textContent = `⚕ ✕ Página de ${page === 'ingreso' ? 'urgencias' : 'ingreso'} no encontrada`;
                badgeDot.className = 'azf-dot warn';
                return;
            }
        }

        await sleep(300);
        await runFill(page);

        // Listen for remote editor triggers (cross-tab)
        try {
            GM_addValueChangeListener('azuraAutoFill', (name, oldVal, newVal, remote) => {
                if (remote && newVal === 'true') {
                    console.log('[Azura Fill] Received remote trigger');
                    const curPage = detectPage();
                    if (curPage) runFill(curPage);
                }
            });
        } catch (e) { }

        // Watch for Wicket AJAX navigation between page sections
        watchPageChanges(page);
    }

    // ─── WATCH FOR WICKET PAGE SECTION CHANGES ────────────────────────────────────
    function watchPageChanges(initialPage) {
        let currentPage = initialPage;
        let debounceTimer = null;

        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const newPage = detectPage();
                if (newPage && newPage !== currentPage) {
                    currentPage = newPage;
                    badgeText.textContent = `⚕ Sección cambiada → ${newPage === 'evolucion' ? 'Evolución' : newPage === 'historia' ? 'Historia' : 'Urgencias'}`;
                    badgeDot.className = 'azf-dot idle';
                    // Small extra wait for Wicket to finish rendering the new fields
                    sleep(800).then(() => runFill(newPage));
                }
            }, 600);
        });


        // Watch for any DOM changes in the main content area (H1 swaps, form renders)
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    main();
})();
