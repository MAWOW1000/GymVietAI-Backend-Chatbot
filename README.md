# GymVietAI Chatbot Service với RAG

Dịch vụ chatbot thông minh cho hệ thống GymVietAI, tích hợp tính năng RAG (Retrieval-Augmented Generation) để cung cấp câu trả lời chính xác dựa trên tài liệu của bạn.

## Tính năng

- Chatbot AI sử dụng Google Gemini 1.5 Flash
- Hỗ trợ tiếng Việt và tiếng Anh
- Tính năng RAG (Retrieval-Augmented Generation) để trả lời dựa trên tài liệu
- **Hỗ trợ đa ngôn ngữ nâng cao**: Có thể đọc hiểu tài liệu tiếng Anh và trả lời câu hỏi tiếng Việt (hoặc ngược lại)
- Tự động phát hiện ngôn ngữ của câu hỏi và trả lời bằng ngôn ngữ tương ứng
- Quản lý tài liệu (tải lên, xem, xóa)
- Xác thực người dùng
- Lưu lịch sử chat và thống kê

## Cài đặt

1. Clone repository
2. Cài đặt các gói phụ thuộc:
   ```
   npm install
   ```
3. Tạo file `.env` với các biến môi trường cần thiết:
   ```
   PORT=7999
   NODE_ENV=development
   
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=chatbot
   DB_PORT=3306
   
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=24h
   
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   
   CACHE_TTL=3600
   
   SERVICE_AUTH_URL=http://localhost:8083/api/v1/validateUser
   ```
4. Thiết lập cơ sở dữ liệu:
   ```
   npm run setup-db
   ```
   
   Lưu ý: Nếu bạn đã có cơ sở dữ liệu từ file `chatbot.sql`, bạn có thể nhập nó trước:
   ```
   mysql -u root -p chatbot < chatbot.sql
   ```
   Sau đó chạy script cập nhật để thêm các bảng cần thiết cho RAG:
   ```
   npm run update-rag-db
   ```

5. Khởi động server:
   ```
   npm run dev
   ```

## Sử dụng tính năng RAG

### 1. Tải lên tài liệu

```
POST /api/documents/upload
```

Yêu cầu:
- Xác thực: JWT Token
- Content-Type: multipart/form-data
- Body:
  - document: File tài liệu (hỗ trợ .txt, .pdf, .docx, .md, .json)
  - title: Tiêu đề tài liệu (tùy chọn)
  - description: Mô tả tài liệu (tùy chọn)

### 2. Lấy danh sách tài liệu

```
GET /api/documents
```

Yêu cầu:
- Xác thực: JWT Token

### 3. Lấy tài liệu theo ID

```
GET /api/documents/:id
```

Yêu cầu:
- Xác thực: JWT Token

### 4. Xóa tài liệu

```
DELETE /api/documents/:id
```

Yêu cầu:
- Xác thực: JWT Token

### 5. Chat với chatbot

```
POST /api/chatbot/chat
```

Yêu cầu:
- Body:
  - message: Nội dung tin nhắn

Phản hồi:
```json
{
  "message": "Nội dung trả lời từ chatbot",
  "sources": [
    {
      "id": 1,
      "title": "Tiêu đề tài liệu",
      "description": "Mô tả tài liệu"
    }
  ],
  "usedRAG": true,
  "remainingChats": -1
}
```

### 6. Lấy lịch sử chat

```
GET /api/chatbot/history
```

Yêu cầu:
- Xác thực: JWT Token

Phản hồi:
```json
{
  "history": [
    {
      "id": 1,
      "message": "Câu hỏi của người dùng",
      "response": "Câu trả lời của chatbot",
      "created_at": "2024-01-08T12:34:56.000Z",
      "sources": [
        {
          "id": 1,
          "title": "Tiêu đề tài liệu",
          "description": "Mô tả tài liệu"
        }
      ]
    }
  ]
}
```

## Cách hoạt động của RAG

1. Khi người dùng gửi tin nhắn, hệ thống sẽ tự động tìm kiếm các tài liệu liên quan đến nội dung tin nhắn.
2. Nếu tìm thấy tài liệu liên quan, các tài liệu này sẽ được sử dụng làm ngữ cảnh để tạo câu trả lời (usedRAG = true).
3. Câu trả lời sẽ được trả về cùng với thông tin về các tài liệu nguồn.
4. Nếu không có tài liệu liên quan, hệ thống sẽ tự động chuyển sang sử dụng mô hình AI thông thường để trả lời (usedRAG = false).
5. Tất cả các cuộc trò chuyện đều được lưu vào bảng `chat_logs` trong cơ sở dữ liệu.

## Hỗ trợ đa ngôn ngữ

Hệ thống hỗ trợ đa ngôn ngữ nâng cao với các tính năng sau:

1. **Phát hiện ngôn ngữ tự động**: Tự động phát hiện ngôn ngữ của câu hỏi (tiếng Việt hoặc tiếng Anh) và trả lời bằng ngôn ngữ tương ứng.

2. **Tìm kiếm tài liệu đa ngôn ngữ**: Có thể tìm kiếm và sử dụng tài liệu liên quan bất kể ngôn ngữ của tài liệu. Ví dụ, khi người dùng đặt câu hỏi bằng tiếng Việt, hệ thống có thể tìm và sử dụng tài liệu tiếng Anh để trả lời.

3. **Dịch thông tin tự động**: Khi sử dụng tài liệu tiếng Anh để trả lời câu hỏi tiếng Việt (hoặc ngược lại), hệ thống sẽ tự động dịch thông tin từ tài liệu sang ngôn ngữ của câu hỏi.

4. **Trải nghiệm người dùng nhất quán**: Người dùng luôn nhận được câu trả lời bằng cùng ngôn ngữ với câu hỏi của họ, bất kể ngôn ngữ của tài liệu nguồn.

## Lưu ý

- Tài liệu được lưu trữ trong thư mục `documents` và cơ sở dữ liệu.
- Kích thước tối đa của tài liệu là 10MB.
- Chỉ hỗ trợ các định dạng file: .txt, .pdf, .docx, .md, .json.
- Hệ thống hỗ trợ tốt nhất cho tài liệu tiếng Việt và tiếng Anh. Các ngôn ngữ khác có thể không được hỗ trợ đầy đủ.

## Xử lý các định dạng tài liệu

Hệ thống hỗ trợ nhiều định dạng tài liệu khác nhau:

1. **Văn bản thuần túy (.txt)**: Đọc trực tiếp nội dung văn bản.

2. **Markdown (.md)**: Đọc nội dung và có thể trích xuất tiêu đề từ cú pháp Markdown (# Tiêu đề).

3. **JSON (.json)**: Đọc nội dung dưới dạng văn bản.

4. **PDF (.pdf)**: Trích xuất văn bản từ tài liệu PDF sử dụng thư viện pdf-parse.

5. **Word (.docx)**: Trích xuất văn bản từ tài liệu Word sử dụng thư viện mammoth.

Khi tải lên tài liệu, hệ thống sẽ tự động:
- Phát hiện định dạng tài liệu dựa trên phần mở rộng
- Trích xuất nội dung văn bản từ tài liệu
- Tự động tạo tiêu đề và mô tả nếu không được cung cấp
- Lưu trữ nội dung để sử dụng trong RAG 