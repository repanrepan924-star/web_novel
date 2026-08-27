document.addEventListener('DOMContentLoaded', () => {

  // Database Penyimpanan Naskah Cerita (Memory Storage)
  const storyDatabase = {
    'row-45': '<p>Suara dentupan pedang bergema di seluruh lembah klan. Para prajurit berjuang mempertahankan benteng terakhir mereka...</p>',
    'row-46': '<p>Peta kuno itu menunjuk ke arah reruntuhan istana bawah tanah yang tersembunyi selama seribu tahun...</p>',
    'row-47': '<p>Kapal mulai berlayar melintasi Samudra Biru menuju Benua Baru yang penuh mistis...</p>'
  };
  const deletedChapterIds = new Set(JSON.parse(localStorage.getItem('novel_deleted_chapters') || '[]'));

  // Akses dicatat di server agar dapat dilihat lintas perangkat.
  const accessTableBody = document.getElementById('access-table-body');
  const accessSummary = document.getElementById('access-summary');
  const refreshAccessesBtn = document.getElementById('refresh-accesses-btn');

  function formatAccessTime(timestamp) {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  }

  function renderAccesses(accesses) {
    if (!accessTableBody) return;
    accessTableBody.innerHTML = '';
    if (!accesses.length) {
      accessTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada akses tercatat.</td></tr>';
    } else {
      accesses.forEach(access => {
        const row = document.createElement('tr');
        [access.device, formatAccessTime(access.createdAt), access.language, access.timezone].forEach(value => {
          const cell = document.createElement('td');
          cell.textContent = value || '-';
          row.appendChild(cell);
        });
        accessTableBody.appendChild(row);
      });
    }
    if (accessSummary) accessSummary.textContent = `${accesses.length} akses terakhir tersimpan di sistem utama`;
  }

  async function loadAccesses() {
    if (!accessTableBody) return;
    try {
      const response = await fetch('/api/accesses');
      if (!response.ok) throw new Error('Gagal mengambil akses');
      renderAccesses(await response.json());
    } catch (error) {
      if (accessSummary) accessSummary.textContent = 'Sistem utama belum aktif. Jalankan server.js untuk sinkronisasi lintas perangkat.';
    }
  }

  async function recordCurrentAccess() {
    try {
      await fetch('/api/accesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screen: `${window.screen.width}x${window.screen.height}`
        })
      });
      loadAccesses();
    } catch (error) {
      // Halaman tetap dapat digunakan saat dibuka sebagai file lokal.
    }
  }

  if (refreshAccessesBtn) refreshAccessesBtn.addEventListener('click', loadAccesses);
  loadAccesses();
  recordCurrentAccess();

  // 1. SISTEM NOTIFIKASI TOAST
  window.showToast = function(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    if (type === 'success') toast.style.borderLeftColor = '#10b981';
    if (type === 'warning') toast.style.borderLeftColor = '#f59e0b';
    if (type === 'info') toast.style.borderLeftColor = '#38bdf8';

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // 2. NAVIGASI HALAMAN & MODAL BUKU
  const readerModalOverlay = document.getElementById('reader-modal-overlay');
  const readerModalTitle = document.getElementById('reader-modal-title');
  const readerModalMeta = document.getElementById('reader-modal-meta');
  const readerModalBody = document.getElementById('reader-modal-body');
  const sidebar = document.querySelector('.sidebar');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

  function closeMobileMenu() {
    if (!sidebar || !mobileMenuToggle) return;
    sidebar.classList.remove('mobile-open');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
    mobileMenuToggle.setAttribute('aria-label', 'Buka menu dashboard');
  }

  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('mobile-open');
      mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
      mobileMenuToggle.setAttribute('aria-label', isOpen ? 'Tutup menu dashboard' : 'Buka menu dashboard');
    });

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'mobile-menu-close';
    closeButton.setAttribute('aria-label', 'Tutup menu dashboard');
    closeButton.textContent = '×';
    sidebar.appendChild(closeButton);
    closeButton.addEventListener('click', closeMobileMenu);
  }

  function switchPage(targetPageId) {
    const pages = document.querySelectorAll('.page-view');
    pages.forEach(page => page.classList.remove('active'));

    const targetPage = document.getElementById(targetPageId);
    if (targetPage) {
      targetPage.classList.add('active');
    }
  }

  // Fungsi Membuka Modal Pembaca Buku
  function openReader(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const titleCell = row.querySelector('.chapter-title-cell');
    const title = titleCell ? titleCell.textContent : 'Judul Bab';
    const status = row.getAttribute('data-status') || 'Dipublikasi';
    const content = storyDatabase[rowId] || '<p style="color: #8c6d46; font-style: italic; text-align: center; margin-top: 2rem;">(Belum ada naskah cerita yang ditulis pada lembaran bab ini.)</p>';

    // Hitung Kata Naskah
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const textOnly = tempDiv.innerText.trim();
    const wordCount = textOnly ? textOnly.split(/\s+/).length : 0;

    if (readerModalTitle) readerModalTitle.textContent = title;
    if (readerModalMeta) readerModalMeta.textContent = `Status: ${status} • ${wordCount} Kata`;
    if (readerModalBody) readerModalBody.innerHTML = content;

    if (readerModalOverlay) readerModalOverlay.classList.add('active');
  }

  function closeReader() {
    if (readerModalOverlay) readerModalOverlay.classList.remove('active');
  }

  function deleteChapter(row) {
    if (!row) return;

    const titleCell = row.querySelector('.chapter-title-cell');
    const title = titleCell ? titleCell.textContent.trim() : 'bab ini';
    if (!confirm(`Hapus "${title}" dari daftar novel? Tindakan ini tidak dapat dibatalkan.`)) return;

    delete storyDatabase[row.id];
    deletedChapterIds.add(row.id);
    localStorage.setItem('novel_deleted_chapters', JSON.stringify([...deletedChapterIds]));
    row.remove();
    showToast(`"${title}" berhasil dihapus`, 'success');
  }

  function editChapter(row) {
    if (!row || !standaloneTitleInput || !storyEditor || !standaloneStatusSelect) return;

    const titleCell = row.querySelector('.chapter-title-cell');
    standaloneTitleInput.value = titleCell ? titleCell.textContent.trim() : '';
    standaloneStatusSelect.value = row.getAttribute('data-status') || 'Draft';
    storyEditor.innerHTML = storyDatabase[row.id] || '';
    standaloneForm.dataset.editingRowId = row.id;
    updateStats();

    const writeTab = document.querySelector('[data-target="page-buat-bab"]');
    if (writeTab) writeTab.click();
    standaloneTitleInput.focus();
    showToast('Bab siap diedit', 'info');
  }

  // 3. MENAMBAHKAN BARIS BAB KE DASHBOARD
  function addChapterToTable(title, status, content = '') {
    const tableBody = document.getElementById('chapter-table-body');
    if (!tableBody) return null;

    let badgeClass = 'badge-secondary';
    if (status === 'Dipublikasi') badgeClass = 'badge-success';
    if (status === 'Dijadwalkan') badgeClass = 'badge-warning';

    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const rowId = 'row-' + Date.now();

    // Simpan naskah ke database memori
    if (content) {
      storyDatabase[rowId] = content;
    }

    const newRow = document.createElement('tr');
    newRow.setAttribute('data-status', status);
    newRow.id = rowId;
    newRow.innerHTML = `
      <td class="font-medium chapter-title-cell" data-label="Judul Bab">${title}</td>
      <td data-label="Status"><span class="badge ${badgeClass}">${status}</span></td>
      <td data-label="Tanggal Rilis">${status === 'Dipublikasi' ? todayStr : (status === 'Dijadwalkan' ? 'Besok' : '-')}</td>
      <td data-label="Pembaca">-</td>
      <td data-label="Aksi">
        <button class="btn-action read-btn" style="margin-right: 0.3rem;">📖 Baca Buku</button>
        <button class="btn-action edit-btn" style="margin-right: 0.3rem;">✏️ Edit</button>
        <button class="btn-action delete-btn" aria-label="Hapus bab">🗑️ Hapus</button>
      </td>
    `;

    tableBody.insertBefore(newRow, tableBody.firstChild);
    return rowId;
  }

  // 4. EDITOR LEMBAR BUKU (TOOLBAR, STATS & DRAF OTOMATIS)
  const storyEditor = document.getElementById('story-editor');
  const wordCountSpan = document.getElementById('word-count');
  const charCountSpan = document.getElementById('char-count');
  const autosaveStatus = document.getElementById('autosave-status');
  const standaloneTitleInput = document.getElementById('standalone-title');
  const standaloneStatusSelect = document.getElementById('standalone-status');
  const clearDraftBtn = document.getElementById('clear-draft-btn');

  // Format Teks Toolbar
  const toolbarButtons = document.querySelectorAll('.editor-toolbar .btn-action');
  toolbarButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const command = btn.getAttribute('data-command');
      const val = btn.getAttribute('data-val') || null;
      document.execCommand(command, false, val);
      if (storyEditor) storyEditor.focus();
      updateStats();
    });
  });

  // Hitung Kata dan Karakter
  function updateStats() {
    if (!storyEditor) return;
    const text = storyEditor.innerText || '';
    const chars = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

    if (wordCountSpan) wordCountSpan.textContent = words;
    if (charCountSpan) charCountSpan.textContent = chars;
  }

  // Penyimpanan Draf Sementara
  let autosaveTimer = null;
  function saveDraftLocal() {
    if (!storyEditor || !standaloneTitleInput) return;
    const draftData = {
      title: standaloneTitleInput.value,
      status: standaloneStatusSelect.value,
      content: storyEditor.innerHTML
    };
    localStorage.setItem('novel_chapter_draft', JSON.stringify(draftData));
    if (autosaveStatus) autosaveStatus.textContent = 'Naskah tersimpan otomatis';
  }

  function loadDraftLocal() {
    const saved = localStorage.getItem('novel_chapter_draft');
    if (saved && storyEditor && standaloneTitleInput) {
      try {
        const draftData = JSON.parse(saved);
        standaloneTitleInput.value = draftData.title || '';
        standaloneStatusSelect.value = draftData.status || 'Draft';
        storyEditor.innerHTML = draftData.content || '';
        updateStats();
      } catch (err) {
        console.error('Gagal memuat draf', err);
      }
    }
  }

  if (storyEditor) {
    storyEditor.addEventListener('input', () => {
      updateStats();
      if (autosaveStatus) autosaveStatus.textContent = 'Menyimpan lembaran...';
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(saveDraftLocal, 1000);
    });
  }

  if (standaloneTitleInput) {
    standaloneTitleInput.addEventListener('input', () => {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(saveDraftLocal, 1000);
    });
  }

  if (clearDraftBtn) {
    clearDraftBtn.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin menghapus lembaran naskah cerita ini?')) {
        localStorage.removeItem('novel_chapter_draft');
        if (standaloneTitleInput) standaloneTitleInput.value = '';
        if (storyEditor) storyEditor.innerHTML = '';
        updateStats();
        showToast('Naskah telah dibersihkan', 'info');
      }
    });
  }

  loadDraftLocal();

  // 5. EVENT DELEGATION GLOBAL
  document.addEventListener('click', (e) => {

    // Navigasi Sidebar Menu
    const menuItem = e.target.closest('.menu-item');
    if (menuItem) {
      e.preventDefault();
      document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
      menuItem.classList.add('active');

      const targetPageId = menuItem.getAttribute('data-target');
      if (targetPageId) switchPage(targetPageId);
      closeMobileMenu();
      return;
    }

    // Tombol "+ Tulis Bab di Buku" dari Dashboard
    if (e.target.closest('#open-write-page-btn')) {
      const writeTab = document.querySelector('[data-target="page-buat-bab"]');
      if (writeTab) writeTab.click();
      return;
    }

    // Tombol BACA BUKU di Dashboard
    const readBtn = e.target.closest('.read-btn');
    if (readBtn) {
      const row = readBtn.closest('tr');
      if (row) openReader(row.id);
      return;
    }

    // Modal Close
    if (e.target.closest('#close-reader-modal-btn') || e.target.closest('#close-reader-btn') || e.target === readerModalOverlay) {
      closeReader();
      return;
    }

    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      editChapter(editBtn.closest('tr'));
      return;
    }

    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      deleteChapter(deleteBtn.closest('tr'));
      return;
    }
  });

  // 6. FILTER TAB DASHBOARD
  const filterButtons = document.querySelectorAll('.filter-btn');
  const tableBody = document.getElementById('chapter-table-body');

  deletedChapterIds.forEach(rowId => document.getElementById(rowId)?.remove());

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');
      if (!tableBody) return;
      const rows = tableBody.querySelectorAll('tr');

      rows.forEach(row => {
        if (filterValue === 'all' || row.getAttribute('data-status') === filterValue) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });

  // 7. TERBITKAN BAB DARI LEMBAR BUKU KE DASHBOARD
  const standaloneForm = document.getElementById('standalone-chapter-form');
  if (standaloneForm) {
    standaloneForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = standaloneTitleInput.value.trim();
      const status = standaloneStatusSelect.value;
      const contentHTML = storyEditor.innerHTML;

      if (!storyEditor.innerText.trim()) {
        showToast('Isi cerita di lembaran buku tidak boleh kosong!', 'warning');
        return;
      }

      const editingRowId = standaloneForm.dataset.editingRowId;
      let newRowId = editingRowId;

      if (editingRowId) {
        const row = document.getElementById(editingRowId);
        const titleCell = row ? row.querySelector('.chapter-title-cell') : null;
        const statusBadge = row ? row.querySelector('.badge') : null;
        if (row && titleCell && statusBadge) {
          titleCell.textContent = title;
          row.setAttribute('data-status', status);
          statusBadge.textContent = status;
          statusBadge.className = `badge ${status === 'Dipublikasi' ? 'badge-success' : status === 'Dijadwalkan' ? 'badge-warning' : 'badge-secondary'}`;
          storyDatabase[editingRowId] = contentHTML;
        }
        showToast(`Bab "${title}" berhasil diperbarui!`, 'success');
      } else {
        newRowId = addChapterToTable(title, status, contentHTML);
        showToast(`Bab "${title}" berhasil diterbitkan ke Dashboard!`, 'success');
      }

      // Bersihkan Editor
      localStorage.removeItem('novel_chapter_draft');
      standaloneForm.reset();
      delete standaloneForm.dataset.editingRowId;
      storyEditor.innerHTML = '';
      updateStats();

      // Pindah ke Dashboard & Tampilkan Modal Buku Digital
      const dashboardTab = document.querySelector('[data-target="page-dashboard"]');
      if (dashboardTab) dashboardTab.click();
      
      if (newRowId) {
        openReader(newRowId);
      }
    });
  }

  const settingsForm = document.getElementById('settings-form');
  const profileNameInput = document.getElementById('profile-name');
  if (settingsForm && profileNameInput) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = profileNameInput.value.trim();
      if (!name) {
        showToast('Nama penulis tidak boleh kosong', 'warning');
        profileNameInput.focus();
        return;
      }
      document.querySelectorAll('.user-name').forEach(element => {
        element.textContent = name;
      });
      localStorage.setItem('novel_profile_name', name);
      showToast('Pengaturan berhasil disimpan', 'success');
    });

    const savedProfileName = localStorage.getItem('novel_profile_name');
    if (savedProfileName) {
      profileNameInput.value = savedProfileName;
      document.querySelectorAll('.user-name').forEach(element => {
        element.textContent = savedProfileName;
      });
    }
  }

  const searchInput = document.getElementById('chapter-search');
  if (searchInput && tableBody) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      tableBody.querySelectorAll('tr').forEach(row => {
        const title = row.querySelector('.chapter-title-cell')?.textContent.toLowerCase() || '';
        row.style.display = title.includes(query) ? '' : 'none';
      });
    });
  }

});