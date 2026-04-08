/**
 * ╔═══════════════════════════════════════════════════════════════╗
 *  AZURA SCOUT  —  Brute-force form field locator
 *  Paste this entire script into the browser DevTools console.
 *  It will:
 *    1. Find every visible input, textarea, and select on the page.
 *    2. Highlight each one with a numbered badge.
 *    3. Print a structured report to the console.
 *    4. Let you click any badge to log that field's best selector.
 *
 *  To remove all highlights, run:   AzuraScout.cleanup()
 *  To re-scan the page, run:        AzuraScout.scan()
 *  To copy report as JSON:          AzuraScout.copy()   ← paste into chat!
 *  To save report as a file:        AzuraScout.download()
 * ╚═══════════════════════════════════════════════════════════════╝
 */
(() => {
    'use strict';

    // ── Cleanup previous run ────────────────────────────────────
    if (window.AzuraScout) {
        try { window.AzuraScout.cleanup(); } catch (_) { }
    }

    const STYLE_ID = '__azura-scout-style';
    const BADGE_CLS = '__azura-scout-badge';
    const HL_CLS = '__azura-scout-hl';
    let badges = [];
    let lastReport = [];

    // ── Inject styles ───────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = `
            .${HL_CLS} {
                outline: 2px solid #00e5ff !important;
                outline-offset: 1px;
                box-shadow: 0 0 6px #00e5ff88 !important;
                transition: outline-color .2s, box-shadow .2s;
            }
            .${HL_CLS}:hover {
                outline-color: #ff4081 !important;
                box-shadow: 0 0 10px #ff408188 !important;
            }
            .${BADGE_CLS} {
                position: absolute;
                z-index: 999999;
                background: linear-gradient(135deg, #7c4dff, #00e5ff);
                color: #fff;
                font: bold 10px/1 system-ui, sans-serif;
                padding: 2px 5px;
                border-radius: 4px;
                cursor: pointer;
                pointer-events: auto;
                box-shadow: 0 1px 4px #0005;
                user-select: none;
                white-space: nowrap;
            }
            .${BADGE_CLS}:hover {
                transform: scale(1.25);
                background: linear-gradient(135deg, #ff4081, #ff6e40);
            }
        `;
        document.head.appendChild(s);
    }

    // ── Find label / context text ───────────────────────────────
    function getLabel(el) {
        // 1. Explicit <label for="...">
        if (el.id) {
            const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (lbl) return lbl.textContent.trim();
        }
        // 2. Enclosing <label>
        const parentLabel = el.closest('label');
        if (parentLabel) return parentLabel.textContent.trim().slice(0, 60);
        // 3. Previous sibling / parent td text
        const td = el.closest('td');
        if (td) {
            const prevTd = td.previousElementSibling;
            if (prevTd) {
                const t = prevTd.textContent.trim();
                if (t.length > 0 && t.length < 80) return t;
            }
        }
        // 4. Previous sibling text
        const row = el.closest('tr');
        if (row) {
            const t = row.textContent.replace(el.value || '', '').trim();
            if (t.length > 0 && t.length < 80) return t;
        }
        // 5. Placeholder
        if (el.placeholder) return `[placeholder] ${el.placeholder}`;
        // 6. Aria label
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
        return '—';
    }

    // ── Build best selector ─────────────────────────────────────
    function bestSelector(el) {
        // Prefer name (Wicket pages use long name attributes)
        if (el.name) return `[name="${el.name}"]`;
        if (el.id) return `#${el.id}`;
        // Fallback: build a CSS path
        const tag = el.tagName.toLowerCase();
        const cls = el.className ? '.' + [...el.classList].join('.') : '';
        return tag + cls;
    }

    // ── Is element visible? ─────────────────────────────────────
    function isVisible(el) {
        if (el.type === 'hidden') return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        return true;
    }

    // ── Main scan ───────────────────────────────────────────────
    function scan() {
        cleanup(); // remove previous marks
        injectStyles();

        const els = [
            ...document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"])'),
            ...document.querySelectorAll('textarea'),
            ...document.querySelectorAll('select'),
        ].filter(isVisible);

        // Try to find the page title (first H1)
        const h1 = document.querySelector('h1');
        const pageTitle = h1 ? h1.textContent.trim() : 'Unknown Page';

        const report = {
            PageTitle: pageTitle,
            URL: window.location.href,
            Timestamp: new Date().toISOString(),
            Fields: []
        };

        els.forEach((el, i) => {
            const num = i + 1;
            const label = getLabel(el);
            const sel = bestSelector(el);
            const tag = el.tagName.toLowerCase();
            const type = el.type || '—';
            const value = (el.value || '').slice(0, 40);

            // Highlight the element
            el.classList.add(HL_CLS);

            // Create positioned badge
            const rect = el.getBoundingClientRect();
            const badge = document.createElement('div');
            badge.className = BADGE_CLS;
            badge.textContent = `#${num}`;
            badge.title = `${label}\n${sel}`;
            badge.style.top = (window.scrollY + rect.top - 14) + 'px';
            badge.style.left = (window.scrollX + rect.left) + 'px';
            document.body.appendChild(badge);
            badges.push({ badge, el });

            // Click badge → log details + scroll + flash
            badge.addEventListener('click', (ev) => {
                ev.stopPropagation();
                console.group(`%c🔎 Scout #${num}`, 'color:#00e5ff;font-weight:bold');
                console.log('Label:', label);
                console.log('Selector:', sel);
                console.log('Tag:', tag, '| Type:', type);
                console.log('Name:', el.name || '—');
                console.log('ID:', el.id || '—');
                console.log('Value:', value || '(empty)');
                console.log('Element:', el);
                console.log(`\n📋 Copy-ready selector:\n${sel}`);
                console.groupEnd();

                // Flash the element
                el.style.outline = '3px solid #ff4081';
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => { el.style.outline = ''; }, 1200);
            });

            report.Fields.push({
                '#': num,
                'Label': label.slice(0, 50),
                'Selector': sel,
                'Tag': tag,
                'Type': type,
                'Name': el.name || '—',
                'ID': el.id || '—',
                'Value': value || '',
            });
        });

        // Print table
        console.log('%c╔══════════════════════════════════════════╗', 'color:#7c4dff');
        console.log(`%c║       AZURA SCOUT — Field Report         ║`, 'color:#7c4dff;font-weight:bold');
        console.log('%c╚══════════════════════════════════════════╝', 'color:#7c4dff');
        console.log(`Page: %c${pageTitle}`, 'color:#feaa2c; font-weight:bold;');
        console.log(`Found ${report.Fields.length} visible form fields.`);
        console.table(report.Fields);
        console.log('%cTIP: Click any numbered badge on the page to log its full details and copy-ready selector.', 'color:#00e5ff');
        console.log('%cExport: AzuraScout.copy()  |  AzuraScout.download()', 'color:#7c4dff');

        lastReport = report;
        return report;
    }

    // ── Cleanup ────────────────────────────────────────────────
    function cleanup() {
        // Remove badges
        badges.forEach(b => {
            try { b.badge.remove(); } catch (_) { }
            try { b.el.classList.remove(HL_CLS); } catch (_) { }
        });
        badges = [];
        // Remove orphan badges
        document.querySelectorAll('.' + BADGE_CLS).forEach(b => b.remove());
        document.querySelectorAll('.' + HL_CLS).forEach(el => el.classList.remove(HL_CLS));
        // Remove style
        const s = document.getElementById(STYLE_ID);
        if (s) s.remove();
    }

    // ── Copy report to clipboard ────────────────────────────────
    function copy() {
        if (!lastReport || !lastReport.Fields || !lastReport.Fields.length) { console.warn('[Scout] No report yet — run AzuraScout.scan() first.'); return; }
        const json = JSON.stringify(lastReport, null, 2);
        navigator.clipboard.writeText(json).then(() => {
            console.log('%c✓ Scout report copied to clipboard! Paste it into the chat.', 'color:#2dc96a;font-weight:bold');
        }).catch(() => {
            // Fallback for pages that block clipboard API
            const ta = document.createElement('textarea');
            ta.value = json; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy');
            ta.remove();
            console.log('%c✓ Scout report copied (fallback)! Paste it into the chat.', 'color:#2dc96a;font-weight:bold');
        });
    }

    // ── Download report as JSON file ────────────────────────────
    function download() {
        if (!lastReport || !lastReport.Fields || !lastReport.Fields.length) { console.warn('[Scout] No report yet — run AzuraScout.scan() first.'); return; }
        const json = JSON.stringify(lastReport, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scout-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        console.log('%c⬇ scout-report.json downloaded!', 'color:#2dc96a;font-weight:bold');
    }

    // ── Expose API ──────────────────────────────────────────────
    window.AzuraScout = { scan, cleanup, copy, download };

    // ── Auto-run ────────────────────────────────────────────────
    scan();

    console.log('%c⚕ AzuraScout loaded. Commands: scan() | cleanup() | copy() | download()', 'color:#00e5ff;font-weight:bold');
})();
