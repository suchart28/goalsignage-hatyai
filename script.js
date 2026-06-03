import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// ใส่ Firebase Config ของคุณ
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
    if(window.location.hash === '#admin') openAdmin();
    else openDisplay();
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
    displayRoot.style.display = 'flex';
    adminRoot.style.display = 'none';

    updateClock();
    setInterval(updateClock, 1000);

    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        updateText('shop-name-text', data.shopName);
        updateText('marquee-text', data.marquee);

        const speed = data.marqueeSpeed || 40;
        document.getElementById('marquee-text').style.animationDuration = `${speed}s`;

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
    displayRoot.style.display = 'none';
    adminRoot.style.display = 'block';

    const loginModal = document.getElementById('login-modal');
    const controlPanel = document.getElementById('control-panel');
    const passInput = document.getElementById('password-input');
    const btnLogin = document.getElementById('btn-login');
    const loginError = document.getElementById('login-error');
    
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        loginModal.style.display = 'none';
        controlPanel.style.display = 'block';
        initAdminControls();
    }

    const handleLogin = () => {
        const password = passInput.value.trim();
        if (password === '987654321') {
            sessionStorage.setItem('isLoggedIn', 'true');
            loginModal.style.display = 'none';
            controlPanel.style.display = 'block';
            initAdminControls();
        } else {
            loginError.style.display = 'block';
        }
    };

    btnLogin.addEventListener('click', handleLogin);
    
    passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.removeItem('isLoggedIn');
        location.reload();
    });
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
            document.getElementById('marquee-speed-input').value = currentSpeed;
            updateText('speed-value-display', currentSpeed);

            const isMan = data.manualMode === true;
            document.getElementById('manual-mode-check').checked = isMan;
            toggleManualInputs(isMan);
        }
    });

    const speedInput = document.getElementById('marquee-speed-input');
    speedInput.addEventListener('input', (e) => {
        updateText('speed-value-display', e.target.value);
    });

    const manualCheck = document.getElementById('manual-mode-check');
    manualCheck.addEventListener('change', (e) => toggleManualInputs(e.target.checked));

    document.getElementById('control-form').addEventListener('submit', (e) => {
        e.preventDefault();
        set(ref(db, 'signage/status'), {
            shopName: getVal('shop-name-input'),
            marquee: getVal('marquee-input'),
            marqueeSpeed: getVal('marquee-speed-input'),
            manualMode: manualCheck.checked,
            manualBuy: getVal('manual-buy-input'),
            manualSell: getVal('manual-sell-input'),
            timestamp: Date.now()
        }).then(() => alert('✅ บันทึกเรียบร้อย!'));
    });
}

function toggleManualInputs(isManual) {
    const box = document.getElementById('manual-controls');
    box.style.opacity = isManual ? '1' : '0.5';
    box.style.pointerEvents = isManual ? 'auto' : 'none';
}

function updateText(id, text) { const el = document.getElementById(id); if(el && text) el.textContent = text; }
function getVal(id) { return document.getElementById(id).value; }
function setVal(id, val) { if(document.getElementById(id)) document.getElementById(id).value = val || ''; }

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

// --- ฟังก์ชันดึงราคาจาก API ฮั่วเซ่งเฮงที่อัปเดตแล้ว ---
async function fetchGoldAPI() {
    try {
        // ดึงข้อมูลจาก API ฮั่วเซ่งเฮง
        const response = await fetch('https://apicheckpricev3.huasengheng.com/api/Values/GetPrice');
        const data = await response.json();
        
        if (!data || (Array.isArray(data) && data.length === 0)) throw new Error("No data");

        // รูปแบบข้อมูลปกติจะเป็น Array เลือกข้อมูลชุดแรก (ทอง 96.5%)
        const goldData = Array.isArray(data) ? data[0] : data;

        if (goldData && goldData.Buy && goldData.Sell) {
            updateText('gold-buy', parsePrice(goldData.Buy).toLocaleString());
            updateText('gold-sell', parsePrice(goldData.Sell).toLocaleString());
            
            // ดึงข้อความเวลาอัปเดตที่ส่งมาจาก API ถ้าไม่มีให้ใช้เวลาของเครื่อง
            let updateTimeStr = goldData.StrTimeUpdate;
            if (!updateTimeStr) {
                const now = new Date();
                updateTimeStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + 
                                now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            }

            updateText('last-update', `ราคาอัปเดตล่าสุด: ${updateTimeStr}`);
        }
    } catch (err) { 
        console.error("API Error", err);
        updateText('last-update', 'เชื่อมต่อระบบราคาไม่ได้ (แสดงข้อมูลล่าสุดที่มี)');
    }
}
