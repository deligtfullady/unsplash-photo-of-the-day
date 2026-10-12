/**
 * Photo of the Day — Unsplash
 * Урок 3: Сетевые запросы (Browser APIs)
 *
 */

// ========== НАСТРОЙКИ ==========
const ACCESS_KEY = '2makBfMxcuIK4CtOEOqIX8oM8yRuY7QqnEEC1FviJJE'; 
const API_URL = 'https://api.unsplash.com/photos/random';
const HISTORY_KEY = 'unsplash_photo_history';
const LIKES_KEY = 'unsplash_photo_likes';
const MAX_HISTORY = 12;

// ========== DOM ==========
const loaderEl = document.getElementById('loader');
const errorEl = document.getElementById('error');
const errorMessageEl = document.getElementById('error-message');
const photoCardEl = document.getElementById('photo-card');
const photoEl = document.getElementById('photo');
const unsplashLinkEl = document.getElementById('unsplash-link');
const photographerAvatarEl = document.getElementById('photographer-avatar');
const photographerNameEl = document.getElementById('photographer-name');
const photographerUsernameEl = document.getElementById('photographer-username');
const likeBtnEl = document.getElementById('like-btn');
const likeCountEl = document.getElementById('like-count');
const newPhotoBtnEl = document.getElementById('new-photo-btn');
const photoDescriptionEl = document.getElementById('photo-description');
const historySectionEl = document.getElementById('history-section');
const historyListEl = document.getElementById('history-list');
const clearHistoryBtnEl = document.getElementById('clear-history-btn');
const retryBtnEl = document.getElementById('retry-btn');

// ========== СОСТОЯНИЕ ==========
let currentPhoto = null;

// ========== LOCAL STORAGE ==========

