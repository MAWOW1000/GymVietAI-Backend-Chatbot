const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/database');

class RAGService {
    constructor() {
        if (!process.env.GOOGLE_AI_API_KEY) {
            console.error('GOOGLE_AI_API_KEY không được cấu hình');
            return;
        }
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        this.documentsDir = path.join(__dirname, '../documents');
        this.ensureDocumentsDirectory();
    }

    async ensureDocumentsDirectory() {
        try {
            await fs.mkdir(this.documentsDir, { recursive: true });
        } catch (error) {
            console.error('Error creating documents directory:', error);
        }
    }

    async saveDocument(fileName, content, metadata = {}) {
        try {
            // Lưu nội dung tài liệu vào thư mục documents
            const filePath = path.join(this.documentsDir, fileName);
            await fs.writeFile(filePath, content);

            // Lưu metadata vào cơ sở dữ liệu
            const [result] = await pool.query(
                'INSERT INTO documents (file_name, file_path, title, description, created_at) VALUES (?, ?, ?, ?, NOW())',
                [fileName, filePath, metadata.title || fileName, metadata.description || '']
            );

            return {
                id: result.insertId,
                fileName,
                filePath,
                ...metadata
            };
        } catch (error) {
            console.error('Error saving document:', error);
            throw error;
        }
    }

    async getAllDocuments() {
        try {
            const [rows] = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
            return rows;
        } catch (error) {
            console.error('Error getting documents:', error);
            throw error;
        }
    }

    async getDocumentById(id) {
        try {
            const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
            if (rows.length === 0) {
                return null;
            }

            const document = rows[0];
            try {
                // Đọc nội dung file dựa trên định dạng
                const fileExt = path.extname(document.file_name).toLowerCase();
                document.content = await this.readDocumentContent(document.file_path, fileExt);
            } catch (readError) {
                console.error('Error reading document file:', readError);
                document.content = '';
            }

            return document;
        } catch (error) {
            console.error('Error getting document by ID:', error);
            throw error;
        }
    }

