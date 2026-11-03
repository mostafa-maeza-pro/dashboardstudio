/**
 * PlatformRuntime.js V2.04
 * Universal Financial UI Chassis & High-Impact Charting Engine
 * Calypso Dashboard Studio
 */

// ============================================================================
// 1. LIFECYCLE, IDENTITY & THEME STATE MANAGEMENT
// ============================================================================

function initializeThemeDefault() { 
    document.body.classList.add('dark-mode'); 
    window.dashboardInitialTheme = 'dark'; 
}

function extractInitials(name) { 
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '--'; 
}

function resolveDatasetKey(metadata) {
    if (!metadata) return 'default';
    if (typeof metadata === 'string') return metadata;
    return metadata.templateId || metadata.domain || metadata.packageId || 'default';
}

function getPlatformThemeTokens() {
    const isLight = document.body.classList.contains('light-mode');
    return {
        isLight,
        textColor: isLight ? '#2d3748' : '#e2e8f0',
        textMuted: isLight ? '#718096' : '#94a3b8',
        gridColor: isLight ? 'rgba(226, 232, 240, 0.8)' : 'rgba(51, 65, 85, 0.4)',
        borderColor: isLight ? '#cbd5e1' : '#334155',
        palette: [
            '#38bdf8', // Sky Blue
            '#818cf8', // Indigo
            '#34d399', // Emerald
            '#f43f5e', // Rose
            '#fbbf24', // Amber
            '#a855f7', // Purple
            '#fb923c', // Orange
            '#2dd4bf', // Teal
            '#60a5fa'  // Blue
        ]
    };
}

// ============================================================================
// 2. UNIVERSAL FINANCIAL METRIC & DATE FORMATTERS
// ============================================================================

function formatMetricValue(value, formatSpec = {}) {
    if (value === null || value === undefined || isNaN(Number(value))) {
        return value !== null && value !== undefined ? String(value) : '--';
    }

    const num = Number(value);
    const style = (typeof formatSpec === 'string' ? formatSpec : formatSpec.style) || 'number';
    const currency = (typeof formatSpec === 'object' ? formatSpec.currency : null) || 'USD';
    const compact = (typeof formatSpec === 'object' && formatSpec.compact !== undefined) 
        ? formatSpec.compact 
        : (Math.abs(num) >= 1000000);

    try {
        if (style === 'currency') {
            if (compact) {
                const absVal = Math.abs(num);
                const sign = num < 0 ? '-' : '';
                const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
                if (absVal >= 1e9) return `${sign}${sym}${(absVal / 1e9).toFixed(2)}B`;
                if (absVal >= 1e6) return `${sign}${sym}${(absVal / 1e6).toFixed(2)}M`;
                if (absVal >= 1e3) return `${sign}${sym}${(absVal / 1e3).toFixed(1)}K`;
            }
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num);
        }

        if (style === 'percent') {
            const pctVal = Math.abs(num) <= 1 ? num * 100 : num;
            return `${pctVal.toFixed(2)}%`;
        }

        if (style === 'bps') {
            const bpsVal = Math.abs(num) <= 1 ? num * 10000 : num;
            return `${bpsVal.toFixed(1)} bps`;
        }

        if (style === 'integer') {
            return new Intl.NumberFormat('en-US', {
                maximumFractionDigits: 0
            }).format(num);
        }

        if (compact) {
            const absVal = Math.abs(num);
            const sign = num < 0 ? '-' : '';
            if (absVal >= 1e9) return `${sign}${(absVal / 1e9).toFixed(2)}B`;
            if (absVal >= 1e6) return `${sign}${(absVal / 1e6).toFixed(2)}M`;
            if (absVal >= 1e3) return `${sign}${(absVal / 1e3).toFixed(1)}K`;
        }

        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num);
    } catch (e) {
        return String(num);
    }
}

function formatSubtitleTimestamp(dateVal) { 
    if (!dateVal) return ''; 
    const d = new Date(dateVal); 
    if (isNaN(d.getTime())) return String(dateVal); 
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']; 
    const monthStr = months[d.getMonth()]; 
    const day = d.getDate(); 
    const year = d.getFullYear(); 
    let hours = d.getHours(); 
    const minutes = String(d.getMinutes()).padStart(2, '0'); 
    const ampm = hours >= 12 ? 'PM' : 'AM'; 
    hours = hours % 12; 
    hours = hours ? hours : 12; 
    return `${monthStr} ${day}, ${year}, ${hours}:${minutes} ${ampm}`; 
}

function formatInputCriteriaDateMask(dateStr) { 
    if (!dateStr) return ''; 
    const d = new Date(dateStr); 
    if (!isNaN(d.getTime())) { 
        return formatSubtitleTimestamp(d);
    } 
    return dateStr; 
}

