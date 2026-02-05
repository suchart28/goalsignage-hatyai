import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// --- 1. Config Firebase ---
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

// --- 2. ตัวแปรและ Elements ---
const displayRoot = document.getElementById('display-root');
const adminRoot = document.getElementById('admin-root');
const adminTrigger = document.getElementById('admin-trigger');
const btnBackDisplay = document.getElementById('btn-back-display');

let isManualMode = false;

// ==========================================
// 🚀 Main System Start
// ==========================================
checkMode();

function checkMode() {
    // เช็คว่า URL มี #admin หรือไม่
    if(window.location.hash === '#admin') {
        openAdmin();
    } else {
        openDisplay();
    }
}

// Event Listeners สำหรับเปลี่ยนโหมด
if(adminTrigger) {
    // ดับเบิ้ลคลิกมุมขวาล่างเพื่อเข้า Admin
    adminTrigger.addEventListener('dblclick', () => {
        window.location.hash = 'admin';
        location.reload();
    });
}
if(btnBackDisplay) {
    btnBackDisplay.addEventListener('click', () => {
        window.location.hash = ''; // ลบ hash ออก
        location.reload();
    });
}

// ==========================================
// 📺 DISPLAY LOGIC (ส่วนแสดงผล)
// ==========================================
function openDisplay() {
    displayRoot.style.display = 'flex';
    adminRoot.style.display = 'none';

    // เริ่มนาฬิกา
    updateClock();
    setInterval(updateClock, 1000);

    // เชื่อมต่อ Firebase เพื่อรับข้อมูล Realtime
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // 1. ข้อมูลทั่วไป
        updateText('shop-name-text', data.shopName);
        updateText('marquee-text', data.marquee);

        // 2. จัดการวิดีโอ YouTube
        const videoFrame = document.getElementById('video-frame');
        const vidId = getYoutubeID(data.videoUrl);
        if (vidId) {
            // สร้าง URL แบบ Autoplay + Loop
            const embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=0&loop=1&playlist=${vidId}&controls=0&rel=0`;
            if (videoFrame.src !== embedUrl) videoFrame.src = embedUrl;
        }

        // 3. จัดการราคาทอง (Auto vs Manual)
        isManualMode = data.manualMode === true;
        const modeIndicator = document.getElementById('mode-indicator');
        const updateInfo = document.getElementById('last-update');
        
        if (isManualMode) {
            // --- โหมด Manual ---
            updateText('gold-buy', data.manualBuy || "-");
            updateText('gold-sell', data.manualSell || "-");
            
            if(modeIndicator) modeIndicator.style.display = 'block';
            if(updateInfo) updateInfo.textContent = "ราคาปรับโดยทางร้าน (Manual)";
            
        } else {
            // --- โหมด Auto ---
            if(modeIndicator) modeIndicator.style.display = 'none';
            fetchGoldAPI(); // เรียก API ทันทีเมื่อเปลี่ยนมาเป็น Auto
        }
    });

    // ตั้งเวลาดึง API ทุก 10 นาที (ถ้าอยู่ในโหมด Auto)
    setInterval(() => {
        if(!isManualMode) fetchGoldAPI();
    }, 600000);
}

// ==========================================
// ⚙️ ADMIN LOGIC (ส่วนควบคุม)
// ==========================================
function openAdmin() {
    displayRoot.style.display = 'none';
    adminRoot.style.display = 'block';

    const loginModal = document.getElementById('login-modal');
    const controlPanel = document.getElementById('control-panel');
    const btnLogin = document.getElementById('btn-login');
    
    // ตรวจสอบ Session ว่าล็อกอินค้างไว้ไหม
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        loginModal.style.display = 'none';
        controlPanel.style.display = 'block';
        initAdminControls();
    }

    // ปุ่มล็อกอิน
    btnLogin.addEventListener('click', () => {
        const pwd = document.getElementById('password-input').value;
        if (pwd === '987654321') { // รหัสผ่าน
            sessionStorage.setItem('isLoggedIn', 'true');
            loginModal.style.display = 'none';
            controlPanel.style.display = 'block';
            initAdminControls();
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    });

    // ปุ่มออกจากระบบ
    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.removeItem('isLoggedIn');
        location.reload();
    });
}

function initAdminControls() {
    // โหลดข้อมูลปัจจุบันมาใส่ใน Input
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // ใส่ค่าลง Input เฉพาะตอนที่ user ไม่ได้กำลังพิมพ์อยู่
        if(document.activeElement.tagName !== 'INPUT') {
            setVal('shop-name-input', data.shopName);
            setVal('marquee-input', data.marquee);
            setVal('video-input', data.videoUrl);
            setVal('manual-buy-input', data.manualBuy);
            setVal('manual-sell-input', data.manualSell);
            
            const manualCheck = document.getElementById('manual-mode-check');
            manualCheck.checked = (data.manualMode === true);
            toggleManualInputs(data.manualMode === true);
        }
    });

    // ตรวจจับการติ๊ก Checkbox Manual
    const manualCheck = document.getElementById('manual-mode-check');
    manualCheck.addEventListener('change', (e) => {
        toggleManualInputs(e.target.checked);
    });

    // บันทึกข้อมูล
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
// 🛠 Helper Functions
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

function getYoutubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// --- 🔧 ส่วนสำคัญ: ฟังก์ชันดึงราคาทองและแก้ปัญหา NaN ---

// ฟังก์ชันแปลงค่า: ลบลูกน้ำออก แล้วแปลงเป็นตัวเลข
function parsePrice(val) {
    if (!val) return 0;
    // แปลงเป็น String -> ลบลูกน้ำ -> แปลงเป็น Float
    const num = parseFloat(val.toString().replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

async function fetchGoldAPI() {
    try {
        // เพิ่ม ?v=TimeNow เพื่อป้องกัน Caching (แก้ปัญหาข้อมูลไม่อัปเดต)
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest?v=' + Date.now());
        const data = await response.json();
        
        if (data && data.response && data.response.price && data.response.price.gold_bar) {
            const p = data.response.price.gold_bar;
            const r = data.response;
            
            // ✅ ใช้ parsePrice แก้ปัญหา NaN
            const buyPrice = parsePrice(p.buy);
            const sellPrice = parsePrice(p.sell);

            updateText('gold-buy', buyPrice.toLocaleString());
            updateText('gold-sell', sellPrice.toLocaleString());
            
            // แสดงวันที่และเวลาอัปเดตจากสมาคม
            const dateStr = r.update_date || r.date || "-";
            const timeStr = r.update_time || r.time || "-";
            updateText('last-update', `ราคาอัปเดตล่าสุด: ${dateStr} ${timeStr}`);
        }
    } catch (err) { 
        console.error("API Error", err);
        // กรณี Error ให้แจ้งเตือน
        updateText('last-update', 'ไม่สามารถเชื่อมต่อสมาคมฯ ได้ (แสดงข้อมูลล่าสุดที่มี)');
    }
}
