import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// Firebase Config ของคุณ
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

// ดึง Element สำคัญ
const displayRoot = document.getElementById('display-root');
const adminRoot = document.getElementById('admin-root');
const controlPanel = document.getElementById('control-panel') || document.getElementById('admin-root'); 
const loginModal = document.getElementById('login-modal');

let isManualMode = false;

// --- ระบบเช็คหน้าเว็บ (แก้ไขจุดที่ทำให้จอดำ) ---
// ถ้าหา display-root ไม่เจอแปลว่าเปิดไฟล์ admin.html แบบแยกต่างหาก
const isStandaloneAdmin = (displayRoot === null);

if (isStandaloneAdmin || window.location.hash === '#admin') {
    openAdmin();
} else {
    openDisplay();
}

// --- Event Listeners สลับหน้า ---
const adminTrigger = document.getElementById('admin-trigger');
if(adminTrigger) {
    adminTrigger.addEventListener('dblclick', () => {
        window.location.hash = 'admin';
        location.reload();
    });
}

const btnBackDisplay = document.getElementById('btn-back-display');
if(btnBackDisplay) {
    btnBackDisplay.addEventListener('click', () => {
        window.location.hash = ''; 
        location.reload();
    });
}

// --- Display Mode (หน้าจอแสดงผล) ---
function openDisplay() {
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

// --- Admin Mode (หน้าล็อกอินและตั้งค่า) ---
function openAdmin() {
    if(displayRoot) displayRoot.style.display = 'none';
    
    if(controlPanel) controlPanel.style.display = 'none'; 
    if(loginModal) loginModal.style.display = 'flex'; 

    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        if (loginModal) loginModal.style.display = 'none';
        if (controlPanel) {
            controlPanel.style.display = 'block';
            initAdminControls();
        }
    }

    const passInput = document.getElementById('password-input');
    const btnLogin = document.getElementById('btn-login');
    const loginError = document.getElementById('login-error');

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

    if (btnLogin && !btnLogin.hasAttribute('data-bound')) {
        btnLogin.addEventListener('click', handleLogin);
        btnLogin.setAttribute('data-bound', 'true');
    }
    
    if (passInput && !passInput.hasAttribute('data-bound')) {
        passInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
        passInput.setAttribute('data-bound', 'true');
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout && !btnLogout.hasAttribute('data-bound')) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('isLoggedIn');
            location.reload();
        });
        btnLogout.setAttribute('data-bound', 'true');
    }
}

// --- ฟังก์ชันควบคุมฟอร์ม ---
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
    if (speedInput && !speedInput.hasAttribute('data-bound-speed')) {
        speedInput.addEventListener('input', (e) => {
            updateText('speed-value-display', e.target.value);
            updateText('speed-display', e.target.value);
        });
        speedInput.setAttribute('data-bound-speed', 'true');
    }

    const manualCheck = document.getElementById('manual-mode-check');
    if (manualCheck && !manualCheck.hasAttribute('data-bound-check')) {
        manualCheck.addEventListener('change', (e) => toggleManualInputs(e.target.checked));
        manualCheck.setAttribute('data-bound-check', 'true');
    }

    const ctrlForm = document.getElementById('control-form');
    if (ctrlForm && !ctrlForm.hasAttribute('data-bound-form')) {
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
            }).then(() => alert('✅ บันทึกข้อมูลเรียบร้อย!'));
        });
        ctrlForm.setAttribute('data-bound-form', 'true');
    }
}

function toggleManualInputs(isManual) {
    const box = document.getElementById('manual-controls') || document.getElementById('manual-inputs');
    if (box) {
        box.style.opacity = isManual ? '1' : '0.5';
        box.style.pointerEvents = isManual ? 'auto' : 'none';
    }
}

// --- ฟังก์ชันช่วยเหลือ (Utilities) ---
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

// --- ดึงข้อมูลจาก API สมาคมค้าทองคำ (อิงข้อมูลจาก goldtraders.or.th) ---
async function fetchGoldAPI() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        
        // แนะนำให้เปิด Console (F12) ดูว่าข้อมูลเข้ามาหน้าตาเป็นอย่างไร
        console.log("📦 ข้อมูลที่ได้จาก API:", data); 
        
        if (data && data.status === "success") {
            const goldData = data.response;
            const priceObj = goldData.price || {};
            
            // ดักจับเผื่อ API เปลี่ยนชื่อ Key เป็นแบบอื่น
            const goldBar = priceObj.gold_bar || priceObj.goldbar || priceObj.gold;
            
            if (goldBar && goldBar.buy && goldBar.sell) {
                const buyPrice = goldBar.buy;
                const sellPrice = goldBar.sell;
                
                // อัปเดตราคาบนหน้าจอ
                updateText('gold-buy', parsePrice(buyPrice).toLocaleString());
                updateText('gold-sell', parsePrice(sellPrice).toLocaleString());
                
                // อัปเดตเวลา (ใช้ key ชื่อ 'date' ตามโครงสร้างจริงของ API)
                const updateDate = goldData.date || ""; 
                const updateTime = goldData.update_time || "";
                updateText('last-update', `อัปเดตล่าสุด: ${updateDate} ${updateTime}`.trim());
            } else {
                console.error("❌ หาตัวเลขราคาไม่พบในข้อมูลที่ส่งมา:", data);
                updateText('last-update', 'รูปแบบข้อมูลราคาจาก API เปลี่ยนแปลง');
            }
        } else {
            throw new Error("API แจ้งสถานะขัดข้องหรือไม่พบข้อมูล");
        }
    } catch (err) { 
        console.error("🔴 เกิดข้อผิดพลาดจาก API:", err);
        updateText('last-update', 'ระบบดึงราคาขัดข้อง (กรุณารอสักครู่)');
    }
}