function formatIsoToDatetimeLocal(dateStr) {
    if (!dateStr) return '';
    const cleanStr = String(dateStr).trim().replace(/\//g, '-');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) {
        const fallbackMatch = cleanStr.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
        return fallbackMatch ? `${fallbackMatch[1]}T${fallbackMatch[2]}` : '';
    }
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============================================================================
// 3. MULTI-CONTRACT CRITERIA DECK HARMONIZATION UTILITIES
// ============================================================================

function mergeCriteriaParameters(explicitParams = [], contractRegistry = {}) {
    const paramMap = new Map();

    const registerParam = (p) => {
        if (!p) return;
        const fieldKey = (p.field || p.name || p.id || '').trim();
        if (!fieldKey) return;
        const canonicalKey = fieldKey.toLowerCase();

        const widgetType = p.widget || (
            p.type === 'Datetime' ? 'datetime-local' :
            p.type === 'Date' ? 'date' :
            p.type === 'Number' ? 'number' :
            (p.options && Array.isArray(p.options)) ? 'select' : 'text'
        );

        if (!paramMap.has(canonicalKey)) {
            paramMap.set(canonicalKey, {
                id: p.id || `param-${fieldKey}`,
                field: fieldKey,
                label: p.label || fieldKey.replace(/_/g, ' '),
                type: p.type || 'String',
                widget: widgetType,
                defaultValue: p.defaultValue ?? p.value ?? '',
                options: p.options || undefined,
                required: Boolean(p.required)
            });
        } else {
            const existing = paramMap.get(canonicalKey);
            if (!existing.options && p.options) existing.options = p.options;
            if (!existing.defaultValue && (p.defaultValue || p.value)) {
                existing.defaultValue = p.defaultValue ?? p.value;
            }
        }
    };

    if (Array.isArray(explicitParams)) {
        explicitParams.forEach(registerParam);
    }

    Object.values(contractRegistry || {}).forEach(contract => {
        if (!contract) return;
        const exposed = contract.exposedCriteria || contract.parameters || contract.inputParameters || [];
        if (Array.isArray(exposed)) {
            exposed.forEach(item => {
                registerParam({
                    field: item.name || item.field,
                    label: item.label || item.name,
                    type: item.type,
                    defaultValue: item.defaultValue ?? item.value,
                    options: item.options
                });
            });
        }
    });

    return Array.from(paramMap.values());
}

function extractPreDefinedAudits(explicitAudits = {}, contractRegistry = {}) {
    const domainsMap = {};

    if (explicitAudits && explicitAudits.domains && typeof explicitAudits.domains === 'object') {
        Object.keys(explicitAudits.domains).forEach(dom => {
            domainsMap[dom] = Array.isArray(explicitAudits.domains[dom]) 
                ? [...explicitAudits.domains[dom]] 
                : [];
        });
    }

    Object.keys(contractRegistry || {}).forEach(domName => {
        if (domName === 'default') return;
        const contract = contractRegistry[domName];
        if (!contract) return;

        if (!domainsMap[domName]) {
            domainsMap[domName] = [];
        }

        const presets = contract.presetCriteria || contract.preDefinedParameters || contract.lockedFilters || [];
        if (Array.isArray(presets)) {
            presets.forEach(p => {
                const name = p.name || p.field || p.label;
                const exists = domainsMap[domName].some(existing => (existing.name || existing.label) === name);
                if (!exists) {
                    domainsMap[domName].push({
                        name: name,
                        label: p.label || name,
                        fixedValue: p.fixedValue ?? p.value ?? '-'
                    });
                }
            });
        }
    });

    return domainsMap;
}

// ============================================================================
// 4. ADVANCED GENERIC CHART.JS SPECIFICATION FACTORY
// ============================================================================

function createChartColorGradient(ctx, hexColor, alphaTop = 0.35, alphaBottom = 0.0) {
    if (!ctx) return hexColor;
    try {
        const gradient = ctx.createLinearGradient(0, 0, 0, 320);
        gradient.addColorStop(0, hexToRgba(hexColor, alphaTop));
        gradient.addColorStop(1, hexToRgba(hexColor, alphaBottom));
        return gradient;
    } catch (e) {
        return hexColor;
    }
}

function hexToRgba(hex, alpha = 1) {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

function buildChartJsConfig(chartSpec, labels, seriesDataMap, canvasCtx = null, prebuiltDatasets = null) {
    const tokens = getPlatformThemeTokens();
    const isCombo = chartSpec.type === 'combo';
    const rootType = isCombo ? 'bar' : (chartSpec.type || 'bar');
    const isRadial = rootType === 'doughnut' || rootType === 'pie' || rootType === 'polarArea' || rootType === 'radar';
    const isHorizontal = chartSpec.indexAxis === 'y';

    let finalLabels = labels;
    let finalSeriesDataMap = seriesDataMap || {};

    if (Array.isArray(labels) && labels.length > 0 && typeof labels[0] === 'object' && !Array.isArray(labels[0])) {
        const dataset = labels;
        const dimensionKey = chartSpec.dimension || chartSpec.groupBy;
        finalLabels = [...new Set(dataset.map(row => row[dimensionKey]))].filter(v => v !== undefined && v !== null);
        finalSeriesDataMap = {};
        (chartSpec.series || []).forEach(s => {
            const mKey = s.metric || s.field;
            finalSeriesDataMap[mKey] = finalLabels.map(label => {
                const matched = dataset.filter(r => r[dimensionKey] === label);
                const vals = matched.map(r => Number(r[mKey]) || 0);
                if (s.aggregation === 'avg') return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                if (s.aggregation === 'count') return vals.length;
                return vals.reduce((a, b) => a + b, 0);
            });
        });
    }

    let datasets = [];
    if (Array.isArray(prebuiltDatasets) && prebuiltDatasets.length > 0 && chartSpec.seriesField) {
        datasets = prebuiltDatasets.map((ds, idx) => {
            const baseColor = ds.backgroundColor || tokens.palette[idx % tokens.palette.length];
            return {
                type: ds.type || rootType,
                label: ds.label || `Series ${idx + 1}`,
                data: ds.data || [],
                backgroundColor: hexToRgba(baseColor, 0.85),
                borderColor: baseColor,
                borderWidth: 1,
                borderRadius: (!isRadial) ? 4 : 0,
                stack: chartSpec.stacked ? 'stack-0' : undefined
            };
        });
    } else {
        let seriesList = chartSpec.series || [];
        const dataKeys = Object.keys(finalSeriesDataMap);
        const hasMatchingKey = seriesList.some(s => (s.metric || s.field) in finalSeriesDataMap);

        if ((!hasMatchingKey || seriesList.length === 0) && dataKeys.length > 0) {
            seriesList = dataKeys.map((k, kIdx) => ({
                field: k,
                metric: k,
                label: k,
                color: tokens.palette[kIdx % tokens.palette.length]
            }));
        }

        datasets = seriesList.map((s, idx) => {
            const baseColor = s.color || tokens.palette[idx % tokens.palette.length];
            const seriesType = s.type || (isCombo ? 'bar' : rootType);
            const yAxisID = s.yAxisID || 'y';
            const isLine = seriesType === 'line';

            let backgroundColor;
            if (isRadial) {
                backgroundColor = tokens.palette.slice(0, (finalLabels || []).length);
            } else if (isLine && s.fill) {
                backgroundColor = canvasCtx ? createChartColorGradient(canvasCtx, baseColor, 0.3, 0.01) : hexToRgba(baseColor, 0.2);
            } else if (isLine) {
                backgroundColor = baseColor;
            } else {
                backgroundColor = hexToRgba(baseColor, 0.85);
            }

            const metricKey = s.metric || s.field;
            const dataVals = finalSeriesDataMap ? (
                finalSeriesDataMap[metricKey] ??
                finalSeriesDataMap[s.field] ??
                finalSeriesDataMap[s.metric] ??
                (s.label && finalSeriesDataMap[s.label]) ??
                []
            ) : [];

            return {
                type: seriesType,
                label: s.label || metricKey || s.field || s.metric || `Series ${idx + 1}`,
                data: dataVals,
                yAxisID: isRadial ? undefined : yAxisID,
                backgroundColor: backgroundColor,
                borderColor: isRadial ? (tokens.isLight ? '#ffffff' : '#1e293b') : baseColor,
                borderWidth: isLine ? (s.borderWidth || 2.5) : 1,
                borderRadius: (!isLine && !isRadial) ? (s.borderRadius ?? 4) : 0,
                fill: s.fill ?? (isLine ? false : undefined),
                tension: s.tension ?? (isLine ? 0.3 : 0),
                pointRadius: isLine ? (s.pointRadius ?? 3) : 0,
                pointHoverRadius: isLine ? 6 : 0,
                pointBackgroundColor: baseColor,
                borderDash: s.borderDash || undefined,
                stack: chartSpec.stacked ? 'stack-0' : undefined
            };
        });
    }

    const scales = {};
    if (!isRadial) {
        const categoryAxisKey = isHorizontal ? 'y' : 'x';
        const primaryValAxisKey = isHorizontal ? 'x' : 'y';

        scales[categoryAxisKey] = {
            stacked: chartSpec.stacked || false,
            grid: {
                display: false,
                color: tokens.gridColor
            },
            ticks: {
                color: tokens.textMuted,
                font: { size: 11, family: 'Inter, system-ui, sans-serif' }
            }
        };

        const rawPrimaryScale = chartSpec.scales?.[primaryValAxisKey];
        const primaryScaleDef = (typeof rawPrimaryScale === 'object' && rawPrimaryScale !== null) ? rawPrimaryScale : {};
        scales[primaryValAxisKey] = {
            position: primaryScaleDef.position || (isHorizontal ? 'bottom' : 'left'),
            stacked: chartSpec.stacked || false,
            grid: {
                color: tokens.gridColor,
                drawBorder: false,
                ...(typeof primaryScaleDef.grid === 'object' ? primaryScaleDef.grid : {})
            },
            ticks: {
                color: tokens.textMuted,
                font: { size: 11, family: 'Inter, system-ui, sans-serif' },
                callback: function(value) {
                    return formatMetricValue(value, primaryScaleDef.format || { compact: true });
                },
                ...(typeof primaryScaleDef.ticks === 'object' ? primaryScaleDef.ticks : {})
            },
            title: primaryScaleDef.title ? {
                display: true,
                text: typeof primaryScaleDef.title === 'string' ? primaryScaleDef.title : primaryScaleDef.title.text,
                color: tokens.textMuted,
                font: { size: 11, weight: '500' },
                ...(typeof primaryScaleDef.title === 'object' ? primaryScaleDef.title : {})
            } : undefined
        };

        const secondaryValAxisKey = isHorizontal ? 'x1' : 'y1';
        if (chartSpec.scales?.[secondaryValAxisKey]) {
            const rawSecondaryScale = chartSpec.scales[secondaryValAxisKey];
            const secondaryScaleDef = (typeof rawSecondaryScale === 'object' && rawSecondaryScale !== null) ? rawSecondaryScale : {};
            scales[secondaryValAxisKey] = {
                position: secondaryScaleDef.position || (isHorizontal ? 'top' : 'right'),
                grid: {
                    drawOnChartArea: typeof secondaryScaleDef.grid === 'boolean'
                        ? secondaryScaleDef.grid
                        : (secondaryScaleDef.grid?.drawOnChartArea ?? false),
                    color: tokens.gridColor,
                    ...(typeof secondaryScaleDef.grid === 'object' ? secondaryScaleDef.grid : {})
                },
                ticks: {
                    color: tokens.textMuted,
                    font: { size: 11, family: 'Inter, system-ui, sans-serif' },
                    callback: function(value) {
                        return formatMetricValue(value, secondaryScaleDef.format || { compact: true });
                    },
                    ...(typeof secondaryScaleDef.ticks === 'object' ? secondaryScaleDef.ticks : {})
                },
                title: secondaryScaleDef.title ? {
                    display: true,
                    text: typeof secondaryScaleDef.title === 'string' ? secondaryScaleDef.title : secondaryScaleDef.title.text,
                    color: tokens.textMuted,
                    font: { size: 11, weight: '500' },
                    ...(typeof secondaryScaleDef.title === 'object' ? secondaryScaleDef.title : {})
                } : undefined
            };
        }
    }

    return {
        type: rootType,
        data: { labels: finalLabels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: chartSpec.indexAxis || 'x',
            interaction: {
                mode: isRadial ? 'nearest' : 'index',
                intersect: isRadial
            },
            plugins: {
                legend: {
                    display: isRadial || (datasets.length > 1),
                    position: 'top',
                    labels: {
                        color: tokens.textColor,
                        boxWidth: 12,
                        boxHeight: 12,
                        font: { size: 12, family: 'Inter, system-ui, sans-serif' },
                        padding: 14
                    }
                },
                tooltip: {
                    backgroundColor: tokens.isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.94)',
                    titleColor: tokens.isLight ? '#0f172a' : '#f8fafc',
                    bodyColor: tokens.isLight ? '#334155' : '#cbd5e1',
                    borderColor: tokens.borderColor,
                    borderWidth: 1,
                    padding: 10,
                    boxPadding: 4,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            const dataset = context.dataset;
                            const val = context.parsed[isHorizontal ? 'x' : 'y'] ?? context.parsed;
                            const yAxisID = dataset.yAxisID || 'y';
                            const rawScale = chartSpec.scales?.[yAxisID];
                            const scaleDef = (typeof rawScale === 'object' && rawScale !== null) ? rawScale : {};
                            const formatted = formatMetricValue(val, scaleDef.format);
                            return ` ${dataset.label || ''}: ${formatted}`;
                        }
                    }
                }
            },
            scales: isRadial ? undefined : scales
        }
    };
}

