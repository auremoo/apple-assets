// My Apple Collection — Auteur : Aurélien Moote - Moo - 2026 — Licence MIT
// ===== App Controller =====
const App = {
    currentView: 'collection',

    async init() {
        await DB.init();
        this.bindEvents();
        this.renderCurrentView();
    },

    // --- Events ---
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        // Add device
        document.getElementById('btn-add-device').addEventListener('click', () => this.openDeviceModal());

        // Modal close
        document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
            el.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Device form
        document.getElementById('device-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDevice();
        });
        [['device-type', 'change'], ['device-model', 'input'], ['device-color', 'input'],
         ['device-date-acquired', 'input'], ['device-acquisition', 'change'],
         ['device-date-released', 'input']].forEach(([id, evt]) => {
            document.getElementById(id).addEventListener(evt, (e) => e.target.classList.remove('invalid'));
        });
        document.getElementById('device-status').addEventListener('change', () => this.updateReleaseDateRequirement());
        this.setupDatePrecisionToggle('device-date-acquired', 'device-date-acquired-imprecise');
        this.setupDatePrecisionToggle('device-date-released', 'device-date-released-imprecise');

        // Delete device
        document.getElementById('btn-delete-device').addEventListener('click', () => this.deleteDevice());

        // Export / Import
        document.getElementById('btn-export').addEventListener('click', () => this.exportData());
        document.getElementById('btn-import').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', (e) => this.importData(e));

        // DataSafe
        document.getElementById('btn-datasafe').addEventListener('click', () => this.openDataSafeModal());
        document.getElementById('datasafe-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDataSafeConfig();
        });
        document.getElementById('btn-datasafe-disable').addEventListener('click', () => this.disableDataSafe());

        // Close modal on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    },

    // --- Navigation ---
    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`).classList.add('active');
        this.renderCurrentView();
    },

    renderCurrentView() {
        switch (this.currentView) {
            case 'collection': this.renderCollection(); break;
            case 'timeline': this.renderTimeline(); break;
            case 'stats': this.renderStats(); break;
        }
    },

    // --- Device Type Emoji ---
    getDeviceEmoji(type) {
        const emojis = {
            'iPhone': '📱', 'iPad': '📱', 'Mac': '🖥️', 'MacBook': '💻',
            'Apple Watch': '⌚', 'AirPods': '🎧', 'iPod': '🎵',
            'Apple TV': '📺', 'HomePod': '🔊', 'Apple Vision Pro': '🥽',
            'Accessoire': '🔌', 'Autre': '🍎'
        };
        return emojis[type] || '🍎';
    },

    getStatusClass(status) {
        const classes = {
            'Possédé': 'status-owned', 'Revendu': 'status-sold',
            'Donné': 'status-given', 'Échangé': 'status-traded',
            'Cassé': 'status-broken', 'Perdu': 'status-lost'
        };
        return classes[status] || '';
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    },

    formatPrice(price) {
        if (!price) return '';
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
    },

    // --- Collection View ---
    renderCollection() {
        const container = document.getElementById('view-collection');
        const devices = DB.getDevices();

        if (devices.length === 0) {
            container.innerHTML = `
                <div class="collection-empty">
                    <svg viewBox="0 0 814 1000" fill="currentColor" opacity="0.15">
                        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57.8-155.5-127.4c-58.3-81.3-105.9-207.6-105.9-328.5 0-193.2 125.5-295.8 249.1-295.8 65.6 0 120.3 43.1 161.4 43.1 39.1 0 100.1-45.7 174.5-45.7 28.2 0 129.5 2.6 196.5 99.3z"/>
                        <path d="M554.1 0c8.5 49.5-14.3 99-46.4 134.8-32.1 35.8-84.7 63.5-136.2 59.8-10.2-47.4 16.4-99 46.4-130.3C449.8 29.5 508.1 3.9 554.1 0z"/>
                    </svg>
                    <h3>Aucun appareil</h3>
                    <p>Cliquez sur + pour ajouter votre premier appareil Apple</p>
                </div>`;
            return;
        }

        const cards = devices.map(d => {
            const imageHtml = d.image_url
                ? `<img class="device-card-image" src="${this.escapeHtml(d.image_url)}" alt="${this.escapeHtml(d.model)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : '';
            const placeholderStyle = d.image_url ? 'style="display:none"' : '';

            const tags = [];
            if (d.color) tags.push(d.color);
            if (d.storage) tags.push(d.storage);
            if (d.acquisition_mode) tags.push(d.acquisition_mode);

            const dateRange = [];
            if (d.date_acquired) dateRange.push(this.formatDate(d.date_acquired));
            if (d.date_released) dateRange.push(this.formatDate(d.date_released));

            return `
                <div class="device-card" data-id="${d.id}">
                    <span class="device-status-badge ${this.getStatusClass(d.status)}">${this.escapeHtml(d.status)}</span>
                    ${imageHtml}
                    <div class="device-card-placeholder" ${placeholderStyle}>${this.getDeviceEmoji(d.type)}</div>
                    <div class="device-card-type">${this.escapeHtml(d.type)}</div>
                    <div class="device-card-model">${this.escapeHtml(d.model)}</div>
                    ${tags.length ? `<div class="device-card-details">${tags.map(t => `<span class="device-tag">${this.escapeHtml(t)}</span>`).join('')}</div>` : ''}
                    ${d.price_buy ? `<div class="device-card-dates">${this.formatPrice(d.price_buy)}</div>` : ''}
                    ${dateRange.length ? `<div class="device-card-dates">${dateRange.join(' → ')}</div>` : ''}
                </div>`;
        }).join('');

        container.innerHTML = `<div class="collection-grid">${cards}</div>`;

        // Click to edit
        container.querySelectorAll('.device-card').forEach(card => {
            card.addEventListener('click', () => {
                this.openDeviceModal(parseInt(card.dataset.id));
            });
        });
    },

    // --- Timeline View ---
    renderTimeline() {
        const container = document.getElementById('view-timeline');
        const devices = DB.getDevices();

        // Sort by date_acquired ascending
        const sorted = [...devices].sort((a, b) => {
            const da = a.date_acquired || '9999';
            const db = b.date_acquired || '9999';
            return da.localeCompare(db);
        });

        if (sorted.length === 0) {
            container.innerHTML = `
                <div class="collection-empty">
                    <h3>Timeline vide</h3>
                    <p>Ajoutez des appareils pour voir votre timeline</p>
                </div>`;
            return;
        }

        const items = sorted.map(d => {
            const isActive = d.status === 'Possédé';
            const dateRange = [];
            if (d.date_acquired) dateRange.push(this.formatDate(d.date_acquired));
            if (d.date_released) dateRange.push(this.formatDate(d.date_released));
            else if (isActive) dateRange.push("aujourd'hui");

            const meta = [];
            if (d.color) meta.push(d.color);
            if (d.storage) meta.push(d.storage);
            if (d.price_buy) meta.push(this.formatPrice(d.price_buy));

            return `
                <div class="timeline-item" data-id="${d.id}">
                    <div class="timeline-dot ${isActive ? '' : 'inactive'}"></div>
                    <div class="timeline-card">
                        <div class="timeline-year">${dateRange.join(' → ') || 'Date inconnue'}</div>
                        <div class="timeline-model">${this.getDeviceEmoji(d.type)} ${this.escapeHtml(d.model)}</div>
                        <div class="timeline-meta">${meta.map(m => this.escapeHtml(m)).join(' · ')}</div>
                        ${d.notes ? `<div class="timeline-meta" style="margin-top:4px;font-style:italic">"${this.escapeHtml(d.notes)}"</div>` : ''}
                    </div>
                </div>`;
        }).join('');

        container.innerHTML = `<div class="timeline">${items}</div>`;

        container.querySelectorAll('.timeline-item').forEach(item => {
            item.addEventListener('click', () => {
                this.openDeviceModal(parseInt(item.dataset.id));
            });
        });
    },

    // --- Stats View ---
    renderStats() {
        const container = document.getElementById('view-stats');
        const stats = DB.getStats();

        if (stats.total === 0) {
            container.innerHTML = `
                <div class="stats-empty">
                    <h3>Pas encore de stats</h3>
                    <p>Ajoutez des appareils pour voir vos statistiques</p>
                </div>`;
            return;
        }

        const buildBarChart = (data, total) => {
            return Object.entries(data)
                .sort((a, b) => b[1] - a[1])
                .map(([label, count]) => {
                    const pct = Math.round((count / total) * 100);
                    return `
                        <div class="bar-row">
                            <div class="bar-label">${this.escapeHtml(label)}</div>
                            <div class="bar-track">
                                <div class="bar-fill" style="width: ${Math.max(pct, 8)}%">${count}</div>
                            </div>
                        </div>`;
                }).join('');
        };

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Appareils au total</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.stillOwned}</div>
                    <div class="stat-label">Encore possédés</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.formatPrice(stats.totalSpent)}</div>
                    <div class="stat-label">Total dépensé</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.formatPrice(stats.totalRecovered)}</div>
                    <div class="stat-label">Total récupéré</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.formatPrice(stats.netCost)}</div>
                    <div class="stat-label">Coût net</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.avgOwnership}</div>
                    <div class="stat-label">Mois de possession (moy.)</div>
                </div>
            </div>

            ${Object.keys(stats.byType).length ? `
            <div class="stats-section">
                <h3>Par type d'appareil</h3>
                <div class="bar-chart">${buildBarChart(stats.byType, stats.total)}</div>
            </div>` : ''}

            ${Object.keys(stats.byStatus).length ? `
            <div class="stats-section">
                <h3>Par statut</h3>
                <div class="bar-chart">${buildBarChart(stats.byStatus, stats.total)}</div>
            </div>` : ''}

            ${Object.keys(stats.byAcquisition).length ? `
            <div class="stats-section">
                <h3>Par mode d'acquisition</h3>
                <div class="bar-chart">${buildBarChart(stats.byAcquisition, stats.total)}</div>
            </div>` : ''}
        `;
    },

    // --- Device Modal ---
    openDeviceModal(deviceId = null) {
        const modal = document.getElementById('device-modal');
        const form = document.getElementById('device-form');
        const title = document.getElementById('modal-title');
        const deleteBtn = document.getElementById('btn-delete-device');

        form.reset();
        document.getElementById('device-id').value = '';
        ['device-type', 'device-model', 'device-color', 'device-date-acquired',
         'device-acquisition', 'device-date-released'].forEach(id => {
            document.getElementById(id).classList.remove('invalid');
        });
        this.applyDateValue('device-date-acquired', 'device-date-acquired-imprecise', '');
        this.applyDateValue('device-date-released', 'device-date-released-imprecise', '');

        if (deviceId) {
            const device = DB.getDevice(deviceId);
            if (!device) return;

            title.textContent = 'Modifier l\'appareil';
            deleteBtn.style.display = 'block';
            document.getElementById('device-id').value = device.id;
            document.getElementById('device-type').value = device.type || '';
            document.getElementById('device-model').value = device.model || '';
            document.getElementById('device-color').value = device.color || '';
            document.getElementById('device-storage').value = device.storage || '';
            document.getElementById('device-serial').value = device.serial_number || '';
            this.applyDateValue('device-date-acquired', 'device-date-acquired-imprecise', device.date_acquired || '');
            this.applyDateValue('device-date-released', 'device-date-released-imprecise', device.date_released || '');
            document.getElementById('device-acquisition').value = device.acquisition_mode || '';
            document.getElementById('device-status').value = device.status || 'Possédé';
            document.getElementById('device-price-buy').value = device.price_buy || '';
            document.getElementById('device-price-sell').value = device.price_sell || '';
            document.getElementById('device-image').value = device.image_url || '';
            document.getElementById('device-notes').value = device.notes || '';
        } else {
            title.textContent = 'Ajouter un appareil';
            deleteBtn.style.display = 'none';
        }

        this.updateReleaseDateRequirement();
        modal.classList.add('active');
    },

    // Un input type="date" affiche AAAA-MM-JJ ; type="month" affiche AAAA-MM
    // pour les dates dont on ne connaît que le mois.
    applyDateValue(inputId, checkboxId, value) {
        const input = document.getElementById(inputId);
        const checkbox = document.getElementById(checkboxId);
        const isMonthOnly = value.length === 7;
        checkbox.checked = isMonthOnly;
        input.type = isMonthOnly ? 'month' : 'date';
        input.value = value;
    },

    setupDatePrecisionToggle(inputId, checkboxId) {
        const input = document.getElementById(inputId);
        const checkbox = document.getElementById(checkboxId);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                input.type = 'month';
                if (input.value.length === 10) input.value = input.value.slice(0, 7);
            } else {
                input.type = 'date';
            }
        });
    },

    // La date de cession est obligatoire tant que l'appareil n'est plus possédé.
    updateReleaseDateRequirement() {
        const status = document.getElementById('device-status').value;
        const releasedInput = document.getElementById('device-date-released');
        const requiredMark = document.getElementById('date-released-required-mark');
        const isRequired = status !== 'Possédé';
        releasedInput.required = isRequired;
        requiredMark.style.display = isRequired ? '' : 'none';
        if (!isRequired) releasedInput.classList.remove('invalid');
    },

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
        } else {
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        }
    },

    saveDevice() {
        const typeEl = document.getElementById('device-type');
        const modelEl = document.getElementById('device-model');
        const colorEl = document.getElementById('device-color');
        const acquiredEl = document.getElementById('device-date-acquired');
        const acquisitionEl = document.getElementById('device-acquisition');
        const releasedEl = document.getElementById('device-date-released');
        const requiredFields = [typeEl, modelEl, colorEl, acquiredEl, acquisitionEl, releasedEl];
        requiredFields.forEach(el => el.classList.remove('invalid'));

        let firstInvalid = null;
        requiredFields.forEach(el => {
            if (el === releasedEl && !releasedEl.required) return;
            if (!el.value.trim()) {
                el.classList.add('invalid');
                firstInvalid = firstInvalid || el;
            }
        });
        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }

        const id = document.getElementById('device-id').value;
        const device = {
            type: typeEl.value,
            model: modelEl.value,
            color: colorEl.value,
            storage: document.getElementById('device-storage').value,
            serial_number: document.getElementById('device-serial').value,
            date_acquired: acquiredEl.value,
            date_released: releasedEl.value,
            acquisition_mode: acquisitionEl.value,
            status: document.getElementById('device-status').value,
            price_buy: parseFloat(document.getElementById('device-price-buy').value) || null,
            price_sell: parseFloat(document.getElementById('device-price-sell').value) || null,
            image_url: document.getElementById('device-image').value,
            notes: document.getElementById('device-notes').value
        };

        try {
            if (id) {
                DB.updateDevice(parseInt(id), device);
            } else {
                DB.addDevice(device);
            }
        } catch (err) {
            console.error('saveDevice failed:', err);
            alert('Erreur lors de l\'enregistrement : ' + err.message);
            return;
        }

        this.closeModal();
        this.renderCurrentView();
        DataSafe.push(DB.getDevices());
    },

    deleteDevice() {
        const id = document.getElementById('device-id').value;
        if (!id) return;

        if (confirm('Supprimer cet appareil ?')) {
            DB.deleteDevice(parseInt(id));
            this.closeModal();
            this.renderCurrentView();
            DataSafe.push(DB.getDevices());
        }
    },

    // --- Export / Import ---
    // Sauvegarde le JSON vers DataSafe si configuré, sinon le télécharge
    // localement. En cas d'échec réseau vers DataSafe, on retombe sur le
    // téléchargement local plutôt que de perdre la sauvegarde.
    async exportData() {
        if (DataSafe.isConfigured()) {
            const result = await DataSafe.push(DB.getDevices());
            if (result && result.success) {
                this.showToast('☁️ Sauvegardé sur DataSafe');
                return;
            }
            this.downloadLocalBackup();
            this.showToast('⚠️ DataSafe indisponible — sauvegarde locale');
            return;
        }
        this.downloadLocalBackup();
        this.showToast('💾 Sauvegardé en local');
    },

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('visible');
        clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2500);
    },

    downloadLocalBackup() {
        const payload = DataSafe.buildPayload(DB.getDevices());
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `apple-collection-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const raw = e.target.result;
                const count = DB.importData(raw);
                try {
                    DataSafe.restoreConfigFromPayload(JSON.parse(raw));
                } catch { /* pas de bloc _datasafe valide, on ignore */ }
                alert(`${count} appareil(s) importé(s) avec succès !`);
                this.renderCurrentView();
                DataSafe.push(DB.getDevices());
            } catch (err) {
                alert('Erreur lors de l\'import : ' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    // --- DataSafe ---
    openDataSafeModal() {
        const config = DataSafe.getConfig() || {};
        document.getElementById('datasafe-url').value = config.url || '';
        document.getElementById('datasafe-key').value = config.apiKey || '';
        document.getElementById('datasafe-appname').value = config.appName || 'my-apple-collection';

        const status = document.getElementById('datasafe-status');
        status.className = 'datasafe-status';
        status.textContent = DataSafe.isConfigured()
            ? 'Sauvegarde automatique active.'
            : 'Non configuré : les données ne sont sauvegardées que localement.';

        document.getElementById('datasafe-modal').classList.add('active');
    },

    async saveDataSafeConfig() {
        const url = document.getElementById('datasafe-url').value.trim();
        const apiKey = document.getElementById('datasafe-key').value.trim();
        const appName = document.getElementById('datasafe-appname').value.trim() || 'my-apple-collection';
        const status = document.getElementById('datasafe-status');

        if (!url || !apiKey) {
            status.className = 'datasafe-status error';
            status.textContent = 'URL et clé API requises.';
            return;
        }

        DataSafe.setConfig({ url, apiKey, appName });

        status.className = 'datasafe-status';
        status.textContent = 'Test de connexion...';
        const result = await DataSafe.push(DB.getDevices());

        if (result && result.success) {
            status.className = 'datasafe-status success';
            status.textContent = `Connecté (${result.versions ?? '?'} version(s) sauvegardée(s)).`;
        } else {
            status.className = 'datasafe-status error';
            status.textContent = 'Configuration enregistrée, mais le test de connexion a échoué. Nouvelle tentative à la prochaine modification.';
        }
    },

    disableDataSafe() {
        DataSafe.clearConfig();
        this.closeModal();
    },

    // --- Utility ---
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
