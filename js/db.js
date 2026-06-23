// My Apple Collection — Auteur : Aurélien Moote - Moo - 2026 — Licence MIT
// Database module using sql.js (SQLite in WebAssembly)
const DB = {
    instance: null,
    currentUser: null,

    async init() {
        const SQL = await initSqlJs({
            locateFile: file => `https://sql.js.org/dist/${file}`
        });

        // Try to load existing DB from localStorage
        const saved = localStorage.getItem('apple_collection_db');
        if (saved) {
            const buf = new Uint8Array(JSON.parse(saved));
            this.instance = new SQL.Database(buf);
        } else {
            this.instance = new SQL.Database();
        }

        this.createTables();
        return this;
    },

    createTables() {
        this.instance.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
        `);

        this.instance.run(`
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                model TEXT NOT NULL,
                color TEXT,
                storage TEXT,
                serial_number TEXT,
                date_acquired TEXT,
                date_released TEXT,
                acquisition_mode TEXT,
                status TEXT DEFAULT 'Possédé',
                price_buy REAL,
                price_sell REAL,
                image_url TEXT,
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);

        this.save();
    },

    save() {
        const data = this.instance.export();
        const arr = Array.from(data);
        localStorage.setItem('apple_collection_db', JSON.stringify(arr));
    },

    // --- User Management ---
    register(username, password) {
        if (!username || !password) throw new Error('Pseudo et mot de passe requis');
        if (username.length < 2) throw new Error('Pseudo trop court (min 2 caractères)');
        if (password.length < 3) throw new Error('Mot de passe trop court (min 3 caractères)');

        const existing = this.instance.exec('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0 && existing[0].values.length > 0) {
            throw new Error('Ce pseudo est déjà pris');
        }

        this.instance.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
        this.save();

        const result = this.instance.exec('SELECT id, username FROM users WHERE username = ?', [username]);
        this.currentUser = { id: result[0].values[0][0], username: result[0].values[0][1] };
        return this.currentUser;
    },

    login(username, password) {
        if (!username || !password) throw new Error('Pseudo et mot de passe requis');

        const result = this.instance.exec(
            'SELECT id, username FROM users WHERE username = ? AND password = ?',
            [username, password]
        );

        if (result.length === 0 || result[0].values.length === 0) {
            throw new Error('Pseudo ou mot de passe incorrect');
        }

        this.currentUser = { id: result[0].values[0][0], username: result[0].values[0][1] };
        return this.currentUser;
    },

    logout() {
        this.currentUser = null;
    },

    // --- Device CRUD ---
    addDevice(device) {
        this.instance.run(`
            INSERT INTO devices (user_id, type, model, color, storage, serial_number,
                date_acquired, date_released, acquisition_mode, status,
                price_buy, price_sell, image_url, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            this.currentUser.id,
            device.type, device.model, device.color, device.storage,
            device.serial_number, device.date_acquired, device.date_released,
            device.acquisition_mode, device.status,
            device.price_buy || null, device.price_sell || null,
            device.image_url, device.notes
        ]);
        this.save();
    },

    updateDevice(id, device) {
        this.instance.run(`
            UPDATE devices SET
                type = ?, model = ?, color = ?, storage = ?, serial_number = ?,
                date_acquired = ?, date_released = ?, acquisition_mode = ?, status = ?,
                price_buy = ?, price_sell = ?, image_url = ?, notes = ?,
                updated_at = datetime('now')
            WHERE id = ? AND user_id = ?
        `, [
            device.type, device.model, device.color, device.storage,
            device.serial_number, device.date_acquired, device.date_released,
            device.acquisition_mode, device.status,
            device.price_buy || null, device.price_sell || null,
            device.image_url, device.notes,
            id, this.currentUser.id
        ]);
        this.save();
    },

    deleteDevice(id) {
        this.instance.run('DELETE FROM devices WHERE id = ? AND user_id = ?', [id, this.currentUser.id]);
        this.save();
    },

    getDevices() {
        const result = this.instance.exec(
            'SELECT * FROM devices WHERE user_id = ? ORDER BY date_acquired DESC',
            [this.currentUser.id]
        );
        if (result.length === 0) return [];
        return result[0].values.map(row => {
            const cols = result[0].columns;
            const obj = {};
            cols.forEach((col, i) => obj[col] = row[i]);
            return obj;
        });
    },

    getDevice(id) {
        const result = this.instance.exec(
            'SELECT * FROM devices WHERE id = ? AND user_id = ?',
            [id, this.currentUser.id]
        );
        if (result.length === 0 || result[0].values.length === 0) return null;
        const cols = result[0].columns;
        const obj = {};
        cols.forEach((col, i) => obj[col] = result[0].values[0][i]);
        return obj;
    },

    // --- Stats ---
    getStats() {
        const devices = this.getDevices();
        const total = devices.length;
        const stillOwned = devices.filter(d => d.status === 'Possédé').length;
        const totalSpent = devices.reduce((sum, d) => sum + (d.price_buy || 0), 0);
        const totalRecovered = devices.reduce((sum, d) => sum + (d.price_sell || 0), 0);

        // Count by type
        const byType = {};
        devices.forEach(d => {
            byType[d.type] = (byType[d.type] || 0) + 1;
        });

        // Average ownership duration (in months)
        let totalMonths = 0;
        let countWithDates = 0;
        devices.forEach(d => {
            if (d.date_acquired) {
                const start = new Date(d.date_acquired);
                const end = d.date_released ? new Date(d.date_released) : new Date();
                const months = (end - start) / (1000 * 60 * 60 * 24 * 30.44);
                if (months >= 0) {
                    totalMonths += months;
                    countWithDates++;
                }
            }
        });
        const avgOwnership = countWithDates > 0 ? Math.round(totalMonths / countWithDates) : 0;

        // By acquisition mode
        const byAcquisition = {};
        devices.forEach(d => {
            if (d.acquisition_mode) {
                byAcquisition[d.acquisition_mode] = (byAcquisition[d.acquisition_mode] || 0) + 1;
            }
        });

        // By status
        const byStatus = {};
        devices.forEach(d => {
            byStatus[d.status] = (byStatus[d.status] || 0) + 1;
        });

        return {
            total, stillOwned, totalSpent, totalRecovered,
            netCost: totalSpent - totalRecovered,
            byType, avgOwnership, byAcquisition, byStatus
        };
    },

    // --- Export / Import ---
    exportData() {
        const devices = this.getDevices();
        return JSON.stringify({
            version: 1,
            exportDate: new Date().toISOString(),
            user: this.currentUser.username,
            devices
        }, null, 2);
    },

    importData(jsonString) {
        const data = JSON.parse(jsonString);
        if (!data.devices || !Array.isArray(data.devices)) {
            throw new Error('Format de fichier invalide');
        }

        let imported = 0;
        data.devices.forEach(d => {
            this.addDevice({
                type: d.type,
                model: d.model,
                color: d.color || '',
                storage: d.storage || '',
                serial_number: d.serial_number || '',
                date_acquired: d.date_acquired || '',
                date_released: d.date_released || '',
                acquisition_mode: d.acquisition_mode || '',
                status: d.status || 'Possédé',
                price_buy: d.price_buy || null,
                price_sell: d.price_sell || null,
                image_url: d.image_url || '',
                notes: d.notes || ''
            });
            imported++;
        });

        return imported;
    }
};
