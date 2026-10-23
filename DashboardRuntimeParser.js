/**
 * Calypso Dashboard Studio - Deterministic Runtime Spec Parser
 * GitHub Pages CDN: https://mostafa-maeza-pro.github.io/dashboardstudio/DashboardRuntimeParser.js
 */
class DashboardRuntimeParser {
    constructor(options = {}) {
        this.spec = null;
        this.activeData = {};
        this.activeCriteria = [];
        this.chartInstances = {};
        this.domainTableStates = {};
        this.currentDomain = null;
        this.isProductionMode = options.isProductionMode ?? false;

        this._initGlobalChartDefaults();
        this._bindGlobalDelegations();
    }

    hydrate(spec, dataPackage, appliedCriteria = null) {
        if (!spec) return;
        this.spec = spec;
        this.activeData = dataPackage || {};

        if (appliedCriteria) {
            this.activeCriteria = Array.isArray(appliedCriteria) ? [...appliedCriteria] : [];
        }

        const availableDomains = Object.keys(this.activeData);
        if (!this.currentDomain || !this.activeData[this.currentDomain]) {
            this.currentDomain = this.spec.metadata?.activeDomain || availableDomains[0] || "default";
        }

        this._hydrateHeaderMeta();
        this._hydrateCriteriaPanel(false);
        this._hydrateKpis();
        this._hydrateCharts();
        this._hydrateDataGrid();

        if (typeof bindChartInteractiveEvents === 'function') {
            bindChartInteractiveEvents();
        }
    }

    _hydrateHeaderMeta() {
        const titleElem = document.querySelector('.canvas-title-header');
        const subtitleElem = document.querySelector('.canvas-subtitle-header');

        if (titleElem && this.spec.metadata?.title) {
            titleElem.textContent = this.spec.metadata.title;
        }

        if (subtitleElem) {
            const now = new Date();
            const uploadTime = typeof formatSubtitleTimestamp === 'function' 
                ? formatSubtitleTimestamp(now) 
                : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let valDate = "N/A";
            const valDateField = this.spec.metadata?.subtitle?.valuationDateField || "ValuationDate";
            const sampleRows = this.activeData[this.currentDomain] || [];
            if (sampleRows.length > 0 && sampleRows[0][valDateField]) {
                valDate = sampleRows[0][valDateField];
            }

            subtitleElem.textContent = "⚡ " + uploadTime + " | Valuation Date: " + valDate;
        }
    }

