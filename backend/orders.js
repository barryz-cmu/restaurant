const express = require('express');
const router = express.Router();

// 1. Import your controllers
const {
    createOrderController,
    getOrderController
} = require('orderController');

// 2. Define routes


// Create a new order
// POST /api/orders
router.post('/', createOrderController);

// Get an order by ID
// GET /api/orders/:id
router.get('/:id', getOrderController);

// 3. Export router
module.exports = router;