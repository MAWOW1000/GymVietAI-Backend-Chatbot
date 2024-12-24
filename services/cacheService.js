const NodeCache = require('node-cache');

class CacheService {
    constructor() {
        // Cache sẽ hết hạn sau 24 giờ
        this.cache = new NodeCache({ stdTTL: 86400 });
    }

    getChatResponse(message) {
        const key = this._generateKey(message);
        const cached = this.cache.get(key);
        if (cached) {
            return {
                response: cached.response,
                timestamp: cached.timestamp
            };
        }
        return null;
    }

    setChatResponse(message, response) {
        const key = this._generateKey(message);
        this.cache.set(key, {
            response,
            timestamp: new Date().toISOString()
        });
    }

    clearCache() {
        this.cache.flushAll();
    }

    getCacheStats() {
        return {
            keys: this.cache.keys(),
            stats: this.cache.getStats()
        };
    }

    _generateKey(message) {
        // Chuẩn hóa message để làm key
        return message.toLowerCase().trim();
    }
}

module.exports = new CacheService();
