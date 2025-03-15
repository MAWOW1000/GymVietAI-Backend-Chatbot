# Hướng dẫn test tính năng RAG cho GymVietAI Chatbot

Tài liệu này hướng dẫn cách test tính năng RAG (Retrieval-Augmented Generation) cho chatbot GymVietAI.

## Chuẩn bị

1. Đảm bảo server đã được khởi động:
   ```
   npm run dev
   ```

2. Import file `GymVietAI_RAG_Chatbot.postman_collection.json` vào Postman.

3. Chuẩn bị một số file tài liệu để test tính năng RAG. Dưới đây là một số ví dụ:

### Ví dụ tài liệu 1: huong-dan-tap-gym.txt
```
# Hướng dẫn tập Gym cho người mới bắt đầu

## Các bài tập cơ bản cho người mới

Khi mới bắt đầu tập gym, bạn nên tập trung vào các bài tập cơ bản để xây dựng nền tảng và học kỹ thuật đúng:

1. **Squat (Ngồi xổm)**: Tập trung vào cơ đùi, mông và lưng dưới.
   - Đứng thẳng, hai chân rộng bằng vai
   - Hạ người xuống như đang ngồi xuống ghế
   - Đảm bảo đầu gối không vượt quá ngón chân
   - 3 hiệp, mỗi hiệp 10-12 lần

2. **Push-up (Chống đẩy)**: Tập trung vào cơ ngực, vai và tay.
   - Bắt đầu ở tư thế plank
   - Hạ người xuống cho đến khi ngực gần chạm sàn
   - Đẩy người lên về vị trí ban đầu
   - 3 hiệp, mỗi hiệp 8-10 lần

3. **Deadlift (Nâng tạ đất)**: Tập trung vào cơ lưng, mông và chân.
   - Đứng trước thanh tạ, chân rộng bằng vai
   - Cúi người xuống, giữ lưng thẳng
   - Nắm thanh tạ và nâng lên bằng cách đẩy hông về phía trước
   - 3 hiệp, mỗi hiệp 8-10 lần

4. **Bench Press (Đẩy ngực)**: Tập trung vào cơ ngực, vai và tay.
   - Nằm trên ghế, hai chân đặt chắc trên sàn
   - Nắm thanh tạ rộng hơn vai
   - Hạ thanh tạ xuống ngực và đẩy lên
   - 3 hiệp, mỗi hiệp 8-10 lần

5. **Plank (Tấm ván)**: Tập trung vào cơ bụng và lõi.
   - Tư thế chống đẩy nhưng chống trên khuỷu tay
   - Giữ cơ thể thẳng như một tấm ván
   - Giữ 30-60 giây, 3 lần

## Lịch tập cho người mới

Tuần đầu tiên, hãy tập 2-3 lần/tuần để cơ thể có thời gian thích nghi:

- **Ngày 1**: Tập toàn thân (tất cả các bài tập trên)
- **Ngày 2**: Nghỉ ngơi
- **Ngày 3**: Tập toàn thân
- **Ngày 4**: Nghỉ ngơi
- **Ngày 5**: Tập toàn thân
- **Ngày 6-7**: Nghỉ ngơi

Sau 2-3 tuần, bạn có thể chuyển sang lịch tập chia theo nhóm cơ:

- **Ngày 1**: Chân và mông (Squat, Deadlift)
- **Ngày 2**: Ngực và tay (Push-up, Bench Press)
- **Ngày 3**: Nghỉ ngơi
- **Ngày 4**: Lưng và vai
- **Ngày 5**: Bụng và lõi (Plank)
- **Ngày 6-7**: Nghỉ ngơi

## Lưu ý cho người mới

1. **Khởi động kỹ** trước khi tập, kéo giãn sau khi tập
2. **Tập trung vào kỹ thuật** hơn là trọng lượng
3. **Uống đủ nước** trước, trong và sau khi tập
4. **Nghỉ ngơi đầy đủ** giữa các buổi tập
5. **Ăn uống hợp lý** để cung cấp năng lượng và phục hồi cơ
```

