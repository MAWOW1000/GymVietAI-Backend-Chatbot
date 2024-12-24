const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/database');
const messages = require('../config/messages');
const cacheService = require('../services/cacheService');
const userService = require('../services/userService');

class ChatbotController {
    constructor() {
        if (!process.env.GOOGLE_AI_API_KEY) {
            console.error('GOOGLE_AI_API_KEY không được cấu hình');
            return;
        }
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    async checkChatLimit(userId, token) {
        try {
            // Kiểm tra subscription từ auth service
            const subscription = await userService.getUserSubscription(userId, token);
            
            // Nếu user có gói premium, không giới hạn chat
            if (subscription && ['premium', 'vip', 'admin'].includes(subscription.plan.toLowerCase())) {
                return { canChat: true, remainingChats: -1 }; // -1 nghĩa là không giới hạn
            }

            // Nếu là free user, kiểm tra limit
            const [records] = await pool.execute(
                'SELECT * FROM user_chat_limits WHERE user_id = ? AND date = CURDATE()',
                [userId]
            );

            if (records.length === 0) {
                await pool.execute(
                    'INSERT INTO user_chat_limits (user_id, chat_count, date) VALUES (?, 1, CURDATE())',
                    [userId]
                );
                return { canChat: true, remainingChats: 9 };
            }

            const record = records[0];
            const dailyLimit = 10;
            const remainingChats = dailyLimit - record.chat_count;

            if (remainingChats <= 0) {
                return { canChat: false, remainingChats: 0 };
            }

            await pool.execute(
                'UPDATE user_chat_limits SET chat_count = chat_count + 1 WHERE id = ?',
                [record.id]
            );

            return { canChat: true, remainingChats: remainingChats - 1 };
        } catch (error) {
            console.error('Check chat limit error:', error);
            throw error;
        }
    }

    async chat(req, res) {
        try {
            const { message } = req.body;
            if (!message) {
                return res.status(400).json({ message: messages.MESSAGE_REQUIRED });
            }

            // Use default prompt since database is not connected
            const systemPrompt = {
                role: "user",
                parts: [{ text: "Bạn là một huấn luyện viên thể hình chuyên nghiệp, nhiệm vụ của bạn là tư vấn về tập luyện và dinh dưỡng. Hãy trả lời một cách chuyên nghiệp, ngắn gọn và dễ hiểu." }]
            };

            // Generate chat response
            const chat = this.model.startChat({
                history: [systemPrompt]
            });

            const result = await chat.sendMessage([{ text: message }]);
            const response = await result.response;

            return res.json({ 
                message: response.text(),
                remainingChats: -1 // Unlimited chats
            });

        } catch (error) {
            console.error('Chat error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }

    async getChatHistory(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: messages.auth.tokenRequired });
            }

            // Validate token và lấy thông tin user
            let userData;
            try {
                userData = await userService.validateToken(token);
            } catch (error) {
                return res.status(401).json({ message: messages.auth.invalidToken });
            }

            const [history] = await pool.execute(
                'SELECT user_message, bot_response, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
                [userData.id]
            );
            res.json(history);
        } catch (error) {
            console.error('Get chat history error:', error);
            res.status(500).json({ message: messages.server.error });
        }
    }

    async updateProfile(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: messages.auth.tokenRequired });
            }

            // Validate token và lấy thông tin user
            let userData;
            try {
                userData = await userService.validateToken(token);
            } catch (error) {
                return res.status(401).json({ message: messages.auth.invalidToken });
            }

            const { height, weight, level, goal } = req.body;

            // Validate input
            if (height && (height < 100 || height > 250)) {
                return res.status(400).json({ message: 'Chiều cao không hợp lệ (100-250cm)' });
            }
            if (weight && (weight < 30 || weight > 200)) {
                return res.status(400).json({ message: 'Cân nặng không hợp lệ (30-200kg)' });
            }
            if (level && !['beginner', 'intermediate', 'advanced'].includes(level)) {
                return res.status(400).json({ message: 'Trình độ không hợp lệ' });
            }

            // Kiểm tra profile đã tồn tại chưa
            const [profiles] = await pool.execute(
                'SELECT id FROM user_profiles WHERE user_id = ?',
                [userData.id]
            );

            if (profiles.length > 0) {
                // Update existing profile
                await pool.execute(
                    `UPDATE user_profiles 
                    SET height = ?, weight = ?, level = ?, goal = ?
                    WHERE user_id = ?`,
                    [height, weight, level, goal, userData.id]
                );
            } else {
                // Create new profile
                await pool.execute(
                    `INSERT INTO user_profiles (user_id, height, weight, level, goal)
                    VALUES (?, ?, ?, ?, ?)`,
                    [userData.id, height, weight, level, goal]
                );
            }

            res.json({ message: 'Profile updated successfully' });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ message: messages.server.error });
        }
    }

    async getProfile(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: messages.auth.tokenRequired });
            }

            // Validate token và lấy thông tin user
            let userData;
            try {
                userData = await userService.validateToken(token);
            } catch (error) {
                return res.status(401).json({ message: messages.auth.invalidToken });
            }

            const [profiles] = await pool.execute(
                'SELECT height, weight, level, goal FROM user_profiles WHERE user_id = ?',
                [userData.id]
            );

            if (profiles.length === 0) {
                return res.json({
                    height: null,
                    weight: null,
                    level: 'beginner',
                    goal: null
                });
            }

            res.json(profiles[0]);
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ message: messages.server.error });
        }
    }
}

module.exports = new ChatbotController();