    // Hàm đọc nội dung tài liệu dựa trên định dạng
    async readDocumentContent(filePath, fileExt) {
        try {
            switch (fileExt) {
                case '.pdf':
                    try {
                        // Đọc file PDF như văn bản thông thường
                        console.log(`Đọc tệp PDF ${filePath} như văn bản thông thường...`);
                        return await fs.readFile(filePath, 'utf8');
                    } catch (error) {
                        console.error(`Error reading PDF file ${filePath}:`, error.message);
                        return `[Không thể đọc tệp PDF: ${error.message}]`;
                    }
                    
                case '.docx':
                    try {
                        // Đọc file Word như văn bản thông thường
                        console.log(`Đọc tệp DOCX ${filePath} như văn bản thông thường...`);
                        return await fs.readFile(filePath, 'utf8');
                    } catch (error) {
                        console.error(`Error reading DOCX file ${filePath}:`, error.message);
                        return `[Không thể đọc tệp DOCX: ${error.message}]`;
                    }
                    
                case '.txt':
                case '.md':
                case '.json':
                default:
                    // Đọc file văn bản thông thường
                    try {
                        return await fs.readFile(filePath, 'utf8');
                    } catch (error) {
                        console.error(`Error reading text file ${filePath}:`, error.message);
                        return `[Không thể đọc tệp văn bản: ${error.message}]`;
                    }
            }
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error.message);
            return `[Lỗi không xác định: ${error.message}]`;
        }
    }

    async deleteDocument(id) {
        try {
            const document = await this.getDocumentById(id);
            if (!document) {
                return false;
            }

            // Xóa file
            try {
                await fs.unlink(document.file_path);
            } catch (unlinkError) {
                console.error('Error deleting document file:', unlinkError);
            }

            // Xóa từ database
            await pool.query('DELETE FROM documents WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    }

    async searchRelevantDocuments(query) {
        try {
            // Lấy tất cả tài liệu
            const documents = await this.getAllDocuments();
            if (documents.length === 0) {
                console.log('Không có tài liệu nào trong cơ sở dữ liệu');
                return [];
            }

            // Đọc nội dung của tất cả tài liệu
            const documentsWithContent = await Promise.all(
                documents.map(async (doc) => {
                    try {
                        // Đọc nội dung file dựa trên định dạng
                        const fileExt = path.extname(doc.file_name).toLowerCase();
                        const content = await this.readDocumentContent(doc.file_path, fileExt);
                        return { ...doc, content };
                    } catch (error) {
                        console.error(`Error reading document ${doc.id}:`, error.message);
                        // Trả về nội dung trống nếu không thể đọc tài liệu
                        return { ...doc, content: `[Không thể đọc tài liệu: ${error.message}]` };
                    }
                })
            );

            // Lọc ra các tài liệu có nội dung hợp lệ
            const validDocuments = documentsWithContent.filter(doc => 
                doc.content && 
                typeof doc.content === 'string' && 
                doc.content.length > 0 && 
                !doc.content.startsWith('[Không thể đọc tài liệu:') &&
                !doc.content.startsWith('[Lỗi không xác định:') &&
                !doc.content.startsWith('[Không thể đọc tệp PDF:') &&
                !doc.content.startsWith('[Không thể đọc tệp DOCX:') &&
                !doc.content.startsWith('[Không thể đọc tệp văn bản:')
            );

            if (validDocuments.length === 0) {
                console.log('Không có tài liệu hợp lệ để tìm kiếm');
                return [];
            }

            // Phát hiện ngôn ngữ của câu hỏi
            const isVietnamese = this.detectVietnameseLanguage(query);
            const queryLanguage = isVietnamese ? 'tiếng Việt' : 'tiếng Anh';
            
            // Sử dụng AI để tìm tài liệu liên quan, với chỉ dẫn đa ngôn ngữ
            const prompt = `Tôi có các tài liệu sau (có thể bằng tiếng Việt hoặc tiếng Anh):
${validDocuments.map((doc, index) => {
    // Giới hạn nội dung để tránh vượt quá giới hạn token
    const truncatedContent = doc.content.substring(0, 500);
    return `Tài liệu ${index + 1}:
Nội dung: ${truncatedContent}...`;
}).join('\n\n')}

Câu hỏi của người dùng bằng ${queryLanguage}: "${query}"

Hãy tìm các tài liệu liên quan đến câu hỏi, bất kể ngôn ngữ của tài liệu. Trả về danh sách các chỉ số (1-${validDocuments.length}) của các tài liệu liên quan nhất, chỉ trả về các chỉ số, cách nhau bằng dấu phẩy. Nếu không có tài liệu nào liên quan, hãy trả về "0".`;

            try {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                const responseText = response.text().trim();

                // Xử lý kết quả
                if (responseText === "0") {
                    return [];
                }

                // Xử lý kết quả, đảm bảo chỉ lấy các số
                const relevantIndices = responseText
                    .split(/[,\s]+/)  // Tách theo dấu phẩy hoặc khoảng trắng
                    .map(part => part.trim())
                    .filter(part => /^\d+$/.test(part))  // Chỉ giữ lại các phần là số
                    .map(idx => parseInt(idx) - 1);  // Chuyển đổi sang chỉ số mảng (0-based)

                return relevantIndices
                    .filter(idx => idx >= 0 && idx < validDocuments.length)
                    .map(idx => validDocuments[idx]);
            } catch (aiError) {
                console.error('Error generating content with AI:', aiError.message);
                return [];
            }
        } catch (error) {
            console.error('Error searching relevant documents:', error.message);
            return [];
        }
    }

    // Phát hiện ngôn ngữ tiếng Việt dựa trên dấu
    detectVietnameseLanguage(text) {
        const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
        return vietnamesePattern.test(text);
    }

    async cleanupInvalidDocuments() {
        try {
            // Lấy tất cả tài liệu
            const documents = await this.getAllDocuments();
            if (documents.length === 0) {
                return { cleaned: 0, total: 0 };
            }

            let invalidCount = 0;
            
            // Kiểm tra từng tài liệu
            for (const doc of documents) {
                try {
                    // Thử đọc file để xem có tồn tại không
                    await fs.access(doc.file_path);
                } catch (error) {
                    // Nếu không tìm thấy file, xóa tài liệu khỏi cơ sở dữ liệu
                    console.log(`Removing invalid document ${doc.id}: ${doc.title}`);
                    await pool.query('DELETE FROM documents WHERE id = ?', [doc.id]);
                    invalidCount++;
                }
            }

            return {
                cleaned: invalidCount,
                total: documents.length
            };
        } catch (error) {
            console.error('Error cleaning up invalid documents:', error);
            return { cleaned: 0, total: 0, error: error.message };
        }
    }

    async generateRAGResponse(userQuery, relevantDocuments) {
        try {
            if (!relevantDocuments || relevantDocuments.length === 0) {
                // Nếu không có tài liệu liên quan, sử dụng mô hình thông thường
                const result = await this.model.generateContent(userQuery);
                const response = await result.response;
                return {
                    answer: response.text(),
                    sources: []
                };
            }

            // Phát hiện ngôn ngữ của câu hỏi
            const isVietnamese = this.detectVietnameseLanguage(userQuery);
            const responseLanguage = isVietnamese ? 'tiếng Việt' : 'tiếng Anh';
            
            // Tạo prompt với thông tin từ tài liệu liên quan, với chỉ dẫn đa ngôn ngữ và phong cách thân thiện
            const contextPrompt = `Dựa trên các thông tin sau (có thể bằng tiếng Việt hoặc tiếng Anh):
${relevantDocuments.map((doc, index) => `Tài liệu ${index + 1}: 
${doc.content.substring(0, 1000)}...`).join('\n\n')}

Hãy trả lời câu hỏi sau bằng ${responseLanguage}: "${userQuery}"

Trả lời dựa trên thông tin từ các tài liệu được cung cấp, bất kể ngôn ngữ của tài liệu. Nếu tài liệu bằng tiếng Anh, hãy dịch thông tin sang ${responseLanguage} khi trả lời. Nếu không có thông tin liên quan trong tài liệu, hãy nói rằng bạn không có đủ thông tin để trả lời.

QUAN TRỌNG: KHÔNG BAO GIỜ nhắc đến các tài liệu được sử dụng trong câu trả lời. Không được nói "Theo tài liệu..." hoặc "Trong tài liệu..." hoặc bất kỳ cách nào khác để đề cập đến nguồn thông tin. Trả lời như thể bạn đã biết thông tin này.

Hướng dẫn về phong cách trả lời:
1. Trả lời một cách thân thiện, tự nhiên và gần gũi như một người bạn đang trò chuyện
2. Sử dụng ngôn ngữ đời thường, tránh quá chuyên nghiệp hoặc máy móc
3. Thể hiện sự quan tâm đến người dùng
4. Sử dụng emoji phù hợp để tạo cảm giác thân thiện (nhưng không quá lạm dụng)
5. Thỉnh thoảng sử dụng các từ ngữ thể hiện sự đồng cảm như "mình hiểu", "mình biết cảm giác đó"
6. Chia sẻ một số mẹo nhỏ hoặc kinh nghiệm cá nhân (giả định) để tạo cảm giác gần gũi
7. Khuyến khích và động viên người dùng một cách chân thành
8. Bắt đầu với một câu thân thiện và kết thúc với một câu động viên

Hãy đảm bảo câu trả lời vẫn chính xác về mặt khoa học nhưng được trình bày một cách dễ hiểu và thân thiện.`;

            const result = await this.model.generateContent(contextPrompt);
            const response = await result.response;

            return {
                answer: response.text(),
                sources: relevantDocuments.map(doc => ({
                    id: doc.id,
                    title: Buffer.from(doc.title, 'utf-8').toString('utf-8'),
                    description: Buffer.from(doc.description || '', 'utf-8').toString('utf-8')
                }))
            };
        } catch (error) {
            console.error('Error generating RAG response:', error);
            throw error;
        }
    }
}

module.exports = new RAGService(); 