### Ví dụ tài liệu 2: dinh-duong-cho-nguoi-tap-gym.txt
```
# Dinh dưỡng cho người tập Gym

## Nguyên tắc cơ bản

Dinh dưỡng đóng vai trò quan trọng không kém gì việc tập luyện. Dưới đây là một số nguyên tắc cơ bản:

1. **Cân bằng calo**: Tùy thuộc vào mục tiêu (tăng cơ, giảm mỡ, duy trì), bạn cần điều chỉnh lượng calo nạp vào:
   - Tăng cơ: Dư thừa calo (calo nạp vào > calo tiêu hao)
   - Giảm mỡ: Thiếu hụt calo (calo nạp vào < calo tiêu hao)
   - Duy trì: Cân bằng calo (calo nạp vào = calo tiêu hao)

2. **Phân bổ macros**: Đảm bảo tỷ lệ hợp lý giữa các chất dinh dưỡng đa lượng:
   - Protein: 1.6-2.2g/kg cân nặng
   - Carbohydrate: 3-5g/kg cân nặng (tùy mục tiêu)
   - Chất béo: 0.5-1.5g/kg cân nặng

3. **Timing**: Thời điểm ăn cũng quan trọng:
   - Trước tập: 1-2 giờ, ưu tiên carbs và protein
   - Sau tập: Trong vòng 30-60 phút, ưu tiên protein và carbs
   - Các bữa còn lại: Phân bổ đều trong ngày

## Chế độ ăn cho người tập Gym

### Mẫu thực đơn tăng cơ (cho nam 70kg)

**Bữa sáng (7:00)**
- 100g yến mạch
- 2 quả trứng
- 1 ly sữa
- 1 quả chuối

**Bữa nhẹ (10:00)**
- 30g hạt (hạnh nhân, óc chó)
- 1 hộp sữa chua

**Bữa trưa (12:30)**
- 150g thịt gà/bò
- 100g gạo lứt
- Rau xanh không giới hạn
- 1 quả táo

**Bữa nhẹ trước tập (15:30)**
- 1 bánh protein bar
- 1 quả chuối

**Bữa sau tập (18:30)**
- 30g whey protein
- 1 ly nước ép trái cây

**Bữa tối (20:00)**
- 150g cá hồi/thịt bò
- 100g khoai lang
- Rau xanh không giới hạn
- 1 thìa dầu oliu

### Mẫu thực đơn giảm mỡ (cho nam 70kg)

**Bữa sáng (7:00)**
- 50g yến mạch
- 3 lòng trắng trứng + 1 trứng nguyên quả
- Rau xanh

**Bữa nhẹ (10:00)**
- 1 hộp sữa chua không đường
- 15g hạt

**Bữa trưa (12:30)**
- 150g thịt gà/cá
- 50g gạo lứt
- Rau xanh không giới hạn

**Bữa nhẹ trước tập (15:30)**
- 1 quả táo
- 20g whey protein

**Bữa sau tập (18:30)**
- 30g whey protein
- 1 quả chuối

**Bữa tối (20:00)**
- 150g thịt nạc
- Rau xanh không giới hạn
- 1 thìa dầu oliu

## Thực phẩm bổ sung

Một số thực phẩm bổ sung phổ biến cho người tập gym:

1. **Whey Protein**: Hỗ trợ tăng cơ, dễ hấp thu
2. **Creatine**: Tăng sức mạnh và hiệu suất tập luyện
3. **BCAA**: Hỗ trợ phục hồi cơ
4. **Multivitamin**: Bổ sung vi chất
5. **Omega-3**: Tốt cho tim mạch và giảm viêm

## Lưu ý quan trọng

1. **Uống đủ nước**: Tối thiểu 2-3 lít/ngày
2. **Ưu tiên thực phẩm nguyên chất**: Hạn chế thực phẩm chế biến sẵn
3. **Điều chỉnh theo cá nhân**: Mỗi người có nhu cầu khác nhau
4. **Kiên trì và nhất quán**: Kết quả đến từ sự kiên trì
5. **Tham khảo ý kiến chuyên gia**: Nếu có điều kiện, hãy tham khảo ý kiến của chuyên gia dinh dưỡng
```

