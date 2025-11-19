# J4R Box - Frontend

Game store e-commerce platform with animated UI and real-time inventory management.

## Features

- **Category System**: Physical, Currency, Digital products
- **Real-time Stock**: Syncs with MongoDB on checkout
- **Animated Background**: Interactive particle system
- **Toast Notifications**: Better user feedback
- **Responsive Design**: Mobile-friendly layout

## Product Categories

- **📦 Physical**: Game discs, accessories (stock management)
- **💎 Currency**: In-game top-ups (unlimited stock)
- **🎮 Digital**: Game keys (stock management)

## Recent Updates (v2.0)

- ✅ New category system (Physical/Currency/Digital)
- ✅ Stock deduction on checkout (syncs to MongoDB)
- ✅ Improved toast notifications
- ✅ Better stock badge UI
- ✅ GCash payment info for Currency/Digital purchases
- ✅ Removed login/cart from About/Contact pages
- ✅ Fixed checkout success modal z-index

## Setup

1. Clone the repository
2. Open with Live Server
3. Connect to backend API

## API Endpoints

- Backend: https://j4r-box-api.onrender.com
- Stock Update: POST /api/products/:id/stock

## Tech Stack

- HTML5, CSS3, JavaScript
- TailwindCSS
- Leaflet.js (Maps)
- Canvas API (Background animation)

## License

© 2025 J4R Box. All Rights Reserved.