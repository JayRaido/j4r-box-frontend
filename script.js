// ===============================================
// J4R BOX - Frontend Logic
// ===============================================

const el = s => document.querySelector(s);
const els = s => Array.from(document.querySelectorAll(s));
const fmt = new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP' });

/* ===========================
   Config
   =========================== */
const DEFAULT_API_BASE = 'https://j4r-box-api.onrender.com'; // ← YOUR RENDER URL!
let API = {
  base: localStorage.getItem('apiBase') || DEFAULT_API_BASE,
  products: function(){ return `${this.base.replace(/\/$/,'')}/api/products`; },
  login: function(){ return `${this.base.replace(/\/$/,'')}/api/auth/login`; },
  register: function(){ return `${this.base.replace(/\/$/,'')}/api/auth/register`; }
};

// Store auth token
let authToken = localStorage.getItem('authToken') || null;

/* ===========================
   Demo admin user (local-only)
   =========================== */
const ADMIN = { name: 'Jei Raido', email: 'JeiRaido11254@gmail.com', password: 'JayRide4' };
(function ensureLocalUsers(){
  try {
    const users = JSON.parse(localStorage.getItem('localUsers') || '[]');
    if (!users.find(u => u.email === ADMIN.email)) {
      users.push({ id: 'admin-local', name: ADMIN.name, email: ADMIN.email, password: ADMIN.password });
      localStorage.setItem('localUsers', JSON.stringify(users));
    }
  } catch(e) {
    localStorage.setItem('localUsers', JSON.stringify([{ id:'admin-local', name: ADMIN.name, email: ADMIN.email, password: ADMIN.password }]));
  }
})();

/* ===========================
   State
   =========================== */
const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  filters: { q:'', category:'all', sort:'featured' }
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function toast(msg, ms=2000){
  const t = el('#toast');
  if(!t) return;
  t.textContent = msg; t.classList.remove('hidden');
  setTimeout(()=> t.classList.add('hidden'), ms);
}

/* ===========================
   Demo Products (fallback)
   =========================== */
const demoProducts = [
  { _id: uid(), name: "Elden Ring (PC)", category: "virtual", price: 2699, stock: 50, image: "./images/elden.jpg", description: "Award-winning ARPG. Steam key." },
  { _id: uid(), name: "God of War Ragnarok (PS5)", category: "physical", price: 3495, stock: 20, image: "./images/god.jpg", description: "Brand new physical disc." },
  { _id: uid(), name: "Genshin Genesis Crystals 6480", category: "currency", price: 4290, stock: 999, image: "./images/genshin.jpg", description: "In-game top up." },
  { _id: uid(), name: "Razer BlackShark V2 X", category: "accessory", price: 2499, stock: 35, image: "./images/razer.png", description: "Lightweight esports headset." },
  { _id: uid(), name: "Minecraft (Java & Bedrock)", category: "virtual", price: 1599, stock: 100, image: "./images/minecraft.jpeg", description: "PC digital code." },
  { _id: uid(), name: "Nintendo Switch Pro Controller", category: "accessory", price: 3495, stock: 15, image: "./images/nintendo.jpeg", description: "Official Pro Controller." },
  { _id: uid(), name: "NBA 2K24 (PS4)", category: "physical", price: 1995, stock: 25, image: "./images/nba.jpeg", description: "PS4 physical disc." },
  { _id: uid(), name: "Valorant Points 475", category: "currency", price: 249, stock: 999, image: "./images/valo.png", description: "Direct Riot top-up." },
  { _id: uid(), name: "Cyberpunk Expansion Pack", category: "virtual", price: 1299, stock: 60, image: "./images/cyber.png", description: "DLC pack with skins and missions." },
  { _id: uid(), name: "Logitech Pro 2", category: "accessory", price: 2599, stock: 40, image: "./images/mouse.png", description: "High DPI esports mouse." },
  { _id: uid(), name: "Steam Wallet ₱1000", category: "currency", price: 1000, stock: 999, image: "./images/steam.png", description: "Steam wallet code." },
  { _id: uid(), name: "Oculus Quest", category: "accessory", price: 8999, stock: 6, image: "./images/oculus.png", description: "All-in-one VR headset." }
];

