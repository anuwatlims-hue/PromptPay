# Subs Vault — Chrome Extension

ส่วนขยาย Manifest V3 สำหรับนำเข้า ค้นหา แสดง/ซ่อน และคัดลอก Subscription keys โดยเก็บข้อมูลใน `chrome.storage.local` เท่านั้น ไม่มี host permissions, remote code หรือการเชื่อมต่อเซิร์ฟเวอร์

## ติดตั้ง

1. เปิด `chrome://extensions` แล้วเปิด **Developer mode**
2. เลือก **Load unpacked** แล้วเลือกโฟลเดอร์ `extension`
3. ปักหมุด **Subs Vault** และเปิดส่วนขยาย
4. กด **นำเข้าคีย์ของคุณ** แล้ววางข้อความชุด Product Prefix และคีย์ต้นฉบับทั้งชุด

> ไฟล์ในที่เก็บนี้ไม่มีคีย์จริง การนำเข้าและสำรองข้อมูลเป็นการกระทำของผู้ใช้ในเครื่อง ไฟล์สำรอง JSON มีคีย์แบบไม่เข้ารหัส จึงควรเก็บไว้ในที่ปลอดภัย การถอนการติดตั้งส่วนขยายจะลบข้อมูลใน `chrome.storage.local`

## ตรวจสอบ

```sh
cd extension
npm test
npm run check
```
