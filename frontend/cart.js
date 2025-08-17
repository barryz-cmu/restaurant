// Cart and Checkout Functionality
let cart = [];
const TAX_RATE = 0.08; // 8% tax rate - adjust as needed

function addToCartFromMenu(button) {
  const menuItem = button.closest('.menu-item');
  const itemName = button.getAttribute('data-item-name');
  
  // Get selected size
  let size = 'Regular';
  const sizeSelect = menuItem.querySelector('select[onchange*="updatePrice"]');
  if (sizeSelect) {
    size = sizeSelect.options[sizeSelect.selectedIndex].value;
  }
  
  // Get selected sides
  let sides = [];
  const sideSelects = menuItem.querySelectorAll('select[onchange*="updateTotalPrice"]');
  sideSelects.forEach(select => {
    sides.push(select.options[select.selectedIndex].value);
  });
  
  // Get current price
  const priceSpan = menuItem.querySelector('.price');
  let price = 0;
  if (priceSpan && priceSpan.textContent !== 'Ask') {
    price = parseFloat(priceSpan.textContent);
  }
  
  // Get selected quantity
  const qtyInput = menuItem.querySelector('.qty-input');
  const quantity = parseInt(qtyInput.value) || 1;
  
  // Add to cart multiple times based on quantity
  for (let i = 0; i < quantity; i++) {
    addToCart(itemName, size, sides.join(', '), price);
  }
  
  // Reset quantity to 1 after adding
  qtyInput.value = 1;
}

function updateItemQuantity(button, change) {
  const qtyInput = button.parentElement.querySelector('.qty-input');
  let currentQty = parseInt(qtyInput.value) || 1;
  currentQty += change;
  
  if (currentQty < 1) currentQty = 1;
  if (currentQty > 99) currentQty = 99;
  
  qtyInput.value = currentQty;
}

function updatePrice(selectElement) {
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const price = selectedOption.getAttribute('data-price');
  const priceSpan = selectElement.closest('.menu-item').querySelector('.price');
  
  if (priceSpan && price) {
    // Check if this item has sides (has data-base-price attribute)
    const basePrice = priceSpan.getAttribute('data-base-price');
    if (basePrice) {
      // Item has sides, update base price and recalculate total
      priceSpan.setAttribute('data-base-price', price);
      updateTotalPrice(selectElement);
    } else {
      // Item has no sides, just update the price
      priceSpan.textContent = parseFloat(price).toFixed(2);
    }
  }
}

