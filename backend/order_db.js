const db = require("./index")

async function createOrder(orderData) {
    const { name, phone, total} = orderData;
    const confirmation_number = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const result = await db.query(
        `INSERT INTO orders (name, phone, total, time, confirmation_number) 
        VALUES ($1, $2, $3, NOW(), $4) RETURNING *`, 
        [name, phone, total, confirmation_number]);
    return result.rows[0];
}

async function getOrderById(id) {
    const result = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
    return result.rows[0];
}

module.exports = {
    createOrder,
    getOrderById
};