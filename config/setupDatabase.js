const fs = require('fs');
const path = require('path');
const pool = require('./database');

async function setupDatabase() {
    try {
        console.log('Bắt đầu thiết lập cơ sở dữ liệu...');
        
        // Đọc file SQL cơ bản
        const sqlFilePath = path.join(__dirname, 'database_schema.sql');
        const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Chia các câu lệnh SQL
        const sqlStatements = sqlScript
            .split(';')
            .filter(statement => statement.trim() !== '');
        
        // Thực thi từng câu lệnh SQL
        for (const statement of sqlStatements) {
            await pool.query(statement);
        }
        
        // Đọc file SQL cập nhật cho RAG
        const updateSqlFilePath = path.join(__dirname, 'update_database_for_rag.sql');
        if (fs.existsSync(updateSqlFilePath)) {
            console.log('Cập nhật cơ sở dữ liệu cho tính năng RAG...');
            const updateSqlScript = fs.readFileSync(updateSqlFilePath, 'utf8');
            
            // Chia các câu lệnh SQL
            const updateSqlStatements = updateSqlScript
                .split(';')
                .filter(statement => statement.trim() !== '');
            
            // Thực thi từng câu lệnh SQL
            for (const statement of updateSqlStatements) {
                await pool.query(statement);
            }
        }
        
        // Tạo bảng documents nếu chưa tồn tại
        await pool.query(`
            CREATE TABLE IF NOT EXISTS documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                file_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('Thiết lập cơ sở dữ liệu thành công!');
    } catch (error) {
        console.error('Lỗi khi thiết lập cơ sở dữ liệu:', error);
    } finally {
        // Đóng kết nối
        process.exit(0);
    }
}

setupDatabase(); 