// ============================================================================
// 5. UI CHASSIS COMPILATION FACTORY
// ============================================================================

function createChassisComponent(titleText, bodyHTMLContent, isExpandable = false, componentId = "", isCollapsible = false, hasDatasetToggle = false) { 
    const wrapper = document.createElement('div'); 
    wrapper.className = 'ui-proposal-chassis'; 
    
    let collapseBtnHTML = ''; 
    if (titleText && isCollapsible) { 
        collapseBtnHTML = '<button class="ui-chassis-collapse-btn" title="Toggle Section Collapse">&minus;</button>'; 
    } 
    
    let controlsHTML = '<div class="ui-chassis-controls">'; 
    if (hasDatasetToggle) { 
        controlsHTML += `<div class="ui-chassis-view-switch"><button class="chassis-switch-btn active" data-view="visual" title="Visual Chart"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 17v-5M12 17V7M17 17v-3"/></svg></button><button class="chassis-switch-btn" data-view="dataset" title="Supporting Dataset"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></button></div>`; 
    } 
    if (isExpandable && componentId) { 
        controlsHTML += '<button class="ui-chassis-zoom-trigger" data-component-target="' + componentId + '" title="Enlarge View"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 23 3 23 5 23 9"></polyline><polyline points="9 21 3 21 1 21 1 19 1 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg></button>'; 
    } 
    controlsHTML += '</div>'; 
    
    const headerHTML = titleText ? '<div class="ui-chassis-header"><div class="ui-chassis-title-group">' + collapseBtnHTML + '<h3 class="ui-chassis-title">' + titleText + '</h3></div>' + controlsHTML + '</div>' : ''; 
    wrapper.innerHTML = headerHTML + '<div class="ui-chassis-body">' + bodyHTMLContent + '</div>'; 
    
    if (isCollapsible) { 
        const btn = wrapper.querySelector('.ui-chassis-collapse-btn'); 
        if (btn) { 
            btn.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                const isCollapsed = wrapper.classList.toggle('is-collapsed'); 
                btn.innerHTML = isCollapsed ? '&#43;' : '&minus;'; 
            }); 
        } 
    } 
    return wrapper; 
}

