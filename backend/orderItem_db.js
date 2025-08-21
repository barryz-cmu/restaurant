const db = require("./index");

async function addItem(orderID, itemData) {
    const { item_name, quantity, size, sides, price } = itemData;
    const result = await db.query("INSERT INTO order_items (order_id, item_name, quantity, size, sides, price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [orderID, item_name, quantity, size, sides, price]);
    return result.rows[0];
}

async function getItemByID(id) {
    const result = await db.query("SELECT * FROM order_items WHERE id = $1", [id]);
    return result.rows[0];
}

module.exports = {
    addItem,
    getItemByID
};