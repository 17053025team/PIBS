import React, { useEffect, useState } from 'react';
import { gasApi } from '../services/gasApi';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Star, Shield, Info, Calendar, ChevronRight, ShoppingCart, Info as InfoIcon } from 'lucide-react';
import { useBooking } from '../context/BookingContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
  description: string;
  category: string;
}

export const Catalog = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate, setPeriod, isValid, days } = useBooking();
  const { addToCart } = useCart();

  const [dateStart, setDateStart] = useState(startDate);
  const [dateEnd, setDateEnd] = useState(endDate);

  const applyDates = () => {
    setPeriod(dateStart, dateEnd);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isValid) {
      toast.error('Silakan tetapkan tanggal sewa terlebih dahulu');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      itemTotal: product.price * days,
      startDate,
      endDate,
      days,
      quantity: 1
    });

    toast.success(`${product.name} masuk keranjang!`);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await gasApi.call('getProducts');
        // Hanya tampilkan produk kategori Sewa
        const rentalProducts = data.filter((p: any) => p.type === 'rent');
        setProducts(rentalProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-maroon"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 px-2 sm:px-4">
      {/* Global Date Selector - Optimized for Mobile */}
      <section className="sticky top-[64px] sm:top-20 z-40 transition-all duration-300">
        {!isValid || !startDate ? (
          <div className="bg-white border-2 border-brand-orange/20 rounded-3xl p-5 shadow-xl shadow-orange-500/10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-brand-maroon">
                <Calendar size={20} className="text-brand-orange" />
                <span className="font-display text-lg">Pilih Tanggal Sewa</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Mulai</label>
                  <input 
                    type="date" 
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-brand-orange font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Selesai</label>
                  <input 
                    type="date" 
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-brand-orange font-bold text-xs"
                  />
                </div>
              </div>
              <button 
                onClick={applyDates}
                disabled={!dateStart || !dateEnd || new Date(dateEnd) < new Date(dateStart)}
                className="btn-orange py-4 w-full font-black text-xs uppercase tracking-widest disabled:opacity-50"
              >
                Terapkan Tanggal
              </button>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="group bg-brand-maroon text-white rounded-2xl p-3 shadow-lg flex items-center justify-between cursor-pointer border border-white/10 hover:bg-brand-maroon/95 transition-colors"
            onClick={() => setPeriod('', '')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Calendar size={16} className="text-brand-orange" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-tighter opacity-70 leading-none mb-1">Periode Sewa ({days} Hari)</p>
                <p className="text-xs font-bold leading-none">{startDate} — {endDate}</p>
              </div>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest group-hover:bg-brand-orange transition-colors">
              Ubah
            </div>
          </motion.div>
        )}
      </section>

      {/* Hero Section */}
      <section className="bg-gradient-summit rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <h1 className="text-white text-4xl md:text-5xl mb-4 leading-tight">Jelajahi Alam dengan Alat Premium</h1>
          <p className="text-white/80 mb-6 italic">Sewa alat pendakian berkualitas tinggi dengan harga terjangkau. Aman, Nyaman, & Terpercaya.</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs backdrop-blur-md">
              <Shield size={14} className="text-brand-orange" />
              <span>Jaminan Alat Steril</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs backdrop-blur-md">
              <Star size={14} className="text-brand-orange" />
              <span>Peralatan Top-Tier</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
          <Mountain size={300} className="transform translate-x-20 -translate-y-10" />
        </div>
      </section>

      {/* Catalog Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl">Katalog Alat</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['Tenda', 'Tas', 'Sepatu', 'Alat Masak'].map(cat => (
              <button key={cat} className="px-4 py-2 rounded-full border border-gray-200 text-sm hover:border-brand-maroon transition-colors whitespace-nowrap">
                {cat}
              </button>
            ))}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Info className="mx-auto text-gray-400 mb-2" size={48} />
            <p className="text-gray-500">Belum ada alat yang tersedia. Tunggu admin mengisi stok ya!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="card-white group flex flex-col p-2 sm:p-4 border-none shadow-lg shadow-gray-100 animate-in fade-in duration-300"
              >
                <div onClick={() => navigate(`/product/${product.id}`)} className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-3 bg-gray-50 flex items-center justify-center cursor-pointer">
                  <img
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=400'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {product.stock > 0 ? 'Tersedia' : 'Habis'}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                     <div className="bg-white/90 backdrop-blur p-2 rounded-full text-brand-maroon shadow-xl scale-75 group-hover:scale-100 transition-transform">
                       <InfoIcon size={20} />
                     </div>
                  </div>
                </div>
                
                <div className="flex-grow space-y-1">
                  <h3 className="font-display text-sm sm:text-base leading-tight line-clamp-1">{product.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-brand-orange font-black text-sm sm:text-lg">Rp{product.price.toLocaleString('id-ID')}</span>
                    <span className="text-[9px] text-gray-400 font-bold">/hari</span>
                  </div>
                </div>

                <div className="pt-3 flex gap-1.5">
                  <button 
                    onClick={(e) => handleAddToCart(e, product)}
                    className="flex-grow btn-orange py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <ShoppingCart size={14} /> Sewa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const Mountain = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
  </svg>
);