// ensure there are products in localStorage
if(!localStorage.getItem('products')){
  localStorage.setItem('products', JSON.stringify(demoProducts));
}

/* ===========================
   API helpers
   =========================== */
async function apiGetProducts(){
  try {
    const res = await fetch(API.products());
    if(!res.ok) throw new Error('API products unreachable');
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error('Unexpected /api/products response');
    return data;
  } catch(err){
    console.log('Using local products fallback');
    return JSON.parse(localStorage.getItem('products') || '[]');
  }
}

async function apiCreateProduct(p){
  try {
    const headers = { 'Content-Type':'application/json' };
    if(authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    const res = await fetch(API.products(), { 
      method:'POST', 
      headers,
      body: JSON.stringify(p) 
    });
    
    if(!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'create failed');
    }
    return await res.json();
  } catch(e){
    const cur = JSON.parse(localStorage.getItem('products')||'[]');
    const item = { ...p, _id: 'p-'+uid() };
    cur.unshift(item);
    localStorage.setItem('products', JSON.stringify(cur));
    return item;
  }
}

async function apiUpdateProduct(id,p){
  try {
    const headers = { 'Content-Type':'application/json' };
    if(authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    const res = await fetch(`${API.products().replace(/\/$/,'')}/${id}`, { 
      method:'PUT', 
      headers,
      body: JSON.stringify(p) 
    });
    
    if(!res.ok) throw new Error('update failed');
    return await res.json();
  } catch(e){
    const cur = JSON.parse(localStorage.getItem('products')||'[]');
    const idx = cur.findIndex(x=>x._id===id);
    if(idx>=0){ 
      cur[idx] = {...cur[idx],...p}; 
      localStorage.setItem('products', JSON.stringify(cur)); 
      return cur[idx]; 
    }
    return null;
  }
}

async function apiDeleteProduct(id){
  try {
    const headers = {};
    if(authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    const res = await fetch(`${API.products().replace(/\/$/,'')}/${id}`, { 
      method:'DELETE',
      headers
    });
    
    if(!res.ok) throw new Error('delete failed');
    return true;
  } catch(e){
    const cur = JSON.parse(localStorage.getItem('products')||'[]').filter(x=>x._id!==id);
    localStorage.setItem('products', JSON.stringify(cur));
    return true;
  }
}

async function apiRegister({name,email,password}){
  try {
    const res = await fetch(API.register(), { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({name,email,password}) 
    });
    if(res.ok) return await res.json();
    throw new Error('register failed');
  } catch(e){
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
    if(res.ok) return await res.json();
    throw new Error('login failed');
  } catch(e){
    const users = JSON.parse(localStorage.getItem('localUsers')||'[]');
    const u = users.find(x => x.email === email && x.password === password);
    if(u) return { user:{ name: u.name, email: u.email }, token: 'local-'+uid() };
    if(email === ADMIN.email && password === ADMIN.password) {
      return { user:{ name: ADMIN.name, email: ADMIN.email, admin:true }, token: 'local-admin-'+uid() };
    }
    throw new Error('Invalid credentials');
  }
}

/* ===========================
   UI Rendering
   =========================== */
function renderProducts(){
  const grid = el('#productGrid');
  let list = [...state.products];
  const q = (state.filters.q || '').toLowerCase().trim();
  if(q) list = list.filter(p => (p.name + ' ' + (p.description||'')).toLowerCase().includes(q));
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

  grid.innerHTML = list.map(p=>`
    <div class="card p-4 rounded-lg flex flex-col">
      <div class="h-44 overflow-hidden mb-3">
        ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" class="product-img w-full h-full object-cover rounded">` : `<div class="img-fallback h-44 rounded">No image</div>`}
      </div>
      <div class="flex-grow">
        <div class="font-semibold line-clamp-2">${escapeHtml(p.name)}</div>
        <div class="text-xs text-slate-400 mt-1">${escapeHtml(p.description||'')}</div>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <div class="text-indigo-300 font-bold">${fmt.format(p.price)}</div>
        <div class="flex items-center gap-2">
          ${isAdmin() ? `<button class="px-2 py-1 rounded border text-xs" data-edit="${p._id}">Edit</button>` : ''}
          <button class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm" data-add="${p._id}">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', ()=> addToCart(b.dataset.add)));
  if(isAdmin()){
    grid.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', ()=> loadProductIntoForm(b.dataset.edit)));
  }
}

function renderAdminList(){
  const box = el('#adminProductList');
  if(!box) return;
  box.innerHTML = state.products.map(p=>`
    <div class="py-3 flex items-center justify-between gap-3">
      <div>
        <div class="font-medium">${escapeHtml(p.name)}</div>
        <div class="text-xs text-slate-400">${p.category} • ${fmt.format(p.price)} • stock: ${p.stock}</div>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <button class="px-2 py-1 rounded border text-xs" data-edit="${p._id}">Edit</button>
        <button class="px-2 py-1 rounded border text-red-400 text-xs" data-del="${p._id}">Delete</button>
      </div>
    </div>
  `).join('');

  box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', ()=> loadProductIntoForm(b.dataset.edit)));
  box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async ()=>{
    if(confirm('Delete this product?')){ 
      await apiDeleteProduct(b.dataset.del); 
      await loadProducts(); 
      toast('Product deleted'); 
    }
  }));
}

