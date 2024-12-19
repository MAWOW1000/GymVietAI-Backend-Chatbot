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
            const token = req.headers.authorization?.split(' ')[1];

            if (!message) {
                return res.status(400).json({ message: messages.chat.invalidMessage });
            }

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

            // Kiểm tra chat limit
            const chatLimit = await this.checkChatLimit(userData.id, token);
            if (!chatLimit.canChat) {
                return res.status(403).json({
                    message: messages.chat.limitExceeded,
                    remainingChats: 0
                });
            }

            // Kiểm tra cache
            const cachedResponse = cacheService.getChatResponse(message);
            if (cachedResponse) {
                await pool.execute(
                    'INSERT INTO chat_logs (user_id, message, response, is_cached) VALUES (?, ?, ?, ?)',
                    [userData.id, message, cachedResponse.response, true]
                );

                return res.json({
                    message: cachedResponse.response,
                    cached: true,
                    timestamp: cachedResponse.timestamp,
                    remainingChats: chatLimit.remainingChats
                });
            }

            // Lấy thông tin user từ auth service
            const userProfile = await userService.getUserProfile(userData.id, token);
            
            // Tạo context cho AI dựa trên profile
            const userContext = `
                Thông tin người dùng:
                - Tên: ${userProfile.firstname} ${userProfile.lastname}
                - Giới tính: ${userProfile.gender}
                - Chiều cao: ${userProfile.height ? userProfile.height + 'cm' : 'Chưa cập nhật'}
                - Cân nặng: ${userProfile.weight ? userProfile.weight + 'kg' : 'Chưa cập nhật'}
                - Trình độ: ${userProfile.level || 'Beginner'}
                - Mục tiêu: ${userProfile.goal || 'Chưa cập nhật'}
            `;

            // Lấy prompt từ database
            const [prompts] = await pool.execute(
                'SELECT content FROM chat_prompts WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
            );

            const systemPrompt = prompts[0]?.content || 'Bạn là chatbot tư vấn gym';
            const chat = this.model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: systemPrompt }]
                    },
                    {
                        role: "model",
                        parts: [{ text: "Tôi đã hiểu và sẽ tuân theo hướng dẫn." }]
                    },
                    {
                        role: "user",
                        parts: [{ text: userContext }]
                    },
                    {
                        role: "model",
                        parts: [{ text: "Tôi đã ghi nhận thông tin người dùng." }]
                    }
                ]
            });

            const result = await chat.sendMessage([{ text: message }]);
            const response = result.response.text();

            // Lưu vào cache
            cacheService.setChatResponse(message, response);

            // Lưu chat history
            await pool.execute(
                'INSERT INTO chat_history (user_id, user_message, bot_response) VALUES (?, ?, ?)',
                [userData.id, message, response]
            );

            // Log chat
            await pool.execute(
                'INSERT INTO chat_logs (user_id, message, response, is_cached) VALUES (?, ?, ?, ?)',
                [userData.id, message, response, false]
            );

            res.json({
                message: response,
                cached: false,
                remainingChats: chatLimit.remainingChats
            });

        } catch (error) {
            console.error('Chat error:', error);
            res.status(500).json({ message: messages.server.error });
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
