# 📅 ระบบจัดการตารางเวร First Tier IT Support (MongoDB Atlas Cloud Edition)

เว็บแอปพลิเคชันจัดการตารางเวร IT Support แบบ Full-stack Serverless ออกแบบเพื่อการจัดการตารางเวรที่โปร่งใส เป็นธรรม และสะดวกในการสลับเวร พร้อมเชื่อมต่อฐานข้อมูล **MongoDB Atlas** แบบเรียลไทม์

---

## ✨ คุณสมบัติเด่น (Features)
- 🍃 **เชื่อมต่อฐานข้อมูล MongoDB Atlas:** บันทึกและซิงค์ตารางเวร ประวัติการสลับเวร และการตั้งค่าอัตโนมัติตลอด 24 ชม.
- 🏢 **ตารางเวรวันทำการ (16 กะ):** พร้อมแสดงเวลาเริ่มงาน, เวลาเลิกงาน, เวลาพัก และ Job Description (JD)
- 🏖️ **ตารางเวรวันหยุด & วันพิเศษ (4 กะ):** รองรับวันเสาร์-อาทิตย์ และวันหยุดตามประกาศธนาคารแห่งประเทศไทย (ธปท.)
- 🔄 **ระบบคลิกเพื่อสลับเวร (Direct Click Swap):** น้องๆ สามารถคลิกชื่อตัวเองและเพื่อนเพื่อสลับเวรได้อิสระ ทั้งข้ามสัปดาห์และข้ามเดือน
- 👑 **โหมดหัวหน้างาน (Admin Control):** ล็อกด้วยรหัส PIN สามารถเปิด/ปิดรับการสลับเวร, ดูแลตารางต้นฉบับ Master, และคำนวณเดือนถัดไป
- 🛡️ **ระบบป้องกันความปลอดภัย 2 ชั้น:** มีกล่องยืนยันพร้อมเงื่อนไขติ๊กถูกก่อนคืนค่าหรือคำนวณใหม่ ป้องกันการเผลอกดผิด 100%
- 👤 **การ์ดสรุปรายบุคคล:** แสดงกะทำงาน โควตาวันหยุด และไฮไลท์ชื่อตัวเองในตารางรวม
- ⏱️ **ตารางเช็คจำนวนคนรายชั่วโมง:** ตรวจสอบความพร้อมของกำลังพลในแต่ละช่วงเวลา
- 📊 **ส่งออกข้อมูล:** รองรับการส่งออกเป็นไฟล์ Excel (.xlsx) และสั่งพิมพ์ / PDF

---

## 🚀 การ Deploy ขึ้นใช้งานจริง (Vercel + GitHub + MongoDB Atlas)

### ขั้นตอนที่ 1: Deploy บน Vercel (ฟรี 100%)
1. เข้าเว็บ [Vercel.com](https://vercel.com) แล้วเลือก **Continue with GitHub**
2. กดปุ่ม **"Add New..." > Project** แล้วเลือก Import Repository `kaaom3/shift-schedule`
3. ในส่วน **Environment Variables** ให้เพิ่มตัวแปร:
   - **Key:** `MONGODB_URI`
   - **Value:** Connection String ของ MongoDB Atlas เช่น `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
4. กดปุ่ม **Deploy**
5. เมื่อ Deploy เสร็จ คุณจะได้ URL เช่น `https://shift-schedule-xxxxx.vercel.app` ซึ่งสามารถเข้าใช้งานได้ทันที และระบบจะเชื่อมต่อกับ MongoDB Atlas อัตโนมัติ!

### ขั้นตอนที่ 2 (ทางเลือก): ใช้งานผ่าน GitHub Pages
- หากต้องการใช้งานผ่าน GitHub Pages (`https://kaaom3.github.io/shift-schedule`) สามารถคลิกที่แถบสถานะ **🍃 MongoDB** ที่มุมขวาบนของหน้าเว็บ แล้วนำ URL ของ Vercel (เช่น `https://shift-schedule-xxxxx.vercel.app/api/schedule`) มาใส่ในช่อง API Endpoint เพื่อเชื่อมต่อได้ทันที

---

## 💻 การรันบนเครื่อง Local (Development)

1. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```

2. ตั้งค่า Connection String ใน Environment Variable:
   ```powershell
   $env:MONGODB_URI = "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
   ```

3. เริ่มเซิร์ฟเวอร์:
   ```bash
   npm start
   ```
   เปิดเบราว์เซอร์ไปที่: `http://localhost:3000`
