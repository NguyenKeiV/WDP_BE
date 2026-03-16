# Tổng kết thay đổi Backend (WDP_BE)

Tài liệu này liệt kê các thay đổi đã thực hiện trên repo **WDP_BE**.

---

## 1. Rescue team gửi ảnh khi hoàn thành nhiệm vụ

| File | Thay đổi |
|------|----------|
| `src/models/rescue_requests.model.js` | Thêm field **`completion_media_urls`** (JSON, mảng, `allowNull: true`, `defaultValue: []`) – ảnh báo cáo từ đội khi hoàn thành. |
| `src/services/rescue_request.js` | **`completeMission`**: thêm tham số thứ 4 `completionMediaUrls`; trong `request.update(...)` thêm `completion_media_urls`. |
| `src/controllers/rescue_requests.js` | **`completeMission`**: lấy `completion_media_urls` từ `req.body`, truyền xuống service. |

**API:** `POST /api/rescue-requests/:id/complete`  
Body có thể gửi thêm: `completion_media_urls` (array of URL string).

---

## 2. Đồng bộ request – Nhiệm vụ đã hoàn thành

| File | Thay đổi |
|------|----------|
| `src/services/rescue_request.js` | Import `Op` từ `sequelize`. **`getMyTeamMissions`**: điều kiện `status` đổi thành `{ [Op.in]: ["on_mission", "completed"] }` để trả về cả nhiệm vụ đã xong. |

**API:** `GET /api/rescue-requests/my-team-missions`  
Response bao gồm cả request có `status: on_mission` và `completed`.

---

## 3. Kiểm kê vật phẩm (rescue team)

| File | Thay đổi |
|------|----------|
| `src/routes/supplies.route.js` | Thêm **GET /supplies/my-team-distributions** (middleware `requireRescueTeam`). Import `requireRescueTeam` từ auth. |
| `src/controllers/supplies.js` | Thêm **`getMyTeamDistributions`**: lấy team theo `user_id` (RescueTeamService.getTeamByUserId), gọi `getDistributionsByTeamId`, trả về distributions của đội. |
| `src/services/supply.js` | Thêm **`getDistributionsByTeamId(teamId, page, limit)`** – gọi `getDistributions` với filter `team_id`. |
| `src/services/rescue_team.js` | Thêm **`getTeamByUserId(userId)`** – tìm team theo `user_id` (tài khoản trưởng đội). |

**API:** `GET /api/supplies/my-team-distributions?page=1&limit=20`  
Yêu cầu: token, role `rescue_team` (hoặc admin). Trả về danh sách phân phối vật phẩm cho đội của user đăng nhập.

---

## 4. Báo cáo thu hồi xe (rescue team)

| File | Thay đổi |
|------|----------|
| `src/routes/vehicle_requests.route.js` | Thêm **POST /vehicle-requests/:id/report-return** (middleware `requireRescueTeam`). Import `requireRescueTeam`. |
| `src/controllers/vehicle_requests.js` | Thêm **`reportReturnByTeam`**: nhận `id`, gọi `VehicleRequestService.reportReturnByTeam(id, req.user.id)`, trả về message thành công. |
| `src/services/vehicle_request.js` | Thêm **`reportReturnByTeam(id, userId)`**: lấy team theo userId; kiểm tra request thuộc đội đó và status `approved`; cập nhật request thành `returned`, cập nhật vehicle về `available`, bỏ `assigned_team_id`, `vehicle_request_id`. |

**API:** `POST /api/vehicle-requests/:id/report-return`  
Yêu cầu: token, role `rescue_team`. Chỉ đội được cấp xe (request.team_id = đội của user) mới gọi được.

---

## 5. Upload ảnh

| File | Thay đổi |
|------|----------|
| `package.json` | Thêm dependency **multer**. |
| `src/controllers/upload.js` | **Mới.** Controller **`uploadImage`**: nhận `req.file`, trả về `{ success, url }` với URL dạng `baseUrl/api/uploads/filename`. |
| `src/routes/upload.route.js` | **Mới.** Cấu hình multer (lưu vào thư mục `uploads`), tạo thư mục nếu chưa có. Route **POST /upload** (middleware `optionalAuth`), field `image`. |
| `src/routes/index.js` | Mount **`/upload`** → `uploadRoute`. |
| `index.js` | Thêm **`express.static`** cho thư mục `uploads` tại `/api/uploads`. |

**API:** `POST /api/upload`  
Content-Type: `multipart/form-data`, field: `image`. Response: `{ success, url }`. Ảnh được phục vụ tại `GET /api/uploads/<filename>`.

---

## 6. Gắn yêu cầu guest vào user sau đăng nhập (link-to-me)

| File | Thay đổi |
|------|----------|
| `src/services/rescue_request.js` | Thêm **`linkGuestRequestsToUser(requestIds, userId)`**: cập nhật `user_id` thành `userId` cho các rescue_request có `id` nằm trong `requestIds` và **đang có `user_id = null`**. Trả về `{ linked, request_ids }`. |
| `src/controllers/rescue_requests.js` | Thêm **`linkToMe`**: lấy `request_ids` từ `req.body`, gọi service `linkGuestRequestsToUser`, trả về số yêu cầu đã gắn. |
| `src/routes/rescue_requests.route.js` | Thêm **POST /rescue-requests/link-to-me** (middleware `requireAuth`), đặt **trước** route `/:id` để không bị nhầm với id. |

**API:** `POST /api/rescue-requests/link-to-me`  
Body: `{ "request_ids": ["uuid1", "uuid2", ...] }`.  
Yêu cầu: token (đã đăng nhập). Chỉ các yêu cầu có `user_id = null` mới được gắn vào user hiện tại. Dùng để mobile gọi sau khi citizen đăng nhập, gửi danh sách id yêu cầu tạo lúc guest để gắn vào tài khoản.

---

## Tóm tắt API mới / thay đổi

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/rescue-requests/:id/complete` | Body thêm `completion_media_urls` (array). |
| GET | `/api/rescue-requests/my-team-missions` | Trả thêm request có status `completed`. |
| POST | `/api/rescue-requests/link-to-me` | **Mới.** Gắn yêu cầu guest vào user đăng nhập. |
| GET | `/api/supplies/my-team-distributions` | **Mới.** Danh sách vật phẩm phân cho đội (rescue_team). |
| POST | `/api/vehicle-requests/:id/report-return` | **Mới.** Rescue team báo cáo đã trả xe. |
| POST | `/api/upload` | **Mới.** Upload ảnh, trả về URL. |
| GET | `/api/uploads/*` | **Mới.** Phục vụ file tĩnh ảnh đã upload. |

---

## Database

- Bảng **`rescue_requests`**: thêm cột **`completion_media_urls`** (JSON/JSONB). Nếu dùng `sequelize.sync({ alter: true })` thì cột sẽ được tạo tự động khi chạy server; nếu không thì cần migration hoặc alter bảng thủ công.

---

## Dependency

- **multer** – đã thêm vào `package.json`. Chạy `npm install` trong thư mục WDP_BE nếu chưa cài.

---

*Tài liệu cập nhật theo các thay đổi đã triển khai trên WDP_BE.*
