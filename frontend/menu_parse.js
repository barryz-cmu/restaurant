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
menuItems.forEach(item => {
  if (!item.Item) return;
  
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

Object.values(groupedItems).forEach(item => {
  // Add category headers
  const itemCategory = item['Category'] || '';
  if (itemCategory && itemCategory.trim() !== currentCategory) {
    currentCategory = itemCategory.trim();
    menuHtml += `<h2 class="category-header">${currentCategory}</h2>`;
  }
  
  menuHtml += `<div class='menu-item' onclick="toggleDetails(this)">`;
  menuHtml += `  <div class="item-header">`;
  menuHtml += `    <h3>${item.Alias || ''}. ${item.Item} <span class="toggle-icon">+</span></h3>`;
  menuHtml += `  </div>`;
  menuHtml += `  <div class="item-details" style="display: none;">`;

  if (item.Description) menuHtml += `    <p><i>${item.Description}</i></p>`;

  // Handle pricing - either single price or size-based pricing
  if (item.sizes.length > 0) {
    menuHtml += `    <label onclick="event.stopPropagation()">Size: <select onchange="updatePrice(this)" onclick="event.stopPropagation()">`;
    item.sizes.forEach((sizeInfo, index) => {
      const selected = index === 0 ? ' selected' : '';
      menuHtml += `<option value='${sizeInfo.size}' data-price='${sizeInfo.price}'${selected}>${sizeInfo.size}</option>`;
    });
    menuHtml += `</select></label><br/>`;
    menuHtml += `    <p><strong>Price:</strong> $<span class="price">${item.sizes[0].price}</span></p>`;
  } else {
    if (item.Price || item.price) {
      menuHtml += `    <p><strong>Price:</strong> $${item.Price || item.price}</p>`;
    } else {
      menuHtml += `    <p><strong>Price:</strong> <em>Ask</em></p>`;
    }
  }
  
  if ((item.Main_Side || '').toUpperCase() === 'YES') {
    menuHtml += `    <label onclick="event.stopPropagation()">Side: <select onclick="event.stopPropagation()">`;
    mainSides.forEach(side => {
      if (side.Name && side.Price !== undefined) {
        menuHtml += `<option value='${side.Name}'>${side.Name} ($${side.Price})</option>`;
      }
    });
    menuHtml += `</select></label><br/>`;
  }
  if ((item.Combo_Side || '').toUpperCase() === 'YES') {
    menuHtml += `    <label onclick="event.stopPropagation()">Side: <select onclick="event.stopPropagation()">`;
    comboSides.forEach(side => {
      if (side.Name && side.Price !== undefined) {
        menuHtml += `<option value='${side.Name}'>${side.Name} ($${side.Price})</option>`;
      }
    });
    menuHtml += `</select></label><br/>`;
  }
  menuHtml += `  </div>`; // Close item-details
  menuHtml += `</div>`; // Close menu-item
});

// Insert menuHtml into menu.html at #menu-container (robust replacement)
const htmlPath = path.join(__dirname, 'menu.html');

// Create a fresh HTML template each run
const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Restaurant Menu</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    .menu-item {
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
      margin-top: 10px;
      padding-top: 10px;
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
    }
  </style>
</head>
<body>
  <h1>Asian Wok Menu</h1>
  <div id="menu-container">
${menuHtml}  </div>
  <script>
function updatePrice(selectElement) {
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const price = selectedOption.getAttribute('data-price');
  const priceSpan = selectElement.closest('.menu-item').querySelector('.price');
  if (priceSpan && price) {
    priceSpan.textContent = price;
  }
}

function toggleDetails(menuItem) {
  const details = menuItem.querySelector('.item-details');
  const icon = menuItem.querySelector('.toggle-icon');
  
  if (details.style.display === 'none') {
    details.style.display = 'block';
    icon.textContent = '-';
  } else {
    details.style.display = 'none';
    icon.textContent = '+';
  }
}
  </script>
</body>
</html>`;

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Menu HTML with collapsible items created successfully!');
