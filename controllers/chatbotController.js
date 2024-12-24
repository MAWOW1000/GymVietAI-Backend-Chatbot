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
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
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
            // Since we're not tracking user-specific history anymore
            return res.json({ history: [] });
        } catch (error) {
            console.error('Get chat history error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }
}

module.exports = new ChatbotController();