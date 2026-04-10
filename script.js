import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB6YnIk-nodPtaaNQLs9tvOn2Zk1jdSu_8",
  authDomain: "wateras-710bf.firebaseapp.com",
  projectId: "wateras-710bf",
  storageBucket: "wateras-710bf.firebasestorage.app",
  messagingSenderId: "906227350650",
  appId: "1:906227350650:web:bc091ad94124e44ee28fc3",
  measurementId: "G-XN45XFGQBH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===========================================
   AS센터 — script.js (Firebase version)
   =========================================== */

const STATUS_LABELS = ['신청완료', '입고완료', 'AS대기중', 'AS완료후발송대기중', '발송완료'];
const STATUS_ICONS = ['✅', '📥', '🔧', '📦', '🚚'];
const STATUS_BADGE_CLASS = ['badge-0', 'badge-1', 'badge-2', 'badge-3', 'badge-4'];

const DEFAULT_MODELS = [
  '직수형 정수기',
  '냉온수 정수기',
  '얼음 정수기',
  '냉정수기 (냉수전용)',
  '가정용 제빙기',
  '업소용 제빙기 (소형)',
  '업소용 제빙기 (대형)',
  '벽걸이 에어컨',
  '스탠드 에어컨',
  '천장형 에어컨',
  '이동식 에어컨',
];

let currentPage = 'home';

/* ===========================================
   공통 유틸
   =========================================== */
function val(id) {
  return document.getElementById(id)?.value ?? '';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showMsg(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'form-msg ' + type;
  el.style.display = 'block';
}

function hideMsg(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalize(str) {
  return String(str ?? '').replace(/\s/g, '').toLowerCase();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatPhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

function isAdminLoggedIn() {
  return sessionStorage.getItem('adminLoggedIn') === 'true';
}

/* ===========================================
   Firebase DB helpers
   =========================================== */
async function getOrders() {
  const snap = await getDocs(collection(db, 'orders'));
  const items = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  items.sort((a, b) => (b.orderNo || 0) - (a.orderNo || 0));
  return items;
}

async function getPending() {
  const snap = await getDocs(collection(db, 'pending_requests'));
  const items = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return items;
}

async function addOrder(data) {
  await addDoc(collection(db, 'orders'), data);
}

async function updateOrder(docId, data) {
  await updateDoc(doc(db, 'orders', docId), data);
}

async function removeOrder(docId) {
  await deleteDoc(doc(db, 'orders', docId));
}

async function addPending(data) {
  await addDoc(collection(db, 'pending_requests'), data);
}

async function removePending(docId) {
  await deleteDoc(doc(db, 'pending_requests', docId));
}

async function nextOrderNo() {
  const orders = await getOrders();
  return orders.length ? Math.max(...orders.map(o => Number(o.orderNo || 0))) + 1 : 1;
}

/* ===========================================
   Models (브라우저 로컬 유지)
   =========================================== */
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

function populateModelSelects() {
  const models = getModels();
  const selectIds = ['applyModel', 'inqModel', 'addModel'];

  selectIds.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">모델명을 선택해 주세요</option>';
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    });
    if (prev) sel.value = prev;
  });
}

/* ===========================================
   라우팅
   =========================================== */
function updateNavActive(pageId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
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
  btns.forEach(b => {
    b.textContent = isAdminLoggedIn() ? '⚙ 관리자' : '관리자';
  });
}

function navigateTo(pageId) {
  if (pageId === 'admin' && !isAdminLoggedIn()) pageId = 'login';
  if (pageId === 'login' && isAdminLoggedIn()) pageId = 'admin';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (!target) return;

  target.classList.add('active');
  currentPage = pageId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateNavActive(pageId);
  updateAdminNavLabel();

  if (pageId === 'home') initHomePage();
  if (pageId === 'admin') initAdminPage();
  if (pageId === 'inquiry') resetInquiry();
}

/* ===========================================
   홈
   =========================================== */