// ============================================================================
// 6. CHART INTERACTIVE EVENTS (TOOLTIPS & VIEW TOGGLING)
// ============================================================================

function bindChartInteractiveEvents() { 
    const chartContainers = document.querySelectorAll('.css-chart-viewport-svg, .heatmap-container'); 
    chartContainers.forEach(container => { 
        const tooltip = container.querySelector('.studio-chart-tooltip'); 
        const points = container.querySelectorAll('.chart-data-point, .heatmap-cell[data-tooltip]'); 
        if (!tooltip || !points) return; 
        
        points.forEach(pt => { 
            pt.addEventListener('mouseenter', () => { 
                const text = pt.getAttribute('data-tooltip'); 
                if (!text) return; 
                tooltip.textContent = text; 
                const containerRect = container.getBoundingClientRect(); 
                const ptRect = pt.getBoundingClientRect(); 
                const posX = ptRect.left - containerRect.left + (ptRect.width / 2); 
                const posY = ptRect.top - containerRect.top; 
                tooltip.style.left = posX + 'px'; 
                tooltip.style.top = posY + 'px'; 
                tooltip.classList.add('is-visible'); 
            }); 
            pt.addEventListener('mouseleave', () => { 
                tooltip.classList.remove('is-visible'); 
            }); 
        }); 
    }); 
    
    document.querySelectorAll('.chassis-switch-btn').forEach(btn => { 
        if (btn.dataset.listenerAttached) return;
        btn.dataset.listenerAttached = 'true';

        btn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            const view = btn.getAttribute('data-view'); 
            const switchContainer = btn.closest('.ui-chassis-view-switch'); 
            const parentScope = btn.closest('.ui-proposal-chassis') || btn.closest('.modal-container'); 
            if (!parentScope || !view) return; 
            
            if (switchContainer) { 
                switchContainer.querySelectorAll('.chassis-switch-btn').forEach(b => b.classList.remove('active')); 
            } 
            btn.classList.add('active'); 
            
            if (parentScope.classList.contains('modal-container')) { 
                const modalHeaderSwitch = parentScope.querySelector('#modalViewSwitch'); 
                if (modalHeaderSwitch) { 
                    modalHeaderSwitch.querySelectorAll('.chassis-switch-btn').forEach(b => { 
                        b.classList.toggle('active', b.getAttribute('data-view') === view); 
                    }); 
                } 
            } 
            
            const visualPanel = parentScope.querySelector('.chart-visual-panel'); 
            const dataPanel = parentScope.querySelector('.chart-data-panel'); 
            if (view === 'visual') { 
                if (visualPanel) visualPanel.classList.remove('is-hidden'); 
                if (dataPanel) dataPanel.classList.add('is-hidden'); 
            } else if (view === 'dataset') { 
                if (visualPanel) visualPanel.classList.add('is-hidden'); 
                if (dataPanel) dataPanel.classList.remove('is-hidden'); 
            } 
        }); 
    }); 
}

// ============================================================================
// 7. MODAL ZOOM, DRAG & ADVANCED CHART RECONSTRUCTION ENGINE
// ============================================================================

let activeModalChartInstance = null;

function makeModalDraggableAndResizable(modalContainer, dragHandle) {
    if (!modalContainer || !dragHandle || modalContainer.dataset.draggableBound) return;
    modalContainer.dataset.draggableBound = 'true';

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    dragHandle.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('.ui-chassis-view-switch')) return;
        e.preventDefault();

        const rect = modalContainer.getBoundingClientRect();
        modalContainer.style.position = 'fixed';
        modalContainer.style.margin = '0';
        modalContainer.style.transform = 'none';
        modalContainer.style.top = rect.top + 'px';
        modalContainer.style.left = rect.left + 'px';

        pos3 = e.clientX;
        pos4 = e.clientY;

        const onMouseMove = (moveEvt) => {
            moveEvt.preventDefault();
            pos1 = pos3 - moveEvt.clientX;
            pos2 = pos4 - moveEvt.clientY;
            pos3 = moveEvt.clientX;
            pos4 = moveEvt.clientY;

            modalContainer.style.top = (modalContainer.offsetTop - pos2) + 'px';
            modalContainer.style.left = (modalContainer.offsetLeft - pos1) + 'px';
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            if (activeModalChartInstance) {
                activeModalChartInstance.resize();
            }
        });
        resizeObserver.observe(modalContainer);
    }
}

