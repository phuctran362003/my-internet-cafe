# Kiến trúc triển khai

Tài liệu gốc là `docs/SRS.md` (GDD/TDD v1.1). File này ghi những quyết định kỹ thuật đã chốt khi dựng bản chạy được.

## Tách lớp

| Lớp | Vai trò |
|---|---|
| `src/state` | Dữ liệu gameplay. Scene không giữ sổ tiền riêng. |
| `src/systems` | Luật chơi, không import Phaser. |
| `src/scenes`, `src/render` | Tilemap, sprite, camera, click. |
| `src/ui` | Menu, HUD, panel, dialog HTML. |
| `src/data` | JSON cấu hình. |
| `src/assets` | Palette, khung hình, placeholder, registry. |

Menu, HUD, báo cáo ngày và kết thúc là HTML overlay, đúng dòng UI “Phaser + HTML/CSS” trong TDD. Không tạo `MainMenuScene` / `ResultScene` / `HomeScene` / `FamilyScene` vì một dialog và một canvas tránh hai bản UI. `BootScene`, `PreloadScene`, `CafeScene` là scene Phaser.

## Đồng hồ

Ngày chơi chạy từ 07:00 (phút 420) đến 02:00 hôm sau (phút 1560), rồi chốt sổ một lần. Pause dừng đồng hồ. Tốc độ x1/x2/x3 nhân `gameMinutesPerRealSecond`. Mỗi frame chia bước 100ms, tối đa 30 bước, để không nhảy qua giờ chốt sổ.

Sự cố vẫn cho bảo vệ tích thời gian phản ứng khi dialog đang mở. Đồng hồ tiệm vẫn dừng. Tạm dừng tay thì bảo vệ cũng dừng.

## Tiền

Mọi cộng trừ đi qua `EconomySystem`. Thiếu tiền thuê, điện, internet hoặc lương thì phần thiếu thành nợ, tiền mặt không âm. `finishDay` gắn `processedDay` nên chi phí ngày không bị trừ lần hai khi pause, tăng tốc hoặc load.

## Gia đình

Nền, không có nhà. Cuối ngày: mua thức ăn nếu bật tự trả và còn tiền, trừ suất, trả sưởi, rồi tiến triển sức khỏe. Dialog lấy từ `family-events.json`. Ăn và sưởi có thể tắt trên panel gia đình.

Kết thúc gia đình khi người chơi mất, hoặc cả vợ và con đều mất. Nợ đạt ngưỡng trong `economy.json` thì sập tiệm. Đủ ngày, tiền, uy tín và cả nhà khỏe thì được chơi tiếp sandbox.

## Asset

Một style id `cafe-pixel-v1`. Pixel thiết kế 64×64. Mọi màu lấy từ `palette.js`. Gameplay chỉ biết texture key và chỉ số frame trong `layout.js`. PNG trong `public/assets` là bản xuất từ painter (`npm run art`). Preload nạp các sheet đó.

## Phòng, đồ đạc, nhạc

`cafe.rooms` ghi phòng nào đã mở. Phòng khóa không đi được, vẽ xám và ổ khóa; click mở panel giá và trừ tiền qua `EconomySystem`. Mở VIP thì máy `locked` trong phòng đó thành `available`. `cafe.furniture` là đồ người chơi đặt trên sàn trống. Đặt món mới trừ tiền; cất vào `furnitureBag` rồi đặt lại thì không trừ. Ô đặt không được chặn đường từ cửa tới ghế máy đang dùng. Nhạc nền là file `public/assets/audio/music/background.mp3`, lặp sau lần bấm đầu, tắt bằng nút trên dock. Preference nằm ở `localStorage`, không ghi vào save.

## Lưu

IndexedDB, store `saves` và `metadata`. Ô 0 tự lưu khi hết ngày. Ô 1–3 lưu tay. `migrateSave` đưa dữ liệu thiếu field về version 1. Load kiểm tra shape trước khi thay state.
