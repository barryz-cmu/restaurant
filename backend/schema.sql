CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL, 
    total NUMERIC(10, 2) NOT NULL,
    time TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INT NOT NULL,
    size TEXT NOT NULL,
    sides TEXT,
    price NUMERIC(10, 2) NOT NULL
);