import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gasApi } from '../services/gasApi';
import { CreditCard, Wallet, Clock, CheckCircle2, Trash2, Calendar, Edit2, ChevronLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useBooking } from '../context/BookingContext';
import toast from 'react-hot-toast';

export const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, removeFromCart, clearCart } = useCart();
  const { startDate, endDate, setPeriod, days } = useBooking();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [jaminan, setJaminan] = useState('KTP');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'payment'>('details');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  const [editDates, setEditDates] = useState(false);
  const [newStart, setNewStart] = useState(startDate);
  const [newEnd, setNewEnd] = useState(endDate);

  useEffect(() => {
    if (items.length === 0 && paymentStep === 'details') {
      navigate('/');
    }
  }, [items, navigate, paymentStep]);

  useEffect(() => {
    if (paymentStep === 'payment' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
    if (timeLeft === 0 && paymentStep === 'payment') {
      toast.error('Waktu pembayaran habis');
      setPaymentStep('details');
    }
  }, [paymentStep, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCheckout = async () => {
    if (!customerName || !customerEmail) {
      toast.error('Lengkapi data diri Anda');
      return;
    }
    setPaymentStep('payment');
  };

  const confirmPayment = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        customerName,
        customerEmail,
        items: items.map(item => ({
          ...item,
          startDate,
          endDate,
          days,
          itemTotal: item.price * days
        })),
        totalAmount: items.reduce((acc, curr) => acc + (curr.price * days), 0),
        jaminan,
        startDate,
        endDate,
        type: 'rent',
        timestamp: Date.now(),
        date: new Date().toLocaleDateString('id-ID')
      };

      const result = await gasApi.call('createBooking', payload);
      if (result.success) {
        // Simulasi simpan untuk mock
        localStorage.setItem(`mock_trx_${result.id}`, JSON.stringify({
           ...payload,
           id: result.id,
           status: 'paid'
        }));
        
        clearCart();
        toast.success('Pembayaran Berhasil!');
        navigate(`/receipt/${result.id}`);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error('Terjadi kesalahan saat memproses pesanan');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0 && paymentStep === 'details') return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 px-2 sm:px-0">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 sm:p-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
           <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl sm:text-3xl font-display text-brand-maroon leading-none">Penyelesaian Sewa</h1>
      </div>

      {paymentStep === 'details' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="card-white space-y-6 p-6 border-none shadow-xl shadow-maroon/5 bg-white/60 backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display text-brand-maroon">Keranjang Sewa</h2>
              {!editDates ? (
                <button 
                  onClick={() => setEditDates(true)} 
                  className="text-[10px] font-black text-brand-orange uppercase flex items-center gap-1 hover:underline"
                >
                  <Edit2 size={12} /> Ubah Periode
                </button>
              ) : (
                <button 
                  onClick={() => { setPeriod(newStart, newEnd); setEditDates(false); }} 
                  className="text-[10px] font-black text-green-600 uppercase tracking-widest"
                >
                  Simpan
                </button>
              )}
            </div>

            {editDates ? (
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-gray-400 uppercase">Mulai</span>
                  <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} className="w-full p-2 text-xs rounded-xl border-none outline-none focus:ring-1 ring-brand-orange" />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-gray-400 uppercase">Selesai</span>
                  <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="w-full p-2 text-xs rounded-xl border-none outline-none focus:ring-1 ring-brand-orange" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-[10px] font-black text-brand-orange bg-orange-50 px-4 py-2 rounded-2xl w-fit">
                <Calendar size={14} /> {startDate} — {endDate} ({days} Hari)
              </div>
            )}

            <div className="divide-y divide-gray-50 pt-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-4 group">
                  <div className="flex-grow">
                    <p className="font-bold text-sm text-brand-maroon group-hover:text-brand-orange transition-colors">{item.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Rp {item.price.toLocaleString()} / hari</p>
                  </div>
                  <div className="flex items-center gap-5 text-right">
                    <p className="font-mono font-bold text-sm whitespace-nowrap">Rp {(item.price * days).toLocaleString('id-ID')}</p>
                    <button onClick={() => removeFromCart(idx)} className="text-red-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center pt-5 border-t border-gray-100 font-display text-2xl text-brand-maroon">
              <span className="text-xs text-gray-400 font-sans font-black uppercase tracking-widest">Total Tagihan</span>
              <span>Rp {(items.reduce((acc, curr) => acc + (curr.price * days), 0)).toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="card-white space-y-6 p-6 border-none shadow-xl shadow-maroon/5">
            <h2 className="text-xl font-display text-brand-maroon">Formulir Penyewa</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Identitas Penyewa</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange/50 transition-all text-sm font-bold"
                  placeholder="Nama sesuai KTP"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp / Email</label>
                <input 
                  type="email" 
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                   className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange/50 transition-all text-sm font-bold"
                  placeholder="budi@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Jaminan Berkas</label>
                <select 
                  value={jaminan}
                  onChange={(e) => setJaminan(e.target.value)}
                   className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange/50 transition-all text-sm font-bold"
                >
                  <option value="KTP">KTP Asli</option>
                  <option value="SIM">SIM Asli</option>
                  <option value="PASPOR">Paspor</option>
                </select>
              </div>
            </div>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={!customerName || !customerEmail}
            className="w-full btn-maroon py-5 text-sm font-black uppercase tracking-widest shadow-2xl shadow-maroon/20 disabled:opacity-50"
          >
            Lanjut ke Pembayaran
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="card-white text-center space-y-6 py-8">
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-bold">QRIS Dinamis</h2>
              <p className="text-gray-500 text-sm">Gopay Merchant Prepare Outdoor</p>
            </div>

            <div className="relative mx-auto w-64 h-64 bg-white p-4 border-2 border-brand-orange rounded-3xl overflow-hidden flex items-center justify-center">
              {/* Mock QRIS Image */}
              <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-2 border-4 border-orange-50 underline decoration-brand-orange underline-offset-8">
                 <p className="font-mono text-xs opacity-50">QRIS PAYLOAD DATA</p>
                 <CheckCircle2 size={60} className="text-brand-orange opacity-20" />
                 <p className="font-bold text-brand-maroon">Rp {total.toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-brand-maroon bg-red-100 px-4 py-2 rounded-full">
                <Clock size={16} />
                <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
              </div>
              <p className="text-sm font-medium text-gray-500">Selesaikan pembayaran sebelum waktu habis</p>
            </div>

            <div className="pt-6 border-t border-gray-100">
               <button 
                onClick={confirmPayment} 
                disabled={isProcessing}
                className="w-full btn-orange py-4 flex items-center justify-center gap-3"
              >
                {isProcessing ? 'Memproses...' : 'Saya Sudah Bayar'}
                <Wallet size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-500 justify-center">
            <CreditCard size={16} />
            <p>Pembayaran aman & terenkripsi otomatis</p>
          </div>
        </div>
      )}
    </div>
  );
};
