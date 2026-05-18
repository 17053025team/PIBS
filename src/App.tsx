/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Navbar } from './components/Navbar';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { Checkout } from './pages/Checkout';
import { Receipt } from './pages/Receipt';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { POSScanner } from './pages/POSScanner';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { BookingProvider } from './context/BookingContext';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <BookingProvider>
          <CartProvider>
            <div className="min-h-screen bg-brand-white flex flex-col">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-6">
              <Routes>
                <Route path="/" element={<Catalog />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/receipt/:id" element={<Receipt />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/scan" element={<POSScanner />} />
              </Routes>
            </main>
            <footer className="bg-brand-maroon text-white py-8 mt-auto">
              <div className="container mx-auto px-4 text-center">
                <h3 className="font-display text-xl mb-2 text-white">Prepare Outdoor</h3>
                <p className="text-sm opacity-80">Persewaan Alat Gunung & Outdoor Terpercaya</p>
              </div>
            </footer>
            <Toaster position="top-center" />
          </div>
        </CartProvider>
        </BookingProvider>
      </AuthProvider>
    </Router>
  );
}
