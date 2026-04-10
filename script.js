/* ===========================================
   AS센터 — script.js
   =========================================== */

// ──────────────────────────────────────────
//  상수 & 데이터
// ──────────────────────────────────────────
const ADMIN_ID = 'admin';
const ADMIN_PW = '1234';

const STATUS_LABELS = ['신청완료', '입고완료', 'AS대기중', 'AS완료후발송대기중', '발송완료'];
const STATUS_ICONS  = ['📥', '📥', '🔧', '📦', '🚚'];
const STATUS_BADGE_CLASS = ['badge-0', 'badge-1', 'badge-2', 'badge-3', 'badge-4'];

// ── 기본 모델 목록 (관리자가 언제든 수정 가능) ──
const DEFAULT_MODELS = [
  // 정수기
  '직수형 정수기',
  '냉온수 정수기',
  '얼음 정수기',
  '냉정수기 (냉수전용)',
  // 제빙기
  '가정용 제빙기',
  '업소용 제빙기 (소형)',
  '업소용 제빙기 (대형)',
  // 에어컨
  '벽걸이 에어컨',
  '스탠드 에어컨',
  '천장형 에어컨',
  '이동식 에어컨',
];

const SAMPLE_ORDERS = [
  { id: 1, name: '김철수', model: '직수형 정수기',       phone: '1234', courier: 'CJ대한통운', tracking: '123456789012', status: 4, regDate: '2026-04-01', memo: '누수 발생' },
  { id: 2, name: '이영희', model: '얼음 정수기',          phone: '5678', courier: '로젠택배',   tracking: '234567890123', status: 3, regDate: '2026-04-03', memo: '얼음 배출 불량' },
  { id: 3, name: '박민수', model: '업소용 제빙기 (소형)', phone: '9012', courier: '한진택배',   tracking: '345678901234', status: 2, regDate: '2026-04-05', memo: '제빙 불량' },
  { id: 4, name: '최지연', model: '벽걸이 에어컨',        phone: '3456', courier: '우체국택배', tracking: '456789012345', status: 1, regDate: '2026-04-07', memo: '냉방 불량' },
  { id: 5, name: '정우성', model: '스탠드 에어컨',        phone: '7890', courier: 'CJ대한통운', tracking: '567890123456', status: 2, regDate: '2026-04-08', memo: '실내기 소음' },
];

// ──────────────────────────────────────────
//  localStorage 헬퍼
// ──────────────────────────────────────────
function getOrders() {
  const raw = localStorage.getItem('asOrders');
  if (!raw) {
    // 첫 방문 시 샘플 데이터 삽입
    saveOrders(SAMPLE_ORDERS);
    return SAMPLE_ORDERS;
  }
  return JSON.parse(raw);
}

function saveOrders(orders) {
  localStorage.setItem('asOrders', JSON.stringify(orders));
}

// ──────────────────────────────────────────
//  모델 목록 localStorage 헬퍼
// ──────────────────────────────────────────
function getModels() {
  const raw = localStorage.getItem('asModels');
  if (!raw) {
    saveModels(DEFAULT_MODELS);
    return DEFAULT_MODELS.slice();
  }
  return JSON.parse(raw);
}

function saveModels(models) {
  localStorage.setItem('asModels', JSON.stringify(models));
}

// 모든 모델 선택 박스를 최신 목록으로 채우기
function populateModelSelects() {
  const models = getModels();
  const selectIds = ['applyModel', 'inqModel', 'addModel'];
  selectIds.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const prev = sel.value; // 기존 선택값 유지
    sel.innerHTML = '<option value="">모델명을 선택해 주세요</option>';
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    });
    if (prev) sel.value = prev; // 가능하면 이전 선택값 복원
  });
}

function isAdminLoggedIn() {
  return sessionStorage.getItem('adminLoggedIn') === 'true';
}

function setAdminLogin(val) {
  if (val) sessionStorage.setItem('adminLoggedIn', 'true');
  else sessionStorage.removeItem('adminLoggedIn');
}

