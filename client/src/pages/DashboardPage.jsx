import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/auth'); return; }
    api.myOrders().then(setOrders).catch(err => alert(err.response?.data?.error || err.message));
  }, [token]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4 text-primary">Мои заявки</h1>
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Дата</th>
              <th className="p-2 text-left">Тип ТС</th>
              <th className="p-2 text-left">Расстояние (км)</th>
              <th className="p-2 text-left">Цена</th>
              <th className="p-2 text-left">Статус</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t">
                <td className="p-2">{new Date(o.createdAt).toLocaleString('ru-RU')}</td>
                <td className="p-2">{o.vehicleType}</td>
                <td className="p-2">{o.distanceKm}</td>
                <td className="p-2">{o.price?.toLocaleString?.('ru-RU') || o.price} ₽</td>
                <td className="p-2">{o.status}</td>
              </tr>
            ))}
            {!orders.length && (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">Заявок пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

