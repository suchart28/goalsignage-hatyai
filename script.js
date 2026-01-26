// --- ส่วนตั้งค่า Firebase (Guide Khon Kaen) ---
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

// เริ่มการทำงาน Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- ตรวจสอบว่าเป็นหน้า Display หรือ Admin ---
const isDisplayPage = document.getElementById('display-root');
const isAdminPage = document.getElementById('admin-root');

// --- Logic สำหรับหน้าจอแสดงผล (Display) ---
if (isDisplayPage) {
    const videoFrame = document.getElementById('video-frame');
    const webFrame = document.getElementById('web-frame');
    const marqueeText = document.getElementById('marquee-text');

    // ฟังค่าจาก Database แบบ Realtime
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // อัปเดตตัววิ่ง
            if(data.marquee) {
                marqueeText.textContent = data.marquee;
            }

            // สลับโหมด
            if (data.mode === 'video') {
                webFrame.style.display = 'none';
                videoFrame.style.display = 'block';
                
                // แปลง Youtube URL และป้องกันการ Refresh ถ้าวิดีโอเดิมเล่นอยู่
                const videoId = getYoutubeID(data.videoUrl);
                if (videoId) {
                    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
                    // เช็คว่า src เดิมตรงกันไหม เพื่อไม่ให้วิดีโอโหลดใหม่ตอนแก้ตัววิ่ง
                    if(videoFrame.src !== embedUrl) {
                        videoFrame.src = embedUrl;
                    }
                }
                
            } else if (data.mode === 'web') {
                videoFrame.style.display = 'none';
                webFrame.style.display = 'block';
                
                if(webFrame.src !== data.webUrl) {
                    webFrame.src = data.webUrl;
                }
            }
        }
    });
}

// --- Logic สำหรับหน้าควบคุม (Admin) ---
if (isAdminPage) {
    const form = document.getElementById('control-form');
    
    // โหลดค่าเดิมมาแสดงในช่องกรอก
    const dbRef = ref(db, 'signage/status');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            if(document.getElementById('marquee-input').value === "") { // เติมค่าเฉพาะตอนโหลดครั้งแรก หรือช่องว่าง
                document.getElementById('marquee-input').value = data.marquee || "";
            }
            if(document.getElementById('video-input').value === "") {
                document.getElementById('video-input').value = data.videoUrl || "";
            }
            document.getElementById('mode-select').value = data.mode || "video";
        }
    });

    // บันทึกค่าลง Firebase
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const mode = document.getElementById('mode-select').value;
        const videoUrl = document.getElementById('video-input').value;
        const marquee = document.getElementById('marquee-input').value;
        // URL ราคาทอง ฮั่วเซ่งเฮง
        const goldUrl = "https://online965.huasengheng.com/webprice965/"; 

        set(ref(db, 'signage/status'), {
            mode: mode,
            videoUrl: videoUrl,
            webUrl: goldUrl,
            marquee: marquee
        }).then(() => {
            alert('✅ อัปเดตข้อมูลขึ้นจอเรียบร้อย!');
        }).catch((error) => {
            alert('❌ เกิดข้อผิดพลาด: ' + error.message);
            console.error(error);
        });
    });
}

// Helper: ดึง ID จาก Youtube URL
function getYoutubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
