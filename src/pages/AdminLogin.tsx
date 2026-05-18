import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = () => {
    // Simulasi Login Tanpa Firebase
    login();
    toast.success('Login Admin Berhasil (Simulasi)');
    navigate('/admin');
  };

  return (
    <div className="max-w-md mx-auto py-20 px-4">
      <div className="card-white text-center space-y-8 p-12">
        <div className="w-20 h-20 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto text-brand-orange">
          <Lock size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Portal Admin POS</h1>
          <p className="text-gray-500 text-sm">Masuk untuk mengelola inventaris dan scan struk pelanggan.</p>
        </div>
        
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 p-4 rounded-2xl hover:bg-gray-50 transition-all font-bold"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Masuk dengan Google
        </button>

        <p className="text-[10px] text-gray-400">Hanya email terdaftar yang dapat mengakses fitur Dashboard & Scanner POS.</p>
      </div>
    </div>
  );
};