function renderCart(){
  const wrap = el('#cartDrawerContent');
  const count = el('#cartCount');
  const subtotalEl = el('#cartSubtotal');
  const items = state.cart;
  count.textContent = items.reduce((a,b)=>a+b.qty,0);
  if(!wrap) return;
  
  wrap.innerHTML = items.length ? items.map(it=>`
    <div class="p-3 border-b border-white/10 flex items-center gap-3">
      <img src="${it.image}" class="w-14 h-14 rounded object-cover" />
      <div class="flex-1">
        <div class="font-semibold text-sm">${escapeHtml(it.name)}</div>
        <div class="text-xs text-slate-400">${fmt.format(it.price)}</div>
        <div class="flex items-center gap-2 mt-1">
          <button class="px-2 py-1 rounded border text-xs" data-dec="${it._id}">-</button>
          <span class="text-sm">${it.qty}</span>
          <button class="px-2 py-1 rounded border text-xs" data-inc="${it._id}">+</button>
        </div>
      </div>
      <div class="text-sm font-semibold">${fmt.format(it.price * it.qty)}</div>
    </div>
  `).join('') : `<div class="p-4 text-slate-400 text-center">Your cart is empty.</div>`;

  wrap.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', ()=> changeQty(b.dataset.dec, -1)));
  wrap.querySelectorAll('[data-inc]').forEach(b => b.addEventListener('click', ()=> changeQty(b.dataset.inc, +1)));

  const subtotal = items.reduce((s,i)=>s + i.qty * i.price, 0);
  subtotalEl.textContent = fmt.format(subtotal);
}

/* ===========================
   Cart functions
   =========================== */
function addToCart(id){
  const p = state.products.find(x=>x._id===id);
  if(!p) return;
  const it = state.cart.find(x => x._id === id);
  if(it) it.qty++;
  else state.cart.push({ ...p, qty: 1 });
  localStorage.setItem('cart', JSON.stringify(state.cart));
  renderCart();
  toast('Added to cart');
  openCart();
}

function changeQty(id, delta){
  const it = state.cart.find(x=>x._id===id);
  if(!it) return;
  it.qty += delta;
  if(it.qty <= 0) state.cart = state.cart.filter(x=>x._id!==id);
  localStorage.setItem('cart', JSON.stringify(state.cart));
  renderCart();
}

/* ===========================
   Drawer & Modal helpers
   =========================== */
function openCart(){
  const layer = el('#cartDrawer'), aside = layer?.querySelector('aside');
  if(!layer) return;
  layer.classList.remove('hidden');
  aside.classList.remove('drawer-closed'); 
  aside.classList.add('drawer-open');
}

function closeCart(){
  const layer = el('#cartDrawer'), aside = layer?.querySelector('aside');
  if(!layer) return;
  aside.classList.remove('drawer-open'); 
  aside.classList.add('drawer-closed');
  setTimeout(()=>layer.classList.add('hidden'), 260);
}

function openModal(sel){ el(sel)?.classList.remove('hidden'); }
function closeModal(sel){ el(sel)?.classList.add('hidden'); }

/* ===========================
   Auth flows
   =========================== */
