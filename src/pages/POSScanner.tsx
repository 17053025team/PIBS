import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { gasApi } from '../services/gasApi';
import { ChevronLeft, Camera, User, Package, Calendar, ShieldAlert, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const POSScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    }, false);

    scanner.render((result) => {
      setScanResult(result);
      scanner.clear();
      fetchBooking(result);
    }, (error) => {
      // console.warn(error);
    });

    return () => {
      scanner.clear().catch(e => console.error("Scanner clean error", e));
    };
  }, []);

  const fetchBooking = async (id: string) => {
    setLoading(true);
    try {
      const data = await gasApi.call('getBooking', {}, id);
      if (data && !data.error) {
        setBooking(data);
      } else {
        toast.error('Data Booking tidak ditemukan');
      }
    } catch (e) {
      toast.error('Gagal memverifikasi QR Code');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!booking) return;
    setProcessing(true);
    try {
      await gasApi.call('updateStatus', { status: newStatus }, booking.id);
      toast.success(newStatus === 'picked_up' ? 'Barang Berhasil Diambil' : 'Barang Berhasil Dikembalikan');
      setBooking({ ...booking, status: newStatus });
    } catch (e) {
      toast.error('Gagal memperbarui status');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      <Link to="/admin" className="inline-flex items-center gap-2 text-brand-maroon font-bold text-sm">
        <ChevronLeft size={16} /> Kembali ke Dashboard
      </Link>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">POS QR Scanner</h1>
        <p className="text-xs text-gray-500">Scan QR Code pada struk pelanggan untuk Konfirmasi Ambil/Kembali.</p>
      </div>

      {!booking ? (
        <div className="card-white overflow-hidden p-0 relative">
          <div id="reader"></div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-gray-100 flex items-center gap-2 pointer-events-none">
            <Camera size={14} className="text-brand-orange animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Scanning...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
           <div className="card-white space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">{booking.customerName}</h3>
                    <p className="text-[10px] text-gray-500">{booking.customerEmail}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${booking.status === 'paid' ? 'bg-blue-100 text-blue-600' : booking.status === 'picked_up' ? 'bg-orange-100 text-brand-orange' : 'bg-green-100 text-green-600'}`}>
                  {booking.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Package size={18} className="text-brand-maroon" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Item Pesanan</p>
                    <p className="font-medium">{booking.items.map((i: any) => i.name).join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={18} className="text-brand-maroon" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Durasi Sewa</p>
                    <p className="font-medium">{booking.startDate} sd {booking.endDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <ShieldAlert size={18} className="text-brand-orange" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Jaminan Dipegang</p>
                    <p className="font-medium text-brand-orange">{booking.jaminan}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 space-y-3">
                {booking.status === 'paid' && (
                  <button 
                    disabled={processing}
                    onClick={() => updateStatus('picked_up')} 
                    className="w-full btn-orange py-4 flex items-center justify-center gap-2"
                  >
                    {processing ? 'Memproses...' : 'Konfirmasi Ambil Barang'}
                    {!processing && <CheckCircle size={20} />}
                  </button>
                )}

                {booking.status === 'picked_up' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 text-[10px] text-brand-maroon rounded-xl border border-red-100">
                      <p className="font-bold mb-1 underline underline-offset-2">CEK FISIK BARANG:</p>
                      <ul className="list-disc pl-3 mt-1 space-y-0.5">
                        <li>Cek kelengkapan (frame, pasak, tas)</li>
                        <li>Cek sobekan atau kotoran berlebih</li>
                        <li>Pastikan jaminan dikembalikan ke pelanggan</li>
                      </ul>
                    </div>
                    <button 
                      disabled={processing}
                      onClick={() => updateStatus('returned')} 
                      className="w-full btn-maroon py-4 flex items-center justify-center gap-2"
                    >
                      {processing ? 'Memproses...' : 'Konfirmasi Barang Kembali'}
                      {!processing && <CheckCircle size={20} />}
                    </button>
                  </div>
                )}
                
                {booking.status === 'returned' && (
                  <div className="text-center py-6 animate-in zoom-in">
                    <CheckCircle size={60} className="text-green-500 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-green-600 uppercase">Selesai</h4>
                    <p className="text-gray-500 text-sm">Penyewaan ini telah diselesaikan sepenuhnya.</p>
                  </div>
                )}

                <button 
                  onClick={() => { setBooking(null); setScanResult(null); }} 
                  className="w-full py-3 text-gray-400 font-bold text-sm"
                >
                  Scan Ulang
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
