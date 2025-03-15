const fs = require('fs');
const path = require('path');
const pool = require('./database');

async function updateRagDatabase() {
    try {
        console.log('Bắt đầu cập nhật cơ sở dữ liệu cho tính năng RAG...');
        
        // Đọc file SQL cập nhật cho RAG
        const updateSqlFilePath = path.join(__dirname, 'update_database_for_rag.sql');
        const updateSqlScript = fs.readFileSync(updateSqlFilePath, 'utf8');
        
        // Chia các câu lệnh SQL
        const updateSqlStatements = updateSqlScript
            .split(';')
            .filter(statement => statement.trim() !== '');
        
        // Thực thi từng câu lệnh SQL
        for (const statement of updateSqlStatements) {
            if (statement.trim()) {
                try {
                    await pool.query(statement);
                    console.log('Thực thi câu lệnh SQL thành công.');
                } catch (queryError) {
                    console.error('Lỗi khi thực thi câu lệnh SQL:', queryError.message);
                    console.log('Câu lệnh gây lỗi:', statement);
                }
            }
        }
        
        console.log('Cập nhật cơ sở dữ liệu cho tính năng RAG thành công!');
    } catch (error) {
        console.error('Lỗi khi cập nhật cơ sở dữ liệu:', error);
    } finally {
        // Đóng kết nối
        process.exit(0);
    }
}

updateRagDatabase(); 