async function initHomePage() {
  const orders = await getOrders();
  const total = orders.length;
  const pending = orders.filter(o => o.status === 0 || o.status === 1).length;
  const progress = orders.filter(o => o.status === 2 || o.status === 3).length;
  const done = orders.filter(o => o.status === 4).length;

  setText('statTotal', total);
  setText('statPending', pending);
  setText('statProgress', progress);
  setText('statDone', done);

  const days = pending === 0 ? 3 : Math.max(3, Math.ceil(pending * 1.5));
  setText('estimateDays', `약 ${days}일`);
}

/* ===========================================
   AS 신청
   =========================================== */
function initApplyForm() {
  const form = document.getElementById('applyForm');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = val('applyName').trim();
    const phone = val('applyPhone').trim();
    const model = val('applyModel').trim();
    const memo = val('applyMemo').trim();

    if (!name || !phone || !model) {
      showMsg('applyMsg', '모든 필수 항목을 입력해 주세요.', 'error');
      return;
    }

    if (!/^\d{9,11}$/.test(phone.replace(/\D/g, ''))) {
      showMsg('applyMsg', '휴대폰번호를 정확히 입력해 주세요.', 'error');
      return;
    }

    hideMsg('applyMsg');

    try {
      await addPending({
        name,
        phone: phone.replace(/\D/g, ''),
        model,
        memo,
        reqDate: todayStr(),
        createdAt: Date.now()
      });

      document.getElementById('applyFormCard').style.display = 'none';
      const infoEl = document.getElementById('applySuccessInfo');
      infoEl.innerHTML = `
        <strong>이름:</strong> ${escHtml(name)}<br>
        <strong>모델명:</strong> ${escHtml(model)}<br>
        <strong>휴대폰번호:</strong> ${escHtml(formatPhone(phone))}<br>
        <strong>신청일:</strong> ${todayStr()}
      `;
      document.getElementById('applySuccess').style.display = 'block';
    } catch (err) {
      console.error(err);
      showMsg('applyMsg', '신청 저장 중 오류가 발생했습니다.', 'error');
    }
  });

  const againBtn = document.getElementById('applyAgainBtn');
  if (againBtn && !againBtn.dataset.bound) {
    againBtn.dataset.bound = '1';
    againBtn.addEventListener('click', function() {
      document.getElementById('applyFormCard').style.display = '';
      document.getElementById('applySuccess').style.display = 'none';
      document.getElementById('applyForm').reset();
      hideMsg('applyMsg');
    });
  }
}

/* ===========================================
   배송 조회
   =========================================== */
function resetInquiry() {
  document.getElementById('inquiryResult').style.display = 'none';
  hideMsg('inqMsg');
}

function buildTracker(status) {
  let html = '<div class="tracker">';
  STATUS_LABELS.forEach((label, i) => {
    const isDone = i < status;
    const isActive = i === status;
    const cls = isDone ? 't-done' : (isActive ? 't-active' : '');
    const labelHtml = label === 'AS완료후발송대기중' ? 'AS완료후<br>발송대기중' : label;

    html += `
      <div class="tracker-step">
        <div class="tracker-icon ${cls}">${STATUS_ICONS[i]}</div>
        <div class="tracker-label ${cls}">${labelHtml}</div>
      </div>
    `;
    if (i < STATUS_LABELS.length - 1) {
      html += `<div class="tracker-connector ${isDone ? 't-done' : ''}"></div>`;
    }
  });
  html += '</div>';
  return html;
}

