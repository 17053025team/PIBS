import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false, login: () => {}, logout: () => {} });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('summit_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setIsAdmin(u.email === '17053025team@gmail.com');
    }
    setLoading(false);
  }, []);

  const login = () => {
    // Simulasi login karena tidak pakai Firebase Auth
    const mockUser = { email: '17053025team@gmail.com', displayName: 'Admin Prepare Outdoor' };
    localStorage.setItem('summit_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setIsAdmin(true);
  };

  const logout = () => {
    localStorage.removeItem('summit_user');
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