function updateAccountUI(){
  el('#accountLabel').textContent = state.user ? (state.user.name || state.user.email) : 'Login';
  const adminPanel = el('#adminPanel');
  if(state.user && (state.user.email === ADMIN.email || state.user.admin)) {
    adminPanel?.classList.remove('hidden');
  } else {
    adminPanel?.classList.add('hidden');
  }
}

async function loginFlow(email, password){
  try {
    const res = await apiLogin({ email, password });
    const user = res.user || res;
    
    if(res.token) {
      authToken = res.token;
      localStorage.setItem('authToken', authToken);
    }
    
    state.user = user; 
    localStorage.setItem('user', JSON.stringify(user));
    toast('Logged in successfully!');
    updateAccountUI();
    closeModal('#authModal');
    return true;
  } catch(err) {
    toast(err.message || 'Login failed');
    return false;
  }
}

async function registerFlow(name, email, password){
  try {
    const res = await apiRegister({ name, email, password });
    toast('Registered! Please login.');
    openModal('#authModal');
    el('#loginForm').classList.remove('hidden');
    el('#registerForm').classList.add('hidden');
    el('#authTitle').textContent = 'Login';
    return true;
  } catch(err){
    toast(err.message || 'Register failed');
    return false;
  }
}

/* ===========================
   Admin form helpers
   =========================== */
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
  window.scrollTo({ top: el('#shop').offsetTop - 40, behavior:'smooth' });
  toast('Product loaded into form');
}

function resetProductForm(){
  el('#productForm').reset();
  el('#prodId').value = '';
}

/* ===========================
   Loaders
   =========================== */
async function loadProducts(){
  const data = await apiGetProducts();
  state.products = data.map(p => ({ ...p, _id: p._id || p.id || 'p-'+uid() }));
  renderProducts();
  renderAdminList();
  renderCart();
}

/* ===========================
   Helpers
   =========================== */
function escapeHtml(s=''){ 
  return String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c])); 
}

function isAdmin(){ 
  return state.user && (state.user.email === ADMIN.email || state.user.admin); 
}

/* ===========================
   Event wiring
   =========================== */