function renderResult(order) {
  const titleEl = document.getElementById('resultTitle');
  if (titleEl) titleEl.textContent = `${escHtml(order.name)} · ${escHtml(order.model)}`;

  const badge = document.getElementById('resultBadge');
  badge.textContent = STATUS_LABELS[order.status];
  badge.className = 'result-badge ' + STATUS_BADGE_CLASS[order.status];

  document.getElementById('trackerWrap').innerHTML = buildTracker(order.status);

  const shippingInfo = order.status === 4 ? `
    <div class="detail-item">
      <div class="detail-label">택배사</div>
      <div class="detail-val">${escHtml(order.courier || '')}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">송장번호</div>
      <div class="detail-val">${escHtml(order.tracking || '')}</div>
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

function initInquiryForm() {
  const form = document.getElementById('inquiryForm');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = val('inqName').trim();
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

    try {
      const orders = await getOrders();
      const found = orders.find(o =>
        normalize(o.name) === normalize(name) &&
        normalize(o.model) === normalize(model) &&
        String(o.phone || '').replace(/\D/g, '').endsWith(phone)
      );

      if (!found) {
        showMsg('inqMsg', '입력하신 정보와 일치하는 접수 내역을 찾을 수 없습니다.', 'error');
        document.getElementById('inquiryResult').style.display = 'none';
        return;
      }

      renderResult(found);
    } catch (err) {
      console.error(err);
      showMsg('inqMsg', '조회 중 오류가 발생했습니다.', 'error');
    }
  });
}

/* ===========================================
   관리자 로그인
   =========================================== */
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = val('loginId').trim();
    const password = val('loginPw').trim();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      hideMsg('loginMsg');
      navigateTo('admin');
    } catch (err) {
      console.error(err);
      showMsg('loginMsg', '로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해 주세요.', 'error');
    }
  });
}

/* ===========================================
   관리자 대시보드
   =========================================== */
async function renderAdminStats() {
  const orders = await getOrders();
  const pending = await getPending();

  setText('adminStatPending', pending.length);
  setText('adminStatTotal', orders.length);
  setText('adminStatIn', orders.filter(o => o.status === 1).length);
  setText('adminStatWait', orders.filter(o => o.status === 2).length);
  setText('adminStatReady', orders.filter(o => o.status === 3).length);
  setText('adminStatDone', orders.filter(o => o.status === 4).length);
}

async function renderPendingRequests() {
  const list = await getPending();
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
        <strong>${escHtml(item.name)}</strong> / ${escHtml(item.model)} / ${escHtml(formatPhone(item.phone))}${item.memo ? `<div class="pending-memo">${escHtml(item.memo)}</div>` : ''}
      </div>
      <button class="btn btn-sm btn-primary pending-accept-btn" data-id="${item.docId}">수락</button>
    </div>
  `).join('');

  listEl.querySelectorAll('.pending-accept-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      await acceptPendingRequest(this.dataset.id);
    });
  });
}

async function acceptPendingRequest(docId) {
  const pendingList = await getPending();
  const target = pendingList.find(item => item.docId === docId);
  if (!target) return;

  await addOrder({
    orderNo: await nextOrderNo(),
    name: target.name,
    model: target.model,
    phone: target.phone,
    courier: '',
    tracking: '',
    status: 0,
    regDate: todayStr(),
    memo: target.memo || '',
    createdAt: Date.now()
  });

  await removePending(docId);
  await renderAdminStats();
  await renderPendingRequests();
  await renderOrderTable(
    document.getElementById('filterStatus')?.value || 'all',
    document.getElementById('filterSearch')?.value || ''
  );
}

async function renderOrderTable(filterStatus = 'all', filterText = '') {
  const orders = await getOrders();
  const tbody = document.getElementById('orderTableBody');
  const noMsg = document.getElementById('noOrderMsg');

  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === 'all' || String(o.status) === filterStatus;
    const matchText = !filterText ||
      String(o.name || '').includes(filterText) ||
      String(o.model || '').toLowerCase().includes(filterText.toLowerCase());
    return matchStatus && matchText;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    noMsg.style.display = 'block';
    return;
  }

  noMsg.style.display = 'none';

  tbody.innerHTML = filtered.map(o => `
    <tr>
      <td style="color:var(--gray-400);font-size:12px">#${escHtml(o.orderNo || '')}</td>
      <td><strong>${escHtml(o.name)}</strong></td>
      <td>${escHtml(o.model)}</td>
      <td>${escHtml(formatPhone(o.phone))}</td>
      <td>${escHtml(o.courier || '')}</td>
      <td style="font-size:12px;color:var(--gray-500)">${escHtml(o.tracking || '')}</td>
      <td style="font-size:12px;white-space:nowrap">${escHtml(o.regDate)}</td>
      <td>
        <select data-id="${o.docId}" class="status-select">
          ${STATUS_LABELS.map((lbl, idx) =>
            `<option value="${idx}" ${o.status === idx ? 'selected' : ''}>${lbl}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${o.docId}">삭제</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async function() {
      await updateOrderStatus(this.dataset.id, Number(this.value));
    });
  });

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!confirm('정말 삭제하시겠습니까?')) return;
      await deleteOrder(this.dataset.id);
    });
  });
}