function updateTotalPrice(selectElement) {
  const menuItem = selectElement.closest('.menu-item');
  const priceSpan = menuItem.querySelector('.price');
  
  if (!priceSpan) return;
  
  // Get base price from data attribute or current price
  let basePrice = 0;
  const basePriceAttr = priceSpan.getAttribute('data-base-price');
  if (basePriceAttr) {
    basePrice = parseFloat(basePriceAttr);
  } else {
    // For size changes, get from the selected size option
    const sizeSelect = menuItem.querySelector('select[onchange*="updatePrice"]');
    if (sizeSelect) {
      const selectedSizeOption = sizeSelect.options[sizeSelect.selectedIndex];
      const sizePrice = selectedSizeOption.getAttribute('data-price');
      if (sizePrice) {
        basePrice = parseFloat(sizePrice);
        priceSpan.setAttribute('data-base-price', sizePrice);
      }
    }
  }
  
  // Get side price
  let sidePrice = 0;
  const sideSelects = menuItem.querySelectorAll('select[onchange*="updateTotalPrice"]');
  sideSelects.forEach(select => {
    const selectedOption = select.options[select.selectedIndex];
    const sidePriceAttr = selectedOption.getAttribute('data-side-price');
    if (sidePriceAttr) {
      sidePrice += parseFloat(sidePriceAttr);
    }
  });
  
  // Calculate and display total
  const totalPrice = basePrice + sidePrice;
  if (!isNaN(totalPrice)) {
    priceSpan.textContent = totalPrice.toFixed(2);
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

function addToCart(item, size, sides, price) {
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(cartItem => 
        cartItem.item === item && 
        cartItem.size === size && 
        cartItem.sides === sides
    );
    
    if (existingItemIndex !== -1) {
        // Item exists, increase quantity
        cart[existingItemIndex].quantity += 1;
    } else {
        // New item, add to cart
        const cartItem = {
            id: Date.now(),
            item,
            size,
            sides,
            price,
            quantity: 1
        };
        cart.push(cartItem);
    }
    updateCartDisplay();
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCartDisplay();
}

function updateQuantity(itemId, change) {
    const item = cart.find(cartItem => cartItem.id === itemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(itemId);
        } else {
            updateCartDisplay();
        }
    }
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotalDisplay = document.getElementById('cart-total-display');
    
    cartItems.innerHTML = '';

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="color: #666; font-style: italic; margin: 0;">Cart is empty</p>';
    } else {
        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            itemElement.innerHTML = 
                '<div style="flex-grow: 1;">' +
                    '<div style="font-weight: bold;">' + item.item + '</div>' +
                    '<small style="color: #666;">' + item.size + (item.sides ? ', ' + item.sides : '') + '</small>' +
                '</div>' +
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                    '<div style="display: flex; align-items: center; gap: 5px;">' +
                        '<button onclick="updateQuantity(' + item.id + ', -1)" style="background: #6c757d; color: white; border: none; border-radius: 3px; width: 20px; height: 20px; font-size: 12px; display: flex; align-items: center; justify-content: center;">-</button>' +
                        '<span style="min-width: 20px; text-align: center; font-weight: bold;">' + item.quantity + '</span>' +
                        '<button onclick="updateQuantity(' + item.id + ', 1)" style="background: #28a745; color: white; border: none; border-radius: 3px; width: 20px; height: 20px; font-size: 12px; display: flex; align-items: center; justify-content: center;">+</button>' +
                    '</div>' +
                    '<span style="font-weight: bold; min-width: 50px; text-align: right;">$' + (item.price * item.quantity).toFixed(2) + '</span>' +
                    '<button onclick="removeFromCart(' + item.id + ')" style="background: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 12px;">×</button>' +
                '</div>';
            cartItems.appendChild(itemElement);
        });

        // Calculate all totals
        const subtotal = calculateCartSubtotal();
        const tax = calculateCartTax();
        const total = calculateCartTotal();
        
        // Create totals section
        const totalsContainer = document.createElement('div');
        totalsContainer.classList.add('cart-totals');
        totalsContainer.innerHTML = 
            '<div class="cart-subtotal">Subtotal: $' + subtotal.toFixed(2) + '</div>' +
            '<div class="cart-tax">Tax (' + (TAX_RATE * 100).toFixed(1) + '%): $' + tax.toFixed(2) + '</div>' +
            '<div class="cart-total">Total: $' + total.toFixed(2) + '</div>';
        cartItems.appendChild(totalsContainer);
    }
    
    // Show/hide checkout button based on cart contents
    const checkoutButton = document.getElementById('checkout-button');
    if (cart.length > 0) {
        checkoutButton.style.display = 'block';
    } else {
        checkoutButton.style.display = 'none';
    }
    
    // Update header display
    const total = calculateCartTotal();
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalQuantity;
    cartTotalDisplay.textContent = '$' + total.toFixed(2);
}

function calculateCartSubtotal() {
    return cart.reduce((subtotal, item) => subtotal + (item.price * item.quantity), 0);
}

function calculateCartTax() {
    return calculateCartSubtotal() * TAX_RATE;
}

function calculateCartTotal() {
    const subtotal = calculateCartSubtotal();
    const tax = calculateCartTax();
    return subtotal + tax;
}

function toggleCartDetails() {
    const cartDetails = document.getElementById('cart-details');
    const toggleIcon = document.querySelector('.cart-toggle-icon');
    
    if (cartDetails.style.display === 'none') {
        cartDetails.style.display = 'block';
        toggleIcon.textContent = '-';
    } else {
        cartDetails.style.display = 'none';
        toggleIcon.textContent = '+';
    }
}

