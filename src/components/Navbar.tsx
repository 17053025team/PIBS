import { Link } from 'react-router-dom';
import { Mountain, ShoppingCart, User, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export const Navbar = () => {
  const { user, isAdmin } = useAuth();
  const { items } = useCart();

  return (
    <nav className="bg-brand-maroon text-white sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-brand-orange p-1.5 rounded-lg shadow-lg shadow-orange-500/20">
            <Mountain size={18} className="text-brand-maroon" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">SUMMIT<span className="text-brand-orange">RENT</span></span>
        </Link>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/admin" className="hidden sm:block text-sm font-bold hover:text-brand-orange transition-colors uppercase tracking-widest">
              POS Admin
            </Link>
          )}
          <Link 
            to="/checkout" 
            className="group relative p-2.5 bg-white/10 hover:bg-brand-orange rounded-2xl transition-all duration-300"
          >
            <ShoppingCart size={22} className="group-hover:scale-110 transition-transform" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-orange text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-brand-maroon animate-in zoom-in">
                {items.length}
              </span>
            )}
          </Link>
          {user ? (
            <Link to="/admin" className="w-10 h-10 rounded-2xl bg-brand-orange flex items-center justify-center overflow-hidden border-2 border-white/20 shadow-lg">
              {user.photoURL ? <img src={user.photoURL} alt="User" /> : <User size={20} />}
            </Link>
          ) : (
            <Link to="/admin/login" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
              <LogIn size={22} />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
