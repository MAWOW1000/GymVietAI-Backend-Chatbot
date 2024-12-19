const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const chatPromptController = require('../controllers/chatPromptController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Chatbot routes
router.post('/chat', verifyToken, chatbotController.chat.bind(chatbotController));
router.get('/history', verifyToken, chatbotController.getChatHistory.bind(chatbotController));

// Chat prompt routes (admin only)
router.get('/prompts', verifyToken, isAdmin, chatPromptController.getAllPrompts);
router.get('/prompts/active', verifyToken, isAdmin, chatPromptController.getActivePrompt);
router.post('/prompts/:id', verifyToken, isAdmin, chatPromptController.updatePrompt);

module.exports = router;
