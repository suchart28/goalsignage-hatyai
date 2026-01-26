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
const DEFAULT_LOGO = "https://www.goldtraders.or.th/images/logo.png";

// --- ส่วนทำงานหน้าจอ Display (index.html) ---
if (isDisplayPage) {
    const videoFrame = document.getElementById('video-frame');
    const marqueeText = document.getElementById('marquee-text');
    const logoImage = document.getElementById('logo-image');

    // เรียกดึงราคาทองทันที และตั้งเวลาดึงซ้ำทุก 10 นาที
    fetchGoldPrice();
    setInterval(fetchGoldPrice, 600000); 

    // ฟังค่า Realtime จาก Firebase
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // 1. Text ตัววิ่ง
            if (data.marquee) marqueeText.textContent = data.marquee;

            // 2. ปรับความเร็วตัววิ่ง (คำนวณกลับเป็นวินาที)
            let speedVal = data.speed || 50;
            // สูตร: ยิ่งค่า speedVal มาก = เวลาน้อย (วิ่งเร็ว)
            let duration = 65 - (speedVal * 0.6); 
            if (duration < 5) duration = 5; // เร็วสุดลิมิตที่ 5 วินาที
            document.documentElement.style.setProperty('--marquee-duration', `${duration}s`);

            // 3. Logo
            if (data.logoUrl && data.logoUrl.trim() !== "") {
                if (logoImage.src !== data.logoUrl) logoImage.src = data.logoUrl;
            } else {
                logoImage.src = DEFAULT_LOGO;
            }

            // 4. Video (เปลี่ยนเฉพาะตอน ID เปลี่ยน)
            const videoId = getYoutubeID(data.videoUrl);
            if (videoId) {
                const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
                if(videoFrame.src !== embedUrl) videoFrame.src = embedUrl;
            }
        }
    });
}

// --- ส่วนทำงานหน้าจอ Admin (admin.html) ---
if (isAdminPage) {
    // ระบบ Login
    const loginModal = document.getElementById('login-modal');
    const btnLogin = document.getElementById('btn-login');
    const passInput = document.getElementById('password-input');
    const errorMsg = document.getElementById('login-error');

    // เช็ค Session ว่าเคยล็อกอินไหม
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

    // Control Form
    const form = document.getElementById('control-form');
    const speedInput = document.getElementById('speed-input');
    const speedDisplay = document.getElementById('speed-display');

    // Event Slider ปรับความเร็ว
    speedInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if(val < 30) speedDisplay.textContent = "🐢 ช้ามาก";
        else if(val > 70) speedDisplay.textContent = "🚀 เร็วมาก";
        else speedDisplay.textContent = "😊 ปกติ";
    });
    
    // โหลดค่าเดิมจาก Firebase มาใส่ Input
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            // กันไม่ให้ค่าเปลี่ยนตอนเรากำลังพิมพ์
            if(document.activeElement.tagName !== "INPUT") {
                document.getElementById('marquee-input').value = data.marquee || "";
                document.getElementById('video-input').value = data.videoUrl || "";
                document.getElementById('logo-input').value = data.logoUrl || "";
                
                if(data.speed) {
                    speedInput.value = data.speed;
                    speedInput.dispatchEvent(new Event('input')); // Trigger อัปเดตข้อความ
                }
            }
        }
    });

    // บันทึกข้อมูล
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        set(ref(db, 'signage/status'), {
            videoUrl: document.getElementById('video-input').value,
            marquee: document.getElementById('marquee-input').value,
            logoUrl: document.getElementById('logo-input').value,
            speed: parseInt(speedInput.value),
            timestamp: Date.now()
        }).then(() => {
            alert('✅ อัปเดตข้อมูลขึ้นจอเรียบร้อย!');
        }).catch((err) => {
            alert('❌ เกิดข้อผิดพลาด: ' + err.message);
        });
    });
}

// --- ฟังก์ชันเสริม (Helpers) ---

// ดึงราคาทองและตัดทศนิยม
async function fetchGoldPrice() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        
        if (data && data.response && data.response.price) {
            const prices = data.response.price.gold_bar;
            const date = data.response.date;
            const time = data.response.update_time;

            // Math.floor เพื่อตัดทศนิยมออก
            const buyPrice = Math.floor(parseFloat(prices.buy));
            const sellPrice = Math.floor(parseFloat(prices.sell));

            // แสดงผลใส่ลูกน้ำ
            document.getElementById('gold-buy').textContent = buyPrice.toLocaleString('th-TH', { maximumFractionDigits: 0 });
            document.getElementById('gold-sell').textContent = sellPrice.toLocaleString('th-TH', { maximumFractionDigits: 0 });
            document.getElementById('gold-update-time').textContent = `อัปเดตล่าสุด: ${date} ${time}`;
        }
    } catch (error) {
        console.error("Gold API Error:", error);
        document.getElementById('gold-buy').textContent = "-,---";
        document.getElementById('gold-sell').textContent = "-,---";
    }
}

// แยก ID จาก Youtube URL
function getYoutubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
