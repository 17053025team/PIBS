import React, { useEffect, useState } from 'react';
import { gasApi } from '../services/gasApi';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit3, Package, Users, Activity, QrCode, LayoutDashboard, Database, Receipt as ReceiptIcon, TrendingUp, Info, ExternalLink, ShoppingCart, Search, X, Printer, Check, Barcode, CreditCard, Wallet, Link as LinkIcon, Download, MessageCircle, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pos' | 'history' | 'inventory' | 'bookings' | 'promotions'>('overview');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'rent' | 'sale'>('all');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('All');
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [selectedProductDetail, setSelectedProductDetail] = useState<any | null>(null);
  
  // Promotion State
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showAddPromoModal, setShowAddPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [newPromo, setNewPromo] = useState({
    name: '',
    type: 'item_discount' as 'item_discount' | 'min_purchase' | 'buy_x_get_y',
    value: 0,
    targetItemId: '',
    minPurchase: 0,
    buyQty: 0,
    getQty: 0,
    isActive: true
  });
  
  // POS State
  const [posMode, setPosMode] = useState<'sale' | 'rent'>('sale');
  const [posCart, setPosCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posGlobalDiscount, setPosGlobalDiscount] = useState(0);
  const [posGlobalDiscountType, setPosGlobalDiscountType] = useState<'amount' | 'percent'>('amount');
  const [posPayload, setPosPayload] = useState(''); // For product code entry
  const [showPosSearchModal, setShowPosSearchModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer' | 'debit'>('cash');
  const [posLoading, setPosLoading] = useState(false);

  // Rental Specific POS State
  const [rentStartDate, setRentStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [rentEndDate, setRentEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleAddById = (id: string) => {
    const p = products.find(prod => (prod.id === id || prod.barcode === id) && prod.type === posMode);
    if (!p) {
      toast.error(`Barang ${posMode === 'sale' ? 'jual' : 'sewa'} tidak ditemukan atau tipe barang salah`);
      return;
    }
    const existing = posCart.find(item => item.id === p.id);
    if (existing) {
      setPosCart(posCart.map(item => item.id === p.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setPosCart([...posCart, { ...p, qty: 1, customPrice: p.price, itemDiscount: 0, itemDiscountType: 'amount' }]);
    }
    setPosPayload('');
  };

  const calculateRentDays = () => {
    if (posMode !== 'rent') return 1;
    const start = new Date(rentStartDate);
    const end = new Date(rentEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const calculateTotal = () => {
    const days = calculateRentDays();
    let subtotal = posCart.reduce((sum, item) => {
      const price = item.customPrice ?? item.price;
      const discountVal = item.itemDiscount ?? 0;
      
      // Auto-apply item promotions if any
      const itemPromo = promotions.find(p => p.isActive && p.type === 'item_discount' && p.targetItemId === item.id);
      const effectiveDiscountVal = itemPromo ? Math.max(discountVal, itemPromo.value) : discountVal;

      const totalItemPrice = price * item.qty * (posMode === 'rent' ? days : 1);
      const discount = item.itemDiscountType === 'percent' 
        ? (totalItemPrice * effectiveDiscountVal / 100) 
        : effectiveDiscountVal;
      return sum + (totalItemPrice - discount);
    }, 0);
    
    // Apply Global Min Purchase Promotion
    const minPurchasePromo = promotions
      .filter(p => p.isActive && p.type === 'min_purchase' && subtotal >= p.minPurchase)
      .sort((a, b) => b.value - a.value)[0];
    
    let promoDiscount = 0;
    if (minPurchasePromo) {
      promoDiscount = minPurchasePromo.value;
    }

    const globalDiscountVal = posGlobalDiscountType === 'percent'
      ? (subtotal * posGlobalDiscount / 100)
      : posGlobalDiscount;
      
    return Math.max(0, subtotal - (globalDiscountVal + promoDiscount));
  };

  const downloadInventoryExcel = () => {
    const dataToExport = products
      .filter(p => {
        const matchesType = inventoryFilter === 'all' || p.type === inventoryFilter;
        const matchesCategory = inventoryCategoryFilter === 'All' || p.category === inventoryCategoryFilter;
        const matchesSearch = p.name.toLowerCase().includes(inventorySearchQuery.toLowerCase()) || p.id.includes(inventorySearchQuery);
        return matchesType && matchesCategory && matchesSearch;
      })
      .map(p => ({
        'ID Produk': p.id,
        'Barcode': p.barcode || '-',
        'Nama Produk': p.name,
        'Kategori': p.category,
        'Tipe': p.type === 'rent' ? 'Sewa' : 'Jual',
        'Harga Unit': p.price,
        'Stok': p.stock,
        'Status': p.isActive ? 'Aktif' : 'Non-Aktif',
        'Deskripsi': p.description || '-'
      }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stok Inventaris');
    XLSX.writeFile(workbook, `Prepare_Outdoor_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel berhasil diunduh');
  };

  // Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    stock: 0,
    category: 'Tenda',
    type: 'rent' as 'rent' | 'sale',
    description: '',
    imageUrl: '',
    barcode: '',
    isActive: true
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar');
        return;
      }
      try {
        const resized = await resizeImage(file);
        setImagePreview(resized);
        setNewProduct(prev => ({ ...prev, imageUrl: resized }));
      } catch (err) {
        toast.error('Gagal memproses gambar');
      }
    }
  };

  useEffect(() => {
    if (showPosSearchModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPosSearchModal]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pData = await gasApi.call('getProducts');
      setProducts(pData);
      
      const allTrx: any[] = [];
      const allPromos: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('mock_trx_')) {
          allTrx.push(JSON.parse(localStorage.getItem(key)!));
        }
        if (key?.startsWith('mock_promo_')) {
          allPromos.push(JSON.parse(localStorage.getItem(key)!));
        }
      }
      const sortedTrx = allTrx.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setTransactions(sortedTrx);
      setBookings(sortedTrx.filter(t => t.type === 'rent' || !t.type));
      setPromotions(allPromos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPromotion = (e: React.FormEvent) => {
    e.preventDefault();
    const promoId = editingPromo ? editingPromo.id : `promo_${Date.now()}`;
    const promoData = { ...newPromo, id: promoId };
    localStorage.setItem(`mock_promo_${promoId}`, JSON.stringify(promoData));
    toast.success(editingPromo ? 'Promotion updated' : 'Promotion added');
    setShowAddPromoModal(false);
    setEditingPromo(null);
    fetchData();
  };

  const deletePromo = (id: string) => {
    if(!confirm('Delete promotion?')) return;
    localStorage.removeItem(`mock_promo_${id}`);
    fetchData();
  };

  const generateUniqueBarcode = () => {
    let newBarcode = '';
    let isUnique = false;
    while (!isUnique) {
      newBarcode = Math.random().toString(36).substring(2, 10).toUpperCase();
      isUnique = !products.some(p => p.barcode === newBarcode);
    }
    setNewProduct({ ...newProduct, barcode: newBarcode });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await gasApi.call('updateProduct', newProduct, editingProduct.id);
        toast.success('Produk berhasil diperbarui');
      } else {
        await gasApi.call('addProduct', newProduct);
        toast.success('Produk berhasil ditambahkan');
      }
      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      fetchData();
    } catch (e) {
      toast.error(editingProduct ? 'Gagal memperbarui produk' : 'Gagal menambah produk');
    }
  };

  const resetForm = () => {
    setNewProduct({
      name: '',
      price: 0,
      stock: 0,
      category: 'Tenda',
      type: 'rent' as 'rent' | 'sale',
      description: '',
      imageUrl: '',
      barcode: '',
      isActive: true
    });
    setImagePreview(null);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price,
      stock: product.stock,
      category: product.category,
      type: product.type || 'rent',
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      barcode: product.barcode || '',
      isActive: product.isActive ?? true
    });
    setImagePreview(product.imageUrl || null);
    setShowAddModal(true);
  };

  const updateStock = async (id: string, delta: number) => {
    try {
      const p = products.find(prod => prod.id === id);
      if(!p) return;
      const newStock = Math.max(0, p.stock + delta);
      await gasApi.call('updateProduct', { stock: newStock }, id);
      toast.success('Stok diperbarui', { duration: 1000 });
      fetchData();
    } catch (e) {
      toast.error('Gagal update stok');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Hapus produk ini secara permanen?')) return;
    try {
      await gasApi.call('deleteProduct', {}, id);
      toast.success('Produk berhasil dihapus');
      fetchData();
    } catch (e) {
      toast.error('Gagal menghapus');
    }
  };

  const seedData = async () => {
    toast.success('Sampel data berhasil ditambahkan (Simulasi)!');
    fetchData();
  };

  const handlePrint = () => {
    if (!selectedTransaction) return;
    const printContents = document.getElementById('receipt-content')?.innerHTML;
    if (!printContents) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Receipt ${selectedTransaction.id}</title>
            <style>
              @page { size: 58mm auto; margin: 0; }
              body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 58mm; margin: 0; padding: 2mm; color: #000;
                line-height: 1.2;
              }
              * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
              img { max-width: 100%; height: auto; }
              .receipt-wrapper { padding: 4mm; }
              /* Force specific styles for print */
              h1, h2, h3 { margin: 0; text-align: center; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .border-t { border-top: 1px dashed #000; margin: 4mm 0; }
              .flex { display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            <div class="receipt-wrapper">
              ${printContents}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  const handleWhatsAppShare = () => {
    if (!selectedTransaction) return;

    const receiptUrl = `${window.location.origin}/receipt/${selectedTransaction.id}`;
    const text = `*PREPARE OUTDOOR*%0A%0A*STRUK PEMBELIAN DIGITAL*%0ANo: ${selectedTransaction.id}%0ACustomer: ${selectedTransaction.customerName}%0A%0A*TOTAL: Rp${selectedTransaction.totalAmount.toLocaleString()}*%0A%0ALihat struk digital Anda di sini:%0A${receiptUrl}%0A%0ATerima Kasih!`;
    
    let phone = selectedTransaction.customerPhone || '';
    if (phone) {
      // Basic Indonesian phone normalization
      phone = phone.replace(/[^0-9]/g, '');
      if (phone.startsWith('0')) {
        phone = '62' + phone.slice(1);
      } else if (phone.startsWith('8')) {
        phone = '62' + phone;
      }
    }

    if (!phone) {
      toast.error('Nomor WhatsApp tidak tersedia');
      return;
    }

    toast.success('Membuka WhatsApp...');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleCopyLink = () => {
    if (!selectedTransaction) return;
    const receiptUrl = `${window.location.origin}/receipt/${selectedTransaction.id}`;
    navigator.clipboard.writeText(receiptUrl);
    toast.success('Link struk berhasil disalin!');
  };

  const handleDownloadPDF = async () => {
    if (!selectedTransaction) return;
    const element = document.getElementById('receipt-content');
    if (!element) return;

    try {
      toast.loading('Menyiapkan PDF...', { id: 'pdf-gen' });
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [58, canvas.height * 58 / canvas.width]
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_PrepareOutdoor_${selectedTransaction.id}.pdf`);
      toast.success('PDF berhasil diunduh', { id: 'pdf-gen' });
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengunduh PDF', { id: 'pdf-gen' });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-maroon"></div></div>;

  const totalRevenue = transactions.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const rentalRevenue = transactions.filter(t => t.type === 'rent').reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const saleRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  return (
    <div className="space-y-4 pb-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-display text-brand-maroon">Admin Hub</h1>
          <p className="text-gray-400 text-xs">Rangkuman operasional Anda.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/scan" className="bg-orange-50 text-brand-orange flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold hover:bg-orange-100 transition-all">
            <QrCode size={16} /> Scan
          </Link>
          <button 
            onClick={() => {
              setEditingProduct(null);
              resetForm();
              setShowAddModal(true);
            }} 
            className="btn-maroon flex items-center gap-1.5 py-2 px-4 shadow-md text-xs"
          >
            <Plus size={16} /> Produk
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-0.5 bg-gray-100 rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', icon: LayoutDashboard, label: 'Ikhtisar' },
          { id: 'pos', icon: ShoppingCart, label: 'POS Jual' },
          { id: 'history', icon: TrendingUp, label: 'Riwayat' },
          { id: 'inventory', icon: Database, label: 'Stok' },
          { id: 'bookings', icon: ReceiptIcon, label: 'Sewa' },
          { id: 'promotions', icon: Activity, label: 'Promosi' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-brand-maroon shadow-sm' 
                : 'text-gray-500 hover:text-brand-maroon'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Pendapatan', value: `Rp${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Pendapatan Sewa', value: `Rp${rentalRevenue.toLocaleString()}`, icon: ReceiptIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Pendapatan Jual', value: `Rp${saleRevenue.toLocaleString()}`, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Pesanan Aktif', value: bookings.filter(b => b.status !== 'returned').length, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
                ].map((stat, i) => (
                  <div key={i} className="card-white group hover:border-brand-maroon/20 hover:shadow-xl transition-all p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl`}>
                        <stat.icon size={26} />
                      </div>
                      <Info size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-gray-500 uppercase font-black tracking-widest mb-1">{stat.label}</p>
                    <p className="text-3xl font-display text-brand-maroon leading-none">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick Look Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card-white p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-display">Pesanan Terbaru</h3>
                    <button onClick={() => setActiveTab('bookings')} className="text-brand-orange text-xs font-bold hover:underline">Lihat Semua</button>
                  </div>
                  <div className="space-y-4">
                    {bookings.slice(0, 5).map((b, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-xs text-brand-maroon border border-gray-100">
                          {b.customerName?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-grow">
                          <p className="font-bold text-sm">{b.customerName}</p>
                          <p className="text-[10px] text-gray-400 font-mono uppercase">{b.id.substring(0, 8)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xs">Rp{b.totalAmount?.toLocaleString()}</p>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${b.status === 'paid' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                            {b.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {bookings.length === 0 && <p className="text-center text-gray-400 py-10 italic">Belum ada aktivitas.</p>}
                  </div>
                </div>

                <div className="card-white p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-display">Produk Terpopuler</h3>
                    <button onClick={() => setActiveTab('inventory')} className="text-brand-orange text-xs font-bold hover:underline">Kelola Stok</button>
                  </div>
                  <div className="space-y-4">
                    {products.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl">
                         <div className="w-12 h-12 bg-white rounded-xl overflow-hidden">
                           <img src={p.imageUrl || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=50'} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         </div>
                         <div className="flex-grow">
                           <p className="font-bold text-sm">{p.name}</p>
                           <p className="text-[10px] text-gray-400 uppercase">{p.category}</p>
                         </div>
                         <div className="text-right">
                           <p className="font-bold text-xs">{p.stock} pcs</p>
                           <p className="text-[10px] text-green-600 font-bold">In-Stock</p>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Product Entry & Selection */}
              <div className="lg:col-span-7 space-y-6">
                <div className="card-white p-6 shadow-xl shadow-gray-200/50 space-y-6">
                  <div className="flex p-1 bg-gray-100 rounded-2xl w-full">
                    <button 
                      onClick={() => { setPosMode('sale'); setPosCart([]); }}
                      className={`flex-1 py-3 rounded-xl font-display text-sm transition-all ${posMode === 'sale' ? 'bg-white text-brand-maroon shadow-sm' : 'text-gray-400 hover:text-brand-maroon'}`}
                    >
                      PENJUALAN (JUAL)
                    </button>
                    <button 
                      onClick={() => { setPosMode('rent'); setPosCart([]); }}
                      className={`flex-1 py-3 rounded-xl font-display text-sm transition-all ${posMode === 'rent' ? 'bg-white text-brand-maroon shadow-sm' : 'text-gray-400 hover:text-brand-maroon'}`}
                    >
                      PERSEWAAN (SEWA)
                    </button>
                  </div>

                  {posMode === 'rent' && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mulai Sewa</label>
                        <input 
                          type="date" 
                          value={rentStartDate}
                          onChange={(e) => setRentStartDate(e.target.value)}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-maroon font-bold text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selesai Sewa</label>
                        <input 
                          type="date" 
                          value={rentEndDate}
                          onChange={(e) => setRentEndDate(e.target.value)}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-maroon font-bold text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    <div className="relative flex-grow">
                      <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                        type="text" 
                        placeholder="Masukkan Kode Barang..."
                        value={posPayload}
                        onChange={(e) => setPosPayload(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddById(posPayload)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 ring-brand-orange/20 font-mono text-lg"
                      />
                    </div>
                    <button 
                      onClick={() => setShowPosSearchModal(true)}
                      className="bg-blue-50 text-blue-600 p-4 rounded-2xl border border-blue-100 active:scale-95 transition-all"
                      title="Cari Barang"
                    >
                      <Search size={24} />
                    </button>
                    <button 
                      onClick={() => handleAddById(posPayload)}
                      className="bg-brand-orange text-white p-4 rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              </div>

              {/* POS Terminal / Receipt */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-maroon/5 flex flex-col overflow-hidden border border-gray-100">
                  <div className="bg-brand-maroon p-6 text-white text-center space-y-1">
                    <h3 className="font-display text-2xl tracking-tight">KASIR <span className="text-brand-orange">PREPARE OUTDOOR</span></h3>
                    <p className="text-[10px] font-bold opacity-60 tracking-widest uppercase">Transaksi {posMode === 'sale' ? 'Jual Barang' : 'Sewa Alat'}</p>
                  </div>

                  <div className="p-6 flex-grow flex flex-col space-y-6">
                    <div className="flex-grow min-h-[200px] max-h-[400px] overflow-y-auto space-y-3 no-scrollbar border-b border-dashed border-gray-200 pb-6">
                      {posCart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 py-10">
                          {posMode === 'sale' ? <ShoppingCart size={48} className="mb-2 opacity-20" /> : <Package size={48} className="mb-2 opacity-20" />}
                          <p className="text-xs font-bold uppercase tracking-widest">Keranjang {posMode === 'sale' ? 'Jual' : 'Sewa'} Kosong</p>
                        </div>
                      ) : (
                        posCart.map(item => {
                          const days = calculateRentDays();
                          const basePrice = item.customPrice * item.qty * (posMode === 'rent' ? days : 1);
                          const discount = item.itemDiscountType === 'percent' 
                            ? (basePrice * item.itemDiscount / 100) 
                            : (item.itemDiscount || 0);
                          const finalPrice = basePrice - discount;

                          return (
                            <div key={item.id} className="flex justify-between items-center bg-gray-50/50 p-2 rounded-xl group">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => setPosCart(posCart.filter(i => i.id !== item.id))}
                                  className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={12} />
                                </button>
                                <div>
                                  <p className="text-xs font-bold text-brand-maroon line-clamp-1">{item.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center bg-white px-1.5 py-0.5 rounded border border-gray-100">
                                      <span className="text-[8px] font-black text-gray-400 mr-1">Rp</span>
                                      <input 
                                        type="number"
                                        value={item.customPrice}
                                        onChange={(e) => setPosCart(posCart.map(i => i.id === item.id ? {...i, customPrice: Number(e.target.value)} : i))}
                                        className="w-16 bg-transparent outline-none text-[10px] font-bold text-brand-maroon"
                                      />
                                    </div>
                                    <div className="flex items-center bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                      <div className="flex items-center gap-0.5 mr-1.5 bg-white/50 p-0.5 rounded">
                                        <button 
                                          onClick={() => setPosCart(posCart.map(i => i.id === item.id ? {...i, itemDiscountType: 'amount'} : i))}
                                          className={`px-1 py-0.5 rounded text-[7px] font-black transition-all ${item.itemDiscountType === 'amount' ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-orange-400'}`}
                                        >
                                          RP
                                        </button>
                                        <button 
                                          onClick={() => setPosCart(posCart.map(i => i.id === item.id ? {...i, itemDiscountType: 'percent'} : i))}
                                          className={`px-1 py-0.5 rounded text-[7px] font-black transition-all ${item.itemDiscountType === 'percent' ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-orange-400'}`}
                                        >
                                          %
                                        </button>
                                      </div>
                                      <input 
                                        type="number"
                                        value={item.itemDiscount}
                                        placeholder="0"
                                        onChange={(e) => setPosCart(posCart.map(i => i.id === item.id ? {...i, itemDiscount: Number(e.target.value)} : i))}
                                        className="w-10 bg-transparent outline-none text-[10px] font-bold text-orange-600 placeholder:text-orange-200"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                                  <button onClick={() => setPosCart(posCart.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))} className="text-xs font-bold px-1.5 focus:text-brand-orange">-</button>
                                  <span className="text-xs font-black mx-1.5">{item.qty}</span>
                                  <button onClick={() => setPosCart(posCart.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i))} className="text-xs font-bold px-1.5 focus:text-brand-orange">+</button>
                                </div>
                                <p className="text-xs font-black text-brand-maroon min-w-[80px] text-right">
                                  Rp{finalPrice.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-orange-500" />
                          <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                            <button 
                              onClick={() => setPosGlobalDiscountType('amount')}
                              className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${posGlobalDiscountType === 'amount' ? 'bg-brand-maroon text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              Rp
                            </button>
                            <button 
                              onClick={() => setPosGlobalDiscountType('percent')}
                              className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${posGlobalDiscountType === 'percent' ? 'bg-brand-maroon text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              %
                            </button>
                          </div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Disc Total</span>
                        </div>
                        <input 
                          type="number"
                          value={posGlobalDiscount}
                          onChange={(e) => setPosGlobalDiscount(Number(e.target.value))}
                          className="w-24 text-right bg-transparent outline-none font-black text-brand-maroon"
                        />
                      </div>

                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Netto</span>
                        <span className="font-display text-4xl text-brand-maroon">Rp{calculateTotal().toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Customer</p>
                          <input 
                            type="text" 
                            value={posCustomerName}
                            onChange={(e) => setPosCustomerName(e.target.value)}
                            placeholder="Nama (Opsional)"
                            className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border border-transparent focus:border-brand-orange transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp</p>
                          <input 
                            type="text" 
                            value={posCustomerPhone}
                            onChange={(e) => setPosCustomerPhone(e.target.value)}
                            placeholder="08..."
                            className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border border-transparent focus:border-brand-orange transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Metode Pembayaran</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'cash', label: 'Tunai', icon: Wallet },
                            { id: 'qris', label: 'QRIS', icon: QrCode },
                            { id: 'transfer', label: 'Transfer', icon: ExternalLink },
                            { id: 'debit', label: 'Debit', icon: CreditCard }
                          ].map(method => (
                            <button
                              key={method.id}
                              onClick={() => setPaymentMethod(method.id as any)}
                              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                paymentMethod === method.id 
                                  ? 'border-brand-orange bg-orange-50 text-brand-orange' 
                                  : 'border-gray-50 bg-gray-50 text-gray-400 grayscale'
                              }`}
                            >
                              <method.icon size={16} />
                              <span className="text-[10px] font-black tracking-widest uppercase">{method.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        disabled={posCart.length === 0 || posLoading}
                        onClick={async () => {
                          setPosLoading(true);
                          const trxId = `${posMode}_${Date.now()}`;
                          const subtotal = posCart.reduce((sum, item) => sum + ((item.customPrice || item.price) * item.qty * (posMode === 'rent' ? calculateRentDays() : 1)), 0);
                          
                          const transaction = {
                            id: trxId,
                            customerName: posCustomerName || 'Walk-in Customer',
                            customerPhone: posCustomerPhone,
                            items: posCart,
                            subtotal,
                            globalDiscount: posGlobalDiscount,
                            globalDiscountType: posGlobalDiscountType,
                            totalAmount: calculateTotal(),
                            paymentMethod,
                            status: 'paid',
                            type: posMode,
                            startDate: posMode === 'rent' ? rentStartDate : null,
                            endDate: posMode === 'rent' ? rentEndDate : null,
                            date: new Date().toLocaleDateString('id-ID'),
                            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                            timestamp: Date.now()
                          };
                          
                          localStorage.setItem(`mock_trx_${trxId}`, JSON.stringify(transaction));
                          
                          setTimeout(() => {
                            toast.success(`Transaksi ${posMode === 'sale' ? 'Penjualan' : 'Persewaan'} Berhasil!`);
                            setSelectedTransaction(transaction);
                            setShowReceiptModal(true);
                            setPosCart([]);
                            setPosCustomerName('');
                            setPosCustomerPhone('');
                            setPosGlobalDiscount(0);
                            setPosLoading(false);
                            fetchData();
                          }, 1000);
                        }}
                        className="w-full btn-maroon py-5 flex items-center justify-center gap-3 shadow-2xl shadow-maroon/30 group disabled:opacity-50 active:scale-[0.98] transition-all"
                      >
                        {posLoading ? (
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Check size={24} />
                            <span className="font-display text-lg">PROSES TRANSAKSI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-white p-6 bg-gradient-to-br from-brand-maroon to-maroon-800 text-white border-none">
                  <p className="text-[10px] font-black uppercase opacity-60">Total Penjualan</p>
                  <p className="text-2xl font-display mt-1">Rp{transactions.reduce((s, t) => s + (t.totalAmount || 0), 0).toLocaleString()}</p>
                </div>
                <div className="card-white p-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Jumlah Transaksi</p>
                  <p className="text-2xl font-display text-brand-maroon mt-1">{transactions.length}</p>
                </div>
              </div>

              <div className="card-white overflow-hidden p-0 border-none shadow-xl">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3">ID Transaksi</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Produk</th>
                      <th className="px-6 py-3">Nominal</th>
                      <th className="px-6 py-3">Metode</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-gray-400">Belum ada riwayat transaksi</td>
                      </tr>
                    ) : (
                      transactions.map((trx) => (
                        <tr 
                          key={trx.id} 
                          onClick={() => {
                            setSelectedTransaction(trx);
                            setShowReceiptModal(true);
                          }}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-3">
                            <p className="text-xs font-bold text-gray-400">{trx.id}</p>
                            <p className="text-[9px] font-medium">{trx.date}</p>
                          </td>
                          <td className="px-6 py-3 font-bold text-xs text-brand-maroon">{trx.customerName}</td>
                          <td className="px-6 py-3">
                            <div className="flex flex-wrap gap-1">
                              {trx.items?.map((it: any, idx: number) => (
                                <span key={idx} className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400">{it.name} x{it.qty || it.quantity}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3 font-black text-brand-orange text-xs">Rp{trx.totalAmount?.toLocaleString()}</td>
                          <td className="px-6 py-3 text-[9px] font-black uppercase text-gray-400">{trx.paymentMethod || 'Online'}</td>
                          <td className="px-6 py-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${trx.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-brand-orange'}`}>
                              {trx.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                   </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="card-white overflow-hidden p-0 border-none shadow-xl">
              <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-center bg-gray-50/50 gap-4">
                <div>
                   <h3 className="text-xl font-display text-brand-maroon">Inventaris Alat</h3>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Total: {products.length} SKU</p>
                </div>
                
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="flex gap-1 bg-gray-200/50 p-1 rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar">
                      {['All', 'Tenda', 'Tas', 'Sepatu', 'Alat Masak', 'Alat Penerangan'].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setInventoryCategoryFilter(cat)}
                          className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${inventoryCategoryFilter === cat ? 'bg-brand-maroon text-white shadow-sm' : 'text-gray-400 hover:text-brand-maroon'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  <button 
                    onClick={downloadInventoryExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-100 transition-all w-full sm:w-auto border border-green-100"
                  >
                    <Download size={14} /> Excel
                  </button>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Cari alat..." 
                      value={inventorySearchQuery}
                      onChange={(e) => setInventorySearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl outline-none focus:border-brand-orange text-xs font-bold"
                    />
                  </div>
                  
                  <div className="flex gap-1 bg-gray-200/50 p-1 rounded-xl w-full sm:w-fit">
                    <button 
                      onClick={() => setInventoryFilter('all')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${inventoryFilter === 'all' ? 'bg-white text-brand-maroon shadow-sm' : 'text-gray-400 hover:text-brand-maroon'}`}
                    >
                      Semua
                    </button>
                    <button 
                      onClick={() => setInventoryFilter('rent')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${inventoryFilter === 'rent' ? 'bg-white text-brand-maroon shadow-sm' : 'text-gray-400 hover:text-brand-maroon'}`}
                    >
                      Sewa
                    </button>
                    <button 
                      onClick={() => setInventoryFilter('sale')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${inventoryFilter === 'sale' ? 'bg-white text-brand-maroon shadow-sm' : 'text-gray-400 hover:text-brand-maroon'}`}
                    >
                      Jual
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white text-gray-400 text-[9px] uppercase font-black tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3">Alat</th>
                      <th className="px-6 py-3">Kategori</th>
                      <th className="px-6 py-3">Tipe</th>
                      <th className="px-6 py-3">Harga Unit</th>
                      <th className="px-6 py-3">Stok</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products
                      .filter(p => {
                        const matchesType = inventoryFilter === 'all' || p.type === inventoryFilter;
                        const matchesCategory = inventoryCategoryFilter === 'All' || p.category === inventoryCategoryFilter;
                        const matchesSearch = p.name.toLowerCase().includes(inventorySearchQuery.toLowerCase()) || p.id.includes(inventorySearchQuery);
                        return matchesType && matchesCategory && matchesSearch;
                      })
                      .map(p => (
                      <tr 
                        key={p.id} 
                        onClick={() => setSelectedProductDetail(p)}
                        className="hover:bg-gray-50/80 transition-colors border-b border-gray-50 last:border-0 cursor-pointer"
                      >
                        <td className="px-6 py-3">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                                <img src={p.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-brand-maroon leading-none">{p.name}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] text-gray-300 font-mono uppercase tracking-tighter">ID: {p.id}</span>
                                  {p.barcode && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                                      <span className="text-[8px] text-brand-orange font-mono font-bold">BC: {p.barcode}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.category}</td>
                        <td className="px-6 py-3">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${p.type === 'rent' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                            {p.type === 'rent' ? 'Sewa' : 'Jual'}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-mono font-bold text-xs text-brand-maroon">Rp{p.price.toLocaleString()}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                             <button 
                               onClick={(e) => { e.stopPropagation(); updateStock(p.id, -1); }}
                               className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-[10px] hover:bg-brand-maroon hover:text-white transition-colors"
                             >
                               -
                             </button>
                             <span className="text-xs font-black text-brand-orange w-6 text-center">{p.stock}</span>
                             <button 
                               onClick={(e) => { e.stopPropagation(); updateStock(p.id, 1); }}
                               className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-[10px] hover:bg-brand-maroon hover:text-white transition-colors"
                             >
                               +
                             </button>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`${p.isActive ? 'text-green-500' : 'text-red-200'}`}>
                            <Check size={14} className={p.isActive ? 'block' : 'hidden'} />
                            <X size={14} className={!p.isActive ? 'block' : 'hidden'} />
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => openEditModal(p)}
                              className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => deleteProduct(p.id)}
                              className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="card-white overflow-hidden p-0 border-none shadow-xl">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-2xl font-display">Aktivitas Penyewaan</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white text-gray-400 text-[9px] uppercase font-black tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3">Customer Info</th>
                      <th className="px-6 py-3">Daftar Barang</th>
                      <th className="px-6 py-3">Periode Sewa</th>
                      <th className="px-6 py-3">Nilai</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-display text-lg">Belum ada transaksi.</td>
                      </tr>
                    ) : (
                      bookings.map(b => (
                        <tr 
                          key={b.id} 
                          onClick={() => {
                            setSelectedTransaction(b);
                            setShowReceiptModal(true);
                          }}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-3">
                            <div className="font-bold text-xs text-brand-maroon">{b.customerName}</div>
                            <div className="text-[9px] text-gray-400 font-mono">{b.customerPhone}</div>
                          </td>
                          <td className="px-6 py-3">
                             <div className="flex gap-1 flex-wrap">
                               {b.items?.map((item: any, idx: number) => (
                                 <span key={idx} className="bg-brand-maroon/5 text-brand-maroon text-[7px] px-1.5 py-0.5 rounded font-black uppercase whitespace-nowrap">
                                   {item.name}
                                 </span>
                               ))}
                             </div>
                          </td>
                          <td className="px-6 py-3 text-[10px] font-bold text-gray-500">
                            {b.startDate} - {b.endDate}
                          </td>
                          <td className="px-6 py-3 font-mono font-bold text-xs text-brand-orange">
                            Rp{b.totalAmount?.toLocaleString()}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                              b.status === 'paid' ? 'bg-blue-50 text-blue-600' : 
                              b.status === 'picked_up' ? 'bg-orange-50 text-orange-600' :
                              'bg-green-50 text-green-600'
                            }`}>
                              {(b.status || 'paid').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <Link to={`/receipt/${b.id}`} className="inline-flex items-center gap-1 text-brand-maroon hover:bg-brand-maroon hover:text-white px-2 py-1 rounded-lg text-[9px] font-black transition-all">
                               LIHAT <ExternalLink size={10} />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'promotions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/50">
                <div>
                  <h3 className="text-2xl font-display text-brand-maroon">Program Promosi</h3>
                  <p className="text-xs text-gray-400">Atur diskon dan promo otomatis di kasir.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingPromo(null);
                    setNewPromo({
                      name: '',
                      type: 'item_discount',
                      value: 0,
                      targetItemId: '',
                      minPurchase: 0,
                      buyQty: 0,
                      getQty: 0,
                      isActive: true
                    });
                    setShowAddPromoModal(true);
                  }}
                  className="bg-brand-orange text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  Buat Promo Baru
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {promotions.length === 0 ? (
                  <div className="col-span-full py-20 text-center space-y-4 opacity-30">
                    <TrendingUp size={48} className="mx-auto" />
                    <p className="text-sm font-black uppercase tracking-widest">Belum ada promosi aktif</p>
                  </div>
                ) : (
                  promotions.map(promo => (
                    <div key={promo.id} className="card-white p-6 relative overflow-hidden group">
                      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 ${promo.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${promo.type === 'item_discount' ? 'bg-blue-100 text-blue-600' : promo.type === 'min_purchase' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-brand-orange'}`}>
                          {promo.type.replace('_', ' ')}
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              setEditingPromo(promo);
                              setNewPromo(promo);
                              setShowAddPromoModal(true);
                            }}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => deletePromo(promo.id)}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-display text-lg text-brand-maroon leading-tight mb-2">{promo.name}</h4>
                      <div className="space-y-2">
                        {promo.type === 'item_discount' && (
                          <p className="text-xs text-gray-500">
                             Diskon <span className="font-bold text-brand-orange">Rp{promo.value.toLocaleString()}</span> untuk produk spesifik.
                          </p>
                        )}
                        {promo.type === 'min_purchase' && (
                          <p className="text-xs text-gray-500">
                             Diskon <span className="font-bold text-brand-orange">Rp{promo.value.toLocaleString()}</span> jika belanja minimal Rp{promo.minPurchase.toLocaleString()}.
                          </p>
                        )}
                        {promo.type === 'buy_x_get_y' && (
                          <p className="text-xs text-gray-500">
                             Beli <span className="font-bold text-brand-orange">{promo.buyQty}</span> Gratis <span className="font-bold text-brand-orange">{promo.getQty}</span>.
                          </p>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${promo.isActive ? 'text-green-500' : 'text-gray-400'}`}>
                          {promo.isActive ? 'AKTIF' : 'NON-AKTIF'}
                        </span>
                        <button 
                          onClick={() => {
                            const updated = { ...promo, isActive: !promo.isActive };
                            localStorage.setItem(`mock_promo_${promo.id}`, JSON.stringify(updated));
                            fetchData();
                          }}
                          className={`w-10 h-5 rounded-full relative transition-all ${promo.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${promo.isActive ? 'right-0.5' : 'left-0.5'}`}></div>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-lg p-6 animate-in zoom-in duration-300 shadow-2xl">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-display text-brand-maroon">{editingProduct ? 'Perbarui Alat' : 'Tambah Alat'}</h2>
               <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
             </div>
             <form onSubmit={handleAddProduct} className="space-y-4">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1 sm:col-span-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Gambar Barang</label>
                   <div className="flex items-center gap-4">
                     <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                       {imagePreview ? (
                         <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                       ) : (
                         <Package className="text-gray-300" size={24} />
                       )}
                     </div>
                     <div className="flex-grow">
                        <label className="inline-block bg-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-gray-200 transition-colors">
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          {imagePreview ? 'Ganti Gambar' : 'Pilih Gambar'}
                        </label>
                        <p className="text-[8px] text-gray-400 mt-1 uppercase font-bold">Max 800px, Web-Ready Resizing</p>
                     </div>
                   </div>
                 </div>

                 <div className="space-y-1 sm:col-span-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nama Barang</label>
                   <input type="text" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-orange transition-colors text-sm font-bold" />
                 </div>

                 <div className="space-y-1 sm:col-span-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Kode Barcode</label>
                   <div className="flex gap-2">
                     <input type="text" value={newProduct.barcode} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} className="flex-grow p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-orange transition-colors text-sm font-bold font-mono" placeholder="Scan atau ketik kode..." />
                     <button 
                       type="button"
                       onClick={generateUniqueBarcode}
                       className="px-4 bg-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-200"
                     >
                       Auto
                     </button>
                   </div>
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tipe Transaksi</label>
                   <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl">
                     <button 
                       type="button"
                       onClick={() => setNewProduct({...newProduct, type: 'rent'})}
                       className={`py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${newProduct.type === 'rent' ? 'bg-white text-brand-maroon shadow-sm' : 'text-gray-500'}`}
                     >
                       Sewa
                     </button>
                     <button 
                       type="button"
                       onClick={() => setNewProduct({...newProduct, type: 'sale'})}
                       className={`py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${newProduct.type === 'sale' ? 'bg-white text-brand-maroon shadow-sm' : 'text-gray-500'}`}
                     >
                       Jual
                     </button>
                   </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Kategori</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-orange transition-colors text-sm font-bold">
                      <option>Tenda</option>
                      <option>Tas</option>
                      <option>Sepatu</option>
                      <option>Alat Masak</option>
                      <option>Alat Penerangan</option>
                    </select>
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Harga Unit {newProduct.type === 'rent' ? '/ Hari' : ''}</label>
                   <input type="number" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-orange transition-colors text-sm font-bold" />
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Stok Tersedia</label>
                   <input type="number" required value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-orange transition-colors text-sm font-bold" />
                 </div>

                 <div className="space-y-1 sm:col-span-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Deskripsi Barang</label>
                   <textarea 
                     value={newProduct.description} 
                     onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
                     className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-orange transition-colors text-sm font-bold h-20 resize-none"
                     placeholder="Contoh: Kapasitas 4 orang, include pasak..."
                   />
                 </div>
               </div>

               <div className="space-y-6 pt-4 border-t border-gray-50">
                <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAddModal(false);
                        setEditingProduct(null);
                        resetForm();
                      }} 
                      className="flex-1 py-3 bg-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200"
                    >
                      Batal
                    </button>
                    <button type="submit" className="flex-[2] bg-brand-maroon text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-maroon/10 hover:bg-opacity-90 transition-all">
                      {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
                    </button>
                </div>
               </div>
             </form>
           </div>
        </div>
      )}


      {/* POS Search Modal */}
      <AnimatePresence>
        {showPosSearchModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-display text-brand-maroon">Cari Barang</h2>
                </div>
                <button 
                  onClick={() => setShowPosSearchModal(false)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto no-scrollbar">
                  {['All', 'Tenda', 'Tas', 'Sepatu', 'Alat Masak', 'Alat Penerangan'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setInventoryCategoryFilter(cat)}
                      className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${inventoryCategoryFilter === cat ? 'bg-white text-brand-maroon shadow-sm' : 'text-gray-400'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-orange" size={16} />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Nama atau kode barang..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 ring-brand-orange/10 font-bold text-sm"
                  />
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[60vh] pr-1 no-scrollbar">
                  {products
                    .filter(p => {
                      const matchesPosMode = p.type === posMode;
                      const matchesCategory = inventoryCategoryFilter === 'All' || p.category === inventoryCategoryFilter;
                      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.includes(searchQuery);
                      return matchesPosMode && matchesCategory && matchesSearch;
                    })
                    .map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        handleAddById(p.id);
                        setShowPosSearchModal(false);
                      }}
                      className="w-full bg-white border border-gray-50 p-2.5 rounded-xl text-left hover:border-brand-orange hover:bg-orange-50/20 transition-all flex items-center justify-between active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gray-50 overflow-hidden opacity-50 shrink-0">
                          <img src={p.imageUrl} alt="" className="w-full h-full object-cover grayscale" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">{p.id}</p>
                          <p className="font-bold text-xs text-brand-maroon leading-none">{p.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-brand-orange font-black text-sm">Rp{p.price.toLocaleString()}</p>
                          <p className="text-[8px] font-bold text-gray-400">Stok: {p.stock}</p>
                        </div>
                        <Plus size={14} className="text-gray-300" />
                      </div>
                    </button>
                  ))}
                  {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.includes(searchQuery)).length === 0 && (
                    <div className="py-10 text-center space-y-2 opacity-30">
                      <Package size={32} className="mx-auto" />
                      <p className="text-sm font-bold">Tidak ditemukan</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail / Receipt Modal */}
      <AnimatePresence>
        {showReceiptModal && selectedTransaction && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[250] flex items-center justify-center p-4"
            onClick={() => setShowReceiptModal(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-brand-maroon p-6 text-white text-center relative">
                <button 
                  onClick={() => setShowReceiptModal(false)}
                  className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-display uppercase tracking-tight">PREPARE OUTDOOR <span className="text-brand-orange">STRUK</span></h2>
                <p className="text-[10px] font-bold opacity-60 tracking-widest uppercase">Invoice: {selectedTransaction.id}</p>
              </div>

              <div id="receipt-content" style={{ backgroundColor: '#ffffff', color: '#800000', fontFamily: 'sans-serif', padding: '32px' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #800000', paddingBottom: '24px', marginBottom: '32px' }}>
                  <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-1px' }}>PREPARE OUTDOOR</h1>
                  <p style={{ margin: 0, fontSize: '8px', fontWeight: '900', letterSpacing: '3px', opacity: 0.4, textTransform: 'uppercase' }}>Outdoor Equipment Rental & Shop</p>
                  <p style={{ margin: 0, fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', marginTop: '8px' }}>Jl. Petualangan No. 88, Jawa Barat</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', marginTop: '12px' }}>
                     <span style={{ color: '#9ca3af', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px' }}>Customer</span>
                     <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedTransaction.customerName}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', marginTop: '12px' }}>
                     <span style={{ color: '#9ca3af', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px' }}>Phone</span>
                     <span style={{ fontWeight: 'bold' }}>{selectedTransaction.customerPhone || '-'}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', marginTop: '12px' }}>
                     <span style={{ color: '#9ca3af', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px' }}>Date/Time</span>
                     <span style={{ fontWeight: 'bold' }}>{selectedTransaction.date} {selectedTransaction.time}</span>
                   </div>
                   {selectedTransaction.type === 'rent' && (
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', marginTop: '12px', color: '#FF6B00' }}>
                       <span style={{ textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px' }}>Periode</span>
                       <span style={{ fontWeight: 'bold' }}>{selectedTransaction.startDate} - {selectedTransaction.endDate}</span>
                     </div>
                   )}
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', marginTop: '12px' }}>
                     <span style={{ color: '#9ca3af', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px' }}>Method</span>
                     <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedTransaction.paymentMethod || 'Online'}</span>
                   </div>
                </div>

                <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '24px', marginTop: '24px', display: 'flex', flexDirection: 'column' }}>
                  {selectedTransaction.items?.map((item: any, idx: number) => {
                    const days = selectedTransaction.type === 'rent' ? (Math.ceil(Math.abs(new Date(selectedTransaction.endDate).getTime() - new Date(selectedTransaction.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1) : 1;
                    const itemSubtotal = (item.customPrice || item.price) * (item.qty || item.quantity) * days;
                    const itemDisc = item.itemDiscountType === 'percent' 
                      ? (itemSubtotal * item.itemDiscount / 100) 
                      : (item.itemDiscount || 0);
                      
                    return (
                      <div key={idx} style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ fontWeight: 'bold' }}>{item.name} <span style={{ color: '#9ca3af', marginLeft: '4px', fontSize: '10px' }}>x{item.qty || item.quantity}</span></span>
                          <span style={{ fontWeight: '900' }}>Rp{itemSubtotal.toLocaleString()}</span>
                        </div>
                        {itemDisc > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#FF6B00', fontWeight: 'bold', fontStyle: 'italic', paddingLeft: '8px', marginTop: '4px' }}>
                            <span>Disc {item.itemDiscountType === 'percent' ? `${item.itemDiscount}%` : ''}</span>
                            <span>-Rp{itemDisc.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af', marginTop: '8px' }}>
                    <span>Total Sebelum Diskon</span>
                    <span style={{ fontWeight: 'bold' }}>Rp{selectedTransaction.subtotal?.toLocaleString()}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#FF6B00', fontWeight: 'bold', marginTop: '8px' }}>
                    <span>Total Potongan Diskon</span>
                    <span>-Rp{(
                      selectedTransaction.items.reduce((s: number, i: any) => {
                        const isub = (i.customPrice || i.price) * (i.qty || i.quantity);
                        return s + (i.itemDiscountType === 'percent' ? (isub * i.itemDiscount / 100) : (i.itemDiscount || 0));
                      }, 0) + 
                      (selectedTransaction.globalDiscountType === 'percent' ? (
                        selectedTransaction.items.reduce((s: number, i: any) => {
                          const isub = (i.customPrice || i.price) * (i.qty || i.quantity);
                          const idisc = i.itemDiscountType === 'percent' ? (isub * i.itemDiscount / 100) : (i.itemDiscount || 0);
                          return s + (isub - idisc);
                        }, 0) * selectedTransaction.globalDiscount / 100) : selectedTransaction.globalDiscount)
                    ).toLocaleString()}</span>
                  </div>
                </div>


                <div style={{ borderTop: '2px solid #800000', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>HARGA SETELAH DISKON</span>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF6B00' }}>Rp{selectedTransaction.totalAmount?.toLocaleString()}</span>
                </div>

                <div style={{ borderTop: '1px dashed #f3f4f6', paddingTop: '32px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '7px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', lineHeight: '1.6', color: '#9ca3af' }}>
                    Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.<br/>
                    Terima kasih atas kunjungan Anda.<br/>
                    www.prepareoutdoor.info
                  </p>
                </div>
              </div>


              <div className="p-6 bg-gray-50 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 py-4 bg-brand-maroon text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-opacity-90 active:scale-95 transition-all shadow-lg shadow-maroon/20"
                  >
                    <Printer size={16} /> Cetak
                  </button>
                  <button 
                    onClick={handleWhatsAppShare}
                    className="flex items-center justify-center gap-2 py-4 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 active:scale-95 transition-all shadow-lg shadow-green-200"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </button>
                </div>

                <button 
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 active:scale-95 transition-all shadow-lg shadow-blue-200"
                >
                  <FileText size={16} /> Download PDF
                </button>

                <button 
                  onClick={() => {
                    const url = `${window.location.origin}/receipt/${selectedTransaction.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link E-Receipt berhasil disalin!');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-orange-100 text-brand-orange rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-200 active:scale-95 transition-all shadow-lg shadow-orange-50"
                >
                  <LinkIcon size={16} /> Salin Link E-Receipt
                </button>
                
                <button 
                  onClick={() => setShowReceiptModal(false)}
                  className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-brand-maroon transition-all"
                >
                  Tutup Halaman
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProductDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col sm:flex-row"
            >
              <div className="w-full sm:w-1/2 h-64 sm:h-auto bg-gray-100 relative">
                <img src={selectedProductDetail.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => setSelectedProductDetail(null)}
                  className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full sm:hidden backdrop-blur-md"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="w-full sm:w-1/2 p-6 flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                   <div>
                     <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${selectedProductDetail.type === 'rent' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {selectedProductDetail.type === 'rent' ? 'Sewa' : 'Jual'}
                     </span>
                     <h2 className="text-xl font-display text-brand-maroon mt-1 leading-tight">{selectedProductDetail.name}</h2>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selectedProductDetail.category}</p>
                   </div>
                   <button 
                      onClick={() => setSelectedProductDetail(null)}
                      className="hidden sm:block p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={20} />
                    </button>
                </div>

                <div className="space-y-3 flex-grow">
                   <div className="flex justify-between items-end border-b border-gray-50 pb-2">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Harga Unit</p>
                      <p className="text-xl font-display text-brand-maroon">Rp{selectedProductDetail.price.toLocaleString()}</p>
                   </div>
                   {selectedProductDetail.barcode && (
                     <div className="flex justify-between items-end border-b border-gray-50 pb-2">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Kode Barcode</p>
                        <p className="text-xs font-mono font-bold text-brand-maroon">{selectedProductDetail.barcode}</p>
                     </div>
                   )}
                   <div className="flex justify-between items-end border-b border-gray-50 pb-2">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Stok Tersedia</p>
                      <p className="text-lg font-bold text-brand-orange">{selectedProductDetail.stock} Pcs</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Deskripsi</p>
                      <p className="text-xs text-gray-600 leading-relaxed font-medium overflow-y-auto max-h-32 pr-1 custom-scrollbar">
                        {selectedProductDetail.description || 'Tidak ada deskripsi.'}
                      </p>
                   </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-50">
                   <button 
                     onClick={() => {
                       openEditModal(selectedProductDetail);
                       setSelectedProductDetail(null);
                     }}
                     className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all"
                   >
                     <Edit3 size={14} /> Edit
                   </button>
                   <button 
                     onClick={() => {
                        if(confirm('Hapus produk ini?')) {
                          deleteProduct(selectedProductDetail.id);
                          setSelectedProductDetail(null);
                        }
                     }}
                     className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
                   >
                     <Trash2 size={14} /> Hapus
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Promo Add/Edit Modal */}
      <AnimatePresence>
        {showAddPromoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl"
             >
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-display text-brand-maroon">{editingPromo ? 'Edit Promosi' : 'Buat Promosi Baru'}</h2>
                 <button onClick={() => setShowAddPromoModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
               </div>
               <form onSubmit={handleAddPromotion} className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nama Program Promo</label>
                   <input 
                     type="text" 
                     required 
                     value={newPromo.name} 
                     onChange={e => setNewPromo({...newPromo, name: e.target.value})} 
                     placeholder="Contoh: Diskon Awal Tahun"
                     className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-orange text-sm font-bold" 
                   />
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tipe Promosi</label>
                   <select 
                     value={newPromo.type} 
                     onChange={e => setNewPromo({...newPromo, type: e.target.value as any})} 
                     className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-orange text-sm font-bold"
                   >
                     <option value="item_discount">Diskon Per Item (Fixed)</option>
                     <option value="min_purchase">Minimal Transaksi (Fixed)</option>
                     <option value="buy_x_get_y">Beli X Gratis Y</option>
                   </select>
                 </div>

                 {newPromo.type === 'item_discount' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pilih Produk</label>
                        <select 
                          required
                          value={newPromo.targetItemId}
                          onChange={e => setNewPromo({...newPromo, targetItemId: e.target.value})}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                        >
                          <option value="">Pilih...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nilai Diskon (RP)</label>
                        <input 
                          type="number" 
                          required
                          value={newPromo.value}
                          onChange={e => setNewPromo({...newPromo, value: Number(e.target.value)})}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                        />
                      </div>
                    </div>
                 )}

                 {newPromo.type === 'min_purchase' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Minimal Belanja (RP)</label>
                        <input 
                          type="number" 
                          required
                          value={newPromo.minPurchase}
                          onChange={e => setNewPromo({...newPromo, minPurchase: Number(e.target.value)})}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Potongan (RP)</label>
                        <input 
                          type="number" 
                          required
                          value={newPromo.value}
                          onChange={e => setNewPromo({...newPromo, value: Number(e.target.value)})}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                        />
                      </div>
                    </div>
                 )}

                 {newPromo.type === 'buy_x_get_y' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Minimal Beli (Unit)</label>
                        <input 
                          type="number" 
                          required
                          value={newPromo.buyQty}
                          onChange={e => setNewPromo({...newPromo, buyQty: Number(e.target.value)})}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Bonus (Unit)</label>
                        <input 
                          type="number" 
                          required
                          value={newPromo.getQty}
                          onChange={e => setNewPromo({...newPromo, getQty: Number(e.target.value)})}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold"
                        />
                      </div>
                    </div>
                 )}

                 <div className="flex gap-3 pt-6 border-t border-gray-50">
                    <button 
                      type="button" 
                      onClick={() => setShowAddPromoModal(false)} 
                      className="flex-1 py-3 bg-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200"
                    >
                      Batal
                    </button>
                    <button type="submit" className="flex-[2] bg-brand-maroon text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-maroon/10 hover:bg-opacity-90 transition-all">
                      {editingPromo ? 'Simpan Perubahan' : 'Aktifkan Promo'}
                    </button>
                 </div>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
