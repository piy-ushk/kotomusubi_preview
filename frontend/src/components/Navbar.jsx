import React from 'react';
import { Link } from 'react-router-dom';
import { Book, Layout, User } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="flex items-center justify-between glass">
      <Link to="/" className="logo">
        <img src="/logo.png" alt="Kotomusubi" />
        <span>Kotomusubi</span>
      </Link>
      
      <nav className="flex gap-4">
        <Link to="/" className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-md transition-colors">
          <Book size={20} />
          <span>Textbooks</span>
        </Link>
        <Link to="/dashboard" className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-md transition-colors">
          <Layout size={20} />
          <span>Dashboard</span>
        </Link>
        <button className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-md transition-colors">
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </header>
  );
};

export default Navbar;
