# Settings Video Upload — kế hoạch tối giản

## Mục tiêu

Thêm loại **Video** vào màn hình Settings để admin chọn và upload một file MP4 khi tạo hoặc sửa setting.

## Phạm vi đã chốt

- Lưu file trên VPS bằng vùng upload hiện có.
- Chỉ nhận một file MP4, tối đa 50 MB.
- File nằm trong thư mục `settings/videos` dưới `UPLOAD_DIR`.
- Database chỉ lưu URL tương đối dạng `/uploads/settings/videos/...`.
- Video dùng chung cho mọi ngôn ngữ, giống cách setting Ảnh đang dùng giá trị chung.
- Chỉ upload khi admin bấm Lưu.
- Không viết thêm Jest test cho tính năng này.
- Không làm chuyển mã, thumbnail, progress upload, chunk upload, object storage hay tự động xóa video cũ.

## Checklist triển khai

- [ ] Thêm `video` vào loại setting và cập nhật constraint để Ảnh/Video lưu URL, Text tiếp tục lưu translations tại [`site-settings.ts`](../libs/database/src/schema/site-settings.ts:6).
- [ ] Sinh một migration Drizzle mới cho enum và constraint, không sửa migration cũ.
- [ ] Mở rộng domain và form schema để chấp nhận loại Video tại [`setting.ts`](../apps/admin/src/domains/setting/domain/setting.ts:1) và [`settings-form-schema.ts`](../apps/admin/src/features/admin-settings/settings-form-schema.ts:3).
- [ ] Thêm hàm lưu video vào [`upload.ts`](../apps/admin/src/features/admin-settings/upload.ts:1): chỉ nhận `video/mp4`, kiểm tra file không rỗng và tối đa 50 MB, sinh tên `.mp4` duy nhất, lưu dưới `settings/videos`.
- [ ] Cập nhật [`saveSettingAction()`](../apps/admin/src/app/admin/settings/actions.ts:17): nhận file video, bắt buộc file khi tạo Video, giữ URL cũ nếu sửa mà không chọn file mới, và xóa file mới nếu lưu database thất bại.
- [ ] Thêm trường chọn Video đơn giản trong [`settings-management.tsx`](../apps/admin/src/components/admin/settings/settings-management.tsx:183): chọn/thay/bỏ file, xem trước bằng thẻ video có controls, hiển thị tên và dung lượng, chỉ gửi file khi bấm Lưu.
- [ ] Thêm lựa chọn, badge và URL Video trong danh sách Settings tại [`settings-management.tsx`](../apps/admin/src/components/admin/settings/settings-management.tsx:296).
- [ ] Cập nhật API để Video trả URL chung, không qua translations, tại [`ContentService.mapSetting()`](../apps/api/src/app/content/content.service.ts:343).
- [ ] Thêm `MAX_UPLOAD_VIDEO_MB=50` vào [`.env.example`](../.env.example:23) và tăng giới hạn Server Action trong [`next.config.js`](../apps/admin/next.config.js:6) lên 55 MB để có dư multipart.
- [ ] Chạy generate migration, lint và build; kiểm tra thủ công tạo Video, sửa mô tả giữ URL cũ, thay video, file quá 50 MB, và bảo đảm Text/Ảnh vẫn hoạt động.

## Tiêu chí hoàn thành

- Admin tạo được setting Video bằng một MP4 hợp lệ.
- Khi tải lại Settings, loại Video và URL đã lưu vẫn hiển thị đúng.
- Sửa mô tả không bắt buộc chọn lại video; thay file sẽ tạo URL mới.
- API trả cùng URL Video cho tiếng Việt và tiếng Anh nếu key nằm trong allowlist public hiện có.
- File không phải MP4, file rỗng hoặc vượt 50 MB bị từ chối.
- Hủy form trước khi Lưu không tạo file trên VPS.
