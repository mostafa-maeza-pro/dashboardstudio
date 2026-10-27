/**
 * PlatformRuntime.js V2.0
 * Universal Financial UI Chassis & High-Impact Charting Engine
 * Calypso Dashboard Studio
 *
 * Core Capabilities:
 * - 100% Generic & Domain-Agnostic: Works seamlessly across Ledgers, Trades, Balances, Cash Flows & Risk
 * - Chart.js Advanced Engine: Combo charts, dual-scale axes (y / y1), stacked horizons, gradient area fills, bezier smoothing
 * - Context-Aware Formatting: Automatic unit scaling ($M, $B, %, bps), dark/light theme reactive tokens
 * - Interactive Chassis & Modals: Drag, resize, smooth view toggling (Visual vs Dataset), and 1.2x zoomed modal recreation
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

function getPlatformThemeTokens() {
    const isLight = document.body.classList.contains('light-mode');
    return {
        isLight,
        textColor: isLight ? '#2d3748' : '#e2e8f0',
        textMuted: isLight ? '#718096' : '#94a3b8',
        gridColor: isLight ? 'rgba(226, 232, 240, 0.8)' : 'rgba(51, 65, 85, 0.4)',
        borderColor: isLight ? '#cbd5e1' : '#334155',
        palette: [
            '#3b82f6', // Sapphire Blue
            '#10b981', // Emerald Green
            '#f59e0b', // Amber
            '#8b5cf6', // Violet
            '#ec4899', // Pink / Magenta
            '#06b6d4', // Cyan
            '#f97316', // Orange
            '#14b8a6', // Teal
            '#6366f1'  // Indigo
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
    const style = formatSpec.style || 'number';
    const currency = formatSpec.currency || 'USD';
    const compact = formatSpec.compact ?? (Math.abs(num) >= 1000000);

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
    const cleanStr = String(dateStr).replace(/\//g, '-');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============================================================================
// 3. ADVANCED GENERIC CHART.JS SPECIFICATION FACTORY
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

/**
 * Builds a complete Chart.js configuration object from the declarative JSON specification.
 * Supports: Combo (Bar + Line), Dual Scales (y & y1), Stacked axes, Area Gradients & Radial charts.
 */