function bindModalEvents(getChartInstanceFn) {
    const modal = document.getElementById('ui-global-enlargement-modal');
    const modalContainer = modal ? modal.querySelector('.modal-container') : null;
    const modalHeader = modal ? modal.querySelector('.modal-header') : null;
    const modalBody = document.getElementById('ui-modal-body-content');
    const modalTitle = document.getElementById('ui-modal-title-text');
    const modalCloseBtn = document.getElementById('ui-modal-close-btn');

    if (modalContainer && modalHeader) {
        makeModalDraggableAndResizable(modalContainer, modalHeader);
    }

    const closeModal = () => {
        if (!modal) return;
        modal.classList.remove('active', 'is-active');
        document.body.classList.remove('modal-open');
        
        if (modalContainer) {
            modalContainer.style.top = '';
            modalContainer.style.left = '';
            modalContainer.style.width = '';
            modalContainer.style.height = '';
            modalContainer.style.transform = '';
            modalContainer.style.margin = '';
            modalContainer.style.aspectRatio = '';
        }

        if (activeModalChartInstance) {
            activeModalChartInstance.destroy();
            activeModalChartInstance = null;
        }
        if (modalBody) modalBody.innerHTML = '';
    };

    if (modalCloseBtn) modalCloseBtn.onclick = closeModal;

    document.addEventListener('click', (e) => {
        const zoomBtn = e.target.closest('.ui-chassis-zoom-trigger');
        if (!zoomBtn || !modal || !modalBody) return;

        const targetId = zoomBtn.getAttribute('data-component-target');
        const chassis = zoomBtn.closest('.ui-proposal-chassis');
        if (!chassis) return;

        const titleText = chassis.querySelector('.ui-chassis-title')?.textContent || 'Enlarged View';
        if (modalTitle) modalTitle.textContent = titleText;

        if (activeModalChartInstance) {
            activeModalChartInstance.destroy();
            activeModalChartInstance = null;
        }

        const bodyContent = chassis.querySelector('.ui-chassis-body');
        if (!bodyContent) return;
        modalBody.innerHTML = bodyContent.innerHTML;

        if (modalContainer) {
            const rect = chassis.getBoundingClientRect();
            const originWidth = rect.width || 600;
            const originHeight = rect.height || 350;

            const scaleMultiplier = 1.2;
            let targetWidthPx = originWidth * scaleMultiplier;
            let targetHeightPx = originHeight * scaleMultiplier;

            const maxVwPx = window.innerWidth * 0.95;
            const maxVhPx = window.innerHeight * 0.92;
            const minWidthPx = 420;
            const minHeightPx = 320;

            targetWidthPx = Math.min(Math.max(targetWidthPx, minWidthPx), maxVwPx);
            targetHeightPx = Math.min(Math.max(targetHeightPx, minHeightPx), maxVhPx);

            modalContainer.style.width = `${targetWidthPx}px`;
            modalContainer.style.height = `${targetHeightPx}px`;
            modalContainer.style.maxWidth = '95vw';
            modalContainer.style.maxHeight = '92vh';
            modalContainer.style.aspectRatio = 'unset';
        }

        const cardActiveBtn = chassis.querySelector('.ui-chassis-view-switch .chassis-switch-btn.active');
        const activeView = cardActiveBtn ? cardActiveBtn.getAttribute('data-view') : 'visual';

        const modalHeaderSwitch = modal.querySelector('#modalViewSwitch');
        if (modalHeaderSwitch) {
            modalHeaderSwitch.querySelectorAll('.chassis-switch-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-view') === activeView);
            });
        }

        const visualPanel = modalBody.querySelector('.chart-visual-panel');
        const dataPanel = modalBody.querySelector('.chart-data-panel');
        if (activeView === 'visual') {
            if (visualPanel) visualPanel.classList.remove('is-hidden');
            if (dataPanel) dataPanel.classList.add('is-hidden');
        } else if (activeView === 'dataset') {
            if (visualPanel) visualPanel.classList.add('is-hidden');
            if (dataPanel) dataPanel.classList.remove('is-hidden');
        }

        modal.classList.add('active', 'is-active');
        document.body.classList.add('modal-open');

        bindChartInteractiveEvents();

        const modalCanvas = modalBody.querySelector('canvas');
        const origChart = getChartInstanceFn ? getChartInstanceFn(targetId) : null;

        if (modalCanvas && origChart) {
            modalCanvas.id = targetId + '_modal_canvas';
            try {
                const rawConfig = origChart.config;
                const modalCtx = modalCanvas.getContext('2d');
                
                const modalDatasets = rawConfig.data.datasets.map(ds => {
                    const cloned = { ...ds, data: ds.data ? [...ds.data] : [] };
                    if (ds.type === 'line' && ds.fill && ds.borderColor && typeof ds.borderColor === 'string') {
                        cloned.backgroundColor = createChartColorGradient(modalCtx, ds.borderColor, 0.35, 0.01);
                    }
                    return cloned;
                });

                const modalOptions = {
                    ...(rawConfig.options || {}),
                    responsive: true,
                    maintainAspectRatio: false
                };

                activeModalChartInstance = new Chart(modalCtx, {
                    type: rawConfig.type,
                    data: {
                        labels: rawConfig.data.labels ? [...rawConfig.data.labels] : [],
                        datasets: modalDatasets
                    },
                    options: modalOptions
                });
            } catch (err) {
                console.error('Modal chart recreation error:', err);
            }
        }
    });
}

// ============================================================================
// 8. GLOBAL HEADER & THEME INTERACTION ENGINE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const userMenuTrigger = document.getElementById('userMenuTrigger');
    const userMenuDropdown = document.getElementById('userMenuDropdown');

    if (userMenuTrigger && userMenuDropdown) {
        userMenuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenuDropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            userMenuDropdown.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        const themeBtn = e.target.closest('#themeToggleBtn');
        if (themeBtn) {
            e.stopPropagation();
            window.setDashboardTheme('toggle');
        }
    });
});

window.setDashboardTheme = function(mode = 'toggle') {
    let isLight;
    if (mode === 'light') {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        isLight = true;
    } else if (mode === 'dark') {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        isLight = false;
    } else {
        isLight = document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode', !isLight);
    }

    if (window.Chart && typeof window.Chart.instances === 'object') {
        Object.values(window.Chart.instances).forEach(chart => {
            try {
                const tokens = getPlatformThemeTokens();
                if (chart.options.scales) {
                    Object.values(chart.options.scales).forEach(scale => {
                        if (scale.grid) scale.grid.color = tokens.gridColor;
                        if (scale.ticks) scale.ticks.color = tokens.textMuted;
                    });
                }
                if (chart.options.plugins?.legend?.labels) {
                    chart.options.plugins.legend.labels.color = tokens.textColor;
                }
                chart.update();
            } catch (err) {}
        });
    }
};

window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.action === 'TOGGLE_THEME') {
        window.setDashboardTheme('toggle');
    } else if (data.action === 'SET_THEME' && data.theme) {
        window.setDashboardTheme(data.theme);
    }
});

// ============================================================================
// 9. URL HASH SPECIFICATION DECOMPRESSION & HYDRATION ENGINE
// ============================================================================

