# Vihali Treasury — Design system

Tài liệu ngắn cho bản dashboard (React + Tailwind + shadcn, đóng gói một file HTML bằng web-artifacts-builder).
Nguyên tắc: thêm màn hình mới thì dùng lại token và thành phần ở đây, không tự đặt cỡ chữ, màu hay kiểu bảng riêng.

## 1. Token

**Màu** (biến CSS trong `src/index.css`, có bản sáng và tối; dùng qua lớp Tailwind):

| Nhóm | Token | Dùng cho |
|---|---|---|
| Nền / chữ | `background`, `foreground`, `card`, `muted`, `muted-foreground`, `border` | Khung, chữ phụ, đường kẻ |
| Thương hiệu | `primary`, `bar`, `gold` | Nút chính, thanh đầu trang, chế độ người lập |
| Ngữ nghĩa | `pos` (thu / đạt), `neg` (chi / vượt / cảnh báo đỏ), `warn` (cần chú ý), `gold` | Số dương/âm, trạng thái |
| Biểu đồ | `c1`…`c7` | Thứ tự series cố định: c1 navy, c2 xanh biển, c3 vàng, c4 xanh lá, c5 đỏ, c6 xám, c7 tím |

Không viết mã màu hex trong trang; màu biểu đồ dùng `hsl(var(--cN))`.

**Cỡ chữ** (`tailwind.config.js` → `fontSize`; không dùng `text-[..px]`):

| Lớp | Cỡ | Dùng cho |
|---|---|---|
| `text-caption` | 11px | Ghi chú dưới số, nhãn trục |
| `text-small` | 12.5px | Bảng phụ, nội dung bản kế hoạch |
| `text-body` | 13px | Bảng và nội dung chính |
| `text-title` | 14px | Tiêu đề khung (Panel) |
| `text-kpi-sm` | 15px | Số trong dải chỉ số nhỏ |
| `text-lead` / `text-h3` | 16 / 17px | Tiêu đề mục |
| `text-kpi` | 21px | Số chính của thẻ KPI |
| `text-h1` | 22px | Tiêu đề trang |

Số luôn dùng lớp `num` (IBM Plex Mono, chữ số cùng độ rộng). Chữ thường: Be Vietnam Pro.

**Bo góc**: `rounded-md` cho khung/thẻ, `rounded-sm` cho nút, ô nhập, chip. **Khoảng cách**: khung `p-4`, giữa các khung `gap-4`, giữa thẻ KPI `gap-3`.

## 2. Thành phần (`src/components/kit.tsx`)

| Thành phần | Dùng khi | Ghi chú |
|---|---|---|
| `Panel` | Mọi khung nội dung | `title`, `sub`, `right`; `pad={false}` khi bên trong là bảng |
| `Kpi` | Thẻ chỉ số đầu trang | `value` nhận chuỗi hoặc phần tử (ví dụ USD + dòng VND); `onClick` thành nút chuyển tab; `alert` viền đỏ |
| `Chip` | Nhãn trạng thái | `tone`: default, primary, pos, neg, warn, gold |
| `Segmented` | Chọn 1 trong vài lựa chọn (USD/VND, tháng, chủ sổ/ngân hàng) | Có `role="radiogroup"`, đi được bằng phím Tab |
| `Donut` + `Legend` | Cơ cấu tỷ trọng | Tối đa ~7 phần, phần nhỏ gộp "Khác" |
| `Delta` | Tăng/giảm lãi suất | Hiện theo bps, ▲ xanh ▼ đỏ |
| `rowToggle(open, toggle)` | Dòng bảng bấm để mở chi tiết | Trả về thuộc tính cho `<tr>`: bấm chuột, Enter/Space, `aria-expanded` |
| `scrollBody` | Bảng dài trong khung cố định chiều cao | Tiêu đề cột dính khi cuộn (lớp `scrollbox`) |
| `th`, `td`, `tn` | Ô bảng | `tn` = ô số canh phải |
| `chartAxisTick`, `chartAxisLine`, `chartGrid`, `chartTip` | Mọi biểu đồ Recharts | Giữ trục, lưới, tooltip giống nhau ở mọi tab |

## 3. Mẫu bố cục

- **Hai cột song song Vihali | Cá nhân** (tab Kế hoạch, phần thực chi): `grid xl:grid-cols-2 gap-4`, mỗi khung `className="xl:h-[…px]"`, thân khung `flex flex-col h-full`, bảng bọc trong `scrollBody`. Dưới `xl` tự xếp chồng.
- **Dải chỉ số trong khung**: `grid grid-cols-N border-b`, mỗi ô `px-4 py-3`, ô sau có `border-l`.
- **Số tiền**: tab Tổng quan dùng USD và một dòng VND nhỏ (tỷ giá `FX` trong `lib/fmt.ts`); các tab nghiệp vụ dùng VND đầy đủ (`nf`) hoặc tỷ (`ty`).
- **Thông tin nhạy cảm**: không hiện tên cá nhân trong dữ liệu thực chi; số dư token chỉ hiện sau khi nhập mã xem.

## 4. Quy trình build

`dashboard-src-preview/` → `parcel build index.html` → `html-inline` → chèn `<head>` (tiêu đề, font, `__TM_BASE`, `__TM_PREVIEW`) → `preview/index.html`.
