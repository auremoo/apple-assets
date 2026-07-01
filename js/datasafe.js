// My Apple Collection — Auteur : Aurélien Moote - Moo - 2026 — Licence MIT
// ===== DataSafe backup =====
// Config (URL, clé API, nom d'app) saisie par l'utilisateur et stockée
// uniquement dans son localStorage : jamais dans le code source, jamais
// dans les fichiers JSON exportés/importés.
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

    // Envoie les données vers DataSafe. Échoue silencieusement : un souci
    // réseau ne doit jamais bloquer ou perturber l'usage de l'app.
    async push(devices) {
        const config = this.getConfig();
        if (!config || !config.url || !config.apiKey) return null;

        const payload = {
            version: 1,
            exportDate: new Date().toISOString(),
            devices
        };

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
