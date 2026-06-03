import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBx3Ir9vlcr9H8X8cfUinIB-RogsL9-OKU",
  authDomain: "guidekhonkaen.firebaseapp.com",
  databaseURL: "https://guidekhonkaen.firebaseio.com",
  projectId: "guidekhonkaen",
  storageBucket: "guidekhonkaen.firebasestorage.app",
  messagingSenderId: "827592654626",
  appId: "1:827592654626:web:5f1e9858dbc04e636daf7b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const displayRoot = document.getElementById('display-root');
const adminRoot = document.getElementById('admin-root');
const adminTrigger = document.getElementById('admin-trigger');
const btnBackDisplay = document.getElementById('btn-back-display');

let isManualMode = false;

// --- Init ---
checkMode();

function checkMode() {
    // เช็คว่าหน้าเว็บปัจจุบันมี login-modal หรือไม่ (ถ้ามีแสดงว่าเป็นหน้า admin.html)
    const isStandaloneAdmin = document.getElementById('login-modal') !== null;
    
    if(isStandaloneAdmin || window.location.hash === '#admin') {
        openAdmin();
    } else {
        openDisplay();
    }
}

if(adminTrigger) {
    adminTrigger.addEventListener('dblclick', () => {
        window.location.hash = 'admin';
        location.reload();
    });
}
if(btnBackDisplay) {
    btnBackDisplay.addEventListener('click', () => {
        window.location.hash = ''; 
        location.reload();
    });
}

// --- Display Mode ---
function openDisplay() {
    // ใส่ if ป้องกัน Error ในกรณีที่เปิดบนหน้า admin.html แล้วหา id นี้ไม่เจอ
    if(displayRoot) displayRoot.style.display = 'flex';
    if(adminRoot) adminRoot.style.display = 'none';

    updateClock();
    setInterval(updateClock, 1000);

    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        updateText('shop-name-text', data.shopName);
        updateText('marquee-text', data.marquee);

        const speed = data.marqueeSpeed || 40;
        const marqueeEl = document.getElementById('marquee-text');
        if (marqueeEl) marqueeEl.style.animationDuration = `${speed}s`;

        isManualMode = data.manualMode === true;
        const modeIndicator = document.getElementById('mode-indicator');
        const updateInfo = document.getElementById('last-update');
        
        if (isManualMode) {
            updateText('gold-buy', data.manualBuy || "-");
            updateText('gold-sell', data.manualSell || "-");
            if(modeIndicator) modeIndicator.style.display = 'block';
            if(updateInfo) updateInfo.textContent = "ราคาปรับโดยทางร้าน (Manual)";
        } else {
            if(modeIndicator) modeIndicator.style.display = 'none';
            fetchGoldAPI(); 
        }
    });

    setInterval(() => {
        if(!isManualMode) fetchGoldAPI();
    }, 600000); // อัปเดตทุก 10 นาที
}

// --- Admin Mode ---
function openAdmin() {
    // ใส่ if ป้องกัน Error ในกรณีที่เปิดบนหน้า admin.html แล้วหา id นี้ไม่เจอ
    if(displayRoot) displayRoot.style.display = 'none';

    const loginModal = document.getElementById('login-modal');
    const controlPanel = document.getElementById('admin-root');
    const passInput = document.getElementById('password-input');
    const btnLogin = document.getElementById('btn-login');
    const loginError = document.getElementById('login-error');
    
    if(controlPanel) controlPanel.style.display = 'none';
    
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        if (loginModal) loginModal.style.display = 'none';
        if (controlPanel) {
            controlPanel.style.display = 'block';
            initAdminControls();
        }
    }

    const handleLogin = () => {
        if(!passInput) return;
        const password = passInput.value.trim();
        if (password === '987654321') {
            sessionStorage.setItem('isLoggedIn', 'true');
            if (loginModal) loginModal.style.display = 'none';
            if (controlPanel) {
                controlPanel.style.display = 'block';
                initAdminControls();
            }
        } else {
            if (loginError) loginError.style.display = 'block';
        }
    };

    if (btnLogin) btnLogin.addEventListener('click', handleLogin);
    
    if (passInput) {
        passInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('isLoggedIn');
            location.reload();
        });
    }
}