    _hydrateCriteriaPanel(isInitial = false) {
        const container = document.getElementById('studio-criteria-fields-container');
        if (!container || !this.spec.criteriaDeck) return;

        const { inputParameters = [], preDefinedAudits = {} } = this.spec.criteriaDeck;

        let html = '<div class="popover-primary-fields">' +
            '<div class="popover-section-label">' +
                '<div class="popover-section-title-group">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                        '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
                        '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>' +
                    '</svg>' +
                    '<span>Input Parameters</span>' +
                '</div>' +
            '</div>' +
            '<div class="popover-primary-scrollbox">';

        inputParameters.forEach(param => {
            const activeVal = (!isInitial && this.activeCriteria.find(c => c.name === param.field))?.value 
                ?? param.defaultValue 
                ?? "";
            
            const isDatetime = param.type === "Datetime";
            const inputType = isDatetime ? "datetime-local" : "text";
            const formattedVal = isDatetime && typeof formatIsoToDatetimeLocal === 'function'
                ? formatIsoToDatetimeLocal(activeVal)
                : activeVal;

            html += '<div class="studio-form-group">' +
                '<label class="studio-form-label" for="param-' + param.field + '">' + param.label + '</label>' +
                '<input type="' + inputType + '" id="param-' + param.field + '" class="studio-form-input criteria-input-field" data-field="' + param.field + '" value="' + formattedVal + '">' +
            '</div>';
        });

        html += '</div></div>';

        const auditDomains = Object.keys(preDefinedAudits.domains || {});
        if (auditDomains.length > 0) {
            html += '<div class="popover-audit-context">' +
                '<div class="popover-section-label">' +
                    '<div class="popover-section-title-group">' +
                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                            '<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path><line x1="12" y1="14" x2="12" y2="17"></line>' +
                        '</svg>' +
                        '<span>Pre-Defined Criterias</span>' +
                    '</div>' +
                    '<button type="button" class="popover-fold-btn is-collapsed" id="studioAuditFoldBtn" title="Toggle View">' +
                        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
                            '<polyline points="6 9 12 15 18 9"></polyline>' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
                '<div class="popover-audit-scrollbox is-collapsed" id="studioAuditScrollbox">' +
                    '<div class="contract-cards-viewport" style="background: transparent !important;">' +
                        '<div class="contract-cards-track" style="background: transparent !important;">';

            auditDomains.forEach(domName => {
                const items = preDefinedAudits.domains[domName] || [];
                html += '<div class="contract-card-slide" style="background: transparent !important; border: 1px solid rgba(148, 163, 184, 0.25) !important;">' +
                    '<div class="contract-card-header" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.75;">' +
                        '<span>' + domName + '</span>' +
                        '<div class="card-slider-nav" style="display: inline-flex !important; flex-direction: row !important; align-items: center !important; gap: 4px !important;">' +
                            '<button type="button" class="slider-prev-action" data-slide-dir="-1" title="Previous">&lt;</button>' +
                            '<button type="button" class="slider-next-action" data-slide-dir="1" title="Next">&gt;</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="contract-card-body" style="background: transparent !important;">';

                items.forEach(crit => {
                    html += '<div class="studio-form-group" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">' +
                        '<span class="studio-form-label" style="font-size: 12px;">' + crit.label + '</span>' +
                        '<span class="criteria-read-only-tag">' + crit.fixedValue + '</span>' +
                    '</div>';
                });

                html += '</div></div>';
            });

            html += '</div></div></div></div>';
        }

        container.innerHTML = html;
        this._bindCriteriaDeckEvents();
    }

    _bindCriteriaDeckEvents() {
        const foldBtn = document.getElementById('studioAuditFoldBtn');
        const scrollbox = document.getElementById('studioAuditScrollbox');
        if (foldBtn && scrollbox) {
            foldBtn.onclick = () => {
                foldBtn.classList.toggle('is-collapsed');
                scrollbox.classList.toggle('is-collapsed');
            };
        }

        const track = document.querySelector('.contract-cards-track');
        if (track) {
            let currentSlide = 0;
            const slides = track.querySelectorAll('.contract-card-slide');
            const updateSlide = (idx) => {
                currentSlide = Math.max(0, Math.min(idx, slides.length - 1));
                track.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
            };

            track.querySelectorAll('.slider-prev-action').forEach(b => {
                b.onclick = () => updateSlide(currentSlide - 1);
            });
            track.querySelectorAll('.slider-next-action').forEach(b => {
                b.onclick = () => updateSlide(currentSlide + 1);
            });
        }
    }

    _hydrateKpis() {
        const outlet = document.getElementById('ui-kpi-grid-outlet');
        if (!outlet) return;
        outlet.innerHTML = '';

        (this.spec.kpis || []).forEach(kpiSpec => {
            const domainRows = this.activeData[kpiSpec.domain || this.currentDomain] || [];
            const rawVal = this._computeAggregation(domainRows, kpiSpec.field, kpiSpec.aggregation, kpiSpec.weightField);
            const formattedVal = this._formatValue(rawVal, kpiSpec.format);

            const cardHtml = '<div class="kpi-label-text">' + kpiSpec.label + '</div>' +
                '<div class="kpi-value-container">' + formattedVal + '</div>' +
                '<div class="kpi-sub-text">' + (kpiSpec.subtext || '') + '</div>';

            if (typeof createChassisComponent === 'function') {
                const chassisCard = createChassisComponent('', cardHtml, false, kpiSpec.id || '');
                outlet.appendChild(chassisCard);
            }
        });
    }

