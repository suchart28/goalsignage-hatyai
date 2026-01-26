import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// Config Firebase ของคุณ
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
const DEFAULT_LOGO = "https://www.goldtraders.or.th/images/logo.png";

// --- DISPLAY LOGIC ---
if (isDisplayPage) {
    const videoFrame = document.getElementById('video-frame');
    const marqueeText = document.getElementById('marquee-text');
    const marqueeContent = document.querySelector('.marquee-content'); // ตัว container ที่ขยับ
    const logoImage = document.getElementById('logo-image');

    fetchGoldPrice();
    setInterval(fetchGoldPrice, 600000); 

    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // 1. Text
            if (data.marquee) marqueeText.textContent = data.marquee;

            // 2. Speed (คำนวณกลับ: Slider มาก = วิ น้อย)
            // สูตร: พื้นฐาน 60 วิ - (ค่า speed * 0.5) หรือตามความเหมาะสม
            // ให้ range 1-100.  1 = 60s (ช้า), 100 = 5s (เร็ว)
            let speedVal = data.speed || 50;
            let duration = 65 - (speedVal * 0.6); 
            if (duration < 5) duration = 5; // เร็วสุดห้ามต่ำกว่า 5 วิ
            
            // อัปเดต CSS Variable
            document.documentElement.style.setProperty('--marquee-duration', `${duration}s`);

            // 3. Logo
            if (data.logoUrl && data.logoUrl.trim() !== "") {
                if (logoImage.src !== data.logoUrl) logoImage.src = data.logoUrl;
            } else {
                logoImage.src = DEFAULT_LOGO;
            }

            // 4. Video
            const videoId = getYoutubeID(data.videoUrl);
            if (videoId) {
                const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
                if(videoFrame.src !== embedUrl) videoFrame.src = embedUrl;
            }
        }
    });
}

// --- ADMIN LOGIC ---
if (isAdminPage) {
    // 🔒 ระบบ Login ง่ายๆ
    const loginModal = document.getElementById('login-modal');
    const btnLogin = document.getElementById('btn-login');
    const passInput = document.getElementById('password-input');
    const errorMsg = document.getElementById('login-error');

    // เช็คว่าเคย Login หรือยัง (Session)
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

    // ------------------------------------

    const form = document.getElementById('control-form');
    const speedInput = document.getElementById('speed-input');
    const speedDisplay = document.getElementById('speed-display');

    // อัปเดตข้อความความเร็วตอนเลื่อน
    speedInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if(val < 30) speedDisplay.textContent = "ช้า";
        else if(val > 70) speedDisplay.textContent = "เร็ว";
        else speedDisplay.textContent = "ปกติ";
    });
    
    // โหลดค่าเดิมจาก Firebase
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            // เช็คว่ากำลังพิมพ์หรือไม่
            if(document.activeElement.tagName !== "INPUT") {
                document.getElementById('marquee-input').value = data.marquee || "";
                document.getElementById('video-input').value = data.videoUrl || "";
                document.getElementById('logo-input').value = data.logoUrl || "";
                
                // Set Slider
                if(data.speed) {
                    speedInput.value = data.speed;
                    // Trigger event เพื่ออัปเดต text
                    speedInput.dispatchEvent(new Event('input'));
                }
            }
        }
    });

    // บันทึก
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        set(ref(db, 'signage/status'), {
            videoUrl: document.getElementById('video-input').value,
            marquee: document.getElementById('marquee-input').value,
            logoUrl: document.getElementById('logo-input').value,
            speed: parseInt(speedInput.value), // ส่งค่าความเร็วไปเป็นตัวเลข 1-100
            timestamp: Date.now()
        }).then(() => {
            alert('✅ อัปเดตเรียบร้อย');
        }).catch((err) => {
            alert('❌ ผิดพลาด: ' + err.message);
        });
    });
}

// Helper Functions
async function fetchGoldPrice() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        if (data && data.response && data.response.price) {
            const prices = data.response.price.gold_bar;
            const date = data.response.date;
            const time = data.response.update_time;
            document.getElementById('gold-buy').textContent = prices.buy.toLocaleString();
            document.getElementById('gold-sell').textContent = prices.sell.toLocaleString();
            document.getElementById('gold-update-time').textContent = `อัปเดตล่าสุด: ${date} ${time}`;
        }
    } catch (error) { console.error("Gold API Error:", error); }
}

function getYoutubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
