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

// Create the complete menu content (navigation + menu items)
const menuContent = navigationHtml + '\n' + menuHtml;

// Write just the menu content to a file that can be included
fs.writeFileSync(path.join(__dirname, 'index.html'), menuContent, 'utf8');

console.log('Menu content generated successfully! Saved to index.html');
