const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/database');
const messages = require('../config/messages');
const ragService = require('../services/ragService');

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

            // Lấy user_id từ request nếu có
            const userId = req.user?.id || null;
            
            // Thời gian bắt đầu để tính thời gian phản hồi
            const startTime = Date.now();

            // Detect language
            const language = this.detectLanguage(message);
            console.log(`Đã phát hiện ngôn ngữ: ${language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}`);

            // Get prompt from database first
            const dbPrompt = await this.getActivePrompt();
            if (!dbPrompt) {
                return res.status(500).json({ message: "No active prompt found in database" });
            }

            // Select prompt based on detected language
            const systemPrompt = language === 'vi' ? dbPrompt.content : dbPrompt.content_en;

            let response, sources = [];
            let isCached = false;
            let usedRAG = false;

            try {
                // Luôn tìm kiếm tài liệu liên quan trước
                console.log('Đang tìm kiếm tài liệu liên quan...');
                const relevantDocuments = await ragService.searchRelevantDocuments(message);
                
                // Nếu có tài liệu liên quan, sử dụng RAG để tạo câu trả lời
                if (relevantDocuments && relevantDocuments.length > 0) {
                    console.log(`Đã tìm thấy ${relevantDocuments.length} tài liệu liên quan, sử dụng RAG để trả lời.`);
                    console.log(`Tài liệu: ${relevantDocuments.map(doc => doc.title).join(', ')}`);
                    
                    const ragResponse = await ragService.generateRAGResponse(message, relevantDocuments);
                    response = ragResponse.answer;
                    sources = ragResponse.sources;
                    usedRAG = true;
                } else {
                    // Nếu không có tài liệu liên quan, sử dụng phương pháp thông thường
                    console.log('Không tìm thấy tài liệu liên quan, sử dụng phương pháp thông thường.');
                    const chat = this.model.startChat({
                        history: [
                            {
                                role: "user",
                                parts: [{ text: systemPrompt }]
                            }
                        ]
                    });

                    // Thêm hướng dẫn về ngôn ngữ phản hồi
                    let userMessage = message;
                    if (language === 'vi') {
                        userMessage = `${message}\n\nVui lòng trả lời bằng tiếng Việt.`;
                    }

                    const result = await chat.sendMessage([{ text: userMessage }]);
                    response = result.response.text();
                }
            } catch (error) {
                console.error('Error processing with RAG:', error);
                // Nếu có lỗi với RAG, sử dụng phương pháp thông thường
                console.log('Có lỗi khi xử lý RAG, chuyển sang phương pháp thông thường.');
                const chat = this.model.startChat({
                    history: [
                        {
                            role: "user",
                            parts: [{ text: systemPrompt }]
                        }
                    ]
                });

                // Thêm hướng dẫn về ngôn ngữ phản hồi
                let userMessage = message;
                if (language === 'vi') {
                    userMessage = `${message}\n\nVui lòng trả lời bằng tiếng Việt.`;
                }

                const result = await chat.sendMessage([{ text: userMessage }]);
                response = result.response.text();
            }

            // Tính thời gian phản hồi
            const responseTime = Date.now() - startTime;

            // Lưu lịch sử chat vào cơ sở dữ liệu
            try {
                const today = new Date().toISOString().split('T')[0]; // Lấy ngày hiện tại dạng YYYY-MM-DD
                
                await pool.query(
                    'INSERT INTO chat_logs (user_id, message, response, is_cached, created_at, response_time, sources, chat_count_date, used_rag) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)',
                    [userId, message, response, isCached ? 1 : 0, responseTime, JSON.stringify(sources), today, usedRAG ? 1 : 0]
                );
            } catch (dbError) {
                console.error('Error saving chat log:', dbError);
                // Không trả về lỗi cho người dùng, vẫn tiếp tục trả về kết quả
            }

            return res.json({
                message: response,
                sources: sources,
                usedRAG: usedRAG,
                remainingChats: -1
            });

        } catch (error) {
            console.error('Chat error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }

    async getChatHistory(req, res) {
        try {
            const userId = req.user?.id || null;
            
            // Nếu có user_id, lấy lịch sử chat của user đó
            // Nếu không, trả về mảng rỗng
            if (userId) {
                const [rows] = await pool.query(
                    'SELECT id, message, response, created_at, sources FROM chat_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
                    [userId]
                );
                return res.json({ history: rows });
            } else {
                return res.json({ history: [] });
            }
        } catch (error) {
            console.error('Get chat history error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }
}

module.exports = new ChatbotController();