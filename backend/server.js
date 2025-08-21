const express = require('express');
const cors = require('cors');
const { createOrderController, getOrderController } = require('./orderController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable cross-origin requests (essential for frontend)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data if needed

// API Routes
app.post('/api/orders', createOrderController);
app.get('/api/orders/:id', getOrderController);

// Health check / Default route
app.get('/', (req, res) => {
    res.send('Restaurant backend server is running!');
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

