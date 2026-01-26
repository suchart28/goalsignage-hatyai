import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// Config เดิมของคุณ
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
    const logoImage = document.getElementById('logo-image');

    // ดึงราคาทองคำ
    fetchGoldPrice();
    setInterval(fetchGoldPrice, 600000); 

    // ฟังค่าจาก Firebase
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // อัปเดตตัววิ่ง
            if (data.marquee) marqueeText.textContent = data.marquee;

            // อัปเดต Logo
            if (data.logoUrl && data.logoUrl.trim() !== "") {
                if (logoImage.src !== data.logoUrl) logoImage.src = data.logoUrl;
            } else {
                logoImage.src = DEFAULT_LOGO;
            }

            // อัปเดตวิดีโอ
            const videoId = getYoutubeID(data.videoUrl);
            if (videoId) {
                const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
                if(videoFrame.src !== embedUrl) {
                    videoFrame.src = embedUrl;
                }
            }
        }
    }, (error) => {
        console.error("Firebase Read Error:", error); // แสดง Error ถ้าอ่านไม่ได้
    });
}

// --- ADMIN LOGIC ---
if (isAdminPage) {
    const form = document.getElementById('control-form');
    
    // โหลดค่าเดิม
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            // เช็คว่าผู้ใช้กำลังพิมพ์อยู่ไหม (ป้องกันค่าเปลี่ยนขณะพิมพ์)
            if(document.activeElement.tagName !== "INPUT") {
                document.getElementById('marquee-input').value = data.marquee || "";
                document.getElementById('video-input').value = data.videoUrl || "";
                document.getElementById('logo-input').value = data.logoUrl || "";
            }
        }
    });

    // บันทึกค่า
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const videoUrl = document.getElementById('video-input').value;
        const marquee = document.getElementById('marquee-input').value;
        const logoUrl = document.getElementById('logo-input').value;

        set(ref(db, 'signage/status'), {
            videoUrl: videoUrl,
            marquee: marquee,
            logoUrl: logoUrl,
            timestamp: Date.now()
        }).then(() => {
            alert('✅ อัปเดตสำเร็จ! หน้าจอควรเปลี่ยนทันที');
        }).catch((err) => {
            alert('❌ บันทึกไม่สำเร็จ: ' + err.message);
            console.error(err);
        });
    });
}

// --- Helper Functions ---
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