function nextId() {
  const orders = getOrders();
  return orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ──────────────────────────────────────────
//  페이지 라우팅
// ──────────────────────────────────────────
let currentPage = 'home';

function navigateTo(pageId) {
  // 관리자 페이지 보호
  if (pageId === 'admin' && !isAdminLoggedIn()) {
    pageId = 'login';
  }
  // 이미 로그인된 상태면 login → admin 으로
  if (pageId === 'login' && isAdminLoggedIn()) {
    pageId = 'admin';
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (!target) return;
  target.classList.add('active');
  currentPage = pageId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 네비 active 표시 갱신
  updateNavActive(pageId);

  // 페이지별 초기화
  if (pageId === 'home')    initHomePage();
  if (pageId === 'admin')   initAdminPage();
  if (pageId === 'inquiry') resetInquiry();

  // 관리자 nav 버튼 텍스트
  updateAdminNavLabel();
}

function updateNavActive(pageId) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  // home / apply / inquiry / login or admin
  const targetPage = (pageId === 'admin') ? 'login' : pageId;
  document.querySelectorAll(`.nav-btn[data-page="${targetPage}"]`).forEach(btn => {
    btn.classList.add('active');
  });
  if (pageId === 'admin') {
    document.querySelectorAll('.nav-btn.nav-admin').forEach(btn => btn.classList.add('active'));
  }
}

function updateAdminNavLabel() {
  const btns = document.querySelectorAll('#adminNavBtn, #adminNavMobile');
  if (isAdminLoggedIn()) {
    btns.forEach(b => { b.textContent = '⚙ 관리자'; });
  } else {
    btns.forEach(b => { b.textContent = '관리자'; });
  }
}

// ──────────────────────────────────────────
//  홈 페이지 — 통계 & 예상 기간
// ──────────────────────────────────────────
function initHomePage() {
  const orders = getOrders();
  const total    = orders.length;
  const pending  = orders.filter(o => o.status === 0 || o.status === 1).length;
  const progress = orders.filter(o => o.status === 2).length;
  const done     = orders.filter(o => o.status === 3).length;

  setText('statTotal',    total);
  setText('statPending',  pending);
  setText('statProgress', progress);
  setText('statDone',     done);

  // 예상 기간: 대기 건수 × 1.5일 + 최소 3일
  const days = pending === 0 ? 3 : Math.max(3, Math.ceil(pending * 1.5));
  setText('estimateDays', `약 ${days}일`);
}

// ──────────────────────────────────────────
//  AS 신청 폼
// ──────────────────────────────────────────
function initApplyForm() {
  const form = document.getElementById('applyForm');
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const name     = val('applyName').trim();
    const phone    = val('applyPhone').trim();
    const model    = val('applyModel').trim();
    const memo     = val('applyMemo').trim();

    if (!name || !phone || !model) {
      showMsg('applyMsg', '모든 필수 항목을 입력해 주세요.', 'error');
      return;
    }
if (!/^\d{9,11}$/.test(phone.replace(/\D/g, ''))) {
  showMsg('applyMsg', '휴대폰번호를 정확히 입력해 주세요.', 'error');
  return;
}

    hideMsg('applyMsg');

     
const pending = getPending();
pending.push({
  id: Date.now(),
  name,
  phone,
  model,
  memo,
  reqDate: todayStr()
});
savePending(pending);

    // 성공 화면
    document.getElementById('applyFormCard').style.display = 'none';
    const successEl = document.getElementById('applySuccess');
    const infoEl    = document.getElementById('applySuccessInfo');
infoEl.innerHTML = `
  <strong>이름:</strong> ${escHtml(name)}<br>
  <strong>모델명:</strong> ${escHtml(model)}<br>
  <strong>휴대폰번호:</strong> ${escHtml(phone)}<br>
  <strong>신청일:</strong> ${todayStr()}
`;
    successEl.style.display = 'block';
  });

  document.getElementById('applyAgainBtn').addEventListener('click', function() {
    document.getElementById('applyFormCard').style.display = '';
    document.getElementById('applySuccess').style.display = 'none';
    document.getElementById('applyForm').reset();
    hideMsg('applyMsg');
  });
}

