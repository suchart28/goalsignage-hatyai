import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// --- Config Firebase (ใช้ค่าเดิมของคุณ) ---
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

// --- Elements ---
const displayRoot = document.getElementById('display-root');
const adminRoot = document.getElementById('admin-root');
const adminTrigger = document.getElementById('admin-trigger');
const btnBackDisplay = document.getElementById('btn-back-display');

// Global Vars
let isManualMode = false;

// ==========================================
// 🚀 เริ่มต้นระบบ
// ==========================================

// 1. ตรวจสอบว่าเปิดโหมดไหน (URL Hash) หรือ Default
checkMode();

function checkMode() {
    if(window.location.hash === '#admin') {
        openAdmin();
    } else {
        openDisplay();
    }
}

// 2. Event Listeners สำหรับเปลี่ยนโหมด
if(adminTrigger) {
    // คลิกมุมขวาล่าง 3 ครั้ง หรือ กดค้าง (สำหรับ Touch) เพื่อเข้า Admin
    adminTrigger.addEventListener('dblclick', () => {
        window.location.hash = 'admin';
        location.reload();
    });
}
if(btnBackDisplay) {
    btnBackDisplay.addEventListener('click', () => {
        window.location.hash = ''; // เคลียร์ hash
        location.reload();
    });
}

// ==========================================
// 📺 DISPLAY LOGIC
// ==========================================
function openDisplay() {
    displayRoot.style.display = 'flex';
    adminRoot.style.display = 'none';

    // เริ่มนาฬิกา
    updateClock();
    setInterval(updateClock, 1000);

    // ดึงข้อมูล Firebase
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // 1. Text Info
        updateText('shop-name-text', data.shopName);
        updateText('marquee-text', data.marquee);

        // 2. Video
        const videoFrame = document.getElementById('video-frame');
        const vidId = getYoutubeID(data.videoUrl);
        if (vidId) {
            const embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=0&loop=1&playlist=${vidId}&controls=0&rel=0`;
            if (videoFrame.src !== embedUrl) videoFrame.src = embedUrl;
        }

        // 3. Price Logic (Manual vs Auto)
        isManualMode = data.manualMode === true;
        const modeIndicator = document.getElementById('mode-indicator');
        
        if (isManualMode) {
            // Manual Mode
            updateText('gold-buy', data.manualBuy || "-");
            updateText('gold-sell', data.manualSell || "-");
            if(modeIndicator) modeIndicator.style.display = 'block';
        } else {
            // Auto Mode
            if(modeIndicator) modeIndicator.style.display = 'none';
            fetchGoldAPI(); // เรียก API ทันที
        }
    });

    // ตั้งเวลาเรียก API ทุก 10 นาที (ถ้า Auto อยู่)
    setInterval(() => {
        if(!isManualMode) fetchGoldAPI();
    }, 600000);
}

// ==========================================
// ⚙️ ADMIN LOGIC
// ==========================================
function openAdmin() {
    displayRoot.style.display = 'none';
    adminRoot.style.display = 'block';

    const loginModal = document.getElementById('login-modal');
    const controlPanel = document.getElementById('control-panel');
    const btnLogin = document.getElementById('btn-login');
    
    // Check Session
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        loginModal.style.display = 'none';
        controlPanel.style.display = 'block';
        initAdminControls();
    }

    btnLogin.addEventListener('click', () => {
        const pwd = document.getElementById('password-input').value;
        if (pwd === '987654321') {
            sessionStorage.setItem('isLoggedIn', 'true');
            loginModal.style.display = 'none';
            controlPanel.style.display = 'block';
            initAdminControls();
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.removeItem('isLoggedIn');
        location.reload();
    });
}

function initAdminControls() {
    // 1. Load Data to Inputs
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Fill inputs only if not currently focused (to prevent overwriting while typing)
        if(document.activeElement.tagName !== 'INPUT') {
            setVal('shop-name-input', data.shopName);
            setVal('marquee-input', data.marquee);
            setVal('video-input', data.videoUrl);
            setVal('manual-buy-input', data.manualBuy);
            setVal('manual-sell-input', data.manualSell);
            document.getElementById('manual-mode-check').checked = (data.manualMode === true);
            toggleManualInputs(data.manualMode === true);
        }
    });

    // 2. Checkbox Logic
    const manualCheck = document.getElementById('manual-mode-check');
    manualCheck.addEventListener('change', (e) => {
        toggleManualInputs(e.target.checked);
    });

    // 3. Save Data
    document.getElementById('control-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        set(ref(db, 'signage/status'), {
            shopName: getVal('shop-name-input'),
            marquee: getVal('marquee-input'),
            videoUrl: getVal('video-input'),
            manualMode: manualCheck.checked,
            manualBuy: getVal('manual-buy-input'),
            manualSell: getVal('manual-sell-input'),
            timestamp: Date.now()
        }).then(() => alert('✅ บันทึกเรียบร้อย!'));
    });
}

function toggleManualInputs(isManual) {
    const box = document.getElementById('manual-controls');
    if(isManual) {
        box.style.opacity = '1';
        box.style.pointerEvents = 'auto';
    } else {
        box.style.opacity = '0.5';
        box.style.pointerEvents = 'none';
    }
}

// ==========================================
// 🛠 Helpers
// ==========================================
function updateText(id, text) {
    const el = document.getElementById(id);
    if(el && text) el.textContent = text;
}
function getVal(id) { return document.getElementById(id).value; }
function setVal(id, val) { if(document.getElementById(id)) document.getElementById(id).value = val || ''; }

function updateClock() {
    const now = new Date();
    updateText('clock-time', now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    updateText('clock-date', now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
}

async function fetchGoldAPI() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        if (data?.response?.price?.gold_bar) {
            const p = data.response.price.gold_bar;
            updateText('gold-buy', Math.floor(p.buy).toLocaleString());
            updateText('gold-sell', Math.floor(p.sell).toLocaleString());
        }
    } catch (err) { console.error("API Error", err); }
}

function getYoutubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
