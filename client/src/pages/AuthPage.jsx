import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '../lib/api.js';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const fn = mode === 'login' ? api.login : api.register;
      const { token, user } = await fn(email, password);
      localStorage.setItem('token', token);
      localStorage.setItem('email', user.email);
      setAuthToken(token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] grid place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm card glass">
        <h1 className="text-xl font-bold mb-4 text-primary">{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
        <label className="label">Email</label>
        <input className="input mb-3" value={email} onChange={e => setEmail(e.target.value)} required type="email" />
        <label className="label">Пароль</label>
        <input className="input mb-4" value={password} onChange={e => setPassword(e.target.value)} required type="password" minLength={6} />
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <button className="btn-primary w-full h-11 rounded-lg">{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
        <button type="button" className="mt-3 text-sm text-gray-600" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
        </button>
      </form>
    </div>
  );
}

