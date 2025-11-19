// J4R BOX - Frontend Logic (COMPLETE - NEW CATEGORY SYSTEM)
const el = s => document.querySelector(s);
const els = s => Array.from(document.querySelectorAll(s));

const fmt = {
  format: (num) => {
    const rounded = Math.round(num);
    return '₱' + rounded.toLocaleString('en-PH');
  }
};

const DEFAULT_API_BASE = 'https://j4r-box-api.onrender.com';
let API = {
  base: localStorage.getItem('apiBase') || DEFAULT_API_BASE,
  products: function(){ return `${this.base.replace(/\/$/,'')}/api/products`; },
  login: function(){ return `${this.base.replace(/\/$/,'')}/api/auth/login`; },
  register: function(){ return `${this.base.replace(/\/$/,'')}/api/auth/register`; }
};

let authToken = localStorage.getItem('authToken') || null;

const ADMIN = { name: 'Jei Raido', email: 'JeiRaido11254@gmail.com', password: 'JayRide4' };
(function ensureLocalUsers(){
  try {
    const users = JSON.parse(localStorage.getItem('localUsers') || '[]');
    if (!users.find(u => u.email === ADMIN.email)) {
      users.push({ id: 'admin-local', name: ADMIN.name, email: ADMIN.email, password: ADMIN.password, admin: true });
      localStorage.setItem('localUsers', JSON.stringify(users));
    }
  } catch(e) {
    localStorage.setItem('localUsers', JSON.stringify([{ id:'admin-local', name: ADMIN.name, email: ADMIN.email, password: ADMIN.password, admin: true }]));
  }
})();

// ✅ FIX: Get cart key based on user
function getCartKey() {
  const user = state.user;
  if(user && user.email) {
    return 'cart_' + user.email;
  }
  return 'cart';
}

function loadCart() {
  const cartKey = getCartKey();
  const cartData = localStorage.getItem(cartKey);
  return JSON.parse(cartData || '[]');
}

function saveCart() {
  const cartKey = getCartKey();
  localStorage.setItem(cartKey, JSON.stringify(state.cart));
}

const state = {
  products: [],
  cart: [],
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  filters: { q:'', category:'physical', sort:'featured' } // ✅ Default to physical
};

state.cart = loadCart();

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function hideAllModals() {
  const authModal = document.getElementById('authModal');
  if(authModal) {
    authModal.style.display = 'none';
    authModal.classList.add('hidden');
  }
  
  const authBackdrop = document.getElementById('authBackdrop');
  if(authBackdrop) {
    authBackdrop.style.display = 'none';
    authBackdrop.style.opacity = '0';
  }
  
  const adminModal = document.getElementById('adminModal');
  if(adminModal) {
    adminModal.classList.remove('active');
    adminModal.style.display = 'none';
  }
  
  const settingsModal = document.getElementById('settingsModal');
  if(settingsModal) {
    settingsModal.classList.remove('active');
    settingsModal.style.display = 'none';
  }
  
  document.body.style.background = '';
  document.body.style.overflow = '';
}

function toast(msg, ms=3000){
  const t = el('#toast');
  if(!t) return;
  
  t.textContent = msg;
  t.classList.remove('hidden');
  t.style.display = 'block';
  t.style.opacity = '1';
  
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => {
      t.classList.add('hidden');
      t.style.display = 'none';
    }, 300);
  }, ms);
}

function flyToCart(productElement) {
  const cartBtn = document.getElementById('openCartBtn');
  if(!cartBtn || !productElement) return;
  
  const productRect = productElement.getBoundingClientRect();
  const cartRect = cartBtn.getBoundingClientRect();
  
  const flyingItem = document.createElement('div');
  flyingItem.className = 'flying-item';
  
  const productImg = productElement.querySelector('img');
  if(productImg) {
    flyingItem.style.backgroundImage = `url(${productImg.src})`;
    flyingItem.style.backgroundSize = 'cover';
    flyingItem.style.backgroundPosition = 'center';
  } else {
    flyingItem.style.background = 'linear-gradient(135deg, #38b6ff, #93ffd8)';
  }
  
  flyingItem.style.left = productRect.left + 'px';
  flyingItem.style.top = productRect.top + 'px';
  
  const tx = cartRect.left - productRect.left;
  const ty = cartRect.top - productRect.top;
  
  flyingItem.style.setProperty('--tx', tx + 'px');
  flyingItem.style.setProperty('--ty', ty + 'px');
  
  document.body.appendChild(flyingItem);
  
  const cartCount = document.getElementById('cartCount');
  if(cartCount) {
    cartCount.classList.add('cart-pulse');
    setTimeout(() => cartCount.classList.remove('cart-pulse'), 400);
  }
  
  setTimeout(() => {
    flyingItem.remove();
  }, 800);
}

// ============= MONGODB API FUNCTIONS =============

async function apiGetProducts(){
  try {
    const res = await fetch(API.products());
    if(!res.ok) throw new Error('API products unreachable');
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error('Unexpected response');
    
    // ✅ Map old categories to new ones
    const mappedData = data.map(product => {
      let category = product.category;
      
      // Map old categories
      if(category === 'virtual') category = 'digital';
      if(category === 'accessory') category = 'physical';
      
      return { ...product, category };
    });
    
    localStorage.setItem('cachedProducts', JSON.stringify(mappedData));
    console.log('✅ Fetched products from MongoDB:', mappedData.length);
    return mappedData;
  } catch(err){
    console.warn('⚠️ API offline, using cached products');
    const cached = JSON.parse(localStorage.getItem('cachedProducts') || '[]');
    
    // ✅ Map old categories in cached data too
    return cached.map(product => {
      let category = product.category;
      if(category === 'virtual') category = 'digital';
      if(category === 'accessory') category = 'physical';
      return { ...product, category };
    });
  }
}

