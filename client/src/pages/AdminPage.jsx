import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/auth'); return; }
    api.adminAll().then(setOrders).catch(err => alert(err.response?.data?.error || err.message));
  }, [token]);

  async function saveStatus(id, status) {
    try {
      const updated = await api.adminSetStatus(id, status);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto p-4">
      <h1 className="text-xl font-bold mb-4 text-primary">Админ-панель</h1>
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-xs sm:text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Пикап</th>
              <th className="p-2 text-left">Доставка</th>
              <th className="p-2 text-left">Тип</th>
              <th className="p-2 text-left">Марка</th>
              <th className="p-2 text-left">Опции</th>
              <th className="p-2 text-left">Км</th>
              <th className="p-2 text-left">Цена</th>
              <th className="p-2 text-left">Статус</th>
              <th className="p-2 text-left">Дата</th>
              <th className="p-2 text-left">Действие</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t align-top">
                <td className="p-2">{o.id}</td>
                <td className="p-2">{o.userEmail}</td>
                <td className="p-2">{o.pickupAddress}</td>
                <td className="p-2">{o.dropoffAddress}</td>
                <td className="p-2">{o.vehicleType}</td>
                <td className="p-2">{o.vehicleBrand || '—'}</td>
                <td className="p-2">на ходу {o.isRunning ? 'да' : 'нет'}, доки {o.hasDocs ? 'да' : 'нет'}, лебедка {o.canWinch ? 'да' : 'нет'}</td>
                <td className="p-2">{o.distanceKm}</td>
                <td className="p-2">{o.price} ₽</td>
                <td className="p-2">
                  <select defaultValue={o.status} onChange={e => saveStatus(o.id, e.target.value)} className="input py-1">
                    <option>в работе</option>
                    <option>готово</option>
                    <option>отмена</option>
                  </select>
                </td>
                <td className="p-2">{new Date(o.createdAt).toLocaleString('ru-RU')}</td>
                <td className="p-2 whitespace-nowrap">—</td>
              </tr>
            ))}
            {!orders.length && (
              <tr><td colSpan="12" className="p-4 text-center text-gray-500">Нет заявок</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