function getLikes() {
  try {
    return JSON.parse(localStorage.getItem(LIKES_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLike(photoId, count) {
  const likes = getLikes();
  likes[photoId] = count;
  localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
}

function getLikeCount(photoId) {
  const likes = getLikes();
  return likes[photoId] || 0;
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function addToHistory(photo) {
  let history = getHistory();

  // Не добавляем дубликаты
  history = history.filter((item) => item.id !== photo.id);

  // Добавляем в начало
  history.unshift({
    id: photo.id,
    url: photo.urls.small,
    fullUrl: photo.urls.regular,
    alt: photo.alt_description || 'Фото',
    photographer: photo.user.name,
    photographerUsername: photo.user.username,
    photographerLink: photo.user.links.html,
    photographerAvatar: photo.user.profile_image?.medium || '',
    unsplashLink: photo.links.html,
    description: photo.description || photo.alt_description || '',
    likes: getLikeCount(photo.id),
  });

  // Ограничиваем размер истории
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

// ========== API ==========

async function fetchRandomPhoto() {
  if (!ACCESS_KEY || ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
    throw new Error(
      'Укажите свой Access Key Unsplash в файле app.js (константа ACCESS_KEY). Получить ключ: https://unsplash.com/developers'
    );
  }

  const response = await fetch(`${API_URL}?orientation=landscape`, {
    headers: {
      Authorization: `Client-ID ${ACCESS_KEY}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Неверный API-ключ. Проверьте ACCESS_KEY в app.js');
    }
    if (response.status === 403) {
      throw new Error('Превышен лимит запросов Unsplash (50/час для демо-ключа)');
    }
    throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ========== UI ==========

function showLoader() {
  loaderEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  photoCardEl.classList.add('hidden');
}

function showError(message) {
  loaderEl.classList.add('hidden');
  photoCardEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
  errorMessageEl.textContent = message;
}

function showPhoto(photo) {
  currentPhoto = photo;

  loaderEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  photoCardEl.classList.remove('hidden');

  // Изображение
  photoEl.src = photo.urls.regular;
  photoEl.alt = photo.alt_description || 'Случайное фото Unsplash';

  // Ссылка на Unsplash (требование API — attribution)
  unsplashLinkEl.href = photo.links.html + '?utm_source=photo_of_the_day&utm_medium=referral';

  // Фотограф
  photographerAvatarEl.src = photo.user.profile_image?.medium || '';
  photographerAvatarEl.alt = photo.user.name;
  photographerNameEl.textContent = photo.user.name;
  photographerNameEl.href = photo.user.links.html + '?utm_source=photo_of_the_day&utm_medium=referral';
  photographerUsernameEl.textContent = `@${photo.user.username}`;

  // Описание
  const desc = photo.description || photo.alt_description || '';
  photoDescriptionEl.textContent = desc;
  photoDescriptionEl.style.display = desc ? 'block' : 'none';

  // Лайки
  updateLikeUI(photo.id);

  // История
  addToHistory(photo);
}

function updateLikeUI(photoId) {
  const count = getLikeCount(photoId);
  likeCountEl.textContent = count;

  if (count > 0) {
    likeBtnEl.classList.add('liked');
  } else {
    likeBtnEl.classList.remove('liked');
  }
}

function renderHistory() {
  const history = getHistory();

  if (history.length === 0) {
    historySectionEl.classList.add('hidden');
    return;
  }

  historySectionEl.classList.remove('hidden');
  historyListEl.innerHTML = '';

  history.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    if (currentPhoto && currentPhoto.id === item.id) {
      el.classList.add('active');
    }

    const likes = getLikeCount(item.id);

    el.innerHTML = `
      <img src="${item.url}" alt="${item.alt}" loading="lazy">
      ${likes > 0 ? `<span class="likes-badge">♥ ${likes}</span>` : ''}
    `;

    el.addEventListener('click', () => {
      // Восстанавливаем фото из истории без нового запроса
      showPhotoFromHistory(item);
    });

    historyListEl.appendChild(el);
  });
}

function showPhotoFromHistory(item) {
  // Формируем объект, похожий на ответ API
  const photo = {
    id: item.id,
    urls: {
      regular: item.fullUrl,
      small: item.url,
    },
    alt_description: item.alt,
    description: item.description,
    links: { html: item.unsplashLink },
    user: {
      name: item.photographer,
      username: item.photographerUsername,
      links: { html: item.photographerLink },
      profile_image: { medium: item.photographerAvatar },
    },
  };

  currentPhoto = photo;

  photoEl.src = photo.urls.regular;
  photoEl.alt = photo.alt_description;
  unsplashLinkEl.href = photo.links.html + '?utm_source=photo_of_the_day&utm_medium=referral';
  photographerAvatarEl.src = photo.user.profile_image.medium;
  photographerAvatarEl.alt = photo.user.name;
  photographerNameEl.textContent = photo.user.name;
  photographerNameEl.href = photo.user.links.html + '?utm_source=photo_of_the_day&utm_medium=referral';
  photographerUsernameEl.textContent = `@${photo.user.username}`;

  const desc = photo.description || '';
  photoDescriptionEl.textContent = desc;
  photoDescriptionEl.style.display = desc ? 'block' : 'none';

  updateLikeUI(photo.id);
  renderHistory(); // обновить active-состояние

  // Прокрутка к фото
  photoCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========== ОБРАБОТЧИКИ ==========

async function loadNewPhoto() {
  showLoader();
  try {
    const photo = await fetchRandomPhoto();
    showPhoto(photo);
  } catch (err) {
    console.error(err);
    showError(err.message || 'Не удалось загрузить фото');
  }
}

likeBtnEl.addEventListener('click', () => {
  if (!currentPhoto) return;

  const id = currentPhoto.id;
  const newCount = getLikeCount(id) + 1;
  saveLike(id, newCount);
  updateLikeUI(id);
  renderHistory(); // обновить бейджи в истории
});

newPhotoBtnEl.addEventListener('click', loadNewPhoto);
retryBtnEl.addEventListener('click', loadNewPhoto);
clearHistoryBtnEl.addEventListener('click', () => {
  if (confirm('Очистить всю историю просмотров?')) {
    clearHistory();
  }
});

// ========== СТАРТ ==========
renderHistory();
loadNewPhoto();
