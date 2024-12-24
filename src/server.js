const express = require('express');
const cors = require('cors');
require('dotenv').config();

const chatbotRoutes = require('./routes/chatbotRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/chatbot', chatbotRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Chatbot Service running on port ${PORT}`);
});
