// ================= STATE =================
let categories = [];
let posts = [];
let activeCategoryId = 'all';
let searchQuery = '';
let editingPostId = null;

// ================= DOM ELEMENTS =================
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password-input');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const changePassBtn = document.getElementById('change-pass-btn');

const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');

const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const categoryContent = document.getElementById('category-content');
const toggleCategoryBtn = document.getElementById('toggle-category-btn');
const categoryListEl = document.getElementById('category-list');
const addCategoryForm = document.getElementById('add-category-form');
const newCategoryNameInput = document.getElementById('new-category-name');
const newCategoryEmojiSelect = document.getElementById('new-category-emoji');
const postCategorySelect = document.getElementById('post-category');
const feedHeading = document.getElementById('feed-heading');

const composerHeader = document.getElementById('composer-header');
const composerBody = document.getElementById('composer-body');
const toggleComposerBtn = document.getElementById('toggle-composer-btn');
const createPostForm = document.getElementById('create-post-form');
const postTitleInput = document.getElementById('post-title');
const postDateInput = document.getElementById('post-date');
const postContentInput = document.getElementById('post-content');
const postImageInput = document.getElementById('post-image-input');
const postDocInput = document.getElementById('post-doc-input');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');
const docPreviewContainer = document.getElementById('doc-preview-container');
const docPreviewName = document.getElementById('doc-preview-name');
const removeDocBtn = document.getElementById('remove-doc-btn');
const postsFeedEl = document.getElementById('posts-feed');

let selectedImageBase64 = null;
let selectedDocBase64 = null;
let selectedDocName = null;

// ================= 1. AUTHENTICATION & SECURITY =================
function checkAuth() {
  const isAuth = sessionStorage.getItem('isLoggedIn');
  if (isAuth === 'true') {
    loginScreen.classList.add('hidden');
    checkSecurityOnboarding();
    loadData();
  } else {
    loginScreen.classList.remove('hidden');
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = passwordInput.value;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('isLoggedIn', 'true');
      loginError.classList.add('hidden');
      passwordInput.value = '';
      checkAuth();
    } else {
      loginError.textContent = data.message || 'รหัสผ่านไม่ถูกต้อง';
      loginError.classList.remove('hidden');
    }
  } catch (err) {
    loginError.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
    loginError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('isLoggedIn');
  checkAuth();
});

// ตรวจสอบการตั้งค่า Onboarding ครั้งแรก
async function checkSecurityOnboarding() {
  try {
    const res = await fetch('/api/security-status');
    const data = await res.json();
    if (!data.isConfigured) {
      document.getElementById('onboarding-modal').classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

const onboardingQuestion = document.getElementById('onboarding-question');
const onboardingCustomQuestion = document.getElementById('onboarding-custom-question');
onboardingQuestion.addEventListener('change', () => {
  if (onboardingQuestion.value === 'custom') {
    onboardingCustomQuestion.classList.remove('hidden');
    onboardingCustomQuestion.required = true;
  } else {
    onboardingCustomQuestion.classList.add('hidden');
    onboardingCustomQuestion.required = false;
  }
});

document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const rawQ = onboardingQuestion.value;
  const question = rawQ === 'custom' ? onboardingCustomQuestion.value.trim() : rawQ;
  const answer = document.getElementById('onboarding-answer').value.trim();

  try {
    const res = await fetch('/api/setup-security-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer })
    });
    if (res.ok) {
      document.getElementById('onboarding-modal').classList.add('hidden');
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  }
});

// กู้คืนรหัสผ่าน
document.getElementById('forgot-password-link').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/security-question');
    if (!res.ok) {
      alert('ยังไม่ได้ตั้งคำถามความปลอดภัยในระบบ');
      return;
    }
    const data = await res.json();
    document.getElementById('recovery-question-display').textContent = data.question;
    document.getElementById('recovery-answer-input').value = '';
    document.getElementById('recovery-new-password').value = '';
    document.getElementById('recovery-error').classList.add('hidden');
    document.getElementById('recovery-modal').classList.remove('hidden');
  } catch (err) {
    alert('ไม่สามารถดึงข้อมูลคำถามความปลอดภัยได้');
  }
});

document.getElementById('close-recovery-modal').addEventListener('click', () => {
  document.getElementById('recovery-modal').classList.add('hidden');
});

