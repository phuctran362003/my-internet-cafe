# Responsive Design cho Mobile

Hướng dẫn các cập nhật responsive cho thiết bị di động (điện thoại, máy tính bảng).

## Các Thay Đổi Thực Hiện

### 1. **HTML Viewport Meta Tags** (`index.html`)
- Thêm `maximum-scale=1` để tránh zoom tự động
- Thêm `viewport-fit=cover` cho iPhone notch
- Thêm theme color và Apple mobile config

### 2. **CSS Media Queries** (`src/styles/main.css`)

#### Breakpoints:
- **Desktop**: > 1024px (layout hiện tại)
- **Tablet**: 768px - 1023px
- **Mobile**: < 480px

#### Những gì đã điều chỉnh:

**Màn hình lớn (< 1024px):**
- Game area thu nhỏ để drawer không bị che
- Drawer được tối ưu hóa cho kích thước nhỏ hơn
- Font size giảm 10-15%
- Padding/margin giảm 20-30%

**Máy tính bảng (< 768px):**
- Dock hiển thị theo chiều ngang, dàn đều
- Drawer tiếp tục được tối ưu

**Điện thoại (< 480px):**
- **Drawer ẩn mặc định**, chỉ hiển thị khi cần (class `.active`)
- **Dock buttons nhỏ hơn** (36px thay vì 44px)
- **HUD responsive** với wrapping tốt
- **Modal/Sheet full-width** với padding nhỏ (calc(100vw - 8px))
- Font size mặc định: 12px
- Buttons: padding 5px 8px
- Stats: chỉ 10px font size

### 3. **Mobile JavaScript** (`src/ui/mobile.js`)

#### `fixMobileViewportHeight()`
- Fix lỗi `100vh` trên browser mobile (address bar ăn chiều cao)
- Cập nhật `--vh` CSS variable theo thực tế
- Lắng nghe `resize` và `orientationchange`

#### `isTouchDevice()`
- Phát hiện thiết bị touch
- Có thể dùng sau để optimize interaction

#### `disableDoubleTapZoom()`
- Ngăn zoom khi double-tap
- Cải thiện performance

#### `initMobileUI()`
- Quản lý toggle drawer trên mobile
- Đóng drawer khi click dock buttons
- Handle orientation change

### 4. **Main.js Integration** (`src/main.js`)
- Import mobile utilities
- Gọi `fixMobileViewportHeight()` sớm
- Gọi `disableDoubleTapZoom()` sớm
- Gọi `initMobileUI()` sau khi UI mount

## Hành vi trên Mobile

### Điện thoại (< 480px):
1. **Drawer ẩn mặc định** → Giải phóng space cho game
2. **HUD hiển thị lên trên** → Font nhỏ nhưng vẫn đọc được
3. **Dock ở dưới** → Dễ bấm bằng ngón tay
4. **Click dock → đóng drawer** → Không bị che game
5. **Modal full-width** → Dễ tương tác

### Máy tính bảng (480px - 768px):
1. **Drawer compact nhưng visible**
2. **Dock dàn đều**
3. **Font tối ưu cho khoảng cách đọc**

### Desktop (> 1024px):
1. Layout hiện tại không thay đổi
2. Tất cả visible cùng lúc

## CSS Custom Properties Có Thể Dùng

```css
--vh /* 1% của viewport height thực tế, fix cho mobile browser */
```

## Testing Checklist

- [ ] Mở trên iPhone (375px)
- [ ] Mở trên Android (360px - 480px)
- [ ] Test iPad (768px)
- [ ] Test laptop (1920px+)
- [ ] Quay ngang (landscape) trên phone
- [ ] Scroll drawer trên small screen
- [ ] Bấm buttons không bị zoom
- [ ] HUD không bị tràn

## Future Optimizations

1. Có thể thêm swipe gesture để toggle drawer
2. Có thể compress sprites cho mobile
3. Có thể reduce game loop frame rate trên low-end devices
4. Có thể lazy load UI components
5. Có thể dùng `<picture>` cho art assets

## Notes

- Tất cả thay đổi CSS đặt ở cuối `main.css` trong media queries
- JavaScript không check user agent, chỉ dùng window size
- Mobile utilities có thể reuse cho future features
