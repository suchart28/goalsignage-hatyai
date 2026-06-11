import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

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

// --- ฟังก์ชันช่วยเหลือ ---
function updateText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function parsePrice(val) {
    if (!val) return 0;
    const num = parseFloat(val.toString().replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

// --- ฟังก์ชันดึงราคาทองจาก Thai Gold API ---
async function fetchGoldAPI() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        
        if (data && data.status === "success") {
            const goldData = data.response;
            const goldBar = goldData.price.gold_bar; 
            
            updateText('gold-buy', parsePrice(goldBar.buy).toLocaleString());
            updateText('gold-sell', parsePrice(goldBar.sell).toLocaleString());
            updateText('last-update', `อัปเดตล่าสุด: ${goldData.date} ${goldData.update_time}`);
        }
    } catch (err) {
        console.error("ดึงราคาไม่ได้:", err);
        updateText('last-update', 'กำลังเชื่อมต่อ...');
    }
}

// --- การตั้งค่า Firebase Listener ---
const dbRef = ref(db, 'gold_data');

onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    
    // โหมด Manual
    if (data && data.isManual) {
        updateText('gold-buy', parsePrice(data.buy).toLocaleString());
        updateText('gold-sell', parsePrice(data.sell).toLocaleString());
        updateText('last-update', 'Manual Mode');
        const indicator = document.getElementById('mode-indicator');
        if(indicator) indicator.style.display = 'block';
    } 
    // โหมด Auto
    else {
        const indicator = document.getElementById('mode-indicator');
        if(indicator) indicator.style.display = 'none';
        fetchGoldAPI(); // เรียกใช้ที่นี่
    }
});

// --- นาฬิกา ---
function updateClock() {
    const now = new Date();
    updateText('clock-time', now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    updateText('clock-date', now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
}
setInterval(updateClock, 1000);
updateClock();

// อัปเดตราคาจาก API ทุก 5 นาที
setInterval(fetchGoldAPI, 300000);
