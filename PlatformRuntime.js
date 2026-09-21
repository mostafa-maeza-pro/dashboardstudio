/**
 * PlatformRuntime.js V1.11
 * Core Boilerplate and UI Chassis Engine for Calypso Dashboard Studio
 */

// ============================================================================
// 1. LIFECYCLE & IDENTITY UTILITIES
// ============================================================================

function initializeThemeDefault() { 
    document.body.classList.add('dark-mode'); 
    window.dashboardInitialTheme = 'dark'; 
}

function extractInitials(name) { 
    return name ? name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : '--'; 
}

// ============================================================================
// 2. DATE FORMATTING & SANITIZATION UTILITIES
// ============================================================================

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
    return dateStr; 
}

function formatIsoToDatetimeLocal(dateStr) {
    if (!dateStr) return "";
    const cleanStr = String(dateStr).replace(/\//g, '-');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============================================================================
// 3. UI CHASSIS COMPILATION FACTORY
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
// 4. CHART RESPONSIVENESS & INTERACTION BINDINGS
// ============================================================================

function bindChartInteractiveEvents() { 
    // Tooltip Handling
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
    
    // Dataset vs Visual Toggle Switch Handling (Global Event Delegation)
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
// 5. MODAL ZOOM, DRAG & RESIZE SYSTEM
// ============================================================================

let activeModalChartInstance = null;

function makeModalDraggableAndResizable(modalContainer, dragHandle) {
    if (!modalContainer || !dragHandle || modalContainer.dataset.draggableBound) return;
    modalContainer.dataset.draggableBound = "true";

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

            modalContainer.style.top = (modalContainer.offsetTop - pos2) + "px";
            modalContainer.style.left = (modalContainer.offsetLeft - pos1) + "px";
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

        const titleText = chassis.querySelector('.ui-chassis-title')?.textContent || 'Chart View';
        if (modalTitle) modalTitle.textContent = titleText;

        if (activeModalChartInstance) {
            activeModalChartInstance.destroy();
            activeModalChartInstance = null;
        }

        const bodyContent = chassis.querySelector('.ui-chassis-body');
        if (!bodyContent) return;
        modalBody.innerHTML = bodyContent.innerHTML;

        // 1. Capture the active view state ('visual' or 'dataset') from the originating card
        const cardActiveBtn = chassis.querySelector('.ui-chassis-view-switch .chassis-switch-btn.active');
        const activeView = cardActiveBtn ? cardActiveBtn.getAttribute('data-view') : 'visual';

        // 2. Synchronize button highlight state in the modal header (#modalViewSwitch)
        const modalHeaderSwitch = modal.querySelector('#modalViewSwitch');
        if (modalHeaderSwitch) {
            modalHeaderSwitch.querySelectorAll('.chassis-switch-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-view') === activeView);
            });
        }

        // 3. Ensure modal body panels match activeView
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

        // Re-attach switch event listeners for inner chassis content
        bindChartInteractiveEvents();

        const modalCanvas = modalBody.querySelector('canvas');
        const origChart = getChartInstanceFn ? getChartInstanceFn(targetId) : null;

        if (modalCanvas && origChart) {
            modalCanvas.id = targetId + '_modal_canvas';
            try {
                const rawConfig = origChart.config;
                const modalData = {
                    labels: rawConfig.data.labels ? [...rawConfig.data.labels] : [],
                    datasets: rawConfig.data.datasets.map(ds => ({
                        ...ds,
                        data: ds.data ? [...ds.data] : []
                    }))
                };
                const modalOptions = {
                    ...(rawConfig.options || {}),
                    responsive: true,
                    maintainAspectRatio: false
                };

                activeModalChartInstance = new Chart(modalCanvas.getContext('2d'), {
                    type: rawConfig.type,
                    data: modalData,
                    options: modalOptions
                });
            } catch (err) {
                console.error("Modal chart creation error:", err);
            }
        }
    });
}

// ============================================================================
// 6. GLOBAL HEADER & THEME INTERACTION ENGINE
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
            const isLight = document.body.classList.toggle('light-mode');
            document.body.classList.toggle('dark-mode', !isLight);
        }
    });
});

// ============================================================================
// 7. GLOBAL IFRAME THEME CONTROL API
// ============================================================================

window.setDashboardTheme = function(mode = 'toggle') {
    if (mode === 'light') {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    } else if (mode === 'dark') {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    } else {
        const isLight = document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode', !isLight);
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