function buildChartJsConfig(chartSpec, labels, seriesDataMap, canvasCtx = null) {
    const tokens = getPlatformThemeTokens();
    const isCombo = chartSpec.type === 'combo';
    const rootType = isCombo ? 'bar' : (chartSpec.type || 'bar');
    const isRadial = rootType === 'doughnut' || rootType === 'pie' || rootType === 'polarArea' || rootType === 'radar';
    const isHorizontal = chartSpec.indexAxis === 'y';

    // 1. Build Datasets
    const datasets = chartSpec.series.map((s, idx) => {
        const baseColor = s.color || tokens.palette[idx % tokens.palette.length];
        const seriesType = s.type || (isCombo ? 'bar' : rootType);
        const yAxisID = s.yAxisID || 'y';
        const isLine = seriesType === 'line';

        let backgroundColor;
        if (isRadial) {
            backgroundColor = tokens.palette.slice(0, labels.length);
        } else if (isLine && s.fill) {
            backgroundColor = canvasCtx ? createChartColorGradient(canvasCtx, baseColor, 0.3, 0.01) : hexToRgba(baseColor, 0.2);
        } else if (isLine) {
            backgroundColor = baseColor;
        } else {
            backgroundColor = hexToRgba(baseColor, 0.85);
        }

        return {
            type: seriesType,
            label: s.label || s.field,
            data: seriesDataMap[s.field] || [],
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
            borderDash: s.borderDash || undefined
        };
    });

    // 2. Build Universal Scaled Axes
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

        const primaryScaleDef = chartSpec.scales?.[primaryValAxisKey] || {};
        scales[primaryValAxisKey] = {
            position: primaryScaleDef.position || (isHorizontal ? 'bottom' : 'left'),
            stacked: chartSpec.stacked || false,
            grid: {
                color: tokens.gridColor,
                drawBorder: false
            },
            ticks: {
                color: tokens.textMuted,
                font: { size: 11, family: 'Inter, system-ui, sans-serif' },
                callback: function(value) {
                    return formatMetricValue(value, primaryScaleDef.format || { compact: true });
                }
            },
            title: primaryScaleDef.title ? {
                display: true,
                text: primaryScaleDef.title,
                color: tokens.textMuted,
                font: { size: 11, weight: '500' }
            } : undefined
        };

        // Dual Axis Support (y1 or x1)
        const secondaryValAxisKey = isHorizontal ? 'x1' : 'y1';
        if (chartSpec.scales?.[secondaryValAxisKey]) {
            const secondaryScaleDef = chartSpec.scales[secondaryValAxisKey];
            scales[secondaryValAxisKey] = {
                position: secondaryScaleDef.position || (isHorizontal ? 'top' : 'right'),
                grid: {
                    drawOnChartArea: secondaryScaleDef.grid ?? false,
                    color: tokens.gridColor
                },
                ticks: {
                    color: tokens.textMuted,
                    font: { size: 11, family: 'Inter, system-ui, sans-serif' },
                    callback: function(value) {
                        return formatMetricValue(value, secondaryScaleDef.format || { compact: true });
                    }
                },
                title: secondaryScaleDef.title ? {
                    display: true,
                    text: secondaryScaleDef.title,
                    color: tokens.textMuted,
                    font: { size: 11, weight: '500' }
                } : undefined
            };
        }
    }

    // 3. Assemble Options & Intelligent Interaction Tooltips
    return {
        type: rootType,
        data: { labels, datasets },
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
                    display: isRadial || chartSpec.series.length > 1,
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
                            const scaleDef = chartSpec.scales?.[yAxisID] || {};
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
// 4. UI CHASSIS COMPILATION FACTORY
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
// 5. CHART INTERACTIVE EVENTS (TOOLTIPS & VIEW TOGGLING)
// ============================================================================

function bindChartInteractiveEvents() { 
    // Custom SVG / Heatmap Tooltip handling
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
    
    // Dataset vs Visual Toggle Switch (Card & Modal Scopes)
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
// 6. MODAL ZOOM, DRAG & ADVANCED CHART RECONSTRUCTION ENGINE
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

        // Enlargement scaling: 1.2x proportional expansion
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

        // Synchronize switch view state
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

        // Advanced Chart Recreation with Multi-Scale & Combo Support Preserved
        const modalCanvas = modalBody.querySelector('canvas');
        const origChart = getChartInstanceFn ? getChartInstanceFn(targetId) : null;

        if (modalCanvas && origChart) {
            modalCanvas.id = targetId + '_modal_canvas';
            try {
                const rawConfig = origChart.config;
                const modalCtx = modalCanvas.getContext('2d');
                
                // Deep copy datasets preserving complex visual attributes
                const modalDatasets = rawConfig.data.datasets.map(ds => {
                    const cloned = { ...ds, data: ds.data ? [...ds.data] : [] };
                    // Rehydrate linear gradient if filled line
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
// 7. GLOBAL HEADER & THEME INTERACTION ENGINE
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

// ============================================================================
// 8. GLOBAL IFRAME & THEME CONTROL API
// ============================================================================

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

    // Notify registered charts of palette & theme shifts
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
            } catch (err) {
                // Ignore instances mid-destruction
            }
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

/**
 * Built-in standalone LZString URI decompressor fallback.
 * Decodes URI-safe compressed payloads without requiring external CDN bundles.
 */
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

/**
 * Parses either a compressed (#lz=) or URI-encoded (#spec=) JSON AST from the window location hash.
 */
function parseUrlHashSpec() {
    const hash = window.location.hash;
    if (!hash || hash.length < 5) return null;

    try {
        let spec = null;
        if (hash.startsWith('#lz=')) {
            const raw = hash.slice(4);
            const jsonStr = decompressLZString(raw);
            if (jsonStr) {
                spec = JSON.parse(jsonStr);
            }
        } else if (hash.startsWith('#spec=')) {
            const raw = decodeURIComponent(hash.slice(6));
            spec = JSON.parse(raw);
        }
        return spec;
    } catch (e) {
        console.error('[PlatformRuntime] Error parsing specification from URL hash:', e);
        return null;
    }
}

/**
 * Automates specification extraction and dispatches hydration to workspace.html.
 */
function initFromUrlHash() {
    const spec = parseUrlHashSpec();
    if (!spec) return null;

    console.log(`[PlatformRuntime] Hydrating AST from URL Hash: ${spec.metadata?.dashboardId || spec.metadata?.title || 'custom'}`);

    window.dashboardSpec = spec;
    window.activeDashboardSpec = spec;

    // 1. Invoke standard workspace runtime hydration callbacks if defined
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

    // 2. Broadcast custom events for decoupled UI frameworks
    window.dispatchEvent(new CustomEvent('dashboard:spec-loaded', { detail: spec }));
    window.dispatchEvent(new CustomEvent('calypso:load-spec', { detail: spec }));

    // 3. Fallback: Prefill input/modal textarea and trigger submit if present in DOM
    const specInput = document.getElementById('aiSpecInput') || 
                      document.getElementById('specInput') || 
                      document.querySelector('textarea.spec-input, textarea[data-spec-input]');
    if (specInput) {
        specInput.value = JSON.stringify(spec, null, 2);
        specInput.dispatchEvent(new Event('input', { bubbles: true }));
        specInput.dispatchEvent(new Event('change', { bubbles: true }));

        const applyBtn = document.getElementById('applySpecBtn') || 
                         document.getElementById('btnApplySpec') || 
                         document.getElementById('loadSpecBtn') ||
                         document.querySelector('.apply-spec-btn, button[data-apply-spec]');
        if (applyBtn && !applyBtn.disabled) {
            applyBtn.click();
        }
    }

    return spec;
}

// Auto-bootstrap from hash on DOM ready and on hashchange
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
// 10. PUBLIC PLATFORM RUNTIME API EXPOSURE
// ============================================================================

window.PlatformRuntime = {
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
    decompressLZString,
    parseUrlHashSpec,
    initFromUrlHash
};
