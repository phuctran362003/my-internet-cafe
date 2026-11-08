# Internet Café Tycoon

Game mô phỏng quản lý tiệm net trên trình duyệt. Người chơi vận hành quán, thu tiền, xử lý sự cố và giữ gia đình có ăn, sưởi và thuốc. Gia đình không có scene riêng.

Artwork hiện tại là **placeholder có quy chuẩn** (`cafe-pixel-v1`), chưa phải hình cuối. Xem `docs/ART_STYLE_GUIDE.md`.

## Chạy

```bash
npm install
npm run dev
npm test
npm run build
```

Mở `http://localhost:5173`. Chuột: click máy, khách, cửa, quầy. Kéo để nhìn quanh, lăn để phóng to theo bậc 1–3.

## Trạng thái MVP

Đã có vòng chơi: bản đồ tile, 5 máy và 2 chỗ mua thêm, khách tự tìm máy và trả tiền, giá giờ, nâng cấp/sửa/vệ sinh, đồ ăn, bảo vệ, sự cố quỵt tiền, chu kỳ ngày 07:00–02:00, báo cáo, gia đình (đói, lạnh, ốm, bệnh nặng, mất), dialog dùng chung, lưu IndexedDB 3 ô cộng ô tự động cuối ngày.

Chưa làm: artwork cuối, âm thanh, xếp đồ tự do, khu VIP chơi được, nhiều chi nhánh.

## Kiến trúc ngắn

- Phaser vẽ thế giới. HTML vẽ menu, HUD, panel và dialog.
- `GameSession` là chỗ UI gọi lệnh. UI không tự cộng tiền.
- `EconomySystem` là chỗ duy nhất đổi tiền và ghi sổ.
- `EventBus` nối các hệ thống. Nội dung sự kiện nằm trong JSON.
- Save chỉ ghi state thuần, không ghi sprite.

Chi tiết quyết định: `docs/ARCHITECTURE.md`. Thiết kế gốc: `docs/SRS.md`.
