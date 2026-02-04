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

// เริ่มต้น Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ตรวจสอบว่าเป็นหน้า Display หรือ Admin
const isDisplayPage = document.getElementById('display-root');
const isAdminPage = document.getElementById('admin-root');
const DEFAULT_SHOP_NAME = "ห้างทองจินฮั้วเฮง"; 

// ==========================================
// 📺 ส่วนของหน้าจอแสดงผล (Display Page)
// ==========================================
if (isDisplayPage) {
    const videoFrame = document.getElementById('video-frame');
    const marqueeText = document.getElementById('marquee-text');
    const shopNameText = document.getElementById('shop-name-text');
    
    // Elements: ทองรูปพรรณ (Manual)
    const ornamentBuyEl = document.getElementById('ornament-buy');
    const ornamentSellEl = document.getElementById('ornament-sell');

    // 1. เริ่มระบบดึงราคาทองคำแท่ง (API)
    fetchGoldBarPrice();
    setInterval(fetchGoldBarPrice, 600000); // อัปเดตทุก 10 นาที

    // 2. เริ่มระบบนาฬิกา
    updateBigClock();
    setInterval(updateBigClock, 1000); // อัปเดตทุก 1 วินาที

    // 3. เชื่อมต่อ Firebase (Realtime Database)
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // อัปเดตชื่อร้าน
            if (shopNameText) shopNameText.textContent = (data.shopName && data.shopName.trim() !== "") ? data.shopName : DEFAULT_SHOP_NAME;
            
            // อัปเดตตัววิ่ง
            if (data.marquee) marqueeText.textContent = data.marquee;

            // อัปเดตราคาทองรูปพรรณ (จาก Admin)
            if (ornamentBuyEl) ornamentBuyEl.textContent = data.ornamentBuy || "-,---";
            if (ornamentSellEl) ornamentSellEl.textContent = data.ornamentSell || "-,---";

            // ปรับความเร็วตัววิ่ง
            let speedVal = data.speed || 50;
            let duration = 65 - (speedVal * 0.6); 
            if (duration < 5) duration = 5;
            document.documentElement.style.setProperty('--marquee-duration', `${duration}s`);

            // อัปเดตวิดีโอ (รองรับ Shorts)
            const videoId = getYoutubeID(data.videoUrl);
            if (videoId) {
                // ใช้ Playlist พารามิเตอร์เพื่อให้ Loop ได้ชัวร์ๆ
                const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
                if(videoFrame.src !== embedUrl) videoFrame.src = embedUrl;
            }
        }
    });
}

// ==========================================
// ⚙️ ส่วนของหน้าควบคุม (Admin Page)
// ==========================================
if (isAdminPage) {
    // เช็ค Login (จำลองระบบ Login ง่ายๆ)
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        document.getElementById('login-modal').style.display = 'none';
        isAdminPage.style.display = 'block';
    }

    document.getElementById('btn-login').addEventListener('click', () => {
        const passInput = document.getElementById('password-input').value;
        if (passInput === '987654321') { // รหัสผ่าน
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

    // แสดงข้อความความเร็วตอนเลื่อน Slider
    speedInput.addEventListener('input', (e) => {
        const val = e.target.value;
        speedDisplay.textContent = val < 30 ? "🐢 ช้า" : (val > 70 ? "🚀 เร็ว" : "😊 ปกติ");
    });
    
    // โหลดค่าเดิมจาก Database มาแสดงใน Form
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        // เช็ค document.activeElement เพื่อไม่ให้ค่าเด้งกลับขณะพิมพ์
        if(data && document.activeElement.tagName !== "INPUT") {
            document.getElementById('shop-name-input').value = data.shopName || "";
            document.getElementById('video-input').value = data.videoUrl || "";
            document.getElementById('marquee-input').value = data.marquee || "";
            
            // โหลดราคารูปพรรณ
            document.getElementById('ornament-buy-input').value = data.ornamentBuy || "";
            document.getElementById('ornament-sell-input').value = data.ornamentSell || "";

            if(data.speed) {
                speedInput.value = data.speed;
                speedInput.dispatchEvent(new Event('input')); // Trigger event เพื่ออัปเดต text
            }
        }
    });

    // บันทึกข้อมูลลง Database
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        set(ref(db, 'signage/status'), {
            shopName: document.getElementById('shop-name-input').value,
            videoUrl: document.getElementById('video-input').value,
            marquee: document.getElementById('marquee-input').value,
            
            // บันทึกราคาทองรูปพรรณ
            ornamentBuy: document.getElementById('ornament-buy-input').value,
            ornamentSell: document.getElementById('ornament-sell-input').value,
            
            speed: parseInt(speedInput.value),
            timestamp: Date.now()
        }).then(() => {
            alert('✅ อัปเดตข้อมูลสำเร็จ!');
        }).catch((err) => {
            alert('❌ เกิดข้อผิดพลาด: ' + err.message);
        });
    });
}

// ==========================================
// 🛠️ Helper Functions (ฟังก์ชันช่วยทำงาน)
// ==========================================

// 1. ดึงราคาทองคำแท่งจาก API
async function fetchGoldBarPrice() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        
        if (data && data.response && data.response.price) {
            const prices = data.response.price.gold_bar;
            const date = data.response.date;
            const time = data.response.update_time;

            // แปลงตัวเลข (ลบลูกน้ำออกก่อนแล้วแปลงเป็น Int)
            const rawBuy = prices.buy.toString().replace(/,/g, '');
            const rawSell = prices.sell.toString().replace(/,/g, '');
            const buyPrice = Math.floor(parseFloat(rawBuy));
            const sellPrice = Math.floor(parseFloat(rawSell));

            // แสดงผลเฉพาะช่องทองคำแท่ง (API)
            const barBuyEl = document.getElementById('bar-buy');
            const barSellEl = document.getElementById('bar-sell');
            const updateTimeEl = document.getElementById('gold-update-time');

            if(barBuyEl) barBuyEl.textContent = buyPrice.toLocaleString('th-TH');
            if(barSellEl) barSellEl.textContent = sellPrice.toLocaleString('th-TH');
            if(updateTimeEl) updateTimeEl.textContent = `อัปเดตราคา API: ${date} ${time}`;
        }
    } catch (error) {
        console.error("Gold API Error:", error);
    }
}

// 2. อัปเดตนาฬิกา
function updateBigClock() {
    const now = new Date();
    
    // เวลา HH:mm:ss
    const timeString = now.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    // วันที่ไทย
    const dateString = now.toLocaleDateString('th-TH', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });

    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');

    if(timeEl) timeEl.textContent = timeString;
    if(dateEl) dateEl.textContent = dateString;
}

// 3. แกะ Video ID (รองรับ Shorts)
function getYoutubeID(url) {
    if (!url) return null;
    
    // Regex ใหม่: รองรับ /shorts/, /watch?v=, /embed/, youtu.be
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
