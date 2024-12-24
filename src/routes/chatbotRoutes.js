const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const chatPromptController = require('../controllers/chatPromptController');

// Chatbot routes
router.post('/chat', chatbotController.chat.bind(chatbotController));
router.get('/history', chatbotController.getChatHistory.bind(chatbotController));

// Chat prompt routes (admin only)
router.get('/prompts', chatPromptController.getAllPrompts);
router.get('/prompts/active', chatPromptController.getActivePrompt);
router.post('/prompts/:id', chatPromptController.updatePrompt);

module.exports = router;