    _hydrateCharts() {
        const outlet = document.getElementById('ui-charts-container-outlet');
        if (!outlet) return;
        outlet.innerHTML = '';

        (this.spec.charts || []).forEach(chartSpec => {
            const chartId = chartSpec.id;
            const domainRows = this.activeData[chartSpec.domain || this.currentDomain] || [];
            const { labels, datasets, tableData } = this._buildChartDataModel(chartSpec, domainRows);

            const bodyHtml = '<div class="chart-panel-content chart-visual-panel" style="position: relative; height: 280px; width: 100%;">' +
                    '<canvas id="' + chartId + '"></canvas>' +
                '</div>' +
                '<div class="chart-panel-content chart-data-panel is-hidden">' +
                    '<div class="chart-dataset-table-box" style="overflow: auto; max-height: 280px; width: 100%;">' +
                        '<table class="studio-data-table">' +
                            '<thead><tr>' + tableData.headers.map(h => '<th style="background: rgba(125,125,125,0.06); color: inherit;">' + h + '</th>').join('') + '</tr></thead>' +
                            '<tbody>' + tableData.rows.map(row => '<tr>' + row.map(cell => '<td>' + cell + '</td>').join('') + '</tr>').join('') + '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>';

            if (typeof createChassisComponent === 'function') {
                const chassis = createChassisComponent(
                    chartSpec.title,
                    bodyHtml,
                    chartSpec.isExpandable ?? true,
                    chartId,
                    false,
                    chartSpec.hasDatasetToggle ?? true
                );
                outlet.appendChild(chassis);
            }

            const canvas = document.getElementById(chartId);
            if (canvas) {
                if (this.chartInstances[chartId]) {
                    this.chartInstances[chartId].destroy();
                }

                const ctx = canvas.getContext('2d');
                this.chartInstances[chartId] = new Chart(ctx, {
                    type: chartSpec.type || 'bar',
                    data: { labels, datasets },
                    options: this._buildChartOptions(chartSpec)
                });
            }
        });
    }

    _buildChartDataModel(chartSpec, rows) {
        if (chartSpec.dynamicHorizon?.enabled && rows.length > 0) {
            const pattern = new RegExp(chartSpec.dynamicHorizon.dateColumnPattern || '^\\d{2}-[A-Za-z]{3}-\\d{4}$');
            const dateHeaders = Object.keys(rows[0] || {}).filter(k => pattern.test(k));

            const labels = dateHeaders;
            const datasets = (chartSpec.series || []).map(seriesCfg => {
                const dataPoints = dateHeaders.map(dateKey => {
                    return rows.reduce((acc, r) => acc + (parseFloat(r[dateKey]) || 0), 0);
                });

                return {
                    label: seriesCfg.label,
                    type: seriesCfg.type || chartSpec.type,
                    data: dataPoints,
                    borderColor: seriesCfg.color || '#38bdf8',
                    backgroundColor: seriesCfg.type === 'line' ? 'transparent' : (seriesCfg.color || 'rgba(56, 189, 248, 0.4)'),
                    yAxisID: seriesCfg.yAxisIndex ? ('y' + seriesCfg.yAxisIndex) : 'y',
                    tension: seriesCfg.tension ?? 0.2
                };
            });

            const tableRows = dateHeaders.map((dh, idx) => [dh, ...datasets.map(ds => this._formatValue(ds.data[idx], { style: 'currency' }))]);
            return {
                labels,
                datasets,
                tableData: {
                    headers: ['Horizon Date', ...datasets.map(d => d.label)],
                    rows: tableRows
                }
            };
        }

        const groupField = chartSpec.dimensions?.groupBy;
        const metricField = chartSpec.series?.[0]?.field;
        const groups = {};

        rows.forEach(r => {
            const key = r[groupField] || "Other";
            groups[key] = (groups[key] || 0) + (parseFloat(r[metricField]) || 0);
        });

        let sortedKeys = Object.keys(groups).sort((a, b) => groups[b] - groups[a]);
        if (chartSpec.dimensions?.topN && sortedKeys.length > chartSpec.dimensions.topN) {
            const topKeys = sortedKeys.slice(0, chartSpec.dimensions.topN);
            if (chartSpec.dimensions.otherBucket) {
                const otherVal = sortedKeys.slice(chartSpec.dimensions.topN).reduce((sum, k) => sum + groups[k], 0);
                groups["Other"] = otherVal;
                topKeys.push("Other");
            }
            sortedKeys = topKeys;
        }

        const labels = sortedKeys;
        const palette = chartSpec.palette || ['#38bdf8', '#6366f1', '#34d399', '#f59e0b', '#f43f5e', '#94a3b8'];
        const datasets = [{
            label: chartSpec.series?.[0]?.label || metricField,
            data: labels.map(l => groups[l]),
            backgroundColor: palette.slice(0, labels.length),
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1
        }];

        const tableRows = labels.map(l => [l, this._formatValue(groups[l], { style: 'currency' })]);
        return {
            labels,
            datasets,
            tableData: {
                headers: [groupField || 'Dimension', chartSpec.series?.[0]?.label || 'Amount'],
                rows: tableRows
            }
        };
    }

