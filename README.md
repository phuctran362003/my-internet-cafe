# Internet Café Tycoon

Game mô phỏng quản lý tiệm net trên trình duyệt. Người chơi vận hành quán, thu tiền, xử lý sự cố và giữ gia đình có ăn, sưởi và thuốc. Gia đình không có scene riêng.

Artwork hiện tại là bộ sprite cuối `cafe-pixel-v1`, xuất ra PNG trong `public/assets` (`npm run art`). Nhạc nền nằm ở `public/assets/audio/music/background.mp3`.

## Chơi

Nhấp đúp `Choi-game.bat`. Lần đầu máy tự cài thư viện, rồi mở trình duyệt. Giữ cửa sổ đen mở trong lúc chơi. Đóng cửa sổ đó để tắt game.

Cần cài [Node.js](https://nodejs.org/en/download) một lần. Nếu game đã chạy, nhấp lại file chỉ mở lại trang.

Chuột: click máy, khách, cửa, quầy, hoặc phòng đang khóa để xem giá mở. Nút ghế ở dưới dùng để xếp cây, ghế và đèn. Nút nốt nhạc tắt hoặc bật nhạc nền. Khung hình đứng yên, không kéo và không phóng to.

Lệnh cho người sửa game:

```bash
npm install
npm run dev
npm test
npm run build
```

## Trạng thái MVP

Đã có vòng chơi: bản đồ tile, 5 máy và 2 chỗ mua thêm, phòng kho / vệ sinh / VIP mở bằng tiền, khách tự tìm máy và trả tiền, giá giờ, nâng cấp/sửa/vệ sinh, đồ ăn, bảo vệ, sự cố quỵt tiền, chu kỳ ngày 07:00–02:00, báo cáo, gia đình (đói, lạnh, ốm, bệnh nặng, mất), dialog dùng chung, lưu IndexedDB 3 ô cộng ô tự động cuối ngày, nhạc nền lặp và xếp nội thất trên sàn trống.

Chưa làm: nhiều chi nhánh.

## Kiến trúc ngắn

- Phaser vẽ thế giới. HTML vẽ menu, HUD, panel và dialog.
- `GameSession` là chỗ UI gọi lệnh. UI không tự cộng tiền.
- `EconomySystem` là chỗ duy nhất đổi tiền và ghi sổ.
- `EventBus` nối các hệ thống. Nội dung sự kiện nằm trong JSON.
- Save chỉ ghi state thuần, không ghi sprite.

Chi tiết quyết định: `docs/ARCHITECTURE.md`. Thiết kế gốc: `docs/SRS.md`.
