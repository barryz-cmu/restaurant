const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync').parse;

function parseCSV(data) {
  // Remove BOM if present (this means removing the first character if it's a zero-width space)
  if (data.charCodeAt(0) === 0xFEFF) {
    data = data.slice(1);
  }
  return parse(data, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

// Read CSV files
const menuCSV = fs.readFileSync(path.join(__dirname, 'menu.csv'), 'utf8');
const mainSidesCSV = fs.readFileSync(path.join(__dirname, 'main_sides.csv'), 'utf8');
const comboSidesCSV = fs.readFileSync(path.join(__dirname, 'combo_sides.csv'), 'utf8');

const menuItems = parseCSV(menuCSV);
const mainSides = parseCSV(mainSidesCSV);
const comboSides = parseCSV(comboSidesCSV);

// Generate only the menu HTML (for #menu-container)
let menuHtml = '';
let currentCategory = '';

// Group items by name to handle Small/Large variants
const groupedItems = {};
const categories = new Set(); // Collect unique categories

menuItems.forEach(item => {
  if (!item.Item) return;
  
  // Collect categories for navigation
  if (item.Category && item.Category.trim()) {
    categories.add(item.Category.trim());
  }
  
  // Only group items that have the same Category, Alias, Item name, and other properties except Size and Price
  const baseKey = `${item.Category}-${item.Alias}-${item.Item}-${item.Description}-${item.Main_Side}-${item.Combo_Side}`;
  
  if (!groupedItems[baseKey]) {
    groupedItems[baseKey] = {
      ...item,
      sizes: []
    };
  }
  
  if (item.Size && item.Size.trim()) {
    // This item has a size, add it to the sizes array
    groupedItems[baseKey].sizes.push({
      size: item.Size.trim(),
      price: item.Price
    });
    // Clear the individual price since we'll use size-based pricing
    delete groupedItems[baseKey].Price;
  } else if (groupedItems[baseKey].sizes.length === 0) {
    // This item has no size and we haven't added any sizes yet
    groupedItems[baseKey].Price = item.Price;
  }
});

// Create navigation menu
const categoryArray = Array.from(categories).sort();
let navigationHtml = '<div class="navigation-menu">';
navigationHtml += '<h3>Categories:</h3>';
navigationHtml += '<div class="nav-links">';
categoryArray.forEach(category => {
  const anchorId = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  navigationHtml += `<a href="#${anchorId}" class="nav-link">${category}</a>`;
});
navigationHtml += '</div>';
navigationHtml += '</div>';

Object.values(groupedItems).forEach(item => {
  // Add category headers with anchor IDs
  const itemCategory = item['Category'] || '';
  if (itemCategory && itemCategory.trim() !== currentCategory) {
    currentCategory = itemCategory.trim();
    const anchorId = currentCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    menuHtml += `<h2 class="category-header" id="${anchorId}">${currentCategory}</h2>`;
  }
  
  menuHtml += `<div class='menu-item' onclick="toggleDetails(this)">`;
  menuHtml += `  <div class="item-header">`;
  menuHtml += `    <h3>${item.Alias || ''}. ${item.Item} <span class="toggle-icon">+</span></h3>`;
  menuHtml += `  </div>`;
  menuHtml += `  <div class="item-details" style="display: none;">`;

  if (item.Description) menuHtml += `    <p><i>${item.Description}</i></p>`;

  // Handle pricing - either single price or size-based pricing
  const hasSides = (item.Main_Side || '').toUpperCase() === 'YES' || (item.Combo_Side || '').toUpperCase() === 'YES';
  
  if (item.sizes.length > 0) {
    menuHtml += `    <label onclick="event.stopPropagation()">Size: <select onchange="updatePrice(this)" onclick="event.stopPropagation()">`;
    item.sizes.forEach((sizeInfo, index) => {
      const selected = index === 0 ? ' selected' : '';
      const formattedPrice = parseFloat(sizeInfo.price).toFixed(2);
      menuHtml += `<option value='${sizeInfo.size}' data-price='${formattedPrice}'${selected}>${sizeInfo.size}</option>`;
    });
    menuHtml += `</select></label><br/>`;
    
    if (hasSides) {
      menuHtml += `    <div class="price-display" style="display:none;"><strong>Base Price:</strong> $<span class="base-price">${parseFloat(item.sizes[0].price).toFixed(2)}</span></div>`;
    }
  } else {
    if (item.Price || item.price) {
      if (hasSides) {
        const formattedPrice = parseFloat(item.Price || item.price).toFixed(2);
        menuHtml += `    <div class="price-display" style="display:none;"><strong>Base Price:</strong> $<span class="base-price">${formattedPrice}</span></div>`;
      }
    }
  }
  
  if ((item.Main_Side || '').toUpperCase() === 'YES') {
    menuHtml += `    <label onclick="event.stopPropagation()">Side: <select onchange="updateTotalPrice(this)" onclick="event.stopPropagation()">`;
    mainSides.forEach((side, index) => {
      if (side.Name && side.Price !== undefined) {
        const selected = index === 0 ? ' selected' : '';
        const formattedSidePrice = parseFloat(side.Price).toFixed(2);
        menuHtml += `<option value='${side.Name}' data-side-price='${formattedSidePrice}'${selected}>${side.Name} (+$${formattedSidePrice})</option>`;
      }
    });
    menuHtml += `</select></label><br/>`;
  }
  if ((item.Combo_Side || '').toUpperCase() === 'YES') {
    menuHtml += `    <label onclick="event.stopPropagation()">Side: <select onchange="updateTotalPrice(this)" onclick="event.stopPropagation()">`;
    comboSides.forEach((side, index) => {
      if (side.Name && side.Price !== undefined) {
        const selected = index === 0 ? ' selected' : '';
        const formattedSidePrice = parseFloat(side.Price).toFixed(2);
        menuHtml += `<option value='${side.Name}' data-side-price='${formattedSidePrice}'${selected}>${side.Name} (+$${formattedSidePrice})</option>`;
      }
    });
    menuHtml += `</select></label><br/>`;
  }
  
  // Display price based on whether item has sides or not
  if (hasSides) {
    // Calculate total price including default side
    let basePrice = 0;
    let sidePrice = 0;
    
    if (item.sizes.length > 0) {
      basePrice = parseFloat(item.sizes[0].price);
    } else if (item.Price || item.price) {
      basePrice = parseFloat(item.Price || item.price);
    }
    
    if ((item.Main_Side || '').toUpperCase() === 'YES' && mainSides.length > 0) {
      sidePrice = parseFloat(mainSides[0].Price || 0);
    } else if ((item.Combo_Side || '').toUpperCase() === 'YES' && comboSides.length > 0) {
      sidePrice = parseFloat(comboSides[0].Price || 0);
    }
    
    const totalPrice = basePrice + sidePrice;
    
    if (!isNaN(totalPrice)) {
      menuHtml += `    <p><strong>Total:</strong> $<span class="price" data-base-price="${basePrice.toFixed(2)}">${totalPrice.toFixed(2)}</span></p>`;
    }
  } else {
    // Simple price display for items without sides
    if (item.sizes.length > 0) {
      const initialPrice = parseFloat(item.sizes[0].price).toFixed(2);
      menuHtml += `    <p><strong>Price:</strong> $<span class="price">${initialPrice}</span></p>`;
    } else if (item.Price || item.price) {
      const formattedPrice = parseFloat(item.Price || item.price).toFixed(2);
      menuHtml += `    <p><strong>Price:</strong> $<span class="price">${formattedPrice}</span></p>`;
    } else {
      menuHtml += `    <p><strong>Price:</strong> <span class="price"><em>Ask</em></span></p>`;
    }
  }
  
  // Add quantity selector
  menuHtml += `    <div class="quantity-selector">`;
  menuHtml += `      <label onclick="event.stopPropagation()">Quantity: `;
  menuHtml += `        <button type="button" onclick="updateItemQuantity(this, -1); event.stopPropagation();" class="qty-btn">-</button>`;
  menuHtml += `        <input type="number" value="1" min="1" max="99" class="qty-input" onclick="event.stopPropagation();" onchange="event.stopPropagation();">`;
  menuHtml += `        <button type="button" onclick="updateItemQuantity(this, 1); event.stopPropagation();" class="qty-btn">+</button>`;
  menuHtml += `      </label>`;
  menuHtml += `    </div>`;
  
  // Add "Add to Cart" button
  const itemName = `${item.Alias || ''}. ${item.Item}`;
  menuHtml += `    <button onclick="addToCartFromMenu(this)" class="add-to-cart-btn" data-item-name="${itemName.replace(/"/g, '&quot;')}">Add to Cart</button>`;
  
  menuHtml += `  </div>`; // Close item-details
  menuHtml += `</div>`; // Close menu-item
});

const htmlPath = path.join(__dirname, 'index.html');
const cssPath = path.join(__dirname, 'styles.css');

// Create a fresh HTML template each run
const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Restaurant Menu</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Asian Wok Menu</h1>
  <div id="menu-container">
${navigationHtml}
${menuHtml}  </div>
  <div id="cart-container">
    <div class="cart-header" onclick="toggleCartDetails()">
      <h3>
        <span class="cart-left">🛒 Cart (<span id="cart-count">0 items</span>)</span>
        <span class="cart-right">
          <span id="cart-total-display">$0.00</span>
          <span class="cart-toggle-icon">+</span>
        </span>
      </h3>
    </div>
    <div id="cart-details" style="display: none;">
      <div id="cart-items"></div>
      <button id="checkout-button" onclick="toggleCheckout()" style="display: none;">Proceed to Checkout</button>
      <div id="checkout-container" style="display: none;">
          <form id="checkout-form" onsubmit="handleCheckoutSubmit(event)">
              <label for="name">Name:</label>
              <input type="text" id="name" name="name" required>

              <label for="phone">Phone:</label>
              <input type="tel" id="phone" name="phone" required placeholder="1234567890">

              <button type="submit">Submit Order</button>
          </form>
      </div>
      <div id="confirmation-message"></div>
    </div>
  </div>
  <script src="cart.js"></script>
</body>
</html>`;

const cssContent = 
`.menu-item {
  cursor: pointer;
  border: 1px solid #ddd;
  margin: 5px 0;
  padding: 10px;
  border-radius: 5px;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.item-header h3 {
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-icon {
  font-weight: bold;
  font-size: 1.2em;
  transition: transform 0.3s;
}

.item-details {
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid #eee;
}

.item-details label {
  display: block;
  margin: 5px 0;
}

.item-details select {
  margin-left: 10px;
}

.category-header {
  color: #333;
  border-bottom: 2px solid #333;
  padding-bottom: 5px;
  margin-top: 20px;
  scroll-margin-top: 20px; /* Account for fixed navigation if any */
}

.navigation-menu {
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.navigation-menu h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 1.1em;
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.nav-link {
  background-color: #007bff;
  color: white;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 5px;
  font-size: 0.9em;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: #0056b3;
  text-decoration: none;
}

@media (max-width: 768px) {
  .nav-links {
    flex-direction: column;
  }
  .nav-link {
    text-align: center;
  }
}

.add-to-cart-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
  font-size: 0.9em;
}

.add-to-cart-btn:hover {
  background-color: #218838;
}

.quantity-selector {
  margin: 10px 0;
}

.quantity-selector label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.qty-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-btn:hover {
  background-color: #5a6268;
}

.qty-input {
  width: 60px;
  height: 30px;
  text-align: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
}

#cart-container {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 300px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  z-index: 1000;
}

.cart-header {
  background-color: #f8f9fa;
  padding: 10px 15px;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  border-bottom: 1px solid #ddd;
  user-select: none;
}

.cart-header:hover {
  background-color: #e9ecef;
}

.cart-header h3 {
  margin: 0;
  font-size: 1em;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.cart-left {
  text-align: left;
  white-space: nowrap;
}

.cart-right {
  text-align: right;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
}

#cart-count {
  font-weight: bold;
}

#checkout-form {
  padding: 15px;
  border-top: 1px solid #ddd;
  background-color: #f8f9fa;
}

#checkout-form label {
  display: block;
  margin-top: 10px;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

#checkout-form label:first-child {
  margin-top: 0;
}

#checkout-form input {
  display: block;
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 14px;
}

#checkout-form button {
  display: block;
  width: 100%;
  margin-top: 15px;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

#checkout-form button:hover {
  background-color: #0056b3;
}

#checkout-button {
  width: 100%;
  margin-top: 15px;
  padding: 12px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

#checkout-button:hover {
  background-color: #218838;
}

.cart-toggle-icon {
  font-weight: bold;
  font-size: 1.2em;
  transition: transform 0.3s;
}

#cart-details {
  max-height: 300px;
  overflow-y: auto;
  padding: 10px 15px;
}

#cart-items {
  min-height: 20px;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  gap: 10px;
}

.cart-total {
  font-weight: bold;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 2px solid #333;
}

.cart-totals {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #ddd;
}

.cart-subtotal, .cart-tax {
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
  color: #666;
}

.cart-total {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  font-size: 1.1em;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 2px solid #333;
}`

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
fs.writeFileSync(cssPath, cssContent, 'utf8');
console.log('Menu HTML with collapsible items created successfully!');