async function updateOrderStatus(docId, newStatus) {
  const payload = { status: newStatus };

  if (newStatus === 4) {
    const courier = prompt('택배사를 입력하세요.');
    if (courier === null) return;

    const tracking = prompt('송장번호를 입력하세요.');
    if (tracking === null) return;

    payload.courier = courier.trim();
    payload.tracking = tracking.trim();
  }

  await updateOrder(docId, payload);
  await renderAdminStats();

  const filterStatus = document.getElementById('filterStatus')?.value || 'all';
  const filterText = document.getElementById('filterSearch')?.value || '';
  await renderOrderTable(filterStatus, filterText);
}

async function deleteOrder(docId) {
  await removeOrder(docId);
  await renderAdminStats();

  const filterStatus = document.getElementById('filterStatus')?.value || 'all';
  const filterText = document.getElementById('filterSearch')?.value || '';
  await renderOrderTable(filterStatus, filterText);
}

async function initAdminPage() {
  await renderAdminStats();
  await renderPendingRequests();
  await renderOrderTable();
  initModelManager();
}

/* ===========================================
   관리자 신규 주문 등록
   =========================================== */
function initAdminAddForm() {
  const toggleBtn = document.getElementById('toggleAddForm');
  const formWrap = document.getElementById('addOrderForm');
  const cancelBtn = document.getElementById('cancelAddForm');
  const form = document.getElementById('adminAddForm');

  if (toggleBtn && !toggleBtn.dataset.bound) {
    toggleBtn.dataset.bound = '1';
    toggleBtn.addEventListener('click', () => {
      const isOpen = formWrap.style.display !== 'none';
      formWrap.style.display = isOpen ? 'none' : 'block';
      toggleBtn.textContent = isOpen ? '+ 등록하기' : '✕ 닫기';
    });
  }

  if (cancelBtn && !cancelBtn.dataset.bound) {
    cancelBtn.dataset.bound = '1';
    cancelBtn.addEventListener('click', () => {
      formWrap.style.display = 'none';
      toggleBtn.textContent = '+ 등록하기';
      form.reset();
      hideMsg('addFormMsg');
    });
  }

  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = val('addName').trim();
    const phone = val('addPhone').trim();
    const model = val('addModel').trim();
    const courier = val('addCourier').trim();
    const tracking = val('addTracking').trim();
    const status = Number(val('addStatus'));
    const memo = val('addMemo').trim();

    if (!name || !phone || !model) {
      showMsg('addFormMsg', '이름, 휴대폰번호, 모델명은 필수 항목입니다.', 'error');
      return;
    }

    if (!/^\d{9,11}$/.test(phone.replace(/\D/g, ''))) {
      showMsg('addFormMsg', '휴대폰번호를 정확히 입력해 주세요.', 'error');
      return;
    }

    if (status === 4 && (!courier || !tracking)) {
      showMsg('addFormMsg', '발송완료 상태로 등록하려면 택배사와 송장번호를 입력해 주세요.', 'error');
      return;
    }

    try {
      await addOrder({
        orderNo: await nextOrderNo(),
        name,
        model,
        phone: phone.replace(/\D/g, ''),
        courier: status === 4 ? courier : '',
        tracking: status === 4 ? tracking : '',
        status,
        regDate: todayStr(),
        memo,
        createdAt: Date.now()
      });

      showMsg('addFormMsg', '✅ 주문이 등록되었습니다.', 'success');
      form.reset();
      await renderAdminStats();
      await renderOrderTable(
        document.getElementById('filterStatus')?.value || 'all',
        document.getElementById('filterSearch')?.value || ''
      );

      setTimeout(() => {
        formWrap.style.display = 'none';
        toggleBtn.textContent = '+ 등록하기';
        hideMsg('addFormMsg');
      }, 1200);
    } catch (err) {
      console.error(err);
      showMsg('addFormMsg', '주문 등록 중 오류가 발생했습니다.', 'error');
    }
  });
}