function decompressLZString(input) {
    if (window.LZString && typeof window.LZString.decompressFromEncodedURIComponent === 'function') {
        return window.LZString.decompressFromEncodedURIComponent(input);
    }
    if (input == null || input === '') return '';
    input = input.replace(/ /g, '+');

    const keyStrUriSafe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
    const baseReverseDic = {};
    for (let i = 0; i < keyStrUriSafe.length; i++) {
        baseReverseDic[keyStrUriSafe.charAt(i)] = i;
    }

    const getBaseValue = (index) => {
        const char = input.charAt(index);
        return baseReverseDic[char] !== undefined ? baseReverseDic[char] : 0;
    };

    const length = input.length;
    const resetValue = 32;
    const f = String.fromCharCode;
    const dictionary = [0, 1, 2];
    let next;
    let enlargeIn = 4;
    let dictSize = 4;
    let numBits = 3;
    let entry = '';
    const result = [];
    let w;
    let bits;
    let resb;
    let maxpower;
    let power;
    let c;
    const data = { val: getBaseValue(0), position: resetValue, index: 1 };

    bits = 0; maxpower = Math.pow(2, 2); power = 1;
    while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
            data.position = resetValue;
            data.val = getBaseValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
    }

    switch (next = bits) {
        case 0:
            bits = 0; maxpower = Math.pow(2, 8); power = 1;
            while (power !== maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position === 0) {
                    data.position = resetValue;
                    data.val = getBaseValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            c = f(bits);
            break;
        case 1:
            bits = 0; maxpower = Math.pow(2, 16); power = 1;
            while (power !== maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position === 0) {
                    data.position = resetValue;
                    data.val = getBaseValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            c = f(bits);
            break;
        case 2:
            return '';
    }
    dictionary[3] = c;
    w = c;
    result.push(c);

    while (true) {
        if (data.index > length) return '';

        bits = 0; maxpower = Math.pow(2, numBits); power = 1;
        while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
                data.position = resetValue;
                data.val = getBaseValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
        }

        switch (c = bits) {
            case 0:
                bits = 0; maxpower = Math.pow(2, 8); power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) {
                        data.position = resetValue;
                        data.val = getBaseValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
            case 1:
                bits = 0; maxpower = Math.pow(2, 16); power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) {
                        data.position = resetValue;
                        data.val = getBaseValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
            case 2:
                return result.join('');
        }

        if (enlargeIn === 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
        }

        if (dictionary[c]) {
            entry = dictionary[c];
        } else {
            if (c === dictSize) {
                entry = w + w.charAt(0);
            } else {
                return null;
            }
        }
        result.push(entry);

        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;

        w = entry;

        if (enlargeIn === 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
        }
    }
}

function parseUrlHashSpec() {
    try {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.has('lz')) {
            const jsonStr = decompressLZString(searchParams.get('lz'));
            if (jsonStr) return JSON.parse(jsonStr);
        }
        if (searchParams.has('spec')) {
            const raw = searchParams.get('spec');
            return JSON.parse(decodeURIComponent(raw));
        }

        const hash = window.location.hash;
        if (hash && hash.length >= 5) {
            if (hash.startsWith('#lz=')) {
                const raw = hash.slice(4);
                const jsonStr = decompressLZString(raw);
                if (jsonStr) return JSON.parse(jsonStr);
            } else if (hash.startsWith('#spec=')) {
                const raw = decodeURIComponent(hash.slice(6));
                return JSON.parse(raw);
            }
        }

        return null;
    } catch (e) {
        console.error('[PlatformRuntime] Error parsing specification from URL:', e);
        return null;
    }
}

function initFromUrlHash() {
    const spec = parseUrlHashSpec();
    if (!spec) return null;

    const datasetId = resolveDatasetKey(spec.metadata);
    console.log(`[PlatformRuntime] Hydrating AST from URL Hash: ${datasetId}`);

    window.dashboardSpec = spec;
    window.activeDashboardSpec = spec;
    if (spec.contract?.sampleData) {
        window.activeDataset = spec.contract.sampleData;
    }

    if (typeof window.hydrateDashboard === 'function') {
        window.hydrateDashboard(spec);
    } else if (typeof window.renderDashboard === 'function') {
        window.renderDashboard(spec);
    } else if (typeof window.renderDashboardFromSpec === 'function') {
        window.renderDashboardFromSpec(spec);
    } else if (typeof window.loadDashboardSpec === 'function') {
        window.loadDashboardSpec(spec);
    } else if (typeof window.applyDashboardSpec === 'function') {
        window.applyDashboardSpec(spec);
    }

    window.dispatchEvent(new CustomEvent('dashboard:spec-loaded', { detail: spec }));
    window.dispatchEvent(new CustomEvent('calypso:load-spec', { detail: spec }));

    return spec;
}

window.addEventListener('contract:uploaded', (e) => {
    if (!e.detail) return;
    const records = e.detail.sampleData || e.detail.data || (Array.isArray(e.detail) ? e.detail : []);
    if (records.length && window.dashboardSpec) {
        window.activeDataset = records;
        window.dashboardSpec.contract = window.dashboardSpec.contract || {};
        window.dashboardSpec.contract.sampleData = records;
        if (typeof window.hydrateDashboard === 'function') {
            window.hydrateDashboard(window.dashboardSpec);
        } else if (typeof window.renderDashboard === 'function') {
            window.renderDashboard(window.dashboardSpec);
        }
        window.dispatchEvent(new CustomEvent('dashboard:data-updated', { detail: records }));
    }
});

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initFromUrlHash();
        });
    } else {
        initFromUrlHash();
    }

    window.addEventListener('hashchange', () => {
        initFromUrlHash();
    });
}

// ============================================================================
// 9.5 NATIVE PLATFORM INGESTION & BOOTSTRAP ENGINE
// ============================================================================