async function apiCreateProduct(p){
  if(!authToken) {
    toast('❌ Please login as admin first');
    throw new Error('Not authenticated');
  }

  try {
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };
    
    console.log('📤 Creating product in MongoDB:', p);
    
    const res = await fetch(API.products(), { 
      method: 'POST', 
      headers, 
      body: JSON.stringify(p) 
    });
    
    if(!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create product');
    }
    
    const data = await res.json();
    console.log('✅ Product created in MongoDB:', data);
    return data;
    
  } catch(e) {
    console.error('❌ MongoDB Create Error:', e);
    toast('❌ Failed to create: ' + e.message);
    throw e;
  }
}

async function apiUpdateProduct(id, p){
  if(!authToken) {
    toast('❌ Please login as admin first');
    throw new Error('Not authenticated');
  }

  try {
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };
    
    console.log('📤 Updating product in MongoDB:', id, p);
    
    const res = await fetch(`${API.products().replace(/\/$/,'')}/${id}`, { 
      method: 'PUT', 
      headers, 
      body: JSON.stringify(p) 
    });
    
    if(!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update product');
    }
    
    const data = await res.json();
    console.log('✅ Product updated in MongoDB:', data);
    return data;
    
  } catch(e) {
    console.error('❌ MongoDB Update Error:', e);
    toast('❌ Failed to update: ' + e.message);
    throw e;
  }
}

async function apiDeleteProduct(id){
  if(!authToken) {
    toast('❌ Please login as admin first');
    throw new Error('Not authenticated');
  }

  try {
    const headers = { 
      'Authorization': `Bearer ${authToken}`
    };
    
    console.log('📤 Deleting product from MongoDB:', id);
    
    const res = await fetch(`${API.products().replace(/\/$/,'')}/${id}`, { 
      method: 'DELETE', 
      headers 
    });
    
    if(!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete product');
    }
    
    console.log('✅ Product deleted from MongoDB');
    return true;
    
  } catch(e) {
    console.error('❌ MongoDB Delete Error:', e);
    toast('❌ Failed to delete: ' + e.message);
    throw e;
  }
}

async function apiRegister({name,email,password}){
  try {
    const res = await fetch(API.register(), { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({name,email,password}) 
    });
    
    if(res.ok) {
      const data = await res.json();
      console.log('✅ Registered in MongoDB:', data);
      return data;
    }
    throw new Error('Register failed');
  } catch(e){
    console.warn('⚠️ Using localStorage registration');
    const users = JSON.parse(localStorage.getItem('localUsers')||'[]');
    if(users.find(u=>u.email===email)) throw new Error('Email already exists');
    const u = { id: uid(), name, email, password };
    users.push(u); 
    localStorage.setItem('localUsers', JSON.stringify(users));
    return { user: { name, email }, token: 'local-'+uid() };
  }
}

async function apiLogin({email,password}){
  try {
    const res = await fetch(API.login(), { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({email,password}) 
    });
    
    if(res.ok) {
      const data = await res.json();
      console.log('✅ Logged in via MongoDB:', data);
      return data;
    }
    throw new Error('Login failed');
  } catch(e){
    console.warn('⚠️ Using localStorage login');
    const users = JSON.parse(localStorage.getItem('localUsers')||'[]');
    const u = users.find(x => x.email === email && x.password === password);
    if(u) return { user:{ name: u.name, email: u.email, admin: u.admin || false }, token: 'local-'+uid() };
    if(email === ADMIN.email && password === ADMIN.password) {
      return { user:{ name: ADMIN.name, email: ADMIN.email, admin:true }, token: 'local-admin-'+uid() };
    }
    throw new Error('Invalid credentials');
  }
}

