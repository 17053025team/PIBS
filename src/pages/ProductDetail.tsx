import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gasApi } from '../services/gasApi';
import { Info, ShieldCheck, CheckCircle, ShoppingCart, ArrowRight, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useBooking } from '../context/BookingContext';
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

export const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { startDate, endDate, days, isValid } = useBooking();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const products = await gasApi.call('getProducts');
        const found = products.find((p: any) => p.id === id);
        if (found) {
          setProduct(found);
        }

        // Fetch mock bookings to show availability
        const mockBookings = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('mock_trx_')) {
            const b = JSON.parse(localStorage.getItem(key)!);
            if (b.items?.some((item: any) => item.productId === id)) {
              mockBookings.push(b);
            }
          }
        }
        setBookings(mockBookings);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!isValid) {
      toast.error('Silakan tentukan tanggal sewa di halaman katalog terlebih dahulu');
      navigate('/');
      return;
    }

    addToCart({
      productId: product?.id!,
      name: product?.name!,
      price: product?.price!,
      itemTotal: product?.price! * days,
      startDate,
      endDate,
      days: days,
      quantity: 1
    });

    toast.success(`${product?.name} ditambahkan ke keranjang`);
    navigate('/');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-maroon"></div></div>;
  if (!product) return <div className="text-center py-20">Produk tidak ditemukan</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 pb-32 px-1 sm:px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Section */}
        <div className="space-y-4">
          <div className="aspect-[4/5] sm:aspect-square bg-gray-50 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-maroon/5 border border-gray-100">
            <img 
              src={product.imageUrl || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=800'} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform hover:scale-105 duration-700"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="card-white flex items-center gap-4 p-5 border-none shadow-xl shadow-gray-200/40">
            <div className="p-2.5 bg-orange-50 rounded-xl text-brand-orange">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-display text-base text-brand-maroon">Standard Prepare Outdoor</p>
              <p className="text-[10px] text-gray-400 font-medium">Alat diperiksa & dicuci bersih setelah setiap pemakaian.</p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
               <span className="badge-available px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase">{product.category}</span>
               <div className="flex items-center gap-1 text-xs text-gray-400 font-bold">
                 <CheckCircle size={14} className="text-green-500" /> Tersedia
               </div>
            </div>
            <h1 className="text-3xl sm:text-5xl font-display leading-tight text-brand-maroon">{product.name}</h1>
            <div className="flex items-baseline gap-2 pt-1">
              <p className="text-brand-orange text-3xl sm:text-4xl font-black">Rp {product.price.toLocaleString('id-ID')}</p>
              <span className="text-gray-400 text-xs font-medium italic">/ hari</span>
            </div>
          </div>

          <div className="p-5 bg-orange-50/50 rounded-3xl border border-brand-orange/5 space-y-4 shadow-inner">
             <div className="flex items-center justify-between">
               <h3 className="font-display text-base uppercase tracking-wider opacity-60">Periode Sewa</h3>
               {isValid && <span className="text-[10px] font-black bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-lg">{days} HARI</span>}
             </div>
             {!isValid ? (
               <div className="space-y-3">
                 <p className="text-xs text-gray-500 font-medium leading-relaxed">
                   Anda belum menentukan tanggal pemakaian alat.
                 </p>
                 <button onClick={() => navigate('/')} className="w-full bg-white text-brand-maroon p-3 rounded-xl text-xs font-black uppercase tracking-widest border border-brand-maroon/10 shadow-sm flex items-center justify-center gap-2">
                   Set Tanggal <ArrowRight size={14} />
                 </button>
               </div>
             ) : (
               <div className="flex items-center gap-3">
                  <div className="flex-grow p-3 bg-white rounded-2xl border border-orange-100 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-brand-maroon">{startDate}</p>
                    <div className="h-[1px] w-4 bg-gray-100 my-1"></div>
                    <p className="text-[10px] font-bold text-brand-maroon">{endDate}</p>
                  </div>
                  <button onClick={() => navigate('/')} className="p-3 bg-white rounded-2xl text-brand-orange border border-orange-100 shadow-sm">
                    <ArrowRight size={20} />
                  </button>
               </div>
             )}
          </div>

          <div className="space-y-3">
            <h3 className="font-display text-lg flex items-center gap-2">Deskripsi</h3>
            <p className="text-gray-500 leading-relaxed text-sm">{product.description}</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg">Booking Terjadwal</h3>
            {bookings.length > 0 ? (
               <div className="flex flex-wrap gap-2">
                   {bookings.map((b, i) => (
                     <span key={i} className="bg-red-50 text-brand-maroon text-[9px] font-bold px-3 py-1.5 rounded-lg border border-brand-maroon/5">
                       {b.startDate} — {b.endDate}
                     </span>
                   ))}
               </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Tersedia untuk disewa</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 lg:relative lg:bg-transparent lg:border-none lg:p-0">
        <div className="max-w-6xl mx-auto flex gap-3">
          <button 
            onClick={handleAddToCart}
            className="flex-1 btn-orange py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl shadow-orange-500/30"
          >
            <ShoppingCart size={18} />
            Keranjang
          </button>
          <button 
            onClick={() => { handleAddToCart(); if(isValid) navigate('/checkout'); }}
            className="flex-1 btn-maroon py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl shadow-maroon/30"
          >
            Checkout
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
