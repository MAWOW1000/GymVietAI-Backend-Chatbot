const ragService = require('../services/ragService');
const messages = require('../config/messages');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Cấu hình multer để xử lý upload file
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Giới hạn độ dài tên file gốc để tránh lỗi đường dẫn quá dài
        const originalName = file.originalname;
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        // Giới hạn tên file gốc tối đa 50 ký tự
        const truncatedName = baseName.length > 50 ? baseName.substring(0, 50) : baseName;
        cb(null, uniqueSuffix + '-' + truncatedName + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Giới hạn 50MB
    fileFilter: function (req, file, cb) {
        // Chỉ chấp nhận file text, PDF, docx
        const allowedTypes = ['.txt', '.pdf', '.docx', '.md', '.json'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file text, PDF, docx, markdown hoặc JSON'));
        }
    }
});

// Hàm trích xuất tiêu đề từ nội dung file
function extractTitleFromContent(content, fileName) {
    // Tìm tiêu đề từ định dạng Markdown (# Tiêu đề)
    const markdownTitleMatch = content.match(/^#\s+(.+)$/m);
    if (markdownTitleMatch && markdownTitleMatch[1]) {
        return markdownTitleMatch[1].trim();
    }
    
    // Tìm dòng đầu tiên không trống
    const firstNonEmptyLine = content.split('\n')
        .map(line => line.trim())
        .find(line => line.length > 0);
    
    if (firstNonEmptyLine) {
        // Nếu dòng quá dài, cắt bớt
        return firstNonEmptyLine.length > 100 
            ? firstNonEmptyLine.substring(0, 97) + '...' 
            : firstNonEmptyLine;
    }
    
    // Nếu không tìm thấy, sử dụng tên file gốc
    return path.basename(fileName, path.extname(fileName));
}

// Hàm tạo mô tả tự động từ nội dung
function generateDescriptionFromContent(content) {
    // Bỏ qua tiêu đề (dòng bắt đầu bằng #)
    const lines = content.split('\n')
        .filter(line => !line.trim().startsWith('#'))
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    // Lấy tối đa 3 dòng đầu tiên không trống
    const firstLines = lines.slice(0, 3).join(' ');
    
    // Nếu mô tả quá dài, cắt bớt
    return firstLines.length > 200 
        ? firstLines.substring(0, 197) + '...' 
        : firstLines || 'Không có mô tả';
}

// Hàm đọc nội dung file dựa trên định dạng
async function readFileContent(filePath, fileType) {
    try {
        switch (fileType.toLowerCase()) {
            case '.pdf':
                try {
                    // Đọc file PDF
                    const pdfBuffer = await fs.readFile(filePath);
                    try {
                        const pdfData = await pdfParse(pdfBuffer);
                        return pdfData.text;
                    } catch (pdfParseError) {
                        console.error(`Error parsing PDF file ${filePath}:`, pdfParseError);
                        // Nếu không thể đọc như PDF, thử đọc như văn bản thông thường
                        console.log(`Trying to read ${filePath} as plain text...`);
                        return await fs.readFile(filePath, 'utf8');
                    }
                } catch (error) {
                    console.error(`Error reading PDF file ${filePath}:`, error);
                    throw new Error(`Không thể đọc file PDF: ${error.message}`);
                }
                
            case '.docx':
                try {
                    // Đọc file Word
                    const docxBuffer = await fs.readFile(filePath);
                    try {
                        const docxResult = await mammoth.extractRawText({ buffer: docxBuffer });
                        return docxResult.value;
                    } catch (docxParseError) {
                        console.error(`Error parsing DOCX file ${filePath}:`, docxParseError);
                        // Nếu không thể đọc như DOCX, thử đọc như văn bản thông thường
                        console.log(`Trying to read ${filePath} as plain text...`);
                        return await fs.readFile(filePath, 'utf8');
                    }
                } catch (error) {
                    console.error(`Error reading DOCX file ${filePath}:`, error);
                    throw new Error(`Không thể đọc file DOCX: ${error.message}`);
                }
                
            case '.txt':
            case '.md':
            case '.json':
            default:
                // Đọc file văn bản thông thường
                try {
                    return await fs.readFile(filePath, 'utf8');
                } catch (error) {
                    console.error(`Error reading text file ${filePath}:`, error);
                    throw new Error(`Không thể đọc file văn bản: ${error.message}`);
                }
        }
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        throw error;
    }
}

class DocumentController {
    async uploadDocument(req, res) {
        try {
            // Sử dụng multer để xử lý upload
            upload.single('document')(req, res, async function (err) {
                if (err) {
                    return res.status(400).json({ message: err.message });
                }

                if (!req.file) {
                    return res.status(400).json({ message: 'Không có file nào được tải lên' });
                }

                // Đọc nội dung file
                const filePath = req.file.path;
                const fileExt = path.extname(req.file.originalname).toLowerCase();
                
                let content;
                try {
                    // Đọc nội dung file dựa trên định dạng
                    content = await readFileContent(filePath, fileExt);
                } catch (readError) {
                    console.error('Error reading uploaded file:', readError);
                    return res.status(500).json({ message: 'Không thể đọc file đã tải lên: ' + readError.message });
                }

                // Tự động trích xuất tiêu đề và mô tả nếu không được cung cấp
                const title = req.body.title || extractTitleFromContent(content, req.file.originalname);
                const description = req.body.description || generateDescriptionFromContent(content);

                // Lưu tài liệu vào hệ thống RAG
                const metadata = { 
                    title: title || 'Tài liệu không có tiêu đề', 
                    description: description || 'Không có mô tả'
                };
                const document = await ragService.saveDocument(req.file.filename, content, metadata);

                // Xóa file tạm sau khi đã lưu vào hệ thống
                try {
                    await fs.unlink(filePath);
                } catch (unlinkError) {
                    console.error('Error deleting temporary file:', unlinkError);
                }

                return res.status(201).json({
                    message: 'Tài liệu đã được tải lên thành công',
                    document
                });
            });
        } catch (error) {
            console.error('Upload document error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }

    async getAllDocuments(req, res) {
        try {
            const documents = await ragService.getAllDocuments();
            return res.json({ documents });
        } catch (error) {
            console.error('Get all documents error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }

    async getDocumentById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ message: 'ID tài liệu là bắt buộc' });
            }

            const document = await ragService.getDocumentById(id);
            if (!document) {
                return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
            }

            return res.json({ document });
        } catch (error) {
            console.error('Get document by ID error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }

    async deleteDocument(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ message: 'ID tài liệu là bắt buộc' });
            }

            const success = await ragService.deleteDocument(id);
            if (!success) {
                return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
            }

            return res.json({ message: 'Tài liệu đã được xóa thành công' });
        } catch (error) {
            console.error('Delete document error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }

    async cleanupInvalidDocuments(req, res) {
        try {
            const result = await ragService.cleanupInvalidDocuments();
            return res.json({ 
                message: `Đã dọn dẹp ${result.cleaned} tài liệu không hợp lệ (tổng số: ${result.total})`,
                result 
            });
        } catch (error) {
            console.error('Cleanup invalid documents error:', error);
            return res.status(500).json({ message: messages.INTERNAL_ERROR });
        }
    }
}

module.exports = new DocumentController(); 