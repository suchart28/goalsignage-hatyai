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
const DEFAULT_SHOP_NAME = "ห้างทองจินฮั้วเฮง"; // ชื่อร้านเริ่มต้นถ้าไม่ได้ตั้ง

// --- Display Logic ---
if (isDisplayPage) {
    const videoFrame = document.getElementById('video-frame');
    const marqueeText = document.getElementById('marquee-text');
    const shopNameText = document.getElementById('shop-name-text'); // รับ Element ชื่อร้าน

    fetchGoldPrice();
    setInterval(fetchGoldPrice, 600000); 

    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // 1. ชื่อร้าน (ข้อความ)
            shopNameText.textContent = data.shopName || DEFAULT_SHOP_NAME;

            // 2. ตัววิ่ง
            if (data.marquee) marqueeText.textContent = data.marquee;

            // 3. ความเร็วตัววิ่ง
            let speedVal = data.speed || 50;
            let duration = 65 - (speedVal * 0.6); 
            if (duration < 5) duration = 5;
            document.documentElement.style.setProperty('--marquee-duration', `${duration}s`);

            // 4. วิดีโอ
            const videoId = getYoutubeID(data.videoUrl);
            if (videoId) {
                const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
                if(videoFrame.src !== embedUrl) videoFrame.src = embedUrl;
            }
        }
    });
}

// --- Admin Logic ---
if (isAdminPage) {
    const loginModal = document.getElementById('login-modal');
    const btnLogin = document.getElementById('btn-login');
    const passInput = document.getElementById('password-input');
    const errorMsg = document.getElementById('login-error');

    // Login Check
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        loginModal.style.display = 'none';
        isAdminPage.style.display = 'block';
    }

    btnLogin.addEventListener('click', () => {
        if (passInput.value === '987654321') {
            sessionStorage.setItem('isLoggedIn', 'true');
            loginModal.style.display = 'none';
            isAdminPage.style.display = 'block';
        } else {
            errorMsg.style.display = 'block';
        }
    });

    const form = document.getElementById('control-form');
    const speedInput = document.getElementById('speed-input');
    const speedDisplay = document.getElementById('speed-display');

    speedInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if(val < 30) speedDisplay.textContent = "🐢 ช้า";
        else if(val > 70) speedDisplay.textContent = "🚀 เร็ว";
        else speedDisplay.textContent = "😊 ปกติ";
    });
    
    // Load existing data
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            if(document.activeElement.tagName !== "INPUT") {
                document.getElementById('marquee-input').value = data.marquee || "";
                document.getElementById('video-input').value = data.videoUrl || "";
                document.getElementById('shop-name-input').value = data.shopName || ""; // โหลดชื่อร้าน
                if(data.speed) {
                    speedInput.value = data.speed;
                    speedInput.dispatchEvent(new Event('input'));
                }
            }
        }
    });

    // Save Data
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        set(ref(db, 'signage/status'), {
            videoUrl: document.getElementById('video-input').value,
            marquee: document.getElementById('marquee-input').value,
            shopName: document.getElementById('shop-name-input').value, // บันทึกชื่อร้าน
            speed: parseInt(speedInput.value),
            timestamp: Date.now()
        }).then(() => {
            alert('✅ อัปเดตข้อมูลสำเร็จ!');
        }).catch((err) => {
            alert('❌ เกิดข้อผิดพลาด: ' + err.message);
        });
    });
}

// --- Helpers ---
async function fetchGoldPrice() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        
        if (data && data.response && data.response.price) {
            const prices = data.response.price.gold_bar;
            const date = data.response.date;
            const time = data.response.update_time;
            const buyPrice = Math.floor(parseFloat(prices.buy));
            const sellPrice = Math.floor(parseFloat(prices.sell));

            document.getElementById('gold-buy').textContent = buyPrice.toLocaleString('th-TH', { maximumFractionDigits: 0 });
            document.getElementById('gold-sell').textContent = sellPrice.toLocaleString('th-TH', { maximumFractionDigits: 0 });
            document.getElementById('gold-update-time').textContent = `อัปเดตล่าสุด: ${date} ${time}`;
        }
    } catch (error) {
        console.error("Gold API Error:", error);
    }
}

function getYoutubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
