const db = require('../config/database');

class ChatPromptController {
    async getAllPrompts(req, res) {
        try {
            const [prompts] = await db.query('SELECT * FROM chat_prompts ORDER BY created_at DESC');
            res.json(prompts);
        } catch (error) {
            console.error('Get all prompts error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getActivePrompt(req, res) {
        try {
            const [prompts] = await db.query(
                'SELECT * FROM chat_prompts WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
            );
            
            if (prompts.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy prompt' });
            }

            res.json(prompts[0]);
        } catch (error) {
            console.error('Get active prompt error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async updatePrompt(req, res) {
        try {
            const { id } = req.params;
            const { content, is_active } = req.body;

            if (is_active) {
                // Deactivate all other prompts
                await db.query('UPDATE chat_prompts SET is_active = false');
            }

            await db.query(
                'UPDATE chat_prompts SET content = ?, is_active = ? WHERE id = ?',
                [content, is_active, id]
            );

            res.json({ message: 'Prompt updated successfully' });
        } catch (error) {
            console.error('Update prompt error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = new ChatPromptController();