// ============= ✅ NEW RENDER FUNCTION WITH CATEGORY SYSTEM =============
function renderProducts(){
  const grid = el('#productGrid');
  if(!grid) return;
  
  // ✅ Show loader while rendering
  const loader = document.getElementById('j4r-loader');
  if(loader) {
    loader.classList.remove('hidden');
  }
  
  let list = [...state.products];
  
  const q = (state.filters.q || '').toLowerCase().trim();
  if(q) {
    list = list.filter(p => {
      const name = (p.name || '').toLowerCase();
      return name.includes(q);
    });
  }
  
  if(state.filters.category && state.filters.category !== 'all') {
    list = list.filter(p => p.category === state.filters.category);
  }
  
  switch(state.filters.sort){
    case 'price-asc': list.sort((a,b)=>a.price-b.price); break;
    case 'price-desc': list.sort((a,b)=>b.price-a.price); break;
    case 'name-asc': list.sort((a,b)=>a.name.localeCompare(b.name)); break;
    case 'name-desc': list.sort((a,b)=>b.name.localeCompare(a.name)); break;
    default: break;
  }

  if(list.length === 0) {
    grid.innerHTML = `
      <!-- Keep the loader structure -->
      <div id="j4r-loader" class="col-span-full j4r-loader-container">
        <div id="load">
          <div>G</div>
          <div>N</div>
          <div>I</div>
          <div>D</div>
          <div>A</div>
          <div>O</div>
          <div>L</div>
        </div>
        <p class="loader-subtitle">Connecting to J4R Box Inventory...</p>
      </div>
      
      <div class="col-span-full text-center py-12">
        <div class="text-slate-400 text-xl">No products found${q ? ` matching "${q}"` : ''}</div>
        <button onclick="window.state.filters.q=''; window.state.filters.category='physical'; window.renderProducts(); if(document.getElementById('search-input'))document.getElementById('search-input').value=''; document.querySelectorAll('.category-main-btn').forEach(b=>{b.classList.remove('active'); if(b.dataset.category==='physical')b.classList.add('active')});" 
          class="mt-4 px-6 py-2 rounded" 
          style="background: linear-gradient(135deg, #38b6ff, #93ffd8); color: #000; font-weight: 700;">
          Clear Filters
        </button>
      </div>
    `;
    
    // Hide loader after showing "no products"
    setTimeout(() => {
      const loaderAfter = document.getElementById('j4r-loader');
      if(loaderAfter) loaderAfter.classList.add('hidden');
    }, 500);
    return;
  }

  // ✅ Render products (keep your existing product rendering code)
  grid.innerHTML = `
    <!-- Keep the loader structure -->
    <div id="j4r-loader" class="col-span-full j4r-loader-container">
      <div id="load">
        <div>G</div>
        <div>N</div>
        <div>I</div>
        <div>D</div>
        <div>A</div>
        <div>O</div>
        <div>L</div>
      </div>
      <p class="loader-subtitle">Connecting to J4R Box Inventory...</p>
    </div>
  ` + list.map(p=>{
    // ... your existing product card rendering code ...
    let stockText = '';
    let stockClass = '';
    let showStockBadge = true;
    
    if(p.category === 'currency' || p.category === 'digital') {
      showStockBadge = false;
    } else if(p.category === 'physical') {
      if(p.stock > 100) {
        stockText = 'In Stock';
        stockClass = 'unlimited';
      } else if(p.stock > 10) {
        stockText = `${p.stock} Left`;
      } else if(p.stock > 0) {
        stockText = `Only ${p.stock} Left!`;
      } else {
        stockText = 'Out of Stock';
        stockClass = 'out-of-stock';
      }
    }

    let categoryText = '';
    let categoryColor = '';
    switch(p.category) {
      case 'digital':
        categoryText = '🎮 Digital';
        categoryColor = 'rgba(56, 182, 255, 0.9)';
        break;
      case 'physical':
        categoryText = '📦 Physical';
        categoryColor = 'rgba(147, 255, 216, 0.9)';
        break;
      case 'currency':
        categoryText = '💎 Currency';
        categoryColor = 'rgba(255, 215, 0, 0.9)';
        break;
      default:
        categoryText = '📌 Other';
        categoryColor = 'rgba(128, 128, 128, 0.9)';
    }

    let actionButton = '';
    if(p.category === 'currency') {
      actionButton = `<button data-buy-currency="${p._id}">Buy</button>`;
    } else if(p.category === 'digital') {
      actionButton = `<button data-buy-digital="${p._id}">Buy</button>`;
    } else {
      actionButton = `<button data-add="${p._id}">Add to Cart</button>`;
    }

    return `
<div class="card p-4 rounded-lg flex flex-col" data-product-id="${p._id}">
  <div class="flex items-center justify-between gap-3 mb-3 px-1">
    <div class="category-badge-top" style="background: ${categoryColor}">${categoryText}</div>
    ${showStockBadge ? `<div class="stock-badge-top ${stockClass}">${stockText}</div>` : ''}
  </div>
  
  <div class="h-44 overflow-hidden mb-3 relative">
    ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" class="product-img w-full h-full object-cover rounded">` : `<div class="img-fallback h-44 rounded">No image</div>`}
  </div>
  <div class="flex-grow">
    <div class="font-semibold line-clamp-2">${escapeHtml(p.name)}</div>
    <div class="text-xs text-slate-400 mt-1">${escapeHtml(p.description||'')}</div>
  </div>
  <div class="mt-3 flex items-center justify-between">
    <div class="text-indigo-300 font-bold">${fmt.format(p.price)}</div>
  </div>
  <div class="btn-container mt-3">
    ${actionButton}
    ${isAdmin() ? `<button data-edit="${p._id}">Edit</button>` : ''}
  </div>
</div>
  `;
  }).join('');

  // ✅ Hide loader after products are rendered
  setTimeout(() => {
    const loaderFinal = document.getElementById('j4r-loader');
    if(loaderFinal) {
      loaderFinal.classList.add('hidden');
    }
  }, 800); // Show loading for 800ms minimum

  // Re-attach event listeners
  grid.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', (e)=> {
    const productCard = e.target.closest('[data-product-id]');
    addToCart(b.dataset.add, productCard);
  }));
  
  grid.querySelectorAll('[data-buy-currency]').forEach(b => b.addEventListener('click', ()=> {
    window.location.href = `buy-currency.html?id=${b.dataset.buyCurrency}`;
  }));
  
  grid.querySelectorAll('[data-buy-digital]').forEach(b => b.addEventListener('click', ()=> {
    window.location.href = `buy-digital.html?id=${b.dataset.buyDigital}`;
  }));
  
  if(isAdmin()){
    grid.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', ()=> loadProductIntoForm(b.dataset.edit)));
  }
}

function renderAdminList(){
  const box = el('#adminProductList');
  if(!box) return;
  
  if(state.products.length === 0) {
    box.innerHTML = '<div class="py-4 text-center text-slate-400">No products yet. Visit /api/seed to add demo products.</div>';
    return;
  }
  
  box.innerHTML = state.products.map(p=>{
    // ✅ Show stock only for physical products
    let stockDisplay = '';
    if(p.category === 'physical') {
      stockDisplay = ` • stock: ${p.stock}`;
    }
    
    return `
    <div class="py-3 flex items-center justify-between gap-3">
      <div class="flex-1">
        <div class="font-medium">${escapeHtml(p.name)}</div>
        <div class="text-xs text-slate-400">${p.category} • ${fmt.format(p.price)}${stockDisplay}</div>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <button class="px-3 py-1 rounded border border-blue-400 text-blue-400 hover:bg-blue-400/10 text-xs" data-edit="${p._id}">Edit</button>
        <button class="px-3 py-1 rounded border border-red-400 text-red-400 hover:bg-red-400/10 text-xs" data-del="${p._id}">Delete</button>
      </div>
    </div>
  `;
  }).join('');

  box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', ()=> loadProductIntoForm(b.dataset.edit)));
  
  box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async ()=>{
    if(confirm('❌ Delete this product from MongoDB permanently?')){ 
      try {
        await apiDeleteProduct(b.dataset.del); 
        await loadProducts(); 
        renderAdminList();
        toast('✅ Product deleted from MongoDB!'); 
      } catch(error) {
        console.error('Delete failed:', error);
      }
    }
  }));
}

// ============= CART FUNCTIONS =============

function renderCart(){
  const wrap = el('#cartDrawerContent');
  const count = el('#cartCount');
  const itemCountEl = el('#cartItemCount');
  const subtotalEl = el('#cartSubtotal');
  const totalEl = el('#cartTotal');
  const totalItemsEl = el('#cartTotalItems');
  const checkoutBtn = el('#checkoutBtn');
  const emptyState = el('#emptyCartState');
  
  if(!count) return;
  
  const items = state.cart;
  const totalQty = items.reduce((a,b)=>a+b.qty,0);
  const subtotal = items.reduce((s,i)=>s + i.qty * i.price, 0);
  
  count.textContent = totalQty;
  
  if(!wrap) return;
  
  if(itemCountEl) {
    itemCountEl.textContent = `${totalQty} item${totalQty !== 1 ? 's' : ''}`;
  }
  
  const existingItems = wrap.querySelectorAll('.cart-item');
  existingItems.forEach(item => item.remove());
  
  if(items.length === 0) {
    if(emptyState) {
      emptyState.style.display = 'flex';
      emptyState.style.visibility = 'visible';
      emptyState.style.opacity = '1';
    }
    if(checkoutBtn) checkoutBtn.disabled = true;
    
  } else {
    if(emptyState) {
      emptyState.style.display = 'none';
      emptyState.style.visibility = 'hidden';
      emptyState.style.opacity = '0';
    }
    if(checkoutBtn) checkoutBtn.disabled = false;
    
    const itemsHTML = items.map((it, index)=>{
      const product = state.products.find(p => p._id === it._id);
      const actualStock = product ? product.stock : 999;
      const isOverStock = it.qty > actualStock && actualStock < 999;
      const isLowStock = actualStock <= 10 && actualStock > 0 && it.category !== 'currency';
      
      return `
        <div class="cart-item cart-item-new" data-cart-id="${it._id}">
          <button class="remove-item-btn" data-remove="${it._id}" title="Remove item">
            <span>✕</span>
          </button>
          
          <div class="flex gap-3">
            <img src="${it.image || './images/placeholder.png'}" 
                 alt="${escapeHtml(it.name)}" 
                 class="cart-item-img" 
                 onerror="this.src='./images/placeholder.png'" />
            
            <div class="flex-1 flex flex-col justify-between">
              <div>
                <h4 class="font-semibold text-sm text-white mb-1 pr-8">${escapeHtml(it.name)}</h4>
                <p class="text-xs text-cyan-400 font-bold">${fmt.format(it.price)} each</p>
              </div>
              
              <div class="flex items-center justify-between mt-2">
                <div class="qty-control">
                  <button class="qty-btn" data-dec="${it._id}" ${it.qty <= 1 ? 'disabled' : ''}>−</button>
                  <input type="number" 
                         class="qty-input" 
                         data-qty-input="${it._id}" 
                         value="${it.qty}" 
                         min="1" 
                         max="${actualStock < 999 ? actualStock : 999}"
                         style="width: 50px; text-align: center; background: rgba(0,0,0,0.3); border: 1px solid rgba(56,182,255,0.3); border-radius: 4px; color: white; font-weight: 700; padding: 4px; font-family: 'Orbitron', sans-serif;">
                  <button class="qty-btn" data-inc="${it._id}" ${isOverStock || (actualStock > 0 && actualStock < 999 && it.qty >= actualStock) ? 'disabled' : ''}>+</button>
                </div>
                <div class="text-right">
                  <p class="text-xs text-slate-400">Total</p>
                  <p class="text-base font-bold text-white">${fmt.format(it.price * it.qty)}</p>
                </div>
              </div>
              
              ${isOverStock ? `
                <div class="stock-warning">
                  <span>⚠️</span>
                  <span>Only ${actualStock} available in stock</span>
                </div>
              ` : ''}
              
              ${isLowStock && !isOverStock ? `
                <div class="stock-warning">
                  <span>⏰</span>
                  <span>Only ${actualStock} left in stock!</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    if(emptyState) {
      emptyState.insertAdjacentHTML('afterend', itemsHTML);
    } else {
      wrap.insertAdjacentHTML('beforeend', itemsHTML);
    }
    
    setTimeout(() => {
      wrap.querySelectorAll('[data-dec]').forEach(b => {
        b.addEventListener('click', ()=> changeQty(b.dataset.dec, -1));
      });
      
      wrap.querySelectorAll('[data-inc]').forEach(b => {
        b.addEventListener('click', ()=> changeQty(b.dataset.inc, +1));
      });
      
      wrap.querySelectorAll('[data-remove]').forEach(b => {
        b.addEventListener('click', ()=> removeFromCart(b.dataset.remove));
      });
      
      wrap.querySelectorAll('[data-qty-input]').forEach(input => {
        input.addEventListener('change', (e) => {
          const id = e.target.dataset.qtyInput;
          const newQty = parseInt(e.target.value);
          const item = state.cart.find(x => x._id === id);
          const product = state.products.find(p => p._id === id);
          
          if(!item || !product) return;
          
          const maxStock = product.category === 'currency' ? 999 : product.stock;
          
          if(newQty > maxStock) {
            toast(`⚠️ Only ${maxStock} available in stock!`);
            e.target.value = item.qty;
            return;
          }
          
          if(newQty < 1) {
            toast('⚠️ Quantity must be at least 1');
            e.target.value = item.qty;
            return;
          }
          
          item.qty = newQty;
          saveCart();
          renderCart();
          toast(`✅ Updated to ${newQty}`);
        });
      });
      
      wrap.querySelectorAll('.cart-item-new').forEach(item => {
        setTimeout(() => item.classList.remove('cart-item-new'), 300);
      });
    }, 10);
  }
  
  if(subtotalEl) subtotalEl.textContent = fmt.format(subtotal);
  if(totalEl) totalEl.textContent = fmt.format(subtotal);
  if(totalItemsEl) totalItemsEl.textContent = totalQty;
}

function addToCart(id, productElement){
  const p = state.products.find(x=>x._id===id);
  if(!p) {
    toast('❌ Product not found');
    return;
  }
  
  // ✅ Only check stock for physical products
  if(p.category === 'physical' && p.stock < 999) {
    const cartItem = state.cart.find(x => x._id === id);
    const currentQty = cartItem ? cartItem.qty : 0;
    
    if(currentQty >= p.stock) {
      toast(`⚠️ Only ${p.stock} available in stock`);
      return;
    }
    
    if(p.stock === 0) {
      toast('❌ Out of stock');
      return;
    }
  }
  
  const it = state.cart.find(x => x._id === id);
  if(it) {
    it.qty++;
    toast(`✅ Added to cart (${it.qty})`);
  } else {
    state.cart.push({ ...p, qty: 1 });
    toast('✅ Added to cart!');
  }
  
  saveCart();
  renderCart();
  
  if(productElement) {
    flyToCart(productElement);
  }
}

function changeQty(id, delta){
  const it = state.cart.find(x=>x._id===id);
  if(!it) return;
  
  const product = state.products.find(p => p._id === id);
  
  if(delta > 0 && product && product.category === 'physical' && product.stock < 999) {
    if(it.qty >= product.stock) {
      toast(`⚠️ Maximum stock reached (${product.stock})`);
      return;
    }
  }
  
  it.qty += delta;
  
  if(it.qty <= 0) {
    removeFromCart(id);
    return;
  }
  
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  const item = state.cart.find(x => x._id === id);
  if(!item) return;
  
  state.cart = state.cart.filter(x => x._id !== id);
  saveCart();
  
  renderCart();
  toast(`🗑️ Removed ${item.name}`);
}

function openCart(){
  const layer = el('#cartDrawer'), aside = layer?.querySelector('aside');
  const backdrop = el('#cartBackdrop');
  if(!layer) return;
  
  layer.classList.remove('hidden');
  
  setTimeout(() => {
    if(backdrop) backdrop.style.opacity = '1';
    if(aside) {
      aside.classList.remove('drawer-closed');
      aside.classList.add('drawer-open');
    }
  }, 10);
}

function closeCart(){
  const layer = el('#cartDrawer'), aside = layer?.querySelector('aside');
  const backdrop = el('#cartBackdrop');
  if(!layer) return;
  
  if(backdrop) backdrop.style.opacity = '0';
  if(aside) {
    aside.classList.remove('drawer-open');
    aside.classList.add('drawer-closed');
  }
  
  setTimeout(()=>{
    layer.classList.add('hidden');
    document.body.style.overflow = '';
    document.body.style.background = '';
  }, 300);
}

window.closeCart = closeCart;

function openModal(sel){ 
  const cartDrawer = el('#cartDrawer');
  if(cartDrawer && !cartDrawer.classList.contains('hidden')) {
    closeCart();
  }
  
  setTimeout(() => {
    const modal = el(sel);
    if(modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      
      if(sel === '#authModal') {
        const backdrop = el('#authBackdrop');
        if(backdrop) {
          backdrop.style.display = 'block';
          setTimeout(() => {
            backdrop.style.opacity = '1';
          }, 10);
        }
      }
    }
  }, 350);
}

function closeModal(sel){ 
  const modal = el(sel);
  if(modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  
  if(sel === '#authModal') {
    const backdrop = el('#authBackdrop');
    if(backdrop) {
      backdrop.style.display = 'none';
      backdrop.style.opacity = '0';
    }
  }
}

function updateAccountUI(){
  const lbl = el('#accountLabel');
  if(lbl) lbl.textContent = state.user ? (state.user.name || state.user.email) : 'Login';
  
  const adminBtn = el('#adminBtn');
  if(state.user && (state.user.email === ADMIN.email || state.user.admin)) {
    if(adminBtn) {
      adminBtn.style.opacity = '1';
      adminBtn.style.visibility = 'visible';
      adminBtn.style.pointerEvents = 'auto';
    }
  } else {
    if(adminBtn) {
      adminBtn.style.opacity = '0';
      adminBtn.style.visibility = 'hidden';
      adminBtn.style.pointerEvents = 'none';
    }
  }
}

function mergeGuestCartWithUserCart(guestCart, userCart) {
  const merged = [...userCart];
  
  guestCart.forEach(guestItem => {
    const existingItem = merged.find(item => item._id === guestItem._id);
    if(existingItem) {
      existingItem.qty += guestItem.qty;
    } else {
      merged.push(guestItem);
    }
  });
  
  return merged;
}

async function loginFlow(email, password){
  try {
    const guestCart = [...state.cart];
    
    const res = await apiLogin({ email, password });
    const user = res.user || res;
    
    if(res.token) {
      authToken = res.token;
      localStorage.setItem('authToken', authToken);
      console.log('🔑 Auth token saved:', authToken.substring(0, 20) + '...');
    }
    
    state.user = user; 
    localStorage.setItem('user', JSON.stringify(user));
    
    const userCart = loadCart();
    
    if(guestCart.length > 0) {
      state.cart = mergeGuestCartWithUserCart(guestCart, userCart);
      saveCart();
      
      localStorage.removeItem('cart');
      
      toast(`✅ Logged in! ${guestCart.length} item(s) merged with your cart.`);
    } else {
      state.cart = userCart;
      toast('✅ Logged in successfully!');
    }
    
    hideAllModals();
    
    setTimeout(() => {
      hideAllModals();
      location.reload();
    }, 1200);
    
    return true;
  } catch(err) {
    toast('❌ ' + (err.message || 'Login failed'));
    return false;
  }
}

async function registerFlow(name, email, password, passwordConfirm){
  try {
    if(password !== passwordConfirm) {
      toast('❌ Passwords do not match!');
      return false;
    }
    
    const res = await apiRegister({ name, email, password });
    
    const loginRes = await apiLogin({ email, password });
    const user = loginRes.user || loginRes;
    
    if(loginRes.token) {
      authToken = loginRes.token;
      localStorage.setItem('authToken', authToken);
    }
    
    state.user = user;
    localStorage.setItem('user', JSON.stringify(user));
    
    const guestCart = JSON.parse(localStorage.getItem('cart') || '[]');
    if(guestCart.length > 0) {
      state.cart = guestCart;
      saveCart();
      localStorage.removeItem('cart');
    }
    
    hideAllModals();
    toast('✅ Account created! Logging in...');
    
    setTimeout(() => {
      hideAllModals();
      location.reload();
    }, 1000);
    
    return true;
  } catch(err){
    toast('❌ ' + (err.message || 'Register failed'));
    return false;
  }
}

function loadProductIntoForm(id){
  const p = state.products.find(x=>x._id===id);
  if(!p) return;
  el('#prodId').value = p._id;
  el('#prodName').value = p.name;
  el('#prodCategory').value = p.category;
  el('#prodPrice').value = p.price;
  el('#prodStock').value = p.stock || 0;
  el('#prodImage').value = p.image || '';
  el('#prodDesc').value = p.description || '';
  
  // ✅ Hide stock input if currency or digital
  const stockContainer = el('#stockInputContainer');
  if((p.category === 'currency' || p.category === 'digital') && stockContainer) {
    stockContainer.style.display = 'none';
  } else if(stockContainer) {
    stockContainer.style.display = 'block';
  }
  
  toast('Product loaded into form ✏️');
  
  const adminModal = el('#adminModal');
  if(adminModal) {
    adminModal.querySelector('.admin-panel-content')?.scrollTo(0, 0);
  }
}

function resetProductForm(){
  el('#productForm')?.reset();
  el('#prodId').value = '';
  
  const stockContainer = el('#stockInputContainer');
  if(stockContainer) {
    stockContainer.style.display = 'block';
  }
  
  toast('Form cleared');
}

async function loadProducts(){
  try {
    const data = await apiGetProducts();
    state.products = data.map(p => ({ ...p, _id: p._id || p.id || 'p-'+uid() }));
    renderProducts();
    renderAdminList();
    renderCart();
    console.log(`✅ Loaded ${state.products.length} products from MongoDB`);
  } catch(error) {
    console.error('❌ Error loading products:', error);
    toast('Using cached products', 3000);
  }
}

function escapeHtml(s=''){ 
  return String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c])); 
}

function isAdmin(){ 
  return state.user && (state.user.email === ADMIN.email || state.user.admin); 
}

window.renderProducts = renderProducts;
window.state = state;
window.toast = toast;

document.addEventListener('DOMContentLoaded', async ()=>{
  const yearEl = el('#year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
  
  await loadProducts();
  updateAccountUI();

  if(!sessionStorage.getItem('visited')){
    openModal('#welcomeModal');
    sessionStorage.setItem('visited','1');
  }

  el('#btnMobile')?.addEventListener('click', ()=> el('#mobileNav')?.classList.toggle('hidden'));
  el('#openAccountBtn')?.addEventListener('click', ()=> {
    if(!state.user) openModal('#authModal');
  });
  el('#ctaLogin')?.addEventListener('click', ()=> openModal('#authModal'));
  el('#openCartBtn')?.addEventListener('click', openCart);

  el('#welcomeLogin')?.addEventListener('click', ()=> { closeModal('#welcomeModal'); openModal('#authModal'); });
  el('#welcomeBrowse')?.addEventListener('click', ()=> { closeModal('#welcomeModal'); toast('Browsing as guest'); });

  el('#closeAuthBtn')?.addEventListener('click', ()=> closeModal('#authModal'));
  
  el('#switchToRegister')?.addEventListener('click', ()=> {
    el('#loginForm')?.classList.add('hidden'); 
    el('#registerForm')?.classList.remove('hidden'); 
    el('#authTitle').textContent = 'Register';
  });
  el('#switchToLogin')?.addEventListener('click', ()=> {
    el('#registerForm')?.classList.add('hidden'); 
    el('#loginForm')?.classList.remove('hidden'); 
    el('#authTitle').textContent = 'Login';
  });

  el('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('#loginEmail').value.trim();
    const password = el('#loginPassword').value.trim();
    if(!email || !password){ toast('Enter credentials'); return; }
    await loginFlow(email,password);
  });

  el('#registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = el('#regName').value.trim();
    const email = el('#regEmail').value.trim();
    const password = el('#regPassword').value.trim();
    const passwordConfirm = el('#regPasswordConfirm').value.trim();
    if(!name||!email||!password||!passwordConfirm){ toast('Fill all fields'); return; }
    await registerFlow(name, email, password, passwordConfirm);
  });

  const searchContainer = document.getElementById('searchContainer');
  const searchInput = document.getElementById('search-input');
  const searchIcon = document.getElementById('searchIcon');
  
  if(searchInput && searchIcon && searchContainer) {
    searchInput.addEventListener('focus', () => {
      searchContainer.classList.add('search-active');
    });
    
    searchInput.addEventListener('input', (e) => {
      const searchValue = e.target.value.toLowerCase().trim();
      if(window.state && window.renderProducts) {
        window.state.filters.q = searchValue;
        window.renderProducts();
      }
    });
    
    searchIcon.addEventListener('click', () => {
      if(searchContainer.classList.contains('search-active')) {
        searchContainer.classList.remove('search-active');
        searchInput.value = '';
        searchInput.blur();
        
        if(window.state && window.renderProducts) {
          window.state.filters.q = '';
          window.renderProducts();
        }
      }
    });
  }

  // ✅ FIX: Hide stock input when currency/digital category selected
  const prodCategory = el('#prodCategory');
  const stockContainer = el('#stockInputContainer');

  if(prodCategory && stockContainer) {
    prodCategory.addEventListener('change', (e) => {
      if(e.target.value === 'currency' || e.target.value === 'digital') {
        stockContainer.style.display = 'none';
        el('#prodStock').value = 999;
      } else {
        stockContainer.style.display = 'block';
      }
    });
    
    if(prodCategory.value === 'currency' || prodCategory.value === 'digital') {
      stockContainer.style.display = 'none';
    }
  }

  el('#productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if(!isAdmin()){ 
      toast('❌ Admin access required'); 
      return; 
    }

    if(!authToken) {
      toast('❌ Please login as admin first');
      return;
    }
    
    const id = el('#prodId').value.trim();
    const category = el('#prodCategory').value;
    
    const payload = {
      name: el('#prodName').value.trim(),
      category: category,
      price: Number(el('#prodPrice').value) || 0,
      stock: (category === 'currency' || category === 'digital') ? 999 : (Number(el('#prodStock').value) || 0),
      image: el('#prodImage').value.trim() || `./images/product-${Date.now()}.png`,
      description: el('#prodDesc').value.trim()
    };
    
    if(!payload.name){ 
      toast('❌ Enter product name'); 
      return; 
    }
    
    try {
      if(id) {
        await apiUpdateProduct(id, payload);
        toast('✅ Product updated in MongoDB!');
      } else {
        await apiCreateProduct(payload);
        toast('✅ Product created in MongoDB!');
      }
      
      resetProductForm(); 
      await loadProducts();
      renderAdminList();
      
    } catch(error) {
      console.error('Product save error:', error);
    }
  });
  
  el('#resetProductBtn')?.addEventListener('click', resetProductForm);

  el('#sortSelect')?.addEventListener('change', (e)=> { 
    state.filters.sort = e.target.value; 
    renderProducts(); 
  });

  el('#closeCartBtn')?.addEventListener('click', closeCart);
  el('#cartBackdrop')?.addEventListener('click', closeCart);
  
  el('#clearCartBtn')?.addEventListener('click', ()=> {
    if(!state.cart.length) {
      toast('⚠️ Cart is already empty');
      return;
    }
    
    const itemCount = state.cart.length;
    toast(`🗑️ Clearing ${itemCount} item${itemCount > 1 ? 's' : ''}...`, 1000);
    
    setTimeout(() => {
      state.cart = [];
      saveCart();
      renderCart();
      toast('✅ Cart cleared successfully!');
    }, 1000);
  });
  
  el('#checkoutBtn')?.addEventListener('click', ()=> {
    if(!state.user){ 
      toast('❌ Please login first'); 
      openModal('#authModal'); 
      closeCart();
      return; 
    }
    
    if(!state.cart.length){ 
      toast('⚠️ Cart is empty'); 
      return; 
    }
    
    let hasStockIssue = false;
    const stockIssues = [];
    
    state.cart.forEach(item => {
      const product = state.products.find(p => p._id === item._id);
      if(product && product.category === 'physical' && product.stock < 999) {
        if(item.qty > product.stock) {
          hasStockIssue = true;
          stockIssues.push(`${item.name}: Only ${product.stock} available`);
        }
      }
    });
    
    if(hasStockIssue) {
      toast('❌ Stock issues: ' + stockIssues.join(', '), 5000);
      return;
    }
    
    window.location.href = 'checkout.html';
  });

  (function injectAccountMenu(){
    const wrapper = document.createElement('div');
    wrapper.id = 'accountMenu';
    wrapper.className = 'hidden absolute right-6 top-16 w-64 bg-[#071726] border border-white/10 rounded-md shadow-lg p-3';
    wrapper.style.zIndex = 70;
    wrapper.innerHTML = `
      <div id="loggedOutMenu">
        <button id="openAuthBtnSmall" class="w-full text-left px-3 py-2 rounded hover:bg-white/10">Login / Register</button>
      </div>
      <div id="loggedInMenu" class="hidden">
        <div class="px-3 py-2 text-sm text-slate-300 border-b border-white/10 mb-2 pb-2">
          <div id="userNameDisplay" class="font-semibold text-lg"></div>
          <div id="userEmailDisplay" class="text-xs text-slate-400"></div>
        </div>
        <button id="openSettings" class="w-full text-left px-3 py-2 rounded hover:bg-white/10">⚙️ Settings</button>
        <button id="logoutBtn" class="w-full text-left px-3 py-2 rounded hover:bg-white/10 text-red-400">🚪 Logout</button>
      </div>
    `;
    document.body.appendChild(wrapper);

    el('#openAccountBtn')?.addEventListener('click', ()=> {
      if(state.user) {
        wrapper.classList.toggle('hidden');
        el('#userNameDisplay').textContent = state.user.name || 'User';
        el('#userEmailDisplay').textContent = state.user.email || '';
      } else {
        openModal('#authModal');
      }
    });
    
    document.addEventListener('click', (ev)=> { 
      if(!ev.target.closest('#accountMenu') && !ev.target.closest('#openAccountBtn')) {
        wrapper.classList.add('hidden'); 
      }
    });

    el('#openAuthBtnSmall')?.addEventListener('click', ()=> { 
      openModal('#authModal'); 
      wrapper.classList.add('hidden'); 
    });

    el('#openSettings')?.addEventListener('click', ()=> {
      const settingsModal = document.getElementById('settingsModal');
      if(settingsModal) settingsModal.classList.add('active');
      wrapper.classList.add('hidden');
      
      if(state.user) {
        const userSettings = JSON.parse(localStorage.getItem('userSettings_' + state.user.email) || '{}');
        el('#settingsName').value = state.user.name || '';
        el('#settingsEmail').value = state.user.email || '';
        el('#settingsPhone').value = userSettings.phone || '';
        el('#settingsGender').value = userSettings.gender || '';
        el('#settingsDOB').value = userSettings.dob || '';
      }
    });

    el('#settingsForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if(!state.user) return;
      
      const settings = {
        phone: el('#settingsPhone').value,
        gender: el('#settingsGender').value,
        dob: el('#settingsDOB').value
      };
      
      localStorage.setItem('userSettings_' + state.user.email, JSON.stringify(settings));
      state.user.name = el('#settingsName').value;
      localStorage.setItem('user', JSON.stringify(state.user));
      
      toast('✅ Settings saved successfully!');
      document.getElementById('settingsModal').classList.remove('active');
      updateAccountUI();
    });

    el('#logoutBtn')?.addEventListener('click', ()=> {
      state.user = null; 
      authToken = null;
      state.cart = [];
      
      localStorage.removeItem('user'); 
      localStorage.removeItem('authToken');
      saveCart();
      
      toast('✅ Logging out...');
      wrapper.classList.add('hidden');
      
      setTimeout(() => {
        location.reload();
      }, 800);
    });
    
    function updateMenuDisplay() {
      if(state.user) {
        el('#loggedOutMenu')?.classList.add('hidden');
        el('#loggedInMenu')?.classList.remove('hidden');
      } else {
        el('#loggedOutMenu')?.classList.remove('hidden');
        el('#loggedInMenu')?.classList.add('hidden');
      }
    }
    
    window.updateAccountMenu = updateMenuDisplay;
    updateMenuDisplay();
  })();

  const saved = JSON.parse(localStorage.getItem('user') || 'null');
  if(saved){ 
    state.user = saved; 
    state.cart = loadCart();
    updateAccountUI(); 
    if(window.updateAccountMenu) window.updateAccountMenu(); 
  }
});