function initAdminControls() {
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        if(document.activeElement.tagName !== 'INPUT') {
            setVal('shop-name-input', data.shopName);
            setVal('marquee-input', data.marquee);
            setVal('manual-buy-input', data.manualBuy);
            setVal('manual-sell-input', data.manualSell);
            
            const currentSpeed = data.marqueeSpeed || 40;
            const speedInput = document.getElementById('marquee-speed-input') || document.getElementById('speed-input');
            if (speedInput) speedInput.value = currentSpeed;
            
            updateText('speed-value-display', currentSpeed);
            updateText('speed-display', currentSpeed);

            const isMan = data.manualMode === true;
            const manualCheck = document.getElementById('manual-mode-check');
            if (manualCheck) manualCheck.checked = isMan;
            
            toggleManualInputs(isMan);
        }
    });

    const speedInput = document.getElementById('marquee-speed-input') || document.getElementById('speed-input');
    if (speedInput && !speedInput.hasAttribute('data-bound')) {
        speedInput.addEventListener('input', (e) => {
            updateText('speed-value-display', e.target.value);
            updateText('speed-display', e.target.value);
        });
        speedInput.setAttribute('data-bound', 'true');
    }

    const manualCheck = document.getElementById('manual-mode-check');
    if (manualCheck && !manualCheck.hasAttribute('data-bound')) {
        manualCheck.addEventListener('change', (e) => toggleManualInputs(e.target.checked));
        manualCheck.setAttribute('data-bound', 'true');
    }

    const ctrlForm = document.getElementById('control-form');
    if (ctrlForm && !ctrlForm.hasAttribute('data-bound')) {
        ctrlForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const sInput = document.getElementById('marquee-speed-input') || document.getElementById('speed-input');
            const mSpeed = sInput ? sInput.value : 40;
            const mCheck = document.getElementById('manual-mode-check');
            
            set(ref(db, 'signage/status'), {
                shopName: getVal('shop-name-input'),
                marquee: getVal('marquee-input'),
                marqueeSpeed: mSpeed,
                manualMode: mCheck ? mCheck.checked : false,
                manualBuy: getVal('manual-buy-input'),
                manualSell: getVal('manual-sell-input'),
                timestamp: Date.now()
            }).then(() => alert('✅ บันทึกเรียบร้อย!'));
        });
        ctrlForm.setAttribute('data-bound', 'true');
    }
}

function toggleManualInputs(isManual) {
    const box = document.getElementById('manual-controls') || document.getElementById('manual-inputs');
    if (box) {
        box.style.opacity = isManual ? '1' : '0.5';
        box.style.pointerEvents = isManual ? 'auto' : 'none';
    }
}

function updateText(id, text) { 
    const el = document.getElementById(id); 
    if(el && text !== undefined) el.textContent = text; 
}

function getVal(id) { 
    const el = document.getElementById(id);
    return el ? el.value : ''; 
}

function setVal(id, val) { 
    const el = document.getElementById(id);
    if(el) el.value = val || ''; 
}

function updateClock() {
    const now = new Date();
    updateText('clock-time', now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    updateText('clock-date', now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
}

function parsePrice(val) {
    if (!val) return 0;
    const num = parseFloat(val.toString().replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

// API ใหม่ของฮั่วเซ่งเฮง
async function fetchGoldAPI() {
    try {
        const response = await fetch('https://apicheckpricev3.huasengheng.com/api/Values/GetPrice?v=' + Date.now());
        const data = await response.json();
        
        if (data && data.length > 0) {
            const goldData = data[0];
            updateText('gold-buy', parsePrice(goldData.Buy).toLocaleString());
            updateText('gold-sell', parsePrice(goldData.Sell).toLocaleString());
            
            const updateStr = goldData.StrTimeUpdate || goldData.TimeUpdate || "-";
            updateText('last-update', updateStr);
        }
    } catch (err) { 
        console.error("API Error", err);
        updateText('last-update', 'เชื่อมต่อระบบเช็คราคาไม่ได้ (แสดงข้อมูลล่าสุดที่มี)');
    }
}