/* ===========================================
   모델 관리
   =========================================== */
function initModelManager() {
  renderModelList();
  renderModelPreview();

  const toggleBtn = document.getElementById('toggleModelManager');
  const body = document.getElementById('modelManagerBody');
  const preview = document.getElementById('modelPreview');

  if (toggleBtn && !toggleBtn.dataset.bound) {
    toggleBtn.dataset.bound = '1';
    toggleBtn.addEventListener('click', () => {
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      preview.style.display = isOpen ? '' : 'none';
      toggleBtn.textContent = isOpen ? '목록 편집' : '✕ 닫기';
    });
  }

  const addBtn = document.getElementById('addModelBtn');
  const inputEl = document.getElementById('newModelInput');

  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = '1';
    addBtn.addEventListener('click', () => addModel());
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addModel();
      }
    });
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
  const shown = models.slice(0, 6);
  const extra = models.length - 6;

  previewEl.innerHTML =
    shown.map(m => `<span class="model-preview-chip">${escHtml(m)}</span>`).join('') +
    (extra > 0 ? `<span class="model-preview-more">+${extra}개</span>` : '');
}

function updateModelCountBadge() {
  const badge = document.getElementById('modelCountBadge');
  if (badge) badge.textContent = `${getModels().length}개`;
}

/* ===========================================
   공통 이벤트
   =========================================== */
document.addEventListener('click', function(e) {
  const target = e.target.closest('[data-page]');
  if (!target) return;
  e.preventDefault();

  const page = target.dataset.page;
  document.getElementById('mobileMenu')?.classList.remove('open');
  document.getElementById('hamburger')?.classList.remove('open');

  navigateTo(page);
});

document.getElementById('hamburger')?.addEventListener('click', function() {
  this.classList.toggle('open');
  document.getElementById('mobileMenu')?.classList.toggle('open');
});

document.getElementById('logoutBtn')?.addEventListener('click', async function() {
  await signOut(auth);
  navigateTo('home');
});

document.getElementById('filterStatus')?.addEventListener('change', async function() {
  await renderOrderTable(this.value, document.getElementById('filterSearch').value);
});

document.getElementById('filterSearch')?.addEventListener('input', async function() {
  await renderOrderTable(document.getElementById('filterStatus').value, this.value);
});

/* ===========================================
   캐러셀
   =========================================== */
function initCarousel() {
  const carousel = document.getElementById('heroCarousel');
  if (!carousel) return;

  const slides = carousel.querySelectorAll('.carousel-slide');
  const dots = carousel.querySelectorAll('.c-dot');
  const progressBar = document.getElementById('carouselProgress');
  const DURATION = 4000;
  let current = 0;
  let timer = null;
  let progressTimer = null;
  let progressVal = 0;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    resetProgress();
  }

  function next() {
    goTo(current + 1);
  }

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

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      stopAuto();
      goTo(i);
      startAuto();
    });
  });

  carousel.addEventListener('mouseenter', stopAuto);
  carousel.addEventListener('mouseleave', startAuto);

  let touchStartX = 0;
  carousel.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  carousel.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      stopAuto();
      goTo(diff > 0 ? current + 1 : current - 1);
      startAuto();
    }
  }, { passive: true });

  startAuto();
}

/* ===========================================
   초기화
   =========================================== */
(function init() {
  populateModelSelects();
  initApplyForm();
  initInquiryForm();
  initLoginForm();
  initAdminAddForm();
  initHomePage();
  updateAdminNavLabel();
  initCarousel();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      sessionStorage.setItem('adminLoggedIn', 'true');
    } else {
      sessionStorage.removeItem('adminLoggedIn');
    }
    updateAdminNavLabel();
    if (currentPage === 'admin' && !user) {
      navigateTo('home');
    }
  });
})();
