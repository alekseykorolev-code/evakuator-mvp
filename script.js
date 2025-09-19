(function () {
  'use strict';

  const ORDERS_STORAGE_KEY = 'evacuator_orders';

  function getOrdersFromStorage() {
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Ошибка чтения localStorage:', e);
      return [];
    }
  }

  function saveOrdersToStorage(orders) {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Ошибка записи localStorage:', e);
    }
  }

  function sanitizePhone(phone) {
    return String(phone || '').replace(/\D+/g, '');
  }

  function formatDateTime(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('ru-RU', { hour12: false });
    } catch {
      return isoString;
    }
  }

  function calculatePrice(distanceKm) {
    const base = 2000;
    const perKm = 100;
    const kmRoundedUp = Math.max(0, Math.ceil(Number(distanceKm) || 0));
    return base + kmRoundedUp * perKm;
  }

  function updatePricePreview(distanceKm) {
    const pricePreview = document.getElementById('price-preview');
    if (!pricePreview) return;
    const price = calculatePrice(distanceKm);
    pricePreview.textContent = `Средняя стоимость: ${price.toLocaleString('ru-RU')} ₽`;
  }

  function showToast(message) {
    alert(message);
  }

  // ============================ INDEX PAGE LOGIC ============================
  function initIndexPage() {
    const mapContainer = document.getElementById('map');
    const clearMapBtn = document.getElementById('clear-map');
    const submitBtn = document.getElementById('submit-order');
    const myOrdersBtn = document.getElementById('my-orders-btn');

    const pickupAddressEl = document.getElementById('pickup-address');
    const dropoffAddressEl = document.getElementById('dropoff-address');
    const distanceEl = document.getElementById('distance');

    if (!mapContainer || !pickupAddressEl || !dropoffAddressEl || !distanceEl) {
      return;
    }

    let mapInstance = null;
    let pickupPlacemark = null;
    let dropoffPlacemark = null;
    let currentRoute = null;

    function removeRoute() {
      if (currentRoute && mapInstance) {
        mapInstance.geoObjects.remove(currentRoute);
        currentRoute = null;
      }
    }

    function removePlacemark(placemark) {
      if (placemark && mapInstance) {
        mapInstance.geoObjects.remove(placemark);
      }
    }

    function setAddressFromCoords(coords, target) {
      return ymaps.geocode(coords).then((res) => {
        const first = res.geoObjects.get(0);
        const address = first ? first.getAddressLine() : `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`;
        target.value = address;
        return address;
      }).catch(() => {
        target.value = `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`;
        return target.value;
      });
    }

    function geocodeAddressToCoords(address) {
      if (!address || !address.trim()) return Promise.resolve(null);
      return ymaps.geocode(address, { results: 1 }).then((res) => {
        const first = res.geoObjects.get(0);
        if (!first) return null;
        return first.geometry.getCoordinates();
      }).catch(() => null);
    }

    function addOrMovePlacemark(coords, isPickup) {
      const caption = isPickup ? '📍 Забрать здесь' : '📍 Доставить сюда';
      const color = '#1E3A8A';
      if (isPickup) {
        if (!pickupPlacemark) {
          pickupPlacemark = new ymaps.Placemark(coords, { iconCaption: caption, balloonContent: caption }, { preset: 'islands#blueCircleDotIconWithCaption', iconColor: color });
          mapInstance.geoObjects.add(pickupPlacemark);
        } else {
          pickupPlacemark.geometry.setCoordinates(coords);
        }
      } else {
        if (!dropoffPlacemark) {
          dropoffPlacemark = new ymaps.Placemark(coords, { iconCaption: caption, balloonContent: caption }, { preset: 'islands#blueCircleDotIconWithCaption', iconColor: color });
          mapInstance.geoObjects.add(dropoffPlacemark);
        } else {
          dropoffPlacemark.geometry.setCoordinates(coords);
        }
      }
    }

    function buildRouteIfPossible() {
      if (!pickupPlacemark || !dropoffPlacemark) return;
      const a = pickupPlacemark.geometry.getCoordinates();
      const b = dropoffPlacemark.geometry.getCoordinates();
      if (!a || !b) return;

      removeRoute();

      ymaps.route([a, b]).then((route) => {
        currentRoute = route;
        const paths = route.getPaths();
        if (paths) {
          paths.options.set({ strokeColor: '#F97316', strokeWidth: 5, opacity: 0.9 });
        }
        mapInstance.geoObjects.add(route);
        mapInstance.setBounds(route.getBounds(), { checkZoomRange: true, zoomMargin: 30 });

        let distanceMeters = 0;
        try {
          const active = route.getActiveRoute();
          if (active) {
            const d = active.properties.get('distance');
            distanceMeters = d && typeof d.value === 'number' ? d.value : 0;
          } else if (typeof route.getLength === 'function') {
            distanceMeters = route.getLength();
          }
        } catch (e) {
          distanceMeters = 0;
        }
        const distanceKm = distanceMeters / 1000;
        distanceEl.value = String(distanceKm.toFixed(2));
        updatePricePreview(distanceKm);
      }).catch((e) => {
        console.error('Ошибка построения маршрута:', e);
        removeRoute();
      });
    }

    function centerToAddress(address) {
      geocodeAddressToCoords(address).then((coords) => {
        if (coords && mapInstance) {
          mapInstance.setCenter(coords, 14, { checkZoomRange: true });
        }
      });
    }

    function onMapClick(e) {
      const coords = e.get('coords');
      if (!pickupPlacemark) {
        addOrMovePlacemark(coords, true);
        setAddressFromCoords(coords, pickupAddressEl).then(() => {
          updatePricePreview(Number(distanceEl.value || 0));
        });
      } else if (!dropoffPlacemark) {
        addOrMovePlacemark(coords, false);
        setAddressFromCoords(coords, dropoffAddressEl).then(() => {
          buildRouteIfPossible();
        });
      } else {
        // Если обе точки уже есть — перемещаем точку доставки
        addOrMovePlacemark(coords, false);
        setAddressFromCoords(coords, dropoffAddressEl).then(() => {
          buildRouteIfPossible();
        });
      }
    }

    function initMap() {
      const loader = document.getElementById('map-loading');
      try {
        mapInstance = new ymaps.Map('map', {
          center: [59.9343, 30.3351],
          zoom: 11,
          controls: ['zoomControl', 'geolocationControl']
        }, {
          suppressMapOpenBlock: true
        });
        if (loader) loader.style.display = 'none';
        mapInstance.events.add('click', onMapClick);
      } catch (e) {
        console.error('Не удалось инициализировать карту:', e);
        if (loader) loader.textContent = 'Не удалось загрузить карту. Обновите страницу.';
      }
    }

    function clearMap() {
      removeRoute();
      removePlacemark(pickupPlacemark); pickupPlacemark = null;
      removePlacemark(dropoffPlacemark); dropoffPlacemark = null;
      pickupAddressEl.value = '';
      dropoffAddressEl.value = '';
      distanceEl.value = '0';
      updatePricePreview(0);
      if (mapInstance) {
        mapInstance.setCenter([59.9343, 30.3351], 11, { duration: 300 });
      }
    }

    // Address manual changes
    pickupAddressEl.addEventListener('change', () => {
      const address = pickupAddressEl.value.trim();
      if (!address) return;
      geocodeAddressToCoords(address).then((coords) => {
        if (!coords) return;
        if (!mapInstance) return;
        addOrMovePlacemark(coords, true);
        centerToAddress(address);
        buildRouteIfPossible();
      });
    });

    dropoffAddressEl.addEventListener('change', () => {
      const address = dropoffAddressEl.value.trim();
      if (!address) return;
      geocodeAddressToCoords(address).then((coords) => {
        if (!coords) return;
        if (!mapInstance) return;
        addOrMovePlacemark(coords, false);
        centerToAddress(address);
        buildRouteIfPossible();
      });
    });

    if (clearMapBtn) clearMapBtn.addEventListener('click', clearMap);

    // Submit order
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const nameEl = document.getElementById('name');
        const phoneEl = document.getElementById('phone');
        const vehicleTypeEl = document.getElementById('vehicle-type');
        const brandEl = document.getElementById('vehicle-brand');
        const commentEl = document.getElementById('comment');
        const isRunningEl = document.getElementById('is-running');
        const hasDocsEl = document.getElementById('has-docs');
        const canWinchEl = document.getElementById('can-winch');

        const name = (nameEl.value || '').trim();
        const phone = sanitizePhone(phoneEl.value);
        const pickupAddress = (pickupAddressEl.value || '').trim();
        const dropoffAddress = (dropoffAddressEl.value || '').trim();
        const distanceKm = Number(distanceEl.value || '0');

        if (!name) {
          showToast('Введите имя');
          nameEl.focus();
          return;
        }
        if (!(phone.length === 10 || phone.length === 11)) {
          showToast('Введите корректный телефон (10-11 цифр)');
          phoneEl.focus();
          return;
        }
        if (!pickupAddress || !dropoffAddress) {
          showToast('Укажите адреса забора и доставки на карте или вручную');
          return;
        }

        const order = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name,
          phone,
          pickupAddress,
          dropoffAddress,
          distanceKm: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(2)) : 0,
          isRunning: !!isRunningEl.checked,
          hasDocs: !!hasDocsEl.checked,
          canWinch: !!canWinchEl.checked,
          vehicleType: vehicleTypeEl.value,
          vehicleBrand: (brandEl.value || '').trim(),
          comment: (commentEl.value || '').trim(),
          status: 'в работе',
          createdAt: new Date().toISOString(),
          price: calculatePrice(distanceKm)
        };

        const orders = getOrdersFromStorage();
        orders.unshift(order);
        saveOrdersToStorage(orders);

        console.log('Заявка отправлена на vk_rot@mail.ru:', order);
        showToast('Заявка отправлена! Ожидайте звонка.');

        // Reset minimal fields but keep addresses for convenience
        document.getElementById('order-form').reset();
        updatePricePreview(Number(distanceEl.value || 0));
      });
    }

    // My Orders modal
    function openModal(modal) { modal.setAttribute('aria-hidden', 'false'); }
    function closeModal(modal) { modal.setAttribute('aria-hidden', 'true'); }

    const ordersModal = document.getElementById('orders-modal');
    if (ordersModal && myOrdersBtn) {
      myOrdersBtn.addEventListener('click', () => openModal(ordersModal));
      ordersModal.addEventListener('click', (e) => {
        if (e.target && (e.target.matches('[data-close-modal]') || e.target === ordersModal.querySelector('.modal__backdrop'))) {
          closeModal(ordersModal);
        }
      });

      const showBtn = document.getElementById('orders-show-btn');
      const phoneInput = document.getElementById('orders-phone-input');
      const tableBody = document.querySelector('#orders-table tbody');
      const emptyEl = document.getElementById('orders-empty');

      function renderUserOrders() {
        const phone = sanitizePhone(phoneInput.value);
        const orders = getOrdersFromStorage().filter(o => o.phone === phone);
        tableBody.innerHTML = '';
        if (!orders.length) {
          emptyEl.style.display = '';
          return;
        }
        emptyEl.style.display = 'none';
        for (const o of orders) {
          const tr = document.createElement('tr');
          const dateTd = document.createElement('td');
          dateTd.textContent = formatDateTime(o.createdAt);
          const brandTd = document.createElement('td');
          brandTd.textContent = o.vehicleBrand || '—';
          const statusTd = document.createElement('td');
          statusTd.textContent = o.status;
          tr.appendChild(dateTd);
          tr.appendChild(brandTd);
          tr.appendChild(statusTd);
          tableBody.appendChild(tr);
        }
      }

      if (showBtn) showBtn.addEventListener('click', renderUserOrders);
    }

    if (window.ymaps && typeof ymaps.ready === 'function') {
      ymaps.ready(initMap);
    } else {
      // If Yandex Maps did not load, hide loader text is handled in initMap safely
      console.warn('Yandex Maps API не доступен пока.');
    }
  }

  // ============================ ADMIN PAGE LOGIC ============================
  function initAdminPage() {
    const app = document.getElementById('admin-app');
    if (!app) return;

    const loginModal = document.getElementById('login-modal');
    const loginInput = document.getElementById('admin-login');
    const passwordInput = document.getElementById('admin-password');
    const loginBtn = document.getElementById('login-submit');
    const loginError = document.getElementById('login-error');

    const tableBody = document.querySelector('#admin-orders-table tbody');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    function renderAdminTable() {
      const orders = getOrdersFromStorage();
      tableBody.innerHTML = '';
      for (const order of orders) {
        const tr = document.createElement('tr');
        const tdId = document.createElement('td'); tdId.textContent = order.id;
        const tdName = document.createElement('td'); tdName.textContent = order.name;
        const tdPhone = document.createElement('td'); tdPhone.textContent = order.phone;
        const tdPickup = document.createElement('td'); tdPickup.textContent = order.pickupAddress;
        const tdDropoff = document.createElement('td'); tdDropoff.textContent = order.dropoffAddress;
        const tdType = document.createElement('td'); tdType.textContent = order.vehicleType;
        const tdBrand = document.createElement('td'); tdBrand.textContent = order.vehicleBrand || '—';
        const tdComment = document.createElement('td'); tdComment.textContent = order.comment || '—';
        const tdDistance = document.createElement('td'); tdDistance.textContent = (order.distanceKm ?? 0).toString();
        const tdStatus = document.createElement('td');
        const statusSelect = document.createElement('select');
        for (const s of ['в работе', 'готово', 'отмена']) {
          const opt = document.createElement('option');
          opt.value = s; opt.textContent = s; if (order.status === s) opt.selected = true;
          statusSelect.appendChild(opt);
        }
        tdStatus.appendChild(statusSelect);
        const tdDate = document.createElement('td'); tdDate.textContent = formatDateTime(order.createdAt);
        const tdAction = document.createElement('td');
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Сохранить';
        saveBtn.className = 'btn btn-accent';
        saveBtn.addEventListener('click', () => {
          const all = getOrdersFromStorage();
          const idx = all.findIndex(o => o.id === order.id);
          if (idx >= 0) {
            all[idx].status = statusSelect.value;
            saveOrdersToStorage(all);
            renderAdminTable();
          }
        });
        tdAction.appendChild(saveBtn);

        tr.appendChild(tdId);
        tr.appendChild(tdName);
        tr.appendChild(tdPhone);
        tr.appendChild(tdPickup);
        tr.appendChild(tdDropoff);
        tr.appendChild(tdType);
        tr.appendChild(tdBrand);
        tr.appendChild(tdComment);
        tr.appendChild(tdDistance);
        tr.appendChild(tdStatus);
        tr.appendChild(tdDate);
        tr.appendChild(tdAction);
        tableBody.appendChild(tr);
      }
    }

    function doLogin() {
      const login = (loginInput.value || '').trim();
      const pass = (passwordInput.value || '').trim();
      if (login === 'admin' && pass === '123') {
        loginModal.setAttribute('aria-hidden', 'true');
        renderAdminTable();
      } else {
        loginError.style.display = '';
      }
    }

    if (loginBtn) loginBtn.addEventListener('click', doLogin);
    [loginInput, passwordInput].forEach((el) => {
      el && el.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
    });

    if (exportBtn) exportBtn.addEventListener('click', () => {
      const orders = getOrdersFromStorage();
      const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'orders.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(String(reader.result || '[]'));
            if (!Array.isArray(data)) throw new Error('Неверный формат JSON');
            saveOrdersToStorage(data);
            renderAdminTable();
          } catch (err) {
            alert('Ошибка импорта: ' + err.message);
          } finally {
            importFile.value = '';
          }
        };
        reader.readAsText(file, 'utf-8');
      });
    }
  }

  // ============================ BOOTSTRAP ============================
  document.addEventListener('DOMContentLoaded', function () {
    initIndexPage();
    initAdminPage();
  });
})();