    _buildChartOptions(chartSpec) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 10, font: { size: 11 } }
                }
            },
            scales: chartSpec.type === 'doughnut' ? {} : {
                x: { grid: { display: false } },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        callback: (v) => this._formatValue(v, { style: 'currency', notation: 'compact' })
                    }
                }
            }
        };
    }

    _getDomainState(domain) {
        if (!this.domainTableStates[domain]) {
            this.domainTableStates[domain] = {
                sortKey: '',
                sortDir: 1,
                aggregates: {},
                searchTerm: ''
            };
        }
        return this.domainTableStates[domain];
    }

    _hydrateDataGrid() {
        const outlet = document.getElementById('ui-data-matrix-table-outlet');
        if (!outlet) return;
        outlet.innerHTML = '';

        const gridConfig = this.spec.datagrids?.[0];
        if (!gridConfig) return;

        const markup = this._generateDataGridMarkup(gridConfig);

        if (typeof createChassisComponent === 'function') {
            const tableChassis = createChassisComponent(
                gridConfig.title || "Portfolio Position Matrix",
                markup,
                gridConfig.isExpandable ?? true,
                gridConfig.id || "ui-matrix-table-chassis"
            );

            const bodyElem = tableChassis.querySelector('.ui-chassis-body');
            if (bodyElem) {
                bodyElem.style.padding = '8px 20px';
                bodyElem.style.width = '100%';
                bodyElem.style.boxSizing = 'border-box';
            }

            outlet.appendChild(tableChassis);
        }

        this._syncDataGridModal(markup);
    }

    _generateDataGridMarkup(gridConfig) {
        const availableDomains = Object.keys(this.activeData);
        const activeDom = this.currentDomain;
        const domState = this._getDomainState(activeDom);
        const domainSchema = gridConfig.domains?.[activeDom] || {
            columns: Object.keys(this.activeData[activeDom]?.[0] || {}).map(k => ({ key: k, label: k }))
        };

        let tabsHtml = '';
        if (gridConfig.domainNavigation?.enabled && availableDomains.length > 1) {
            tabsHtml = '<div class="datagrid-domain-tabs" style="display: flex; gap: 8px; margin-bottom: 8px;">' +
                availableDomains.map(dom => '<button type="button" class="datagrid-domain-tab-btn ' + (dom === activeDom ? 'active' : '') + '" data-domain="' + dom + '" style="padding: 4px 10px; font-size: 11px; border-radius: 4px; border: 1px solid rgba(125,125,125,0.2); background: ' + (dom === activeDom ? '#38bdf8' : 'transparent') + '; color: ' + (dom === activeDom ? '#0f172a' : 'inherit') + '; cursor: pointer;">' + dom + '</button>').join('') +
            '</div>';
        }

        let rows = [...(this.activeData[activeDom] || [])];
        if (domState.searchTerm) {
            const term = domState.searchTerm.toLowerCase();
            rows = rows.filter(r => Object.values(r).some(val => String(val).toLowerCase().includes(term)));
        }

        if (domState.sortKey) {
            const k = domState.sortKey;
            const dir = domState.sortDir;
            rows.sort((a, b) => {
                const valA = a[k], valB = b[k];
                if (typeof valA === 'number' && typeof valB === 'number') return (valA - valB) * dir;
                return String(valA ?? '').localeCompare(String(valB ?? '')) * dir;
            });
        }

        const toolbarHtml = '<div class="table-toolbar" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: rgba(125,125,125,0.03); border-bottom: 1px solid rgba(125,125,125,0.12); font-size: 12px; position: sticky; top: 0; z-index: 12; backdrop-filter: blur(8px);">' +
            '<span class="fx-table-count-badge" id="fx-table-count-badge" style="font-size: 0.78rem; color: inherit; opacity: 0.7; font-weight: 500;">' + rows.length + ' records</span>' +
            '<div class="filter-box" style="position: relative;">' +
                '<input type="text" class="fx-table-filter" placeholder="Search..." value="' + domState.searchTerm + '" style="padding: 3px 8px; font-size: 11px; border-radius: 4px; border: 1px solid rgba(125,125,125,0.25); background: transparent; color: inherit;">' +
            '</div>' +
        '</div>';

        const cols = domainSchema.columns;
        const theadHtml = '<thead style="position: sticky; top: 31px; z-index: 10; backdrop-filter: blur(8px);"><tr>' +
            cols.map(col => {
                const isSorted = domState.sortKey === col.key;
                const icon = !isSorted ? '⇅' : (domState.sortDir === 1 ? '▲' : '▼');
                const iconOpacity = isSorted ? '1' : '0.4';
                const colorStyle = isSorted ? 'color: #38bdf8;' : 'color: inherit;';
                return '<th data-sort="' + col.key + '" style="background: rgba(125,125,125,0.06); ' + colorStyle + ' border-bottom: 1px solid rgba(125,125,125,0.2); cursor: pointer; padding: 6px 10px; font-size: 11px; text-align: left; user-select: none;">' +
                    col.label + ' <span class="sort-icon" style="opacity: ' + iconOpacity + '; font-size: 10px;">' + icon + '</span>' +
                '</th>';
            }).join('') +
        '</tr></thead>';

        const tbodyHtml = '<tbody>' +
            rows.map(r => '<tr>' +
                cols.map(c => '<td style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid rgba(125,125,125,0.08);">' +
                    (c.format ? this._formatValue(r[c.key], { style: c.format }) : (r[c.key] ?? '')) +
                '</td>').join('') +
            '</tr>').join('') +
        '</tbody>';

        const isLightMode = document.body.classList.contains('light-mode');
        const selectBg = isLightMode ? '#ffffff' : '#0f172a';
        const selectColor = isLightMode ? '#0f172a' : '#f8fafc';

        const tfootHtml = '<tfoot style="position: sticky; bottom: 0; z-index: 10; backdrop-filter: blur(8px);"><tr>' +
            cols.map(col => {
                const aggFunc = domState.aggregates[col.key] || col.footerAgg || 'OFF';
                const aggVal = this._computeFooterValue(rows, col.key, aggFunc);
                return '<td style="background: rgba(125,125,125,0.06); border-top: 1px solid rgba(125,125,125,0.2); padding: 4px 6px;">' +
                    '<div class="agg-cell-container" style="display: flex; align-items: center;">' +
                        '<button type="button" class="agg-result-pill" data-key="' + col.key + '" style="background: rgba(125,125,125,0.08); border: none; font-weight: 700; color: inherit; border-radius: 3px; padding: 2px 6px; font-size: 10px; cursor: pointer;">' +
                            (aggFunc === 'OFF' ? '<span style="opacity: 0.35; font-family: monospace;">-</span>' : aggVal) +
                        '</button>' +
                        '<select class="agg-col-select" data-key="' + col.key + '" style="display: none; font-size: 10px; padding: 1px 3px; border-radius: 3px; background: ' + selectBg + '; color: ' + selectColor + '; border: 1px solid #38bdf8;">' +
                            '<option value="OFF" ' + (aggFunc === 'OFF' ? 'selected' : '') + '>OFF</option>' +
                            '<option value="SUM" ' + (aggFunc === 'SUM' ? 'selected' : '') + '>SUM</option>' +
                            '<option value="AVG" ' + (aggFunc === 'AVG' ? 'selected' : '') + '>AVG</option>' +
                            '<option value="COUNT" ' + (aggFunc === 'COUNT' ? 'selected' : '') + '>COUNT</option>' +
                        '</select>' +
                    '</div>' +
                '</td>';
            }).join('') +
        '</tr></tfoot>';

        return tabsHtml +
            '<div class="chart-dataset-table-box" style="overflow: auto; width: 100%; min-height: 520px; max-height: 600px; border: 1px solid rgba(125,125,125,0.12); border-radius: 6px;">' +
                toolbarHtml +
                '<table class="studio-data-table" style="width: 100%; border-collapse: collapse;">' +
                    theadHtml +
                    tbodyHtml +
                    tfootHtml +
                '</table>' +
            '</div>';
    }

    _computeFooterValue(rows, colKey, func) {
        if (func === 'OFF') return '-';
        if (func === 'COUNT') return rows.length;

        const numbers = rows.map(r => parseFloat(r[colKey])).filter(v => !isNaN(v));
        if (numbers.length === 0) return '-';

        const sum = numbers.reduce((a, b) => a + b, 0);
        if (func === 'SUM') return this._formatValue(sum, { style: 'currency', notation: 'compact' });
        if (func === 'AVG') return this._formatValue(sum / numbers.length, { style: 'percent' });
        return '-';
    }

    _syncDataGridModal(freshMarkup) {
        const modal = document.getElementById('ui-global-enlargement-modal');
        const modalBody = document.getElementById('ui-modal-body-content');
        if (modal && modalBody && (modal.classList.contains('is-active') || modal.classList.contains('active'))) {
            if (modalBody.querySelector('.studio-data-table')) {
                modalBody.innerHTML = freshMarkup;
            }
        }
    }

    _bindGlobalDelegations() {
        document.addEventListener('click', (e) => {
            const th = e.target.closest('th[data-sort]');
            if (!th) return;

            const colKey = th.getAttribute('data-sort');
            const state = this._getDomainState(this.currentDomain);
            if (state.sortKey === colKey) {
                state.sortDir = state.sortDir === 1 ? -1 : 1;
            } else {
                state.sortKey = colKey;
                state.sortDir = 1;
            }
            this._hydrateDataGrid();
        });

        document.addEventListener('input', (e) => {
            if (!e.target.classList.contains('fx-table-filter')) return;
            const term = e.target.value;
            const state = this._getDomainState(this.currentDomain);
            state.searchTerm = term;
            this._hydrateDataGrid();

            document.querySelectorAll('.fx-table-filter').forEach(inp => {
                if (inp !== document.activeElement) inp.value = term;
            });
        });

        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.datagrid-domain-tab-btn');
            if (!tabBtn) return;
            this.currentDomain = tabBtn.getAttribute('data-domain');
            this._hydrateDataGrid();
        });

        document.addEventListener('click', (e) => {
            const pill = e.target.closest('.agg-result-pill');
            if (pill) {
                const select = pill.parentElement.querySelector('.agg-col-select');
                pill.style.display = 'none';
                select.style.display = 'inline-block';
                select.focus();
                return;
            }

            if (!e.target.classList.contains('agg-col-select')) {
                document.querySelectorAll('.agg-col-select').forEach(sel => {
                    if (sel.style.display !== 'none') {
                        sel.style.display = 'none';
                        sel.parentElement.querySelector('.agg-result-pill').style.display = 'inline-block';
                    }
                });
            }
        });

        document.addEventListener('change', (e) => {
            if (!e.target.classList.contains('agg-col-select')) return;
            const colKey = e.target.getAttribute('data-key');
            const func = e.target.value;
            const state = this._getDomainState(this.currentDomain);
            state.aggregates[colKey] = func;

            e.target.style.display = 'none';
            e.target.parentElement.querySelector('.agg-result-pill').style.display = 'inline-block';
            this._hydrateDataGrid();
        });

        const trigger = document.getElementById('ui-applied-criteria-trigger');
        const popover = document.getElementById('studioCriteriaDropdown');
        const backdrop = document.getElementById('studioPopoverBackdrop');
        const closeBtn = document.getElementById('studioPopoverClose');
        const cancelBtn = document.getElementById('studioPopoverCancel');
        const submitBtn = document.getElementById('studioPopoverSubmit');

        const togglePopover = (open) => {
            if (popover && backdrop) {
                popover.classList.toggle('is-active', open);
                backdrop.classList.toggle('is-active', open);
            }
        };

        if (trigger) trigger.onclick = () => togglePopover(true);
        if (closeBtn) closeBtn.onclick = () => { togglePopover(false); this._hydrateCriteriaPanel(false); };
        if (cancelBtn) cancelBtn.onclick = () => { togglePopover(false); this._hydrateCriteriaPanel(false); };
        if (backdrop) backdrop.onclick = () => { togglePopover(false); this._hydrateCriteriaPanel(false); };

        if (submitBtn) {
            submitBtn.onclick = () => {
                const inputs = document.querySelectorAll('.criteria-input-field');
                this.activeCriteria = Array.from(inputs).map(inp => ({
                    name: inp.getAttribute('data-field'),
                    value: inp.value
                }));
                togglePopover(false);

                if (this.isProductionMode && typeof fetchDataFromCalypso === 'function') {
                    fetchDataFromCalypso();
                } else {
                    this.hydrate(this.spec, this.activeData, this.activeCriteria);
                }
            };
        }
    }

    _computeAggregation(rows, field, op, weightField = null) {
        if (!rows || rows.length === 0) return 0;
        if (op === 'count') return rows.length;

        const vals = rows.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
        if (vals.length === 0) return 0;

        if (op === 'sum') return vals.reduce((a, b) => a + b, 0);
        if (op === 'avg') return vals.reduce((a, b) => a + b, 0) / vals.length;
        if (op === 'weightedAvg' && weightField) {
            let totalWeight = 0, sumProd = 0;
            rows.forEach(r => {
                const v = parseFloat(r[field]), w = parseFloat(r[weightField]);
                if (!isNaN(v) && !isNaN(w)) {
                    sumProd += v * w;
                    totalWeight += w;
                }
            });
            return totalWeight !== 0 ? sumProd / totalWeight : 0;
        }
        return vals[0];
    }

    _formatValue(val, formatCfg = {}) {
        if (val === null || val === undefined || isNaN(val)) return '-';
        const num = parseFloat(val);

        if (formatCfg.style === 'currency') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: formatCfg.currency || 'USD',
                notation: formatCfg.notation || 'standard',
                maximumFractionDigits: formatCfg.decimals ?? 2
            }).format(num);
        }

        if (formatCfg.style === 'percent') {
            return num.toFixed(formatCfg.decimals ?? 2) + '%';
        }

        return new Intl.NumberFormat('en-US', {
            notation: formatCfg.notation || 'standard',
            maximumFractionDigits: formatCfg.decimals ?? 0
        }).format(num);
    }

    _initGlobalChartDefaults() {
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = '#94a3b8';
            Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
            Chart.defaults.font.family = 'inherit';
        }
    }
}