document.addEventListener('DOMContentLoaded', async ()=>{
  el('#year') && (el('#year').textContent = new Date().getFullYear());
  
  await loadProducts();
  updateAccountUI();

  if(!sessionStorage.getItem('visited')){
    openModal('#welcomeModal');
    sessionStorage.setItem('visited','1');
  }

  // Header buttons
  el('#btnMobile')?.addEventListener('click', ()=> el('#mobileNav').classList.toggle('hidden'));
  el('#openAccountBtn')?.addEventListener('click', ()=> openModal('#authModal'));
  el('#ctaLogin')?.addEventListener('click', ()=> openModal('#authModal'));
  el('#openCartBtn')?.addEventListener('click', openCart);

  // Welcome modal
  el('#welcomeLogin')?.addEventListener('click', ()=> { 
    closeModal('#welcomeModal'); 
    openModal('#authModal'); 
  });
  el('#welcomeBrowse')?.addEventListener('click', ()=> { 
    closeModal('#welcomeModal'); 
    toast('Browsing as guest'); 
  });

  // Auth modal
  el('#closeAuthBtn')?.addEventListener('click', ()=> closeModal('#authModal'));
  el('#switchToRegister')?.addEventListener('click', ()=> {
    el('#loginForm').classList.add('hidden'); 
    el('#registerForm').classList.remove('hidden'); 
    el('#authTitle').textContent = 'Register';
  });
  el('#switchToLogin')?.addEventListener('click', ()=> {
    el('#registerForm').classList.add('hidden'); 
    el('#loginForm').classList.remove('hidden'); 
    el('#authTitle').textContent = 'Login';
  });

  // Login
  el('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('#loginEmail').value.trim();
    const password = el('#loginPassword').value.trim();
    if(!email || !password){ toast('Enter credentials'); return; }
    await loginFlow(email,password);
  });

  // Register
  el('#registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = el('#regName').value.trim();
    const email = el('#regEmail').value.trim();
    const password = el('#regPassword').value.trim();
    if(!name||!email||!password){ toast('Fill all fields'); return; }
    await registerFlow(name,email,password);
  });

  // Product form
  el('#productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!isAdmin()){ toast('Admin only'); return; }
    
    const id = el('#prodId').value.trim();
    const payload = {
      name: el('#prodName').value.trim(),
      category: el('#prodCategory').value,
      price: Number(el('#prodPrice').value) || 0,
      stock: Number(el('#prodStock').value) || 0,
      image: el('#prodImage').value.trim() || `./images/product-${Date.now()}.png`,
      description: el('#prodDesc').value.trim()
    };
    
    if(!payload.name){ toast('Enter product name'); return; }
    
    if(id){
      await apiUpdateProduct(id,payload);
      toast('Product updated!');
    } else {
      await apiCreateProduct(payload);
      toast('Product created!');
    }
    
    resetProductForm(); 
    await loadProducts();
  });
  
  el('#resetProductBtn')?.addEventListener('click', resetProductForm);

  // Filters
  el('#searchInput')?.addEventListener('input', (e)=> { 
    state.filters.q = e.target.value; 
    renderProducts(); 
  });
  el('#categoryFilter')?.addEventListener('change', (e)=> { 
    state.filters.category = e.target.value; 
    renderProducts(); 
  });
  el('#sortSelect')?.addEventListener('change', (e)=> { 
    state.filters.sort = e.target.value; 
    renderProducts(); 
  });

  // Cart
  el('#closeCartBtn')?.addEventListener('click', closeCart);
  el('#cartBackdrop')?.addEventListener('click', closeCart);
  el('#clearCartBtn')?.addEventListener('click', ()=> { 
    state.cart = []; 
    localStorage.setItem('cart', JSON.stringify(state.cart)); 
    renderCart(); 
    toast('Cart cleared');
  });
  el('#checkoutBtn')?.addEventListener('click', ()=> {
    if(!state.user){ toast('Please login first'); openModal('#authModal'); return; }
    if(!state.cart.length){ toast('Cart is empty'); return; }
    const total = state.cart.reduce((s,i)=>s + i.qty * i.price, 0);
    state.cart = []; 
    localStorage.setItem('cart', JSON.stringify(state.cart)); 
    renderCart(); 
    closeCart();
    toast(`Order placed! Total: ${fmt.format(total)} 🎉`, 5000);
  });

  // Account menu
  (function injectAccountMenu(){
    const wrapper = document.createElement('div');
    wrapper.id = 'accountMenu';
    wrapper.className = 'hidden absolute right-6 top-20 w-56 bg-[#071726] border border-white/10 rounded-md shadow-lg p-2';
    wrapper.style.zIndex = 70;
    wrapper.innerHTML = `
      <div class="px-3 py-2 text-sm text-slate-300">
        <div id="userNameDisplay" class="font-semibold"></div>
        <div id="userEmailDisplay" class="text-xs text-slate-400"></div>
      </div>
      <hr class="border-white/10 my-2" />
      <button id="logoutBtn" class="w-full text-left px-3 py-2 rounded hover:bg-white/10 text-sm ${state.user ? '' : 'hidden'}">Logout</button>
    `;
    document.body.appendChild(wrapper);

    el('#openAccountBtn')?.addEventListener('click', ()=> {
      if(!state.user) {
        openModal('#authModal');
      } else {
        wrapper.classList.toggle('hidden');
        el('#userNameDisplay').textContent = state.user.name || 'User';
        el('#userEmailDisplay').textContent = state.user.email || '';
      }
    });
    
    document.addEventListener('click', (ev)=> { 
      if(!ev.target.closest('#accountMenu') && !ev.target.closest('#openAccountBtn')) {
        wrapper.classList.add('hidden'); 
      }
    });

    el('#logoutBtn')?.addEventListener('click', ()=> {
      state.user = null; 
      authToken = null;
      localStorage.removeItem('user'); 
      localStorage.removeItem('authToken');
      updateAccountUI(); 
      toast('Logged out'); 
      wrapper.classList.add('hidden');
      location.reload(); // Refresh to reset UI
    });
  })();

  // Load saved user
  const saved = JSON.parse(localStorage.getItem('user') || 'null');
  if(saved){ 
    state.user = saved; 
    updateAccountUI(); 
  }
});