function toggleCheckout() {
    const checkoutContainer = document.getElementById('checkout-container');
    const checkoutButton = document.getElementById('checkout-button');
    
    if (checkoutContainer.style.display === 'none' || checkoutContainer.style.display === '') {
        checkoutContainer.style.display = 'block';
        checkoutButton.textContent = 'Hide Checkout';
    } else {
        checkoutContainer.style.display = 'none';
        checkoutButton.textContent = 'Proceed to Checkout';
    }
}

// Generate confirmation number
function generateConfirmationNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return 'ORD' + timestamp + random;
}

// Show confirmation page
function showConfirmationPage(orderData) {
    const confirmationHtml = 
        '<div style="text-align: center; padding: 20px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; margin: 20px; color: #155724;">' +
            '<h2 style="margin: 0 0 15px 0; color: #155724;">🎉 Order Confirmed!</h2>' +
            '<div style="background: white; border: 2px solid #28a745; border-radius: 8px; padding: 15px; margin: 15px 0;">' +
                '<h3 style="margin: 0 0 10px 0; color: #28a745;">Confirmation #' + orderData.confirmationNumber + '</h3>' +
                '<p style="margin: 5px 0; font-weight: bold;">Customer: ' + orderData.name + '</p>' +
                '<p style="margin: 5px 0;">Phone: ' + orderData.phone + '</p>' +
            '</div>' +
            '<button onclick="startNewOrder()" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 15px;">Start New Order</button>' +
        '</div>';
    
    // Hide the entire menu and show confirmation
    document.getElementById('menu-container').style.display = 'none';
    document.querySelector('h1').style.display = 'none';
    
    // Create or update confirmation container
    let confirmationContainer = document.getElementById('confirmation-container');
    if (!confirmationContainer) {
        confirmationContainer = document.createElement('div');
        confirmationContainer.id = 'confirmation-container';
        document.body.appendChild(confirmationContainer);
    }
    
    confirmationContainer.innerHTML = confirmationHtml;
    confirmationContainer.style.display = 'block';
    
    // Hide cart
    document.getElementById('cart-container').style.display = 'none';
}

// Start new order (reset everything)
function startNewOrder() {
    // Clear cart
    cart = [];
    updateCartDisplay();
    
    // Show menu again
    document.getElementById('menu-container').style.display = 'block';
    document.querySelector('h1').style.display = 'block';
    
    // Hide confirmation
    const confirmationContainer = document.getElementById('confirmation-container');
    if (confirmationContainer) {
        confirmationContainer.style.display = 'none';
    }
    
    // Show cart again
    document.getElementById('cart-container').style.display = 'block';
    
    // Reset cart to closed state
    document.getElementById('cart-details').style.display = 'none';
    document.querySelector('.cart-toggle-icon').textContent = '+';
}

// Form submission handling
function handleCheckoutSubmit(event) {
    event.preventDefault();
    
    const form = document.getElementById('checkout-form');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    
    const name = nameInput.value.trim();
    const phone = phoneInput.value.replace(/\D/g, ''); // Remove all non-digits
    
    // Validation
    if (name.length < 2) {
        alert('Please enter a valid name (at least 2 characters).');
        nameInput.focus();
        return;
    }
    
    if (phone.length !== 10) {
        alert('Please enter exactly 10 digits for phone number.');
        phoneInput.focus();
        return;
    }
    
    if (cart.length === 0) {
        alert('Your cart is empty. Please add items before checkout.');
        return;
    }
    
    // Calculate totals
    const subtotal = calculateCartSubtotal();
    const tax = calculateCartTax();
    const total = calculateCartTotal();
    
    // Create order data
    const orderData = {
        confirmationNumber: generateConfirmationNumber(),
        name: name,
        phone: phone, // Use the cleaned 10-digit phone number
        items: [...cart],
        subtotal: subtotal,
        tax: tax,
        total: total,
        timestamp: new Date().toISOString()
    };
    
    // Save order to localStorage for future reference
    const savedOrders = JSON.parse(localStorage.getItem('restaurantOrders') || '[]');
    savedOrders.push(orderData);
    localStorage.setItem('restaurantOrders', JSON.stringify(savedOrders));
    
    // Show confirmation page
    showConfirmationPage(orderData);
    
    console.log('Order confirmed:', orderData);
}
