const express = require('express');
const cors = require('cors');
require('dotenv').config();

const chatbotRoutes = require('./routes/chatbotRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/documents', documentRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 7999;
app.listen(PORT, () => {
    console.log(`Chatbot Service running on port ${PORT}`);
});
