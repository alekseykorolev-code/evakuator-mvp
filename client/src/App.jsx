import React from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AuthPage from './pages/AuthPage.jsx';

function Header() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email');
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-lg font-extrabold tracking-wide text-primary">EVAK SPb</button>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-primary">Главная</Link>
          <a href="#services" className="hover:text-primary">Услуги</a>
          <a href="#contacts" className="hover:text-primary">Контакты</a>
          {token ? (
            <>
              <Link to="/dashboard" className="hover:text-primary">Мои заявки</Link>
              <button className="text-gray-500 hover:text-red-600" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('email'); navigate('/auth'); }}>Выйти ({email})</button>
            </>
          ) : (
            <Link to="/auth" className="hover:text-primary">Войти</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-full">
      <Header />
      <div className="pt-14">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </div>
  );
}

