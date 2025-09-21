import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { api } from '../lib/api.js';

function haversineDistanceKm(a, b) {
  if (!a || !b) return 0;
  const toRad = (x) => x * Math.PI / 180;
  const R = 6371; // km
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function calcPrice(km) { return 2000 + Math.ceil(km) * 100; }

export default function MapWithForm() {
  // Fix default marker icons in Vite
  L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });
  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const [pickup, setPickup] = useState(null); // [lat, lng]
  const [dropoff, setDropoff] = useState(null);
  const [pickupText, setPickupText] = useState('');
  const [dropoffText, setDropoffText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [hasDocs, setHasDocs] = useState(false);
  const [canWinch, setCanWinch] = useState(false);
  const [vehicleType, setVehicleType] = useState('Car');
  const [brand, setBrand] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);

  const distanceKm = useMemo(() => {
    const dist = haversineDistanceKm(pickup, dropoff);
    return Number.isFinite(dist) ? dist : 0;
  }, [pickup, dropoff]);
  const price = useMemo(() => calcPrice(distanceKm), [distanceKm]);

  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;
    const map = L.map(mapElRef.current).setView([59.9343, 30.3351], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    mapRef.current = { map, markers: { pickup: null, dropoff: null }, route: null };

    map.on('click', (e) => {
      const latlng = [e.latlng.lat, e.latlng.lng];
      if (!mapRef.current.markers.pickup) {
        const m = L.marker(latlng, { title: '📍 Забрать здесь' }).addTo(map);
        mapRef.current.markers.pickup = m;
        setPickup(latlng);
        setPickupText(`${latlng[0].toFixed(5)}, ${latlng[1].toFixed(5)}`);
      } else if (!mapRef.current.markers.dropoff) {
        const m = L.marker(latlng, { title: '📍 Доставить сюда' }).addTo(map);
        mapRef.current.markers.dropoff = m;
        setDropoff(latlng);
        setDropoffText(`${latlng[0].toFixed(5)}, ${latlng[1].toFixed(5)}`);
      } else {
        mapRef.current.markers.dropoff.setLatLng(latlng);
        setDropoff(latlng);
        setDropoffText(`${latlng[0].toFixed(5)}, ${latlng[1].toFixed(5)}`);
      }
    });
  }, []);

  useEffect(() => {
    const { map, route } = mapRef.current || {};
    if (!map) return;
    if (route) { route.remove(); mapRef.current.route = null; }
    if (pickup && dropoff) {
      const line = L.polyline([pickup, dropoff], { color: '#F97316', weight: 5, opacity: 0.9 }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [20, 20] });
      mapRef.current.route = line;
    }
  }, [pickup, dropoff]);

  function centerByText(addrText) {
    // Simple geocode via Nominatim (no key) for MVP
    const q = encodeURIComponent(addrText + ', Saint Petersburg');
    return fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'Accept-Language': 'ru' }
    }).then(r => r.json()).then(rows => {
      const r = rows?.[0];
      if (!r) return null;
      const latlng = [Number(r.lat), Number(r.lon)];
      mapRef.current?.map.setView(latlng, 14);
      return latlng;
    }).catch(() => null);
  }

  async function submitOrder(e) {
    e.preventDefault();
    if (!pickup || !dropoff) {
      alert('Поставьте две точки на карте');
      return;
    }
    setEstimateOpen(true);
  }

  async function confirmOrder() {
    try {
      setSubmitting(true);
      const payload = {
        pickupAddress: pickupText,
        dropoffAddress: dropoffText,
        isRunning, hasDocs, canWinch,
        vehicleType, vehicleBrand: brand, comment,
        distanceKm: Number(distanceKm.toFixed(2))
      };
      const created = await api.createOrder(payload);
      alert('Заявка отправлена! Ожидайте звонка.');
      setEstimateOpen(false);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      <div className="absolute inset-0"><div ref={mapElRef} className="w-full h-full" /></div>

      <div className="relative z-10 p-4">
        <form onSubmit={submitOrder} className="glass card max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-primary mb-2">Закажите эвакуатор</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Адрес забора</label>
              <input className="input" value={pickupText} onChange={e => setPickupText(e.target.value)} onBlur={() => pickupText && centerByText(pickupText).then(latlng => { if (latlng) { setPickup(latlng); if (!mapRef.current.markers.pickup) { mapRef.current.markers.pickup = L.marker(latlng).addTo(mapRef.current.map); } else { mapRef.current.markers.pickup.setLatLng(latlng); } } })} placeholder="Кликните на карту или введите адрес" required />
            </div>
            <div>
              <label className="label">Адрес доставки</label>
              <input className="input" value={dropoffText} onChange={e => setDropoffText(e.target.value)} onBlur={() => dropoffText && centerByText(dropoffText).then(latlng => { if (latlng) { setDropoff(latlng); if (!mapRef.current.markers.dropoff) { mapRef.current.markers.dropoff = L.marker(latlng).addTo(mapRef.current.map); } else { mapRef.current.markers.dropoff.setLatLng(latlng); } } })} placeholder="Кликните на карту или введите адрес" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={isRunning} onChange={e => setIsRunning(e.target.checked)} /><span>Машина на ходу</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={hasDocs} onChange={e => setHasDocs(e.target.checked)} /><span>Есть документы</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={canWinch} onChange={e => setCanWinch(e.target.checked)} /><span>Можно лебедкой</span></label>
            </div>

            <div>
              <label className="label">Тип ТС</label>
              <select className="input" value={vehicleType} onChange={e => setVehicleType(e.target.value)} required>
                <option>Car</option>
                <option>Motorcycle</option>
                <option>Bus</option>
                <option>Truck</option>
              </select>
            </div>
            <div>
              <label className="label">Марка/модель</label>
              <input className="input" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Например, Toyota Camry" />
            </div>
            <div>
              <label className="label">Комментарий</label>
              <textarea className="input" rows="3" value={comment} onChange={e => setComment(e.target.value)} placeholder="Дополнительная информация"></textarea>
            </div>

            <div className="text-primary font-bold">Предварительно: {price.toLocaleString('ru-RU')} ₽ <span className="text-gray-500 text-sm">(2000 + 100×км)</span></div>

            <button className="btn-primary w-full h-12 rounded-xl">Отправить заявку</button>
          </div>
        </form>
      </div>

      {estimateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEstimateOpen(false)} />
          <div className="relative z-10 glass card w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">Предварительная стоимость</h3>
            <p className="mb-4">Оценка: <b>{price.toLocaleString('ru-RU')} ₽</b>. Расчет: 2000 ₽ + 100 ₽/км. Может отличаться, водитель уточнит по телефону.</p>
            <div className="flex gap-2">
              <button className="btn-accent h-11 flex-1 rounded-lg" disabled={submitting} onClick={confirmOrder}>Подтвердить</button>
              <button className="btn h-11 flex-1 rounded-lg border border-gray-300 bg-white" onClick={() => setEstimateOpen(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

