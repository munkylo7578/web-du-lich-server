# Ghi chú kiểm chứng

## Trạng thái và môi trường

- Ngày kiểm tra nguồn: 20/09/2026, múi giờ Asia/Bangkok.
- Revision nguồn: `2b38b7ecf2552f60bd1e951cf4341920969b661a`.
- Khi bắt đầu, `plans/codex-admin-user-manual-brief.md` là tệp chưa được Git theo dõi. Không thay đổi tệp này.
- Môi trường: `https://admin.kindtraveldmc.com/`, production theo URL chủ sở hữu cung cấp. Truy cập được và chuyển về `/login`; đăng nhập qua giao diện bằng tài khoản do chủ sở hữu cung cấp. Không ghi lại tài khoản hoặc mật khẩu.
- Công cụ: Codex In-app Browser qua `cua_repl`, tab 1. Đăng nhập thành công và điều hướng được các route `/admin/tours`, `/admin/destinations`, `/admin/services`, `/admin/settings/home`, `/admin/settings/general`.
- Ảnh ứng dụng: **13** PNG thật, chụp 20/09/2026, viewport thực tế khoảng 1936 × 1224, zoom mặc định của tab. Ảnh S03/S05/S07/S15/S16 đã che phẳng nội dung bản ghi trước khi đưa vào deliverable. Không có ảnh chứa mật khẩu, cookie, token hoặc email.
- Chỉ nhập thông tin đăng nhập vào chính URL quản trị được chủ sở hữu cung cấp; không đọc cookie/token hoặc lưu trạng thái phiên. Không đọc tệp `.env` thực tế. Chỉ đọc tên biến từ `.env.example`, không đưa giá trị vào tài liệu.
- Không khởi chạy dự án, build ứng dụng, kết nối cơ sở dữ liệu, chạy migration hay gọi hành động ghi. Không thử lưu, tải tệp, xóa hoặc thay đổi cấu hình. Không commit.
- Các màn hình điều hướng, danh sách và biểu mẫu trống đã được xác minh trong trình duyệt. Các thao tác ghi (lưu, upload, xóa) vẫn chưa được thực hiện. Bản Word giữ nhãn **BẢN NHÁP — CHƯA ĐỦ ẢNH/XÁC MINH** vì chưa có bằng chứng thao tác ghi và chưa duyệt trực quan Word.

## Bảng bằng chứng theo quy trình

Các đường dẫn sau tính từ gốc repository. “Nguồn” nghĩa là đã đọc mã thực thi, không có nghĩa đã chạy kiểm thử. Cột trạng thái phân biệt rõ màn hình đã xem/chụp trong trình duyệt với quy trình chỉ được suy ra từ mã nguồn; việc xem màn hình không chứng minh thao tác ghi đã thành công.

