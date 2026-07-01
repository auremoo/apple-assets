// My Apple Collection — Auteur : Aurélien Moote - Moo - 2026 — Licence MIT
// ===== DataSafe backup =====
// Config (URL, clé API, nom d'app) saisie par l'utilisateur et stockée dans
// son localStorage, jamais codée en dur dans le code source. Si configurée,
// elle est aussi embarquée dans le bloc _datasafe des sauvegardes JSON
// (push et téléchargement local) pour qu'un réimport restaure automatiquement
// la config et permette de repousser sans tout ressaisir.
const DataSafe = {
    CONFIG_KEY: 'apple_collection_datasafe_config',

    getConfig() {
        try {
            const raw = localStorage.getItem(this.CONFIG_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },

    setConfig(config) {
        localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
    },

    clearConfig() {
        localStorage.removeItem(this.CONFIG_KEY);
    },

    isConfigured() {
        const c = this.getConfig();
        return !!(c && c.url && c.apiKey);
    },

    // Construit le JSON de sauvegarde (utilisé pour le push et le
    // téléchargement local). Inclut le bloc _datasafe si configuré, pour
    // que le fichier soit auto-portant.
    buildPayload(devices) {
        const config = this.getConfig();
        const payload = {
            version: 1,
            exportDate: new Date().toISOString(),
            devices
        };
        if (config && config.url && config.apiKey) {
            payload._datasafe = {
                apiKey: config.apiKey,
                url: config.url,
                appName: config.appName || 'my-apple-collection'
            };
        }
        return payload;
    },

    // Si le JSON réimporté contient un bloc _datasafe, restaure la config
    // localement pour que les prochains push repartent sans reconfiguration.
    restoreConfigFromPayload(data) {
        if (data && data._datasafe && data._datasafe.url && data._datasafe.apiKey) {
            this.setConfig(data._datasafe);
            return true;
        }
        return false;
    },

    // Envoie les données vers DataSafe. Échoue silencieusement : un souci
    // réseau ne doit jamais bloquer ou perturber l'usage de l'app.
    async push(devices) {
        const config = this.getConfig();
        if (!config || !config.url || !config.apiKey) return null;

        const payload = this.buildPayload(devices);

        try {
            const res = await fetch(config.url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'X-App-Name': config.appName || 'my-apple-collection',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                console.warn('DataSafe: échec du push', res.status);
                return null;
            }
            return await res.json();
        } catch (err) {
            console.warn('DataSafe: erreur réseau', err.message);
            return null;
        }
    }
};
