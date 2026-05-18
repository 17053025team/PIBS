import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gasApi } from '../services/gasApi';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ChevronLeft, MapPin, BadgeCheck, ExternalLink, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const Receipt = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;
      try {
        const data = await gasApi.call('getBooking', {}, id);
        if (data && !data.error) {
          setBooking(data);
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-maroon"></div></div>;
  if (!booking) return <div className="text-center py-20 font-bold text-brand-maroon">Struk tidak ditemukan</div>;

  const isSale = booking.type === 'sale';

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12 animate-in fade-in duration-700">
      <style>{`
        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
          }
          body {
            width: 58mm;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          #printable-receipt {
            width: 58mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 1mm !important;
          }
          #printable-receipt * {
            color: black !important;
            font-size: 8pt !important;
            line-height: 1.4 !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
          #printable-receipt .bg-brand-maroon {
            background-color: transparent !important;
            border-bottom: 1px dashed #000 !important;
            padding: 10px 0 !important;
          }
          #printable-receipt h1 {
            font-size: 11pt !important;
            font-weight: bold !important;
          }
          #printable-receipt .text-white,
          #printable-receipt .text-brand-orange,
          #printable-receipt .text-brand-maroon {
            color: black !important;
          }
          #printable-receipt .p-8 {
            padding: 5px !important;
          }
          #printable-receipt .rounded-3xl,
          #printable-receipt .rounded-2xl {
            border-radius: 0 !important;
          }
          #printable-receipt .border-t-dashed {
            border-top: 1px dashed black !important;
          }
        }
      `}</style>
      
      <Link to="/" className="inline-flex items-center gap-2 text-brand-maroon font-bold text-sm no-print">
        <ChevronLeft size={16} /> Kembali ke Beranda
      </Link>

      <div id="printable-receipt" className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-2xl font-sans">
        {/* Header Struk */}
        <div className="bg-brand-maroon text-white p-6 text-center">
          <div className="flex justify-center mb-2 no-print">
            <BadgeCheck size={40} className="text-brand-orange" />
          </div>
          <h1 className="text-white text-2xl font-bold font-display uppercase tracking-wider">STRUK DIGITAL</h1>
          <p className="text-[10px] opacity-60 font-mono tracking-widest mt-1">ID: {booking.id}</p>
        </div>

        <div className="p-8 space-y-8">
          {/* QR Code Section (Only for bookings or if requested) */}
          {!isSale && (
            <div className="space-y-4 no-print">
               <div className="text-center p-4 bg-orange-50 border border-brand-orange/20 rounded-2xl">
                 <p className="text-[10px] font-black text-brand-orange uppercase mb-1 tracking-wider">Instruksi Toko</p>
                 <p className="text-[10px] font-medium text-brand-maroon leading-relaxed">Tunjukkan QR Code ini kepada kru toko saat Pengambilan dan Pengembalian Alat.</p>
               </div>

               <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                  <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '2px solid #FF6B00', borderRadius: '24px' }}>
                    <QRCodeSVG value={booking.id} size={150} level="H" />
                  </div>
               </div>
            </div>
          )}

          {/* Customer Details */}
          <div className="space-y-4">
             <div className="flex justify-between items-center text-[11px]">
               <span className="text-gray-400 uppercase font-black tracking-widest">Customer</span>
               <span className="font-bold uppercase text-brand-maroon">{booking.customerName}</span>
             </div>
             {booking.customerPhone && (
               <div className="flex justify-between items-center text-[11px]">
                 <span className="text-gray-400 uppercase font-black tracking-widest">Phone</span>
                 <span className="font-bold text-brand-maroon">{booking.customerPhone}</span>
               </div>
             )}
             <div className="flex justify-between items-center text-[11px]">
               <span className="text-gray-400 uppercase font-black tracking-widest">Transaksi</span>
               <span className="font-bold text-brand-maroon uppercase">{isSale ? 'POS / Penjualan' : 'Rental / Sewa'}</span>
             </div>
             <div className="flex justify-between items-center text-[11px]">
               <span className="text-gray-400 uppercase font-black tracking-widest">Tanggal</span>
               <span className="font-bold text-brand-maroon">{booking.date || new Date(booking.timestamp || Date.now()).toLocaleDateString()}</span>
             </div>
             <div className="flex justify-between items-center text-[11px]">
               <span className="text-gray-400 uppercase font-black tracking-widest">Status</span>
               <span className="font-bold uppercase text-green-600 px-2 py-0.5 bg-green-50 rounded text-[9px]">{booking.status}</span>
             </div>
          </div>

          {/* Items Section */}
          <div className="pt-6 border-t border-dashed border-gray-200">
            <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-[0.2em] mb-4">Rincian Item</h3>
            <div className="space-y-4">
              {booking.items.map((item: any, idx: number) => {
                const isSaleItem = isSale || !!item.qty;
                const unitPrice = item.customPrice || item.price || item.itemPrice || 0;
                const quantity = isSaleItem ? (item.qty || item.quantity || 1) : 1;
                const subTrx = isSaleItem ? (unitPrice * quantity) : (item.itemTotal || item.itemPrice || 0);
                
                const itemDiscount = item.itemDiscountType === 'percent' 
                  ? (subTrx * (item.itemDiscount || 0) / 100) 
                  : (item.itemDiscount || 0);
                
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-start text-xs">
                      <div>
                        <p className="font-bold text-brand-maroon">
                          {item.name} 
                          <span className="text-gray-400 text-[10px] ml-1">
                            x{isSaleItem ? quantity : (item.days || 1)}
                          </span>
                        </p>
                        {!isSaleItem && item.startDate && (
                          <p className="text-[9px] text-gray-400 mt-0.5">{item.startDate} sd {item.endDate}</p>
                        )}
                        {isSaleItem && (
                          <p className="text-[9px] text-gray-400 mt-0.5 ml-1">@ Rp {unitPrice.toLocaleString('id-ID')}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-black text-brand-maroon">Rp {subTrx.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    {itemDiscount > 0 && (
                      <div className="flex justify-between text-[9px] text-orange-500 font-bold italic pl-4">
                        <span>Disc Item {item.itemDiscountType === 'percent' ? `(${item.itemDiscount}%)` : ''}</span>
                        <span>-Rp {itemDiscount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="pt-6 border-t border-gray-100 space-y-2">
             <div className="flex justify-between text-[11px] text-gray-500">
               <span>Total Sebelum Diskon</span>
               <span>Rp {booking.items.reduce((s: number, i: any) => {
                 const up = i.customPrice || i.price || i.itemPrice || 0;
                 const q = isSale ? (i.qty || i.quantity || 1) : 1;
                 return s + (isSale ? (up * q) : (i.itemTotal || i.itemPrice || 0));
               }, 0).toLocaleString('id-ID')}</span>
             </div>

             {(booking.globalDiscount > 0 || booking.items.some((i: any) => i.itemDiscount > 0)) && (
               <div className="flex justify-between text-[11px] text-orange-500 font-bold">
                 <span>Total Potongan Diskon</span>
                 <span>-Rp {(
                   booking.items.reduce((s: number, i: any) => {
                     const isub = isSale ? ((i.customPrice || i.price || i.itemPrice || 0) * (i.qty || i.quantity || 1)) : (i.itemTotal || i.itemPrice || 0);
                     const idisc = i.itemDiscountType === 'percent' ? (isub * (i.itemDiscount || 0) / 100) : (i.itemDiscount || 0);
                     return s + idisc;
                   }, 0) + 
                   (booking.globalDiscountType === 'percent' ? (
                     booking.items.reduce((s: number, i: any) => {
                       const isub = isSale ? ((i.customPrice || i.price || i.itemPrice || 0) * (i.qty || i.quantity || 1)) : (i.itemTotal || i.itemPrice || 0);
                       const idisc = i.itemDiscountType === 'percent' ? (isub * (i.itemDiscount || 0) / 100) : (i.itemDiscount || 0);
                       return s + (isub - idisc);
                     }, 0) * booking.globalDiscount / 100) : (booking.globalDiscount || 0))
                 ).toLocaleString('id-ID')}</span>
               </div>
             )}
             <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
               <span className="font-black text-[10px] uppercase tracking-widest text-brand-maroon opacity-50">Harga Akhir</span>
               <span className="font-display text-2xl text-brand-orange">Rp {booking.totalAmount.toLocaleString('id-ID')}</span>
             </div>
          </div>

          {/* Footer Receipt */}
          <div className="pt-8 border-t border-dashed border-gray-100 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-[10px]">
              <MapPin size={12} />
              <span className="font-bold uppercase tracking-wider">PREPARE OUTDOOR</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed italic">
              "Petualangan besar dimulai dari persiapan yang matang."<br/>
              Simpan struk ini sebagai bukti pembayaran yang sah.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 no-print">
        <button 
          onClick={handlePrint}
          className="bg-brand-maroon text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-lg shadow-maroon/20"
        >
          <Printer size={16} /> Cetak
        </button>
        <button 
          onClick={() => {
            const url = window.location.href;
            const text = `Halo! Berikut adalah Struk Digital PREPARE OUTDOOR Anda (ID: ${booking.id}).%0A%0ALihat di sini: ${url}`;
            const phone = booking.customerPhone ? (booking.customerPhone.startsWith('0') ? '62' + booking.customerPhone.slice(1) : booking.customerPhone) : '';
            window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
          }}
          className="bg-green-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-green-200"
        >
          <MessageCircle size={16} /> WhatsApp
        </button>
      </div>
    </div>
  );
};