// ──────────────────────────────────────────
//  배송 조회 (스텝 트래커)
// ──────────────────────────────────────────
function initInquiryForm() {
  const form = document.getElementById('inquiryForm');
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const name  = val('inqName').trim();
    const model = val('inqModel').trim();
    const phone = val('inqPhone').trim();

    if (!name || !model || !phone) {
      showMsg('inqMsg', '모든 항목을 입력해 주세요.', 'error');
      return;
    }
    if (!/^\d{4}$/.test(phone)) {
      showMsg('inqMsg', '휴대폰번호 뒤 4자리를 숫자 4개로 입력해 주세요.', 'error');
      return;
    }

    hideMsg('inqMsg');

    const orders = getOrders();
    // 이름 + 모델명 + 전화번호 매칭 (대소문자 무시, 공백 무시)
const found = orders.find(o =>
  normalize(o.name) === normalize(name) &&
  normalize(o.model) === normalize(model) &&
  String(o.phone).replace(/\D/g, '').endsWith(phone)
);

    if (!found) {
      showMsg('inqMsg', '입력하신 정보와 일치하는 접수 내역을 찾을 수 없습니다.\n이름, 모델명, 전화번호를 다시 확인해 주세요.', 'error');
      document.getElementById('inquiryResult').style.display = 'none';
      return;
    }

    renderResult(found);
  });
}

function resetInquiry() {
  document.getElementById('inquiryResult').style.display = 'none';
  hideMsg('inqMsg');
}

function renderResult(order) {
  // 제목
  const titleEl = document.getElementById('resultTitle');
  if (titleEl) titleEl.textContent = `${escHtml(order.name)} · ${escHtml(order.model)}`;

  // 배지
  const badge = document.getElementById('resultBadge');
  badge.textContent = STATUS_LABELS[order.status];
  badge.className = 'result-badge ' + STATUS_BADGE_CLASS[order.status];

  // 트래커
  document.getElementById('trackerWrap').innerHTML = buildTracker(order.status);

  // 상세 정보
  const shippingInfo = order.status === 4 ? `
  <div class="detail-item">
    <div class="detail-label">택배사</div>
    <div class="detail-val">${escHtml(order.courier)}</div>
  </div>
  <div class="detail-item">
    <div class="detail-label">송장번호</div>
    <div class="detail-val">${escHtml(order.tracking)}</div>
  </div>
` : '';
  document.getElementById('resultDetails').innerHTML = `
    <div class="detail-item">
      <div class="detail-label">이름</div>
      <div class="detail-val">${escHtml(order.name)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">모델명</div>
      <div class="detail-val">${escHtml(order.model)}</div>
    </div>
${shippingInfo}
    <div class="detail-item">
      <div class="detail-label">접수일</div>
      <div class="detail-val">${escHtml(order.regDate)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">현재 상태</div>
      <div class="detail-val"><span class="s-badge s${order.status}">${STATUS_LABELS[order.status]}</span></div>
    </div>
    ${order.memo ? `
    <div class="detail-item" style="grid-column:1/-1">
      <div class="detail-label">메모 / 증상</div>
      <div class="detail-val">${escHtml(order.memo)}</div>
    </div>` : ''}
  `;

  document.getElementById('inquiryResult').style.display = 'block';
  document.getElementById('inquiryResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildTracker(status) {
  let html = '<div class="tracker">';
  STATUS_LABELS.forEach((label, i) => {
    const isDone   = i < status;
    const isActive = i === status;
    const iconCls  = isDone ? 't-done' : (isActive ? 't-active' : '');
    const lblCls   = isDone ? 't-done' : (isActive ? 't-active' : '');
    const labelHtml = label === 'AS완료후발송대기중'
      ? 'AS완료후<br>발송대기중'
      : label;

    html += `
      <div class="tracker-step">
        <div class="tracker-icon ${iconCls}">${STATUS_ICONS[i]}</div>
        <div class="tracker-label ${lblCls}">${labelHtml}</div>
      </div>
    `;
    if (i < STATUS_LABELS.length - 1) {
      html += `<div class="tracker-connector ${isDone ? 't-done' : ''}"></div>`;
    }
  });
  html += '</div>';
  return html;
}

// ──────────────────────────────────────────
//  관리자 로그인
// ──────────────────────────────────────────
function initLoginForm() {
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = val('loginId').trim();
    const pw = val('loginPw').trim();

    if (id === ADMIN_ID && pw === ADMIN_PW) {
      setAdminLogin(true);
      updateAdminNavLabel();
      hideMsg('loginMsg');
      navigateTo('admin');
    } else {
      showMsg('loginMsg', '아이디 또는 비밀번호가 올바르지 않습니다.', 'error');
    }
  });
}