function initPlatform(options = {}) {
    const {
        isProduction = false,
        contractRegistry = {},
        contractSchema = {},
        activeDataBuffer = {},
        onHydrate = () => {},
        fetchCalypsoFn = null
    } = options;

    // 1. Zone 1 Visibility & Dual-Mode Routing
    const adminHeader = document.getElementById('platformAdminBar');
    if (isProduction) {
        if (adminHeader) adminHeader.style.display = 'none';
        if (typeof fetchCalypsoFn === 'function') {
            fetchCalypsoFn();
        }
        return;
    }

    // 2. Generic Ingestion Processor
    function processPayload(parsed) {
        if (!parsed) return false;

        // Package / Signature Validation
        const targetPackage = contractSchema?.metadata?.packageId;
        if (targetPackage && parsed.metadata?.packageId !== targetPackage) {
            return false;
        }
        if (!targetPackage && contractSchema?.metadata?.signature && 
            parsed.metadata?.signature !== contractSchema.metadata.signature) {
            return false;
        }

        // Primary Match: Template ID or Domain Key
        const templateId = parsed.metadata?.templateId || parsed.metadata?.domain || parsed.metadata?.semanticDomain;
        if (templateId && activeDataBuffer[templateId] !== undefined) {
            activeDataBuffer[templateId] = parsed.sampleData || parsed.data || [];
            return true;
        }

        // Secondary Match: Multi-Domain Bundle Keys
        let matchedBundle = false;
        Object.keys(contractRegistry || {}).forEach(dom => {
            if (parsed[dom] && Array.isArray(parsed[dom])) {
                activeDataBuffer[dom] = parsed[dom];
                matchedBundle = true;
            }
        });
        if (matchedBundle) return true;

        // Fallback: Schema Column Key Overlap
        const incomingRecords = parsed.sampleData || parsed.data || (Array.isArray(parsed) ? parsed : []);
        const incomingSample = incomingRecords[0] || {};
        const incomingKeys = Object.keys(incomingSample);
        let bestDomain = null;
        let maxOverlap = 0;

        for (const [dom, contract] of Object.entries(contractRegistry || {})) {
            if (!contract) continue;
            const schemaCols = (contract.columns || []).map(c => c.field || c.name || c.key);
            const overlap = incomingKeys.filter(k => schemaCols.includes(k)).length;
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestDomain = dom;
            }
        }

        if (bestDomain && maxOverlap > 0) {
            activeDataBuffer[bestDomain] = incomingRecords;
            return true;
        }

        // Single Contract Fallback
        if (contractSchema && !Object.keys(contractRegistry || {}).length) {
            const schemaCols = (contractSchema.columns || []).map(c => c.field || c.name || c.key);
            const overlap = incomingKeys.filter(k => schemaCols.includes(k)).length;
            if (overlap > 0) {
                const singleKey = contractSchema.metadata?.templateId || contractSchema.metadata?.domain || 'default';
                activeDataBuffer[singleKey] = incomingRecords;
                return true;
            }
        }

        return false;
    }

    // 3. Multi-File Batch devFileInput Listener
    const fileInput = document.getElementById('devFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async function(e) {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            let anySuccess = false;
            for (const file of files) {
                try {
                    const text = await file.text();
                    const parsed = JSON.parse(text);
                    if (processPayload(parsed)) {
                        anySuccess = true;
                    }
                } catch (err) {
                    console.warn("Failed to parse file: " + file.name, err);
                }
            }

            if (anySuccess) {
                if (typeof onHydrate === 'function') {
                    onHydrate(activeDataBuffer);
                }
            } else {
                alert("Layout violation: Requested operation breaches structural specifications.");
            }

            e.target.value = '';
        });
    }

    window.processIncomingPayloadGeneric = processPayload;
}
// ============================================================================
// 9.6 NATIVE CRITERIA POPOVER DECK & STATE ENGINE (PHASE 2)
// ============================================================================

let _criteriaSlideIndex = 0;

function renderCriteriaPopover(criteria = [], isInitial = false, options = {}) {
    const container = document.getElementById('studio-criteria-fields-container');
    if (!container) return;

    const contractRegistry = options.contractRegistry || window.CONTRACT_REGISTRY || {};
    const contractSchema = options.contractSchema || window.CONTRACT_SCHEMA || {};

    const effectiveRegistry = Object.keys(contractRegistry).length > 0
        ? contractRegistry
        : (contractSchema && Object.keys(contractSchema).length > 0 
            ? { [contractSchema.metadata?.domain || contractSchema.metadata?.templateId || 'Default']: contractSchema } 
            : {});

    // 1. Resolve Dynamic Input Parameters (Section 1)
    const explicitParams = Array.isArray(criteria) ? criteria : [];
    const mergedParams = mergeCriteriaParameters(explicitParams, effectiveRegistry);

    // 2. Resolve Pre-Defined Audits (Section 2)
    const auditDomainsMap = extractPreDefinedAudits({}, effectiveRegistry);
    const domainKeys = Object.keys(auditDomainsMap);

    // Helper: Map current values
    const getValueForField = (param) => {
        if (isInitial) return '';
        const match = (criteria || []).find(c => (c.field || c.name) === param.field);
        if (match && (match.value !== undefined || match.defaultValue !== undefined)) {
            const val = match.value ?? match.defaultValue;
            return param.widget === 'datetime-local' ? formatIsoToDatetimeLocal(val) : val;
        }
        const fallback = param.defaultValue ?? '';
        return param.widget === 'datetime-local' ? formatIsoToDatetimeLocal(fallback) : fallback;
    };

    // Build Section 1: Input Parameters
    let section1HTML = `
        <div class="popover-primary-fields">
            <div class="popover-section-label">
                <div class="popover-section-title-group">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Input Parameters
                </div>
            </div>
            <div class="popover-primary-scrollbox">
    `;

    if (mergedParams.length === 0) {
        section1HTML += `<div style="font-size: 11px; opacity: 0.6; padding: 4px 0;">No adjustable parameters specified.</div>`;
    } else {
        mergedParams.forEach(p => {
            const val = getValueForField(p);
            section1HTML += `<div class="studio-form-group criteria-input-field">`;
            section1HTML += `<label class="studio-form-label">${p.label || p.field}</label>`;

            if (p.options && Array.isArray(p.options) && p.options.length > 0) {
                section1HTML += `<select class="studio-form-select" data-criteria-field="${p.field}">`;
                p.options.forEach(opt => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    const selected = String(optVal) === String(val) ? 'selected' : '';
                    section1HTML += `<option value="${optVal}" ${selected}>${optLabel}</option>`;
                });
                section1HTML += `</select>`;
            } else if (p.widget === 'datetime-local' || p.type === 'Datetime') {
                section1HTML += `<input type="datetime-local" class="studio-form-input" data-criteria-field="${p.field}" value="${val}">`;
            } else if (p.widget === 'date' || p.type === 'Date') {
                section1HTML += `<input type="date" class="studio-form-input" data-criteria-field="${p.field}" value="${val}">`;
            } else if (p.widget === 'number' || p.type === 'Number') {
                section1HTML += `<input type="number" class="studio-form-input" data-criteria-field="${p.field}" value="${val}">`;
            } else {
                section1HTML += `<input type="text" class="studio-form-input" data-criteria-field="${p.field}" value="${val}">`;
            }
            section1HTML += `</div>`;
        });
    }
    section1HTML += `</div></div>`;

    // Build Section 2: Pre-Defined Criterias (Folded by Default + Sliding Deck)
    let section2HTML = `
        <div class="popover-audit-context">
            <div class="popover-section-label">
                <div class="popover-section-title-group">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path><line x1="12" y1="14" x2="12" y2="17"></line></svg>
                    Pre-Defined Criterias
                </div>
                <button type="button" class="popover-fold-btn is-collapsed" id="studioAuditFoldBtn" title="Toggle View">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
            </div>
            <div class="popover-audit-scrollbox is-collapsed" id="studioAuditScrollbox">
                <div class="contract-cards-viewport" style="background: transparent !important; overflow: hidden; width: 100%;">
                    <div class="contract-cards-track" style="background: transparent !important; display: flex; transition: transform 0.3s ease; width: 100%; transform: translateX(-${_criteriaSlideIndex * 100}%);">
    `;

    if (domainKeys.length === 0) {
        section2HTML += `
            <div class="contract-card-slide" style="min-width: 100%; box-sizing: border-box; background: transparent !important; border: 1px solid rgba(148, 163, 184, 0.25) !important; border-radius: 6px; padding: 10px;">
                <div style="font-size: 11px; opacity: 0.6;">No pre-defined presets registered.</div>
            </div>
        `;
    } else {
        domainKeys.forEach((dom) => {
            const items = auditDomainsMap[dom] || [];
            section2HTML += `
                <div class="contract-card-slide" style="min-width: 100%; box-sizing: border-box; background: transparent !important; border: 1px solid rgba(148, 163, 184, 0.25) !important; border-radius: 6px; padding: 10px;">
                    <div class="contract-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.75; color: inherit;">${dom}</span>
                        <div class="card-slider-nav" style="display: ${domainKeys.length > 1 ? 'inline-flex' : 'none'} !important; flex-direction: row !important; align-items: center !important; gap: 4px !important;">
                            <button type="button" class="slider-prev-action" style="padding: 2px 6px; font-size: 10px; cursor: pointer;" title="Previous">&larr;</button>
                            <button type="button" class="slider-next-action" style="padding: 2px 6px; font-size: 10px; cursor: pointer;" title="Next">&rarr;</button>
                        </div>
                    </div>
                    <div class="contract-card-body" style="background: transparent !important;">
            `;
            if (items.length === 0) {
                section2HTML += `<div style="font-size: 11px; opacity: 0.5;">No pre-defined audit filters.</div>`;
            } else {
                items.forEach(it => {
                    section2HTML += `
                        <div class="studio-form-group" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span class="studio-form-label" style="font-size: 12px;">${it.label || it.name}</span>
                            <span class="criteria-read-only-tag">${it.fixedValue ?? it.value ?? '-'}</span>
                        </div>
                    `;
                });
            }
            section2HTML += `</div></div>`;
        });
    }

    section2HTML += `</div></div></div></div>`;

    container.innerHTML = section1HTML + section2HTML;

    // Attach Section 2 Fold Handler
    const foldBtn = document.getElementById('studioAuditFoldBtn');
    const scrollbox = document.getElementById('studioAuditScrollbox');
    if (foldBtn && scrollbox && !foldBtn.dataset.bound) {
        foldBtn.dataset.bound = 'true';
        foldBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isFolded = foldBtn.classList.toggle('is-collapsed');
            scrollbox.classList.toggle('is-collapsed', isFolded);
        });
    }

    // Attach Slide Navigation Handlers
    const viewport = container.querySelector('.contract-cards-viewport');
    if (viewport && !viewport.dataset.bound) {
        viewport.dataset.bound = 'true';
        viewport.addEventListener('click', (e) => {
            const prev = e.target.closest('.slider-prev-action');
            const next = e.target.closest('.slider-next-action');
            if (!prev && !next) return;
            e.stopPropagation();

            const track = viewport.querySelector('.contract-cards-track');
            const slides = viewport.querySelectorAll('.contract-card-slide');
            if (!track || slides.length <= 1) return;

            if (next) {
                _criteriaSlideIndex = (_criteriaSlideIndex + 1) % slides.length;
            } else if (prev) {
                _criteriaSlideIndex = (_criteriaSlideIndex - 1 + slides.length) % slides.length;
            }
            track.style.transform = `translateX(-${_criteriaSlideIndex * 100}%)`;
        });
    }
}

