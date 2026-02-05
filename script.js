import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// --- Config Firebase ---
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

const isDisplayPage = document.getElementById('display-root');
const isAdminPage = document.getElementById('admin-root');
const DEFAULT_SHOP_NAME = "ห้างทองจินฮั้วเฮง"; 

// ตัวแปร Global สำหรับเก็บสถานะ (สำคัญมาก)
let isManualMode = false; 

// ==========================================
// 📺 หน้า Display
// ==========================================
if (isDisplayPage) {
    const videoFrame = document.getElementById('video-frame');
    const marqueeText = document.getElementById('marquee-text');
    const shopNameText = document.getElementById('shop-name-text');
    
    // อ้างอิง Element ราคา
    const goldBuyEl = document.getElementById('gold-buy');
    const goldSellEl = document.getElementById('gold-sell');
    const modeIndicator = document.getElementById('mode-indicator');

    // 1. เริ่มระบบนาฬิกา
    updateBigClock();
    setInterval(updateBigClock, 1000);

    // 2. เริ่มระบบดึง API (ตั้งเวลาดึงทุก 10 นาที)
    fetchGoldBarPrice();
    setInterval(fetchGoldBarPrice, 600000);

    // 3. ฟังค่าจาก Firebase
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // --- อัปเดตข้อมูลทั่วไป ---
            if (shopNameText) shopNameText.textContent = (data.shopName && data.shopName.trim() !== "") ? data.shopName : DEFAULT_SHOP_NAME;
            if (data.marquee) marqueeText.textContent = data.marquee;

            // --- Video & Shorts (เปิดเสียง) ---
            const videoId = getYoutubeID(data.videoUrl);
            if (videoId) {
                // 🔊 mute=0 คือเปิดเสียง (ต้องระวัง Browser บล็อก Autoplay ถ้าไม่ได้ตั้งค่า)
                const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&controls=0`;
                
                // เช็คก่อนเปลี่ยน src เพื่อไม่ให้วิดีโอกระตุกถ้าเป็นลิงก์เดิม
                if(videoFrame.src !== embedUrl && videoFrame.src.indexOf(videoId) === -1) {
                    videoFrame.src = embedUrl;
                }
            }
            
            // --- Speed ---
            let speedVal = data.speed || 50;
            let duration = 65 - (speedVal * 0.6); 
            if (duration < 5) duration = 5;
            document.documentElement.style.setProperty('--marquee-duration', `${duration}s`);

            // --- 🔧 LOGIC สำคัญ: Manual vs Auto ---
            isManualMode = (data.manualMode === true); // อัปเดตตัวแปร Global
            
            if (isManualMode) {
                // ✅ ถ้าเป็น Manual: บังคับเปลี่ยนตัวเลขทันที!
                if(goldBuyEl) goldBuyEl.textContent = data.manualBuy || "-,---";
                if(goldSellEl) goldSellEl.textContent = data.manualSell || "-,---";
                
                // แสดงสถานะว่า Manual
                if(modeIndicator) modeIndicator.style.display = 'inline-block';
                
            } else {
                // ✅ ถ้าเป็น Auto: ซ่อนป้าย Manual แล้วดึง API
                if(modeIndicator) modeIndicator.style.display = 'none';
                
                // เรียก API ทันทีที่สลับกลับมา Auto
                fetchGoldBarPrice(); 
            }
        }
    });
}

// ==========================================
// ⚙️ หน้า Admin
// ==========================================
if (isAdminPage) {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        document.getElementById('login-modal').style.display = 'none';
        isAdminPage.style.display = 'block';
    }

    document.getElementById('btn-login').addEventListener('click', () => {
        if (document.getElementById('password-input').value === '987654321') {
            sessionStorage.setItem('isLoggedIn', 'true');
            document.getElementById('login-modal').style.display = 'none';
            isAdminPage.style.display = 'block';
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    });

    const form = document.getElementById('control-form');
    const speedInput = document.getElementById('speed-input');
    const speedDisplay = document.getElementById('speed-display');

    speedInput.addEventListener('input', (e) => {
        const val = e.target.value;
        speedDisplay.textContent = val < 30 ? "🐢 ช้า" : (val > 70 ? "🚀 เร็ว" : "😊 ปกติ");
    });
    
    // โหลดค่าเดิมจาก Firebase มาแสดงใน Input
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            // เช็คว่า User กำลังพิมพ์อยู่ไหม (ยกเว้น Checkbox)
            const activeTag = document.activeElement.tagName;
            const activeId = document.activeElement.id;
            
            // อัปเดตค่า Input Text ถ้าไม่ได้กำลังพิมพ์ช่องนั้นอยู่
            if (activeId !== 'shop-name-input') document.getElementById('shop-name-input').value = data.shopName || "";
            if (activeId !== 'video-input') document.getElementById('video-input').value = data.videoUrl || "";
            if (activeId !== 'marquee-input') document.getElementById('marquee-input').value = data.marquee || "";
            
            if (activeId !== 'manual-buy-input') document.getElementById('manual-buy-input').value = data.manualBuy || "";
            if (activeId !== 'manual-sell-input') document.getElementById('manual-sell-input').value = data.manualSell || "";

            // Checkbox ไม่มีผลกับการพิมพ์ อัปเดตได้เลย
            document.getElementById('manual-mode-check').checked = (data.manualMode === true);

            if(data.speed && activeId !== 'speed-input') {
                speedInput.value = data.speed;
                speedInput.dispatchEvent(new Event('input'));
            }
        }
    });

    // บันทึกข้อมูลลง Firebase
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // ดึงค่า Checkbox ออกมา
        const isManual = document.getElementById('manual-mode-check').checked;

        set(ref(db, 'signage/status'), {
            shopName: document.getElementById('shop-name-input').value,
            videoUrl: document.getElementById('video-input').value,
            marquee: document.getElementById('marquee-input').value,
            speed: parseInt(speedInput.value),
            
            // ส่งค่า Manual
            manualMode: isManual,
            manualBuy: document.getElementById('manual-buy-input').value,
            manualSell: document.getElementById('manual-sell-input').value,
            
            timestamp: Date.now()
        }).then(() => {
            alert('✅ อัปเดตข้อมูลสำเร็จ!');
        }).catch((err) => {
            alert('❌ เกิดข้อผิดพลาด: ' + err.message);
        });
    });
}

// ==========================================
// 🛠️ Helper Functions
// ==========================================

async function fetchGoldBarPrice() {
    // 🛡️ ด่านที่ 1: ถ้าเป็นโหมด Manual อยู่ ให้ออกเลย ไม่ต้องยิง API
    if (isManualMode) return;

    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        
        if (data && data.response && data.response.price) {
            const prices = data.response.price.gold_bar;
            const rawBuy = prices.buy.toString().replace(/,/g, '');
            const rawSell = prices.sell.toString().replace(/,/g, '');
            const buyPrice = Math.floor(parseFloat(rawBuy));
            const sellPrice = Math.floor(parseFloat(rawSell));

            // 🛡️ ด่านที่ 2 (Double Check): เช็คอีกทีว่าระหว่างรอ API โหมดยังเป็น Auto อยู่ไหม
            if (isManualMode === false) { 
                const goldBuyEl = document.getElementById('gold-buy');
                const goldSellEl = document.getElementById('gold-sell');

                if(goldBuyEl) goldBuyEl.textContent = buyPrice.toLocaleString('th-TH');
                if(goldSellEl) goldSellEl.textContent = sellPrice.toLocaleString('th-TH');
                
                console.log("API Auto Updated: ", buyPrice, sellPrice);
            } else {
                console.log("API Fetched but ignored (Manual Mode is ON)");
            }
        }
    } catch (error) {
        console.error("Gold API Error:", error);
    }
}

function updateBigClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateString = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');
    if(timeEl) timeEl.textContent = timeString;
    if(dateEl) dateEl.textContent = dateString;
}

function getYoutubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