// ──────────────────────────────────────────
//  관리자 대시보드
// ──────────────────────────────────────────
let editingId = null;  // 현재 수정 중인 ID (미사용, 향후 확장용)

function initAdminPage() {
  renderAdminStats();
  renderPendingRequests();
  renderOrderTable();
  initModelManager();
}

// ──────────────────────────────────────────
//  모델명 관리 (관리자)
// ──────────────────────────────────────────
function initModelManager() {
  renderModelList();
  renderModelPreview();

  // 목록 편집 토글
  const toggleBtn = document.getElementById('toggleModelManager');
  const body      = document.getElementById('modelManagerBody');
  const preview   = document.getElementById('modelPreview');
  if (toggleBtn) {
    // 중복 리스너 방지 — 플래그 사용
    if (toggleBtn.dataset.bound) return;
    toggleBtn.dataset.bound = '1';

    toggleBtn.addEventListener('click', () => {
      const isOpen = body.style.display !== 'none';
      body.style.display    = isOpen ? 'none' : 'block';
      preview.style.display = isOpen ? ''     : 'none';
      toggleBtn.textContent = isOpen ? '목록 편집' : '✕ 닫기';
    });
  }

  // 모델 추가 버튼
  const addBtn   = document.getElementById('addModelBtn');
  const inputEl  = document.getElementById('newModelInput');
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = '1';
    addBtn.addEventListener('click', () => addModel());
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addModel(); } });
  }
}

function addModel() {
  const inputEl = document.getElementById('newModelInput');
  const name = inputEl.value.trim();

  if (!name) {
    showMsg('modelAddMsg', '모델명을 입력해 주세요.', 'error');
    return;
  }
  const models = getModels();
  if (models.some(m => m === name)) {
    showMsg('modelAddMsg', '이미 등록된 모델명입니다.', 'error');
    return;
  }
  hideMsg('modelAddMsg');
  models.push(name);
  saveModels(models);
  inputEl.value = '';
  renderModelList();
  renderModelPreview();
  populateModelSelects();
  updateModelCountBadge();
}

function deleteModel(name) {
  if (!confirm(`"${name}" 모델을 삭제하시겠습니까?`)) return;
  const models = getModels().filter(m => m !== name);
  saveModels(models);
  renderModelList();
  renderModelPreview();
  populateModelSelects();
  updateModelCountBadge();
}

function renderModelList() {
  const listEl = document.getElementById('modelList');
  if (!listEl) return;
  const models = getModels();
  if (models.length === 0) {
    listEl.innerHTML = '';
    return;
  }
  listEl.innerHTML = models.map(m => `
    <div class="model-tag">
      <span>${escHtml(m)}</span>
      <button class="model-tag-del" data-model="${escHtml(m)}" title="삭제">×</button>
    </div>
  `).join('');

  listEl.querySelectorAll('.model-tag-del').forEach(btn => {
    btn.addEventListener('click', () => deleteModel(btn.dataset.model));
  });
  updateModelCountBadge();
}

function renderModelPreview() {
  const previewEl = document.getElementById('modelPreviewList');
  if (!previewEl) return;
  const models = getModels();
  const MAX_SHOW = 6;
  const shown   = models.slice(0, MAX_SHOW);
  const extra   = models.length - MAX_SHOW;

  previewEl.innerHTML =
    shown.map(m => `<span class="model-preview-chip">${escHtml(m)}</span>`).join('') +
    (extra > 0 ? `<span class="model-preview-more">+${extra}개</span>` : '');
}

function updateModelCountBadge() {
  const badge = document.getElementById('modelCountBadge');
  if (badge) badge.textContent = getModels().length + '개';
}

function renderAdminStats() {
  const orders = getOrders();
  const pending = getPending();

  setText('adminStatPending', pending.length);
  setText('adminStatTotal', orders.length);
  setText('adminStatIn', orders.filter(o => o.status === 1).length);
  setText('adminStatWait', orders.filter(o => o.status === 2).length);
  setText('adminStatReady', orders.filter(o => o.status === 3).length);
  setText('adminStatDone', orders.filter(o => o.status === 4).length);
}

function renderOrderTable(filterStatus = 'all', filterText = '') {
  const orders = getOrders();
  const tbody   = document.getElementById('orderTableBody');
  const noMsg   = document.getElementById('noOrderMsg');

  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === 'all' || String(o.status) === filterStatus;
    const matchText   = !filterText ||
      o.name.includes(filterText) ||
      o.model.toLowerCase().includes(filterText.toLowerCase());
    return matchStatus && matchText;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    noMsg.style.display = 'block';
    return;
  }
  noMsg.style.display = 'none';

  // 최신 접수 순 정렬
  const sorted = [...filtered].sort((a, b) => b.id - a.id);

  tbody.innerHTML = sorted.map(o => `
    <tr>
      <td style="color:var(--gray-400);font-size:12px">#${o.id}</td>
      <td><strong>${escHtml(o.name)}</strong></td>
      <td>${escHtml(o.model)}</td>
      <td>****${escHtml(o.phone)}</td>
      <td>${escHtml(o.courier)}</td>
      <td style="font-size:12px;color:var(--gray-500)">${escHtml(o.tracking)}</td>
      <td style="font-size:12px;white-space:nowrap">${escHtml(o.regDate)}</td>
      <td>
        <select data-id="${o.id}" class="status-select">
          ${STATUS_LABELS.map((lbl, idx) =>
            `<option value="${idx}" ${o.status === idx ? 'selected' : ''}>${lbl}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${o.id}">삭제</button>
      </td>
    </tr>
  `).join('');

  // 상태 변경 이벤트
  tbody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', function() {
      updateOrderStatus(Number(this.dataset.id), Number(this.value));
    });
  });

  // 삭제 이벤트
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (confirm('정말 삭제하시겠습니까?')) {
        deleteOrder(Number(this.dataset.id));
      }
    });
  });
}

function updateOrderStatus(id, newStatus) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return;

  if (newStatus === 4) {
    const courier = prompt('택배사를 입력하세요.');
    if (courier === null) return;

    const tracking = prompt('송장번호를 입력하세요.');
    if (tracking === null) return;

    orders[idx].courier = courier.trim();
    orders[idx].tracking = tracking.trim();
  }

  orders[idx].status = newStatus;
  saveOrders(orders);
  renderAdminStats();

  const filterStatus = document.getElementById('filterStatus')?.value || 'all';
  const filterText = document.getElementById('filterSearch')?.value || '';
  renderOrderTable(filterStatus, filterText);
}
  // 홈 통계도 갱신 (백그라운드)
}

function deleteOrder(id) {
  const orders = getOrders().filter(o => o.id !== id);
  saveOrders(orders);
  renderAdminStats();
  const filterStatus = document.getElementById('filterStatus')?.value || 'all';
  const filterText   = document.getElementById('filterSearch')?.value || '';
  renderOrderTable(filterStatus, filterText);
}

// ──────────────────────────────────────────
//  관리자 신규 주문 등록
// ──────────────────────────────────────────
function initAdminAddForm() {
  const toggleBtn  = document.getElementById('toggleAddForm');
  const formWrap   = document.getElementById('addOrderForm');
  const cancelBtn  = document.getElementById('cancelAddForm');
  const form       = document.getElementById('adminAddForm');

  toggleBtn.addEventListener('click', () => {
    const isOpen = formWrap.style.display !== 'none';
    formWrap.style.display = isOpen ? 'none' : 'block';
    toggleBtn.textContent  = isOpen ? '+ 등록하기' : '✕ 닫기';
  });

  cancelBtn.addEventListener('click', () => {
    formWrap.style.display = 'none';
    toggleBtn.textContent = '+ 등록하기';
    form.reset();
    hideMsg('addFormMsg');
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const name     = val('addName').trim();
    const phone    = val('addPhone').trim();
    const model    = val('addModel').trim();
    const courier  = val('addCourier').trim();
    const tracking = val('addTracking').trim();
    const status   = Number(val('addStatus'));
    const memo     = val('addMemo').trim();

    if (!name || !phone || !model || !courier || !tracking) {
      showMsg('addFormMsg', '필수 항목을 모두 입력해 주세요.', 'error');
      return;
    }
if (!/^\d{9,11}$/.test(phone.replace(/\D/g, ''))) {
  showMsg('addFormMsg', '휴대폰번호를 정확히 입력해 주세요.', 'error');
  return;
}

    const orders = getOrders();
    orders.push({ id: nextId(), name, model, phone, courier, tracking, status, regDate: todayStr(), memo });
    saveOrders(orders);

    showMsg('addFormMsg', '✅ 주문이 등록되었습니다.', 'success');
    form.reset();
    renderAdminStats();
    renderOrderTable(
      document.getElementById('filterStatus').value,
      document.getElementById('filterSearch').value
    );

    setTimeout(() => {
      formWrap.style.display = 'none';
      toggleBtn.textContent = '+ 등록하기';
      hideMsg('addFormMsg');
    }, 1500);
  });
}

// ──────────────────────────────────────────
//  유틸
// ──────────────────────────────────────────
function val(id) {
  return document.getElementById(id)?.value ?? '';
}
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'form-msg ' + (type || 'error');
  el.style.display = 'block';
}
function hideMsg(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function normalize(str) {
  return str.replace(/\s/g, '').toLowerCase();
}

// ──────────────────────────────────────────
//  전역 클릭 — data-page 네비게이션
// ──────────────────────────────────────────
document.addEventListener('click', function(e) {
  const target = e.target.closest('[data-page]');
  if (!target) return;
  e.preventDefault();
  const page = target.dataset.page;

  // 모바일 메뉴 닫기
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');

  navigateTo(page);
});

// ──────────────────────────────────────────
//  햄버거 메뉴
// ──────────────────────────────────────────
document.getElementById('hamburger').addEventListener('click', function() {
  this.classList.toggle('open');
  document.getElementById('mobileMenu').classList.toggle('open');
});

// ──────────────────────────────────────────
//  로그아웃
// ──────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', function() {
  setAdminLogin(false);
  updateAdminNavLabel();
  navigateTo('home');
});

// ──────────────────────────────────────────
//  테이블 필터 이벤트
// ──────────────────────────────────────────
document.getElementById('filterStatus').addEventListener('change', function() {
  renderOrderTable(this.value, document.getElementById('filterSearch').value);
});
document.getElementById('filterSearch').addEventListener('input', function() {
  renderOrderTable(document.getElementById('filterStatus').value, this.value);
});

// ──────────────────────────────────────────
//  히어로 이미지 캐러셀
// ──────────────────────────────────────────
function initCarousel() {
  const carousel = document.getElementById('heroCarousel');
  if (!carousel) return;

  const slides    = carousel.querySelectorAll('.carousel-slide');
  const dots      = carousel.querySelectorAll('.c-dot');
  const progressBar = document.getElementById('carouselProgress');
  const DURATION  = 4000; // 슬라이드 전환 간격 (ms)
  let current     = 0;
  let timer       = null;
  let progressTimer = null;
  let progressVal = 0;

  // 슬라이드 이동
  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    resetProgress();
  }

  function next() { goTo(current + 1); }

  // 진행 바 애니메이션
  function resetProgress() {
    clearInterval(progressTimer);
    progressVal = 0;
    if (progressBar) progressBar.style.width = '0%';
    progressTimer = setInterval(() => {
      progressVal += 100 / (DURATION / 80);
      if (progressVal >= 100) progressVal = 100;
      if (progressBar) progressBar.style.width = progressVal + '%';
    }, 80);
  }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(next, DURATION);
    resetProgress();
  }

  function stopAuto() {
    clearInterval(timer);
    clearInterval(progressTimer);
    if (progressBar) progressBar.style.width = '0%';
  }

  // 도트 클릭
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      stopAuto();
      goTo(i);
      startAuto();
    });
  });

  // 마우스 오버 시 일시정지
  carousel.addEventListener('mouseenter', stopAuto);
  carousel.addEventListener('mouseleave', startAuto);

  // 터치 스와이프
  let touchStartX = 0;
  carousel.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      stopAuto();
      goTo(diff > 0 ? current + 1 : current - 1);
      startAuto();
    }
  }, { passive: true });

  // 시작
  startAuto();
}

// ──────────────────────────────────────────
//  초기화
// ──────────────────────────────────────────
(function init() {
  // 모델 선택박스 먼저 채우기
  populateModelSelects();

  // 폼 이벤트 등록
  initApplyForm();
  initInquiryForm();
  initLoginForm();
  initAdminAddForm();

  // 초기 페이지
  initHomePage();
  updateAdminNavLabel();

  // 캐러셀 시작
  initCarousel();
})();

function getPending() {
  return JSON.parse(localStorage.getItem('asPending') || '[]');
}
function savePending(data) {
  localStorage.setItem('asPending', JSON.stringify(data));
}
function renderPendingRequests() {
  const list = getPending();
  const listEl = document.getElementById('pendingList');
  const noEl = document.getElementById('noPendingMsg');
  const badge = document.getElementById('pendingCountBadge');

  if (badge) badge.textContent = `${list.length}건`;
  if (!listEl) return;

  if (list.length === 0) {
    listEl.innerHTML = '';
    if (noEl) noEl.style.display = 'block';
    return;
  }

  if (noEl) noEl.style.display = 'none';

  listEl.innerHTML = list.map(item => `
    <div class="pending-card">
      <div class="pending-info">
        <strong>${escHtml(item.name)}</strong> / ${escHtml(item.model)} / ${escHtml(item.phone)}
        ${item.memo ? `<div class="pending-memo">${escHtml(item.memo)}</div>` : ''}
      </div>
      <button class="btn btn-sm btn-primary pending-accept-btn" data-id="${item.id}">수락</button>
    </div>
  `).join('');

  listEl.querySelectorAll('.pending-accept-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      acceptPendingRequest(Number(this.dataset.id));
    });
  });
}

function acceptPendingRequest(id) {
  const pending = getPending();
  const target = pending.find(item => item.id === id);
  if (!target) return;

  savePending(pending.filter(item => item.id !== id));

  const orders = getOrders();
  orders.push({
    id: nextId(),
    name: target.name,
    model: target.model,
    phone: target.phone,
    courier: '',
    tracking: '',
    status: 0,
    regDate: todayStr(),
    memo: target.memo || ''
  });
  saveOrders(orders);

  renderAdminStats();
  renderPendingRequests();
  renderOrderTable(
    document.getElementById('filterStatus')?.value || 'all',
    document.getElementById('filterSearch')?.value || ''
  );
}
