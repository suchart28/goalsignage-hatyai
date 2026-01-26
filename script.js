// --- Config Firebase (Guide Khon Kaen) ---
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

const isDisplayPage = document.getElementById('display-root');
const isAdminPage = document.getElementById('admin-root');

// --- DISPLAY LOGIC ---
if (isDisplayPage) {
    const videoFrame = document.getElementById('video-frame');
    const marqueeText = document.getElementById('marquee-text');

    // 1. ดึงราคาทองคำ (ทำงานทันทีและทำซ้ำทุก 10 นาที)
    fetchGoldPrice();
    setInterval(fetchGoldPrice, 600000); 

    // 2. ฟังค่าจาก Firebase
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // อัปเดตตัววิ่ง
            if (data.marquee) marqueeText.textContent = data.marquee;

            // อัปเดตวิดีโอ
            const videoId = getYoutubeID(data.videoUrl);
            if (videoId) {
                const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
                if(videoFrame.src !== embedUrl) {
                    videoFrame.src = embedUrl;
                }
            }
        }
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
            if(!document.getElementById('marquee-input').value) document.getElementById('marquee-input').value = data.marquee || "";
            if(!document.getElementById('video-input').value) document.getElementById('video-input').value = data.videoUrl || "";
        }
    });

    // บันทึกค่า
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const videoUrl = document.getElementById('video-input').value;
        const marquee = document.getElementById('marquee-input').value;

        set(ref(db, 'signage/status'), {
            videoUrl: videoUrl,
            marquee: marquee,
            timestamp: Date.now()
        }).then(() => {
            alert('✅ อัปเดตสำเร็จ');
        }).catch((err) => {
            alert('❌ ผิดพลาด: ' + err.message);
        });
    });
}

// --- Helper Functions ---

// ฟังก์ชันดึงราคาทอง (API ฟรีสำหรับนักพัฒนาไทย)
async function fetchGoldPrice() {
    try {
        // ใช้ API สาธารณะที่ดึงค่าจากสมาคมค้าทองคำโดยตรง
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        
        if (data && data.response && data.response.price) {
            const prices = data.response.price.gold_bar; // ทองคำแท่ง
            const date = data.response.date;
            const time = data.response.update_time;

            document.getElementById('gold-buy').textContent = prices.buy.toLocaleString();
            document.getElementById('gold-sell').textContent = prices.sell.toLocaleString();
            document.getElementById('gold-update-time').textContent = `อัปเดตล่าสุด: ${date} ${time}`;
        }
    } catch (error) {
        console.error("ดึงราคาทองไม่สำเร็จ:", error);
        // กรณี Error ให้แสดงค่าขีดแทน
        document.getElementById('gold-buy').textContent = "-,---";
        document.getElementById('gold-sell').textContent = "-,---";
    }
}

function getYoutubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