| Quy trình | Bằng chứng nguồn | Kết luận từ nguồn | Trạng thái trình duyệt |
| --- | --- | --- | --- |
| Đăng nhập, lỗi và trang đầu | `apps/admin/src/components/auth/login-form.tsx`; `app/login/actions.ts`; `app/admin/page.tsx` dưới cùng `apps/admin/src/` | Nhãn Tên đăng nhập, Mật khẩu, Đăng nhập; sai thông tin có lỗi; /admin chuyển /admin/tours | Đã xác minh trang và đăng nhập thành công; không thử lỗi |
| Phiên và đăng xuất | `apps/admin/src/lib/auth/session.ts`; `components/admin/admin-shell.tsx` | Nguồn đặt thời hạn phiên 8 giờ; có hàm xóa phiên nhưng chưa có nút đăng xuất hoạt động trong shell | Chưa kiểm tra hết phiên; không nêu thời hạn như cam kết production |
| Menu và sidebar | `apps/admin/src/components/admin/admin-shell.tsx:48`; `libs/database/src/contracts/setting-category.ts` | Tours, Điểm đến, Dịch vụ, Settings với Trang chủ/Chung; desktop thu gọn, mobile Menu | Đã xác minh; ảnh S02 |
| Tìm kiếm và phân trang | `apps/admin/src/components/admin/shared/server-pagination.tsx`; `features/shared/admin-list.ts`; `hooks/use-server-pagination.ts` | Các danh sách có Trước/Sau; kích thước 10, 20, 50, mặc định 10 | Đã xác minh hiển thị danh sách và điều khiển; chưa gửi tìm kiếm/chuyển trang |
| Điểm đến tạo/sửa | `apps/admin/src/components/admin/destinations/destination-management.tsx:250`; `features/admin-tours/tour-form-schema.ts:61`; `app/admin/destinations/actions.ts` | Tên VI ≥2; EN tùy chọn; mô tả tùy chọn; quốc gia bắt buộc | Đã xác minh biểu mẫu trống S04a; không thực hiện lưu |
| Quốc gia và phường/xã | `libs/database/src/contracts/destination-country.ts`; `apps/admin/src/components/admin/destinations/destination-management.tsx:279` | Lào, Cambodia, Việt Nam; tìm phường/xã từ 2 ký tự; chỉ VN; đổi khỏi VN xóa liên kết khi lưu | Chỉ nguồn; không đổi dữ liệu để chụp |
| Xóa điểm đến | `apps/admin/src/components/admin/destinations/destination-management.tsx:139`; `features/admin-tours/repository.ts:192` | UI khóa và repository từ chối khi liên kết tour | Chưa mở hộp thoại; không xóa |
| Dịch vụ tìm/lọc/tạo/sửa | `apps/admin/src/components/admin/services/service-management.tsx`; `features/admin-services/service-form-schema.ts`; `libs/database/src/contracts/service-category.ts` | Ba phân loại; VI tên ≥2; mô tả cả VI/EN nếu nhập ≥10; ảnh tùy chọn, ảnh đầu đại diện | Đã xác minh danh sách S05 và biểu mẫu trống S06a; không thực hiện lưu |
| Xóa dịch vụ | `apps/admin/src/components/admin/services/service-management.tsx`; `features/admin-services/repository.ts:255`; `app/admin/services/actions.ts` | Không xóa khi đang gắn tour; cảnh báo xóa bản dịch và ảnh | Chỉ nguồn; không xóa |
| Tour tìm/tạo/mở/xóa | `apps/admin/src/components/admin/tours/tour-management.tsx:49`; `app/admin/tours/actions.ts` | Danh sách dùng Tạo tour mới; tìm theo tên; xác nhận xóa không hoàn tác | Đã xác minh danh sách S07; không gửi lưu/xóa |
| Tour trường và bản dịch | `apps/admin/src/components/admin/tours/tour-form-drawer.tsx:289`; `features/admin-tours/tour-form-schema.ts:90` | Tháng null hoặc 1–12; tên VI ≥2; mô tả/bao gồm/không bao gồm VI nếu điền ≥10; EN tùy chọn | Đã xác minh S08/S09 với biểu mẫu trống; chưa gửi lưu |
| Tour điểm đến | `apps/admin/src/components/admin/tours/destination-manager.tsx:39` | Tìm từ 2 ký tự, chỉ chọn có sẵn; gỡ là sửa mảng liên kết, chưa ghi cho đến lưu | Chỉ nguồn |
| Tour chặng | `apps/admin/src/components/admin/tours/tour-form-drawer.tsx:391`; `features/admin-tours/tour-form-schema.ts` | Có thể 0 chặng; mỗi chặng có tên/mô tả VI bắt buộc; English tùy chọn; ảnh riêng | Đã xác minh thẻ trống S10; không thêm/xóa chặng |
| Tour nhóm dịch vụ | `apps/admin/src/components/admin/tours/service-manager.tsx`; `tour-form-drawer.tsx:472` cùng thư mục | Tìm từ 2 ký tự rồi lọc nhóm; mô tả chung/theo nhóm không chia ngôn ngữ, ≥10 nếu điền | Đã xác minh thẻ trống S11b; không gắn dịch vụ |
| Tour ảnh và ảnh chặng | `apps/admin/src/components/admin/tours/image-upload-field.tsx`; `plan-image-upload-field.tsx`; `features/admin-tours/tour-form-schema.ts:9` | Tên ảnh tùy chọn 2–500; cover/gallery; ảnh chặng allowPaste=false | Chỉ nguồn; không chọn/upload tệp |
| Thứ tự | `apps/admin/src/components/admin/shared/image-picker-field.tsx`; `tours/tour-form-drawer.tsx`; `tours/service-manager.tsx` dưới `components/admin/` | Thứ tự theo mảng/chọn; không thấy handlers kéo đổi thứ tự; GripVertical chỉ là biểu tượng | Chưa kiểm tra giao diện triển khai |
| Lưu tour và hủy | `apps/admin/src/components/admin/tours/tour-form-drawer.tsx:94,166,505`; `app/admin/tours/actions.ts` | Upload lúc submit; thành công đóng drawer; lỗi có thể chọn đúng tab; hủy reset tour | Bị chặn kiểm thử lưu theo phạm vi chỉ đọc |
| Hai nhóm Settings | `apps/admin/src/components/admin/settings/settings-management.tsx`; `app/admin/settings/[category]/page.tsx`; `libs/database/src/contracts/setting-category.ts` | Trang chủ/Chung; tìm kiếm trong nhóm; nhãn Không thể xóa | Đã xác minh S15/S16; nội dung bản ghi đã che trong ảnh |
| Setting văn bản | `apps/admin/src/components/admin/settings/settings-management.tsx:371`; `features/admin-settings/settings-form-schema.ts` | VI bắt buộc cho text/plain_text; EN tùy chọn; UI mô tả fallback về VI | Chưa xác minh website công khai; không khẳng định fallback mọi module |
| Setting ảnh/video | `apps/admin/src/components/admin/settings/settings-management.tsx:406,490`; `features/admin-settings/upload.ts`; `app/admin/settings/actions.ts` | Một ảnh hoặc video chung; chọn tệp rồi lưu; MP4 >0 và ≤50 MB ở client; server có cấu hình | Chỉ nguồn; không thử tải |
| Setting tạo/xóa/bảo vệ | `apps/admin/src/components/admin/settings/settings-management.tsx:313`; `app/admin/settings/actions.ts`; `domains/setting/domain/setting.ts:98` | Key, nhóm, loại cố định; key duy nhất; canDelete mặc định false trong form; xóa có bảo vệ | Chỉ nguồn; không sửa hoặc xóa |
| Soạn thảo | `apps/admin/src/components/admin/tours/rich-text-editor.tsx:71` | Sáu nút: In đậm, In nghiêng, Gạch chân, Danh sách, Danh sách số, Liên kết; prompt URL, trống gỡ liên kết | Chỉ nguồn; không định dạng nội dung thật |
| Chọn/tối ưu/tải ảnh | `apps/admin/src/components/admin/shared/image-picker-field.tsx:105`; `features/shared/image-optimization.ts`; `upload-validation.ts`; `image-upload.ts` cùng `features/shared/` | JPEG/PNG/WebP/AVIF; 50 MB client; 100 triệu pixel; cạnh tối đa sau tối ưu 2560; guard 500 MB có overhead; server MAX_UPLOAD_IMAGE_MB | Chưa xác minh giới hạn production |
| Yêu cầu vận hành | `README.md`; `package.json`; tên biến `.env.example`; `apps/admin/next.config.js` | Nx/Next admin; DB/auth/upload là yêu cầu môi trường; không đưa hướng dẫn triển khai vào manual | Không khởi động/kiểm tra kết nối |