function initCriteriaPopover(options = {}) {
    const {
        contractRegistry = {},
        contractSchema = {},
        getActiveCriteria = () => [],
        onCommit = () => {}
    } = options;

    const popoverTrigger = document.getElementById('ui-applied-criteria-trigger');
    const popoverPanel = document.getElementById('studioCriteriaDropdown');
    const popoverBackdrop = document.getElementById('studioPopoverBackdrop');
    const popoverClose = document.getElementById('studioPopoverClose');
    const popoverCancel = document.getElementById('studioPopoverCancel');
    const popoverSubmit = document.getElementById('studioPopoverSubmit');

    const render = (isInitial = false) => {
        renderCriteriaPopover(getActiveCriteria(), isInitial, { contractRegistry, contractSchema });
    };

    const togglePopover = (show) => {
        if (!popoverPanel || !popoverBackdrop) return;
        const isActive = show !== undefined ? show : !popoverPanel.classList.contains('is-active');
        popoverPanel.classList.toggle('is-active', isActive);
        popoverBackdrop.classList.toggle('is-active', isActive);
        if (isActive) {
            render(false);
        }
    };

    // Initial render (unset empty values per spec)
    render(true);

    if (popoverTrigger) popoverTrigger.onclick = () => togglePopover(true);
    if (popoverClose) popoverClose.onclick = () => togglePopover(false);
    if (popoverBackdrop) popoverBackdrop.onclick = () => togglePopover(false);
    if (popoverCancel) popoverCancel.onclick = () => togglePopover(false);

    if (popoverSubmit) {
        popoverSubmit.onclick = () => {
            const container = document.getElementById('studio-criteria-fields-container');
            const inputs = container ? container.querySelectorAll('[data-criteria-field]') : [];
            const updated = [];
            inputs.forEach(inp => {
                const f = inp.getAttribute('data-criteria-field');
                updated.push({ field: f, name: f, value: inp.value });
            });
            togglePopover(false);
            if (typeof onCommit === 'function') {
                onCommit(updated);
            }
        };
    }

    // Expose globally for backward compatibility
    window.renderCriteriaPanel = function(crit, isInit) {
        renderCriteriaPopover(crit, isInit, { contractRegistry, contractSchema });
    };
}
// ============================================================================
// 10. PUBLIC PLATFORM RUNTIME API EXPOSURE
// ============================================================================

window.PlatformRuntime = {
    resolveDatasetKey,
    buildChartJsConfig,
    formatMetricValue,
    getPlatformThemeTokens,
    createChartColorGradient,
    createChassisComponent,
    bindChartInteractiveEvents,
    bindModalEvents,
    formatSubtitleTimestamp,
    formatInputCriteriaDateMask,
    formatIsoToDatetimeLocal,
    mergeCriteriaParameters,
    extractPreDefinedAudits,
    decompressLZString,
    parseUrlHashSpec,
    initFromUrlHash,
    initPlatform,
    initCriteriaPopover
};

// Declares PlatformRuntime in top-level scope to prevent ReferenceError
var PlatformRuntime = window.PlatformRuntime;
