import React from 'react';
import MapWithForm from '../components/MapWithForm.jsx';

export default function HomePage() {
  return (
    <div>
      <MapWithForm />
      <section id="services" className="px-4 py-10 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Услуги</h2>
        <p className="text-gray-600">Эвакуация легковых авто, мотоциклов, автобусов и грузовиков по Санкт-Петербургу и ЛО.</p>
      </section>
      <section id="contacts" className="px-4 pb-10 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Контакты</h2>
        <p className="text-gray-600">Телефон диспетчера будет добавлен на проде. Пока оформляйте заявку через форму.</p>
      </section>
    </div>
  );
}

