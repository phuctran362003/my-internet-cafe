# Art Style Guide — Internet Café Tycoon

**Style ID:** `cafe-pixel-v1`  
**Trạng thái artwork:** placeholder có quy chuẩn. Chưa có final art.  
**Nguồn màu duy nhất:** `src/assets/palette.js`  
**Khung hình duy nhất:** `src/assets/layout.js`

Mọi asset mới, kể cả ảnh tạo bằng AI, phải khớp style id này. Không được mở một art style khác cho từng đợt cài đặt.

## 1. Art direction

Tiệm net bình dân nhìn từ trên xuống, pixel art chunky, màu ấm của gỗ và đèn máy tính. Hình đọc được ở kích thước nhỏ. Bóng đổ chỉ là một lớp tối có sẵn trong palette, không blend, không gradient, không anti-alias.

Không dùng emoji, hình vuông đơn sắc, hay khối ngẫu nhiên làm hình cuối. Placeholder hiện tại là sprite có silhouette, vẽ từ mask và palette chung, để gameplay chạy được trước khi thay PNG.

## 2. Kích thước

| Thông số | Giá trị |
|---|---|
| Design pixel | 32×32 native |
| Scale hiển thị | ×1, camera zoom số nguyên |
| Tile hiển thị | 32×32 |
| Nhân vật | 32×32, một ô, top-down, có tóc, mắt, cổ áo, giày |
| Máy tính | 32×32, viền màn hình, phản chiếu, phím |
| Portrait UI | 32×32 |
| Icon / item / effect | 32×32 trong sheet, nội dung nằm giữa |
| Outline | 1 design-pixel trên sprite, màu `ink` `#1b1420`. Tile sàn và tường không viền để ghép liền |
| Zoom camera | số nguyên 1, 2, 3 |
| Filter | NEAREST, `pixelArt: true`, `roundPixels: true` |

Không scale lẻ. Không xoay sprite ngoài các hướng đã vẽ.

## 3. Góc nhìn và tỷ lệ

- Camera top-down, hơi nhìn thấy mặt bàn và đỉnh đầu.
- Nhân vật cao khoảng 26 design-pixel trong ô 32, chân chạm đáy ô.
- Đầu lớn hơn người thật một chút để đọc được mắt và tóc.
- Bốn hướng: xuống, trái, phải, lên. Trái là gương của hướng xuống; phải là gương của trái.
- Ngồi: một frame, khuất chân, có ghế.

## 4. Palette

Chỉ dùng màu trong `PALETTE`. Không nội suy màu mới.

| Nhóm | Token | Hex |
|---|---|---|
| Viền / chữ | ink | `#1b1420` |
| Nền canvas | canvas | `#141820` |
| UI panel | panel / panelLight / paper | `#2a3142` / `#3b4458` / `#f3e6c8` |
| Sàn gỗ | floor / floorDark / floorLight | `#c4a574` / `#a68456` / `#dec093` |
| Tường | wall / wallDark / wallLight | `#4d596b` / `#2e3644` / `#6d7b90` |
| Cửa | door / doorLight | `#7a4e2d` / `#a56b3d` |
| Da | skin / skinShadow | `#f0c29a` / `#d39a72` |
| Áo | shirtBlue, shirtGreen, shirtRed, shirtPurple, shirtGold, shirtGray | xem `palette.js` |
| Màn hình | screenOff, screenBasic, screenStandard, screenGaming, screenHigh, screenPremium, screenBroken | xem `palette.js` |

Ánh sáng theo giờ là một lớp phủ `night` với alpha, không đổi màu sprite.

## 5. Shading

Mỗi vật thể có tối đa ba tông đã đặt tên: màu gốc, highlight có sẵn, shadow có sẵn. Sáng ở cạnh trên, tối ở chân hoặc khe ván. Không vẽ light source riêng trên từng sprite.

## 6. Animation

| Clip | Frames | Tốc độ |
|---|---|---|
| Idle | 1 | đứng yên |
| Walk | 2 (idle + walk) | 6 FPS, lặp |
| Sit | 1 | khi đang dùng máy hoặc thanh toán |
| Screen in use | đổi frame state, không nhấp nháy tự do | — |

Hướng đi lấy từ trục lớn hơn giữa dx và dy. Không có animation 8 hướng trong MVP.

Sheet nhân vật, cột cố định:

`downIdle, downWalk, leftIdle, leftWalk, rightIdle, rightWalk, upIdle, upWalk, sit`

Hàng: `student, gamer, office, regular, troublemaker, wealthy, guard`

Sheet máy tính, cột: `available, occupied, broken, maintenance`  
Hàng: `basic, standard, gaming, highend, premium`

## 7. Nhóm asset

| Nhóm | Sheet key | File thay thế sau này |
|---|---|---|
| Environment | `tileset-cafe` | `public/assets/tilesets/cafe.png` |
| Characters | `characters` | `public/assets/characters/customers.png` |
| Computers | `computers` | `public/assets/computers/computers.png` |
| Furniture | `furniture` | `public/assets/furniture/furniture.png` |
| Items | `items` | `public/assets/items/items.png` |
| Effects | `effects` | `public/assets/effects/effects.png` |
| UI | `portraits` | `public/assets/ui/portraits.png` |

Gameplay chỉ gọi texture key và chỉ số frame. Đổi PNG không được đổi thứ tự frame trong `src/assets/layout.js`.

## 8. Cách thay placeholder

1. Vẽ đúng kích thước sheet và đúng thứ tự frame.
2. Đặt file vào đường dẫn trong `AssetRegistry`.
3. Đổi `mode` của entry đó từ `placeholder` sang `file`.
4. Giữ `styleId` là `cafe-pixel-v1`.

Placeholder và file cuối không được trộn hai phong cách. Khi một nhóm chuyển sang `file`, cả sheet của nhóm đó phải hoàn chỉnh.

## 9. Việc còn lại (chưa phải final art)

- Tileset môi trường: sàn, tường gạch, cửa mở/đóng, cửa sổ, quầy, kho, nền vệ sinh, thảm.
- 7 biến thể nhân vật × 9 frame.
- 5 tier máy × 4 trạng thái.
- Ghế, cây, quầy rời.
- Đồ uống, mì, thuốc, túi thức ăn.
- Icon cảnh báo, xu, đồ ăn.
- 3 portrait: người chơi, vợ, con.
- Chưa có nhạc và SFX.

Prompt tái sử dụng nằm ở `docs/ART_PROMPTS.md`.
