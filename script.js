import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// --- Firebase Config ---
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

// --- DOM Elements ---
const lastUpdateEl = document.getElementById('last-update');

// --- Helper Functions ---
function updateText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function parsePrice(val) {
    if (!val) return 0;
    const num = parseFloat(val.toString().replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

// --- ดึงข้อมูลจาก API สมาคมค้าทองคำ (Thai Gold API) ---
async function fetchGoldAPI() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        
        if (data && data.status === "success") {
            const goldData = data.response;
            const goldBar = goldData.price.gold_bar; // ราคาทองคำแท่ง
            
            // อัปเดตราคา
            updateText('gold-buy', parsePrice(goldBar.buy).toLocaleString());
            updateText('gold-sell', parsePrice(goldBar.sell).toLocaleString());
            
            // อัปเดตเวลา
            updateText('last-update', `อัปเดตล่าสุด: ${goldData.date} ${goldData.update_time}`);
        } else {
            throw new Error("API ไม่ส่งข้อมูลสถานะ success");
        }
    } catch (err) {
        console.error("🔴 ดึงราคาทองไม่ได้:", err);
        updateText('last-update', 'กำลังเชื่อมต่อราคา...');
    }
}

// --- Main Logic (Firebase Integration) ---
const dbRef = ref(db, 'gold_data'); // สมมติว่าโครงสร้างใน Firebase ชื่อ gold_data

onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    
    // ตรวจสอบว่าเป็นโหมด Manual หรือ Auto
    if (data && data.isManual) {
        // โหมด Manual: ดึงจาก Firebase
        updateText('gold-buy', parsePrice(data.buy).toLocaleString());
        updateText('gold-sell', parsePrice(data.sell).toLocaleString());
        updateText('last-update', 'Manual Mode');
        document.getElementById('mode-indicator').style.display = 'block';
    } else {
        // โหมด Auto: ดึงจาก API
        document.getElementById('mode-indicator').style.display = 'none';
        fetchGoldAPI();
    }
});

// --- Clock Update ---
function updateClock() {
    const now = new Date();
    updateText('clock-time', now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    updateText('clock-date', now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
}
setInterval(updateClock, 1000);
updateClock();

// อัปเดตราคาจาก API ทุก 5 นาที (เพื่อไม่ให้ API โดนบล็อก)
setInterval(fetchGoldAPI, 300000);
