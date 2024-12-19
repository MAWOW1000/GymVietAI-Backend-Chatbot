const axios = require('axios');

class UserService {
    constructor() {
        this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    }

    async getUserProfile(userId, token) {
        try {
            const response = await axios.get(`${this.authServiceUrl}/api/auth/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.user;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw new Error('Failed to fetch user profile from auth service');
        }
    }

    async getUserSubscription(userId, token) {
        try {
            // Lấy thông tin user từ auth service
            const response = await axios.get(`${this.authServiceUrl}/api/auth/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Parse role từ response
            const user = response.data.user;
            return {
                plan: user.role === 1 ? 'admin' : 
                      user.role === 2 ? 'free' :
                      user.role === 3 ? 'premium' : 'free'
            };
        } catch (error) {
            console.error('Error fetching user subscription:', error);
            throw new Error('Failed to fetch user subscription from auth service');
        }
    }

    async validateToken(token) {
        try {
            // Gọi endpoint validate-token
            const response = await axios.get(`${this.authServiceUrl}/api/auth/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.user;
        } catch (error) {
            console.error('Error validating token:', error);
            throw new Error('Invalid or expired token');
        }
    }
}

module.exports = new UserService();