## Các bước test

### 1. Tải lên tài liệu

1. Mở request "Tải lên tài liệu" trong Postman
2. Trong tab "Body", chọn file tài liệu (ví dụ: huong-dan-tap-gym.txt)
3. Điền tiêu đề và mô tả cho tài liệu
4. Gửi request
5. Kiểm tra response, bạn sẽ nhận được thông tin về tài liệu đã tải lên
6. Lặp lại các bước trên để tải lên tài liệu thứ hai (dinh-duong-cho-nguoi-tap-gym.txt)

### 2. Lấy danh sách tài liệu

1. Mở request "Lấy danh sách tài liệu" trong Postman
2. Gửi request
3. Kiểm tra response, bạn sẽ thấy danh sách các tài liệu đã tải lên

### 3. Chat với RAG

1. Mở request "Chat với RAG" trong Postman
2. Trong tab "Body", thay đổi nội dung tin nhắn để test (ví dụ: "Tôi nên tập những bài tập nào cho người mới bắt đầu?")
3. Đảm bảo tham số `useRAG` được đặt là `true`
4. Gửi request
5. Kiểm tra response, bạn sẽ thấy câu trả lời dựa trên tài liệu đã tải lên và danh sách các tài liệu nguồn

### 4. Chat không sử dụng RAG

1. Mở request "Chat không sử dụng RAG" trong Postman
2. Trong tab "Body", sử dụng cùng một nội dung tin nhắn như bước trước
3. Đảm bảo tham số `useRAG` được đặt là `false`
4. Gửi request
5. Kiểm tra response và so sánh với câu trả lời khi sử dụng RAG

### 5. Lấy lịch sử chat

1. Mở request "Lấy lịch sử chat" trong Postman
2. Gửi request
3. Kiểm tra response, bạn sẽ thấy lịch sử các cuộc trò chuyện

### 6. Lấy tài liệu theo ID

1. Mở request "Lấy tài liệu theo ID" trong Postman
2. Thay đổi ID trong URL thành ID của tài liệu bạn muốn xem (lấy từ danh sách tài liệu)
3. Gửi request
4. Kiểm tra response, bạn sẽ thấy thông tin chi tiết của tài liệu

### 7. Xóa tài liệu

1. Mở request "Xóa tài liệu" trong Postman
2. Thay đổi ID trong URL thành ID của tài liệu bạn muốn xóa
3. Gửi request
4. Kiểm tra response để xác nhận tài liệu đã được xóa
5. Kiểm tra lại danh sách tài liệu để đảm bảo tài liệu đã bị xóa

## Các trường hợp test khác

### Test với các câu hỏi khác nhau

Thử các câu hỏi khác nhau để kiểm tra khả năng truy xuất tài liệu liên quan:

1. "Tôi nên ăn gì trước khi tập gym?"
2. "Lịch tập gym cho người mới nên như thế nào?"
3. "Các bài tập nào tốt cho cơ ngực?"
4. "Tôi muốn giảm mỡ bụng, nên ăn uống thế nào?"
5. "Có nên uống protein sau khi tập không?"

### Test với tài liệu không liên quan

Tải lên một tài liệu không liên quan đến gym (ví dụ: về công nghệ, lịch sử, v.v.) và đặt câu hỏi về nội dung đó để xem chatbot có trả lời dựa trên tài liệu không.

## Khôi phục xác thực

Sau khi hoàn thành việc test, bạn nên khôi phục lại middleware xác thực bằng cách bỏ comment các dòng đã comment trong file `routes/documentRoutes.js` và `routes/chatbotRoutes.js`.