document.getElementById('recovery-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const answer = document.getElementById('recovery-answer-input').value.trim();
  const newPassword = document.getElementById('recovery-new-password').value.trim();
  const errorEl = document.getElementById('recovery-error');

  try {
    const res = await fetch('/api/recover-by-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, newPassword })
    });
    const data = await res.json();
    if (data.success) {
      alert('รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
      document.getElementById('recovery-modal').classList.add('hidden');
    } else {
      errorEl.textContent = data.message || 'คำตอบไม่ถูกต้อง';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
    errorEl.classList.remove('hidden');
  }
});

// เปลี่ยนรหัสผ่าน
changePassBtn.addEventListener('click', () => {
  document.getElementById('current-pass').value = '';
  document.getElementById('new-pass').value = '';
  document.getElementById('confirm-pass').value = '';
  document.getElementById('change-pass-error').classList.add('hidden');
  document.getElementById('password-modal').classList.remove('hidden');
});

document.getElementById('close-password-modal').addEventListener('click', () => {
  document.getElementById('password-modal').classList.add('hidden');
});

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('current-pass').value;
  const newPassword = document.getElementById('new-pass').value;
  const confirmPassword = document.getElementById('confirm-pass').value;
  const errorEl = document.getElementById('change-pass-error');

  if (newPassword.length < 4) {
    errorEl.textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร';
    errorEl.classList.remove('hidden');
    return;
  }
  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (data.success) {
      alert('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      document.getElementById('password-modal').classList.add('hidden');
    } else {
      errorEl.textContent = data.message || 'เกิดข้อผิดพลาด';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
    errorEl.classList.remove('hidden');
  }
});

// ================= 2. DARK MODE & UI =================
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
  darkModeToggle.textContent = '☀️';
}

darkModeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  darkModeToggle.textContent = isDark ? '☀️' : '🌙';
});

mobileMenuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('hidden');
});

toggleCategoryBtn.addEventListener('click', () => {
  const isExpanded = toggleCategoryBtn.getAttribute('aria-expanded') === 'true';
  categoryContent.classList.toggle('hidden', isExpanded);
  toggleCategoryBtn.setAttribute('aria-expanded', String(!isExpanded));
  toggleCategoryBtn.textContent = isExpanded ? '▼' : '▲';
});

let isComposerOpen = true;
composerHeader.addEventListener('click', () => {
  isComposerOpen = !isComposerOpen;
  composerBody.classList.toggle('hidden', !isComposerOpen);
  toggleComposerBtn.textContent = isComposerOpen ? '▲' : '▼';
});

// Helper แปลงไฟล์เป็น Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

postImageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedImageBase64 = await fileToBase64(file);
    imagePreview.src = selectedImageBase64;
    imagePreviewContainer.classList.remove('hidden');
  }
});

removeImageBtn.addEventListener('click', () => {
  selectedImageBase64 = null;
  postImageInput.value = '';
  imagePreviewContainer.classList.add('hidden');
});

postDocInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedDocBase64 = await fileToBase64(file);
    selectedDocName = file.name;
    docPreviewName.textContent = file.name;
    docPreviewContainer.classList.remove('hidden');
    docPreviewContainer.classList.add('flex');
  }
});

removeDocBtn.addEventListener('click', () => {
  selectedDocBase64 = null;
  selectedDocName = null;
  postDocInput.value = '';
  docPreviewContainer.classList.add('hidden');
  docPreviewContainer.classList.remove('flex');
});

// ================= 3. DATA LOADING & RENDERING =================
async function loadData() {
  try {
    const [catRes, postRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/posts')
    ]);
    categories = await catRes.json();
    posts = await postRes.json();
    renderCategories();
    renderPosts();
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

function renderCategories() {
  categoryListEl.innerHTML = '';
  postCategorySelect.innerHTML = '<option value="">ไม่มีหมวดหมู่</option>';

  const allLi = document.createElement('li');
  allLi.innerHTML = `
    <button onclick="selectCategory('all')"
      class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition ${
        activeCategoryId === 'all' ? 'bg-blue-50 text-[#1877f2] font-bold' : 'hover:bg-gray-100 text-gray-700'
      }">
      <span>📌 ทั้งหมด</span>
      <span class="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">${posts.length}</span>
    </button>
  `;
  categoryListEl.appendChild(allLi);

  categories.forEach(cat => {
    const count = posts.filter(p => p.category_id === cat.id).length;
    const li = document.createElement('li');
    li.className = 'flex items-center justify-between group';
    li.innerHTML = `
      <button onclick="selectCategory(${cat.id})"
        class="flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
          activeCategoryId === cat.id ? 'bg-blue-50 text-[#1877f2] font-bold' : 'hover:bg-gray-100 text-gray-700'
        }">
        ${cat.emoji || '📁'} ${cat.name} <span class="text-xs text-gray-400 ml-1">(${count})</span>
      </button>
      <button onclick="deleteCategory(${cat.id})" title="ลบหมวดหมู่"
        class="text-gray-400 hover:text-red-500 px-2 py-1 text-xs opacity-70 group-hover:opacity-100">
        🗑️
      </button>
    `;
    categoryListEl.appendChild(li);

    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.emoji || '📁'} ${cat.name}`;
    postCategorySelect.appendChild(opt);
  });
}

window.selectCategory = function(catId) {
  activeCategoryId = catId;
  const catObj = categories.find(c => c.id === catId);
  feedHeading.textContent = `ไทม์ไลน์แผนงาน: ${catId === 'all' ? 'ทั้งหมด' : (catObj ? catObj.name : 'ทั้งหมด')}`;
  renderCategories();
  renderPosts();
};

addCategoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = newCategoryNameInput.value.trim();
  const emoji = newCategoryEmojiSelect.value;
  if (!name) return;

  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, emoji })
    });
    if (res.ok) {
      newCategoryNameInput.value = '';
      loadData();
    }
  } catch (err) {
    alert('ไม่สามารถเพิ่มหมวดหมู่ได้');
  }
});

window.deleteCategory = async function(catId) {
  if (!confirm('ต้องการลบหมวดหมู่นี้ใช่หรือไม่?')) return;
  try {
    const res = await fetch(`/api/categories/${catId}`, { method: 'DELETE' });
    if (res.ok) {
      if (activeCategoryId === catId) activeCategoryId = 'all';
      loadData();
    }
  } catch (err) {
    alert('ไม่สามารถลบหมวดหมู่ได้');
  }
};

function formatThaiDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderPosts() {
  postsFeedEl.innerHTML = '';

  let filtered = posts.filter(p => activeCategoryId === 'all' || p.category_id === activeCategoryId);

  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) || (p.content && p.content.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    postsFeedEl.innerHTML = `
      <div class="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm">
        ${searchQuery ? `ไม่พบแผนงานที่ตรงกับ "${searchQuery}"` : 'ยังไม่มีโพสต์กิจกรรมในหมวดหมู่นี้'}
      </div>
    `;
    return;
  }

  filtered.forEach(post => {
    const category = categories.find(c => c.id === post.category_id);
    const catName = category ? `${category.emoji || '📁'} ${category.name}` : 'ไม่มีหมวดหมู่';

    const card = document.createElement('article');
    card.className = `bg-white rounded-xl shadow-sm p-4 border border-transparent hover:border-blue-100 transition ${
      post.is_completed ? 'post-completed' : ''
    }`;
    card.setAttribute('data-id', post.id);

    let imageHtml = post.image_data ? `<div class="mt-3 rounded-lg overflow-hidden border border-gray-100"><img src="${post.image_data}" class="w-full max-h-96 object-cover"></div>` : '';
    let docHtml = (post.doc_data && post.doc_name) ? `
      <div class="mt-3 flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
        <span class="text-xs font-medium truncate max-w-xs">📄 ${post.doc_name}</span>
        <a href="${post.doc_data}" download="${post.doc_name}" class="text-xs bg-[#1877f2] text-white px-2.5 py-1 rounded hover:bg-blue-600 font-semibold">ดาวน์โหลด</a>
      </div>
    ` : '';

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3 mb-2">
        <div class="flex items-start gap-3">
          <button onclick="toggleComplete(${post.id})" title="${post.is_completed ? 'ทำต่อ' : 'เสร็จสิ้น'}"
            class="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 transition-all ${
              post.is_completed ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
            }">✓</button>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="bg-blue-100 text-[#1877f2] text-xs font-bold px-2 py-0.5 rounded">
                📅 ${formatThaiDate(post.event_date)}
              </span>
              <span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">
                ${catName}
              </span>
              ${post.is_completed ? '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-bold">✨ สำเร็จแล้ว</span>' : ''}
            </div>
            <h4 class="font-bold text-base text-gray-900 mt-1 post-title-text">${post.title}</h4>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button onclick="toggleCollapse(${post.id})" title="ย่อ/ขยาย" class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg text-xs">
            ${post.is_collapsed ? '▼' : '▲'}
          </button>
          <button onclick="openEditModal(${post.id})" title="แก้ไข" class="text-gray-400 hover:text-blue-500 p-1.5 rounded-lg text-sm">✏️</button>
          <button onclick="deletePost(${post.id})" title="ลบ" class="text-gray-400 hover:text-red-500 p-1.5 rounded-lg text-sm">🗑️</button>
          <div class="drag-handle text-gray-400 hover:text-gray-700 p-1.5 rounded-lg text-lg select-none" title="ลากเพื่อย้ายลำดับ">⠿</div>
        </div>
      </div>

      <div class="${post.is_collapsed ? 'hidden' : 'block'}">
        ${post.content ? `<p class="text-gray-700 text-sm whitespace-pre-line border-t border-gray-100 pt-2.5 mt-2">${post.content}</p>` : ''}
        ${imageHtml}
        ${docHtml}
      </div>
    `;

    postsFeedEl.appendChild(card);
  });
}

// สร้างโพสต์ใหม่
createPostForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = postTitleInput.value.trim();
  const event_date = postDateInput.value;
  const content = postContentInput.value.trim();
  const category_id = Number(postCategorySelect.value) || null;

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        event_date,
        content,
        category_id,
        image_data: selectedImageBase64,
        doc_data: selectedDocBase64,
        doc_name: selectedDocName
      })
    });

    if (res.ok) {
      createPostForm.reset();
      selectedImageBase64 = null;
      selectedDocBase64 = null;
      selectedDocName = null;
      imagePreviewContainer.classList.add('hidden');
      docPreviewContainer.classList.add('hidden');
      loadData();
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการสร้างโพสต์');
  }
});

// สลับสถานะ เสร็จ/ยังไม่เสร็จ
window.toggleComplete = async function(id) {
  try {
    await fetch(`/api/posts/${id}/toggle-complete`, { method: 'PUT' });
    loadData();
  } catch (err) {
    console.error(err);
  }
};

// สลับสถานะ ย่อ/ขยาย
window.toggleCollapse = async function(id) {
  try {
    await fetch(`/api/posts/${id}/toggle-collapse`, { method: 'PUT' });
    loadData();
  } catch (err) {
    console.error(err);
  }
};

// ลบโพสต์
window.deletePost = async function(id) {
  if (!confirm('ต้องการลบโพสต์กิจกรรมนี้ใช่หรือไม่?')) return;
  try {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    loadData();
  } catch (err) {
    alert('ไม่สามารถลบโพสต์ได้');
  }
};

// แก้ไขโพสต์
window.openEditModal = function(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  editingPostId = id;

  document.getElementById('edit-title').value = post.title;
  document.getElementById('edit-date').value = post.event_date.split('T')[0];
  document.getElementById('edit-content').value = post.content || '';

  const editCatSelect = document.getElementById('edit-category');
  editCatSelect.innerHTML = '<option value="">ไม่มีหมวดหมู่</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.emoji || '📁'} ${cat.name}`;
    if (cat.id === post.category_id) opt.selected = true;
    editCatSelect.appendChild(opt);
  });

  document.getElementById('edit-modal').classList.remove('hidden');
};

document.getElementById('close-edit-modal').addEventListener('click', () => {
  document.getElementById('edit-modal').classList.add('hidden');
});
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  document.getElementById('edit-modal').classList.add('hidden');
});

document.getElementById('edit-post-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editingPostId) return;

  const title = document.getElementById('edit-title').value.trim();
  const event_date = document.getElementById('edit-date').value;
  const content = document.getElementById('edit-content').value.trim();
  const category_id = Number(document.getElementById('edit-category').value) || null;

  try {
    const res = await fetch(`/api/posts/${editingPostId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, event_date, content, category_id })
    });
    if (res.ok) {
      document.getElementById('edit-modal').classList.add('hidden');
      loadData();
    }
  } catch (err) {
    alert('ไม่สามารถบันทึกการแก้ไขได้');
  }
});

// ค้นหาแบบเรียลไทม์
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
  renderPosts();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  renderPosts();
  searchInput.focus();
});

// ลากสลับตำแหน่งโพสต์
new Sortable(postsFeedEl, {
  animation: 150,
  handle: '.drag-handle',
  ghostClass: 'sortable-ghost',
  onEnd: async function () {
    const cards = postsFeedEl.querySelectorAll('article[data-id]');
    const orderedIds = Array.from(cards).map(el => Number(el.getAttribute('data-id')));

    try {
      await fetch('/api/posts/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      });
    } catch (err) {
      console.error('Reorder sync error:', err);
    }
  }
});

// เริ่มต้นระบบ
checkAuth();