## Những điểm cần phân biệt

1. Dòng hướng dẫn ở biểu mẫu tour nhắc tạo điểm đến, nhưng bộ chọn thực tế chỉ chọn bản ghi có sẵn và yêu cầu tạo ở màn hình Điểm đến. Manual dùng hành vi thực tế từ mã.
2. Các biểu tượng GripVertical không đủ chứng minh có thao tác kéo sắp xếp. Không hướng dẫn kéo chặng hoặc dịch vụ.
3. Mô tả chặng được kiểm tra là chuỗi không trống; tiêu chuẩn “phải có nội dung rõ nghĩa” trong manual là hướng dẫn biên tập, không khẳng định bộ kiểm tra loại hết HTML rỗng.
4. Thông báo thành công từ action không nhất thiết hiển thị lâu vì drawer đóng. Manual yêu cầu mở lại kiểm tra, không hứa luôn có toast thành công.
5. UI setting có dòng tooltip gợi ý xóa trực tiếp trong database. Không đưa cách vượt bảo vệ vào tài liệu người dùng.
6. 50 MB ảnh/video và 500 MB yêu cầu là giới hạn nguồn/UI, chưa phải mức kiểm chứng thực tế tại proxy hoặc máy chủ production.
7. Không có bằng chứng về draft/publish, giá, bookings/customers, phân quyền người dùng, quên mật khẩu, autosave, undo sau lưu hoặc preview website. Không viết quy trình cho các chức năng đó.
8. Chưa có nguồn–UI đối chiếu nên chưa thể kết luận website khác nguồn. Nếu phát hiện khác, hỏi phiên bản cần tài liệu hóa; không trộn hai phiên bản.

## Sinh tài liệu và kiểm tra

Python và python-docx/Pillow từ workspace runtime đã được kiểm tra có thể import. Builder `build_manual.py` đọc Markdown UTF-8, tạo A4, lề 2 cm, Arial 11 pt; bảng 10 pt với hàng tiêu đề lặp, heading Word, trường TOC và PAGE. Metadata tác giả để trống. Không có tài nguyên ảnh từ xa.

Không có LibreOffice trong danh sách native binaries của runtime Windows được cấp. Đã chạy `render_docx.py` với PATH giới hạn vào công cụ đi kèm runtime; kết quả `FileNotFoundError: LibreOffice soffice.exe was not found on PATH`. Không tạo được PNG/PDF, chưa duyệt trang, chưa cập nhật TOC bằng renderer. Không dùng LibreOffice desktop thay thế theo quy định của skill documents. README ghi rõ giới hạn này. Builder chạy thành công bằng Python với `-X utf8`; lần chạy đầu đã lưu DOCX nhưng lỗi in tiếng Việt ra console cp1252, đã khắc phục bằng chế độ UTF-8 và dựng lại.

Đã chạy `verify_manual.py` thành công: 283 đoạn văn ngoài bảng, 10 chương, 7 bảng có tiêu đề lặp, 0 ảnh nhúng, 7 liên kết cục bộ hợp lệ. Tệp ZIP/OOXML đọc được; có heading, TOC, PAGE; khổ A4, lề và font đúng cấu hình; không có quan hệ tài nguyên ngoài. Chưa chạy kiểm thử ứng dụng vì đây là công việc tài liệu và production chỉ cho phép đọc. Không có kiểm tra hiển thị trang nào được thực hiện thành công.

## Việc còn chờ

- Nhận URL, điều hướng chỉ đọc để kiểm tra truy cập; sau đó mới đề nghị chủ sở hữu đăng nhập qua giao diện nếu cần, không xin mật khẩu trong chat.
- Xác nhận phiên bản triển khai tương ứng revision nguồn; chỉ ra những bản ghi và giá trị an toàn để chụp.
- Chụp và duyệt ảnh theo checklist, nhúng bằng liên kết tương đối; ghi lại ngày/viewport/trình duyệt thực tế.
- Giữ các quy trình ghi dữ liệu ở trạng thái chỉ kiểm tra nguồn trừ khi được cấp môi trường và quyền kiểm thử riêng. Không có yêu cầu quyền ghi trên production trong đợt này.
- Cập nhật mục lục trong Word, xem toàn bộ trang, sửa lỗi bố cục nếu có và dựng lại trước khi bàn giao bản hoàn tất.
