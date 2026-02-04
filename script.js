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

// ==========================================
// 📺 หน้า Display
// ==========================================
if (isDisplayPage) {
    const videoFrame = document.getElementById('video-frame');
    const marqueeText = document.getElementById('marquee-text');
    const shopNameText = document.getElementById('shop-name-text');
    const ornamentBuyEl = document.getElementById('ornament-buy');
    const ornamentSellEl = document.getElementById('ornament-sell');

    // 1. ราคาทองคำแท่ง API
    fetchGoldBarPrice();
    setInterval(fetchGoldBarPrice, 600000); 

    // 2. นาฬิกา
    updateBigClock();
    setInterval(updateBigClock, 1000);

    // 3. Firebase Data
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            if (shopNameText) shopNameText.textContent = (data.shopName && data.shopName.trim() !== "") ? data.shopName : DEFAULT_SHOP_NAME;
            if (data.marquee) marqueeText.textContent = data.marquee;

            // ราคาทองรูปพรรณ (Manual)
            if (ornamentBuyEl) ornamentBuyEl.textContent = data.ornamentBuy || "-,---";
            if (ornamentSellEl) ornamentSellEl.textContent = data.ornamentSell || "-,---";

            let speedVal = data.speed || 50;
            let duration = 65 - (speedVal * 0.6); 
            if (duration < 5) duration = 5;
            document.documentElement.style.setProperty('--marquee-duration', `${duration}s`);

            // Video Shorts Support
            const videoId = getYoutubeID(data.videoUrl);
            if (videoId) {
                const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
                if(videoFrame.src !== embedUrl) videoFrame.src = embedUrl;
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
    
    // โหลดค่าเดิม
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if(data && document.activeElement.tagName !== "INPUT") {
            document.getElementById('shop-name-input').value = data.shopName || "";
            document.getElementById('video-input').value = data.videoUrl || "";
            document.getElementById('marquee-input').value = data.marquee || "";
            document.getElementById('ornament-buy-input').value = data.ornamentBuy || "";
            document.getElementById('ornament-sell-input').value = data.ornamentSell || "";

            if(data.speed) {
                speedInput.value = data.speed;
                speedInput.dispatchEvent(new Event('input'));
            }
        }
    });

    // บันทึก
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        set(ref(db, 'signage/status'), {
            shopName: document.getElementById('shop-name-input').value,
            videoUrl: document.getElementById('video-input').value,
            marquee: document.getElementById('marquee-input').value,
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
// 🛠️ Helpers
// ==========================================

async function fetchGoldBarPrice() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        
        if (data && data.response && data.response.price) {
            const prices = data.response.price.gold_bar;
            // *ไม่ต้องดึง date/time มาแสดงแล้ว*

            const rawBuy = prices.buy.toString().replace(/,/g, '');
            const rawSell = prices.sell.toString().replace(/,/g, '');
            const buyPrice = Math.floor(parseFloat(rawBuy));
            const sellPrice = Math.floor(parseFloat(rawSell));

            // แสดงเฉพาะราคาทองแท่ง
            const barBuyEl = document.getElementById('bar-buy');
            const barSellEl = document.getElementById('bar-sell');

            if(barBuyEl) barBuyEl.textContent = buyPrice.toLocaleString('th-TH');
            if(barSellEl) barSellEl.textContent = sellPrice.toLocaleString('th-TH');
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
