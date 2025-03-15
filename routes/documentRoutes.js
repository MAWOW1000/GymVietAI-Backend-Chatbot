const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');

// Route để tải lên tài liệu mới
// router.post('/upload', authMiddleware.verifyToken, documentController.uploadDocument);
router.post('/upload', documentController.uploadDocument);

// Route để lấy tất cả tài liệu
// router.get('/', authMiddleware.verifyToken, documentController.getAllDocuments);
router.get('/', documentController.getAllDocuments);

// Route để lấy tài liệu theo ID
// router.get('/:id', authMiddleware.verifyToken, documentController.getDocumentById);
router.get('/:id', documentController.getDocumentById);

// Route để xóa tài liệu
// router.delete('/:id', authMiddleware.verifyToken, documentController.deleteDocument);
router.delete('/:id', documentController.deleteDocument);

router.post('/cleanup', documentController.cleanupInvalidDocuments);

module.exports = router; 