/**
 * SERVICE UNTUK KOMUNIKASI DENGAN GOOGLE APPS SCRIPT
 */

// URL Web App dari Google Apps Script
// Disarankan menggunakan .env file dengan key VITE_GAS_URL
const GAS_WEB_APP_URL = (import.meta as any).env.VITE_GAS_URL || "";

// Gunakan MOCK_DATA jika URL belum diisi agar aplikasi bisa di-preview di AI Studio
const USE_MOCK = !GAS_WEB_APP_URL || (import.meta as any).env.VITE_USE_MOCK === "true";

const MOCK_PRODUCTS = [
  { 
    id: '1', 
    name: 'Tenda Eiger Guardian 4P', 
    price: 75000, 
    stock: 5, 
    category: 'Tenda', 
    type: 'rent',
    description: 'Tenda double layer kapasitas 4 orang. Paket termasuk: Inner tent, Flysheet, Frame aluminum, 15 Pasak, & Bag.', 
    imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800', 
    isActive: true 
  },
  { 
    id: '2', 
    name: 'Carrier Consina Centurion 50L', 
    price: 35000, 
    stock: 8, 
    category: 'Tas', 
    type: 'rent',
    description: 'Tas gunung dengan backsystem airflow. Sudah termasuk Raincover original.', 
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', 
    isActive: true 
  },
  {
    id: '3',
    name: 'Gas Butane Portable 230g',
    price: 18000,
    stock: 50,
    category: 'Bahan Bakar',
    type: 'sale',
    description: 'Gas butane portable untuk kompor camping. Isi 230 gram.',
    imageUrl: 'https://images.unsplash.com/photo-1627844007135-be0256e409d5?w=800',
    isActive: true
  },
  {
    id: '4',
    name: 'Kaos Kaki Trekking Wol',
    price: 25000,
    stock: 30,
    category: 'Pakaian',
    type: 'sale',
    description: 'Kaos kaki tebal bahan wol untuk pendakian. Nyaman dan hangat.',
    imageUrl: 'https://images.unsplash.com/photo-1582966298431-99c6a1e8d44c?w=800',
    isActive: true
  }
];

export const gasApi = {
  async call(action: string, payload: any = {}, id: string = '') {
    if (USE_MOCK) {
      console.log(`[MOCK API] Action: ${action}`, payload);
      await new Promise(r => setTimeout(r, 800)); // Simulate delay

      // Initialize mock products in localStorage if not exists
      if (!localStorage.getItem('mock_products')) {
        localStorage.setItem('mock_products', JSON.stringify(MOCK_PRODUCTS));
      }

      const getStoredProducts = () => JSON.parse(localStorage.getItem('mock_products') || '[]');
      const setStoredProducts = (products: any[]) => localStorage.setItem('mock_products', JSON.stringify(products));
      
      if (action === 'getProducts') return getStoredProducts();
      
      if (action === 'addProduct') {
        const products = getStoredProducts();
        const newProduct = { ...payload, id: 'PROD-' + Date.now() };
        setStoredProducts([...products, newProduct]);
        return { success: true, product: newProduct };
      }

      if (action === 'updateProduct') {
        const products = getStoredProducts();
        const updated = products.map((p: any) => p.id === id ? { ...p, ...payload } : p);
        setStoredProducts(updated);
        return { success: true };
      }

      if (action === 'deleteProduct') {
        const products = getStoredProducts();
        setStoredProducts(products.filter((p: any) => p.id !== id));
        return { success: true };
      }

      if (action === 'createBooking') return { success: true, id: 'TRX-' + Math.random().toString(36).substr(2, 9).toUpperCase() };
      if (action === 'getBooking') {
          // Cari di local storage untuk simulasi
          const saved = localStorage.getItem(`mock_trx_${id}`);
          return saved ? JSON.parse(saved) : { 
              id, 
              customerName: 'Customer Demo', 
              status: 'paid', 
              items: [MOCK_PRODUCTS[0]], 
              totalAmount: 75000,
              startDate: '2024-05-20',
              endDate: '2024-05-21',
              jaminan: 'KTP'
          };
      }
      if (action === 'updateStatus') return { success: true };
      return { error: 'Mock action not found' };
    }

    // REAL CALL TO GOOGLE APPS SCRIPT
    // Catatan: Google Apps Script memerlukan redirect mode: 'follow' dan biasanya dikirim via POST
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action, payload, id }),
    });
    return response.json();
  }
};
