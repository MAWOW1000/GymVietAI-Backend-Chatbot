const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/database');
const messages = require('../config/messages');

class ChatbotController {
    constructor() {
        if (!process.env.GOOGLE_AI_API_KEY) {
            console.error('GOOGLE_AI_API_KEY không được cấu hình');
            return;
        }
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async getActivePrompt() {
        try {
            const [rows] = await pool.query('SELECT content, content_en FROM chat_prompts WHERE is_active = true LIMIT 1');
            if (rows.length > 0) {
                return rows[0];
            }
            return null;
        } catch (error) {
            console.error('Error getting prompt from database:', error);
            return null;
        }
    }

    detectLanguage(text) {
        // Simple language detection based on common Vietnamese diacritical marks
        const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
        return vietnamesePattern.test(text) ? 'vi' : 'en';
    }

    async chat(req, res) {
        try {
            const { message } = req.body;
            if (!message) {
                return res.status(400).json({ message: messages.MESSAGE_REQUIRED });
            }

            // Get prompt from database first
            const dbPrompt = await this.getActivePrompt();
            if (!dbPrompt) {
                return res.status(500).json({ message: "No active prompt found in database" });
            }

            // Create chat history with both language prompts
            const chatHistory = [
                {
                    role: "user",
                    parts: [{ text: dbPrompt.content }] // Vietnamese prompt
                },
                {
                    role: "user",
                    parts: [{ text: dbPrompt.content_en }] // English prompt
                }
            ];

            // Generate chat response
            const chat = this.model.startChat({
                history: chatHistory
            });
            
            const result = await chat.sendMessage([{ text: message }]);
            const response = await result.response;
            
            return res.json({ 
                message: response.text(),
                remainingChats: -1
            });

        } catch (error) {
            console.error('Chat error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }

    async getChatHistory(req, res) {
        try {
            // Since we're not tracking user-specific history anymore
            return res.json({ history: [] });
        } catch (error) {
            console.error('Get chat history error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }
}

module.exports = new ChatbotController();