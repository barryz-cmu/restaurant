const order = require("./order_db");
const orderItem = require("./orderItem_db");

const TAX_RATE = 0.08; // 8% tax

// Handles creating a new order
async function createOrderController(req, res) {
    try {
        const { name, phone, items } = req.body;

        // Validate input
        if (!name || !phone || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Invalid input" });
        }

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = subtotal * TAX_RATE;
        const total = subtotal + tax;

        // Create the order in the orders table
        const newOrder = await order.createOrder({ name, phone, total });
        if (!newOrder) {
            return res.status(500).json({ error: "Failed to create order" });
        }

        // Insert items into order_items table
        for (const item of items) {
            const dbItem = {
                item_name: item.item,
                quantity: item.quantity,
                size: item.size,
                sides: item.sides,
                price: item.price
            };
            await orderItem.addItem(newOrder.id, dbItem);
        }

        // Return confirmation object with totals
        res.status(201).json({
            orderId: newOrder.id,
            confirmation_number: newOrder.confirmation_number,
            name,
            phone,
            items,
            subtotal,
            tax,
            total
        });

    } catch (err) {
        console.error("Error creating order:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Fetch an order by ID
async function getOrderController(req, res) {
    try {
        const { id } = req.params;
        const orderData = await order.getOrderById(id);
        if (!orderData) return res.status(404).json({ error: "Order not found" });

        const orderItems = await orderItem.getItemsByOrderId(id);

        // Calculate totals for retrieved order
        const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = subtotal * TAX_RATE;
        const total = subtotal + tax;

        res.status(200).json({ ...orderData, items: orderItems, subtotal, tax, total });
    } catch (err) {
        console.error("Error fetching order:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = {
    createOrderController,
    getOrderController
};
