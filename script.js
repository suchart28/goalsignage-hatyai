import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

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

// --- Display ---
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

        const speed = data.marqueeSpeed || 20;
        document.getElementById('marquee-text').style.animationDuration = `${speed}s`;

        const videoFrame = document.getElementById('video-frame');
        const vidId = getYoutubeID(data.videoUrl);
        if (vidId) {
            const embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=0&loop=1&playlist=${vidId}&controls=0&rel=0&modestbranding=1&showinfo=0`;
            if (videoFrame.src !== embedUrl) videoFrame.src = embedUrl;
        }

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
    }, 600000);
}

// --- Admin ---
function openAdmin() {
    displayRoot.style.display = 'none';
    adminRoot.style.display = 'block';

    const loginModal = document.getElementById('login-modal');
    const controlPanel = document.getElementById('control-panel');
    
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        loginModal.style.display = 'none';
        controlPanel.style.display = 'block';
        initAdminControls();
    }

    document.getElementById('btn-login').addEventListener('click', () => {
        if (document.getElementById('password-input').value === '987654321') {
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
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        if(document.activeElement.tagName !== 'INPUT') {
            setVal('shop-name-input', data.shopName);
            setVal('marquee-input', data.marquee);
            setVal('video-input', data.videoUrl);
            setVal('manual-buy-input', data.manualBuy);
            setVal('manual-sell-input', data.manualSell);
            
            const currentSpeed = data.marqueeSpeed || 20;
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

function getYoutubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function parsePrice(val) {
    if (!val) return 0;
    const num = parseFloat(val.toString().replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

async function fetchGoldAPI() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest?v=' + Date.now());
        const data = await response.json();
        
        if (data && data.response && data.response.price && data.response.price.gold_bar) {
            const p = data.response.price.gold_bar;
            const r = data.response;
            updateText('gold-buy', parsePrice(p.buy).toLocaleString());
            updateText('gold-sell', parsePrice(p.sell).toLocaleString());
            
            const dateStr = r.update_date || r.date || "-";
            const timeStr = r.update_time || r.time || "-";
            updateText('last-update', `ราคาอัปเดตล่าสุด: ${dateStr} ${timeStr}`);
        }
    } catch (err) { 
        console.error("API Error", err);
        updateText('last-update', 'เชื่อมต่อสมาคมฯ ไม่ได้ (แสดงข้อมูลล่าสุดที่มี)');
    }
}
