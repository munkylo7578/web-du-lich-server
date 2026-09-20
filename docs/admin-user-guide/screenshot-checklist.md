# Checklist chụp ảnh hướng dẫn quản trị

Cập nhật 20/09/2026. Đã chụp 13 ảnh thật từ `https://admin.kindtraveldmc.com/` bằng Codex In-app Browser sau khi đăng nhập qua luồng bình thường. Các ảnh danh sách đã che phẳng dữ liệu bản ghi; các ảnh biểu mẫu dùng biểu mẫu trống. Không khởi chạy dự án cục bộ.

## Giới hạn bắt buộc cho đợt chụp hiện tại

- Đây là production: chỉ điều hướng đọc và chụp ảnh. Không gửi biểu mẫu, lưu, tạo/xóa bản ghi, đổi cấu hình, tải tệp hoặc nhập dữ liệu để dựng cảnh. Nếu không chắc thao tác có ghi dữ liệu hay không, dừng và hỏi người phụ trách.
- Đăng nhập do chủ tài khoản thực hiện sau khi đã kiểm tra URL truy cập được. Không gửi mật khẩu, mã xác thực, cookie hoặc token vào cuộc trò chuyện, tài liệu hay tệp.
- Chỉ mở bản ghi đã được người phụ trách xác nhận không chứa dữ liệu riêng tư. Không mặc định mọi dữ liệu trong danh sách admin đều công khai. Nếu chưa biết dữ liệu có an toàn không, ưu tiên biểu mẫu tạo trống hoặc chờ ảnh đã được chủ sở hữu xử lý.
- Không cố tình tạo lỗi xác thực, gửi dữ liệu sai hoặc tải thử tệp. S13 và S20 không được thực hiện trong phạm vi hiện tại.
- Hộp xác nhận xóa chỉ được mở khi đã xác định nút đầu tiên không xóa ngay; sau khi chụp chọn **Hủy**. Không chạm nút xác nhận xóa.

## Cách chụp thủ công

1. Mở môi trường được phê duyệt với dữ liệu mẫu an toàn đã có sẵn. Không tạo dữ liệu mẫu trên production cho đợt chụp này.
2. Dùng cùng trình duyệt, cùng kích thước cửa sổ và mức thu phóng 100%. Mục tiêu vùng hiển thị 1440 × 1000; nếu không đặt được, ghi kích thước thực tế, không khai là đã dùng 1440 × 1000.
3. Mở đúng màn hình, thẻ ngôn ngữ và vị trí cuộn theo bảng. Chờ tải xong, không để khung đang tải hoặc ảnh lỗi.
4. Trên Windows, bấm **Win + Shift + S**, chọn vùng hình chữ nhật chứa phần giao diện cần minh họa. Không chụp mật khẩu dù đã che bằng dấu chấm, thanh địa chỉ có token, hồ sơ trình duyệt hay trình quản lý mật khẩu.
5. Lưu PNG đúng tên bảng. Không chụp bằng camera hoặc gửi qua công cụ làm giảm chất lượng ảnh.
6. Kiểm tra dữ liệu riêng tư trước khi lưu vào `screenshots/`. Nếu cần che, dùng lớp màu đục và xuất ảnh phẳng; kiểm tra lại chính ảnh đã xuất. Không dùng hình phủ trong Word để che bí mật. Không đặt bản gốc nhạy cảm trong repo.
7. Gửi ảnh kèm ID, ngày chụp, trình duyệt, kích thước và phiên bản triển khai nếu biết. Người soạn kiểm tra từng ảnh rồi chuyển trạng thái **Đã chụp** → **Đã kiểm tra** trước khi nhúng Word.

## Thông tin cần ghi cho mọi ảnh

Môi trường: production được chủ sở hữu phê duyệt; URL lưu bằng nhãn an toàn nếu không cần công khai tên miền. Với ảnh đã chụp, ngày giờ/múi giờ, viewport, zoom và thao tác chỉ đọc được ghi trong bảng và verification-notes.md. Các hàng còn trạng thái chờ vẫn chưa có bằng chứng trình duyệt.

Mỗi hàng dưới đây yêu cầu chung: đã truy cập hợp lệ, chỉ dữ liệu an toàn, không lộ thông tin đăng nhập hoặc dữ liệu kinh doanh riêng tư. “Mở chỉnh sửa” chỉ mở để xem, không nhập, không chọn tệp, không lưu. Nếu giao diện thực tế khác nguồn, dừng quy trình liên quan và xác nhận phiên bản với chủ sở hữu.

| ID và tên PNG | Mục / đường dẫn | Điều kiện và thao tác chỉ đọc | Khung chụp và nội dung bắt buộc | Kiểm tra riêng tư riêng | Chú thích tiếng Việt | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| S01 · 01-dang-nhap.png | 2.1 · /login | Chưa đăng nhập; chỉ mở trang | Đầu trang; hai ô trống và Đăng nhập | Không autofill, không mật khẩu, không tên tài khoản | Màn hình đăng nhập với các trường để trống | Đã kiểm tra |
| S02 · 02-dieu-huong.png | 2.2 · /admin/tours | Đã truy cập; mở Settings ở thanh bên | Sidebar đầy đủ, Trang chủ, Chung và tiêu đề trang | Không chụp dữ liệu bảng chưa được duyệt | Các mục điều hướng chính và hai nhóm Settings | Đã kiểm tra |
| S03 · 03-diem-den-danh-sach.png | 4.1 · /admin/destinations | Mở Điểm đến | Danh sách, tìm kiếm, thao tác, phân trang | Dữ liệu bảng đã che phẳng | Danh sách điểm đến và công cụ tìm kiếm | Đã kiểm tra |
| S04a · 04a-diem-den-tieng-viet.png | 4.2 · /admin/destinations | Mở Tạo điểm đến trống | Đầu drawer; Quốc gia, Tiếng Việt, tên, mô tả | Không nhập tên thật | Thông tin quốc gia và nội dung tiếng Việt của điểm đến | Đã kiểm tra |
| S04b · 04b-diem-den-english.png | 4.2 · /admin/destinations | Chuyển English của drawer đang mở | Vùng ngôn ngữ; tên và mô tả | Nội dung trống hoặc đã được duyệt | Các trường tiếng Anh của điểm đến | Chưa chụp |
| S04c · 04c-diem-den-phuong-xa.png | 4.2 · /admin/destinations | Drawer mặc định Việt Nam hoặc bản ghi Việt Nam an toàn | Cuộn vùng Phường/xã liên quan; ô tìm và liên kết hiện có | Không đổi quốc gia hoặc chọn liên kết | Vùng phường/xã áp dụng cho điểm đến Việt Nam | Chưa chụp |
| S05 · 05-dich-vu-danh-sach.png | 5.1 · /admin/services | Mở Dịch vụ; chỉ xem bộ lọc | Tìm kiếm, bộ lọc, bảng và phân trang | Dữ liệu bảng đã che phẳng | Danh sách dịch vụ và bộ lọc phân loại | Đã kiểm tra |
| S06a · 06a-dich-vu-thong-tin.png | 5.2 · /admin/services | Mở Tạo dịch vụ trống | Đầu drawer; phân loại, tên, mô tả VI | Không nhập nội dung | Phân loại và nội dung tiếng Việt của dịch vụ | Đã kiểm tra |
| S06b · 06b-dich-vu-anh.png | 5.2 · /admin/services | Cuộn drawer; có thể chụp English thành ảnh bổ sung 06c | Vùng Hình ảnh, hướng dẫn chọn và ảnh hiện có nếu an toàn | Không chọn tệp hoặc paste | Khu vực ảnh dịch vụ và ảnh đại diện theo thứ tự | Chưa chụp |
| S07 · 07-tour-danh-sach.png | 6.1 · /admin/tours | Mở Tours | Tìm theo tên tour, Tạo tour mới, thao tác dòng, phân trang | Dữ liệu bảng đã che phẳng | Danh sách tour và nút tạo tour mới | Đã kiểm tra |
| S08 · 08-tour-thong-tin.png | 6.2 · /admin/tours | Mở Tạo tour mới trống | Thông tin; tháng, thẻ VI, tên, mô tả | Không nhập hoặc đổi tháng | Thông tin khởi hành và nội dung tiếng Việt của tour | Đã kiểm tra |
| S09 · 09-tour-english.png | 6.2 · /admin/tours | Chuyển English trong biểu mẫu trống | Tên, mô tả, bao gồm/không bao gồm | Không sửa bản dịch | Bản tiếng Anh và các quyền lợi của tour | Đã kiểm tra |
| S10 · 10-tour-chang.png | 6.4 · /admin/tours | Mở Kế hoạch tour trong biểu mẫu trống | Nút Thêm chặng và trạng thái chưa có lịch trình | Không Thêm chặng; không xóa; không chọn tệp | Thẻ kế hoạch tour khi chưa có chặng | Đã kiểm tra |
| S11a · 11a-tour-diem-den.png | 6.3 · /admin/tours | Thông tin; cuộn Điểm đến | Bộ tìm, hướng dẫn chỉ chọn điểm đến đã có, liên kết an toàn | Không gắn hoặc gỡ điểm đến | Chọn điểm đến từ danh mục đã có | Chưa chụp |
| S11b · 11b-tour-dich-vu.png | 6.5 · /admin/tours | Mở thẻ Dịch vụ trong biểu mẫu trống | Mô tả chung và từng nhóm | Không gắn/gỡ, không sửa mô tả | Mô tả chung và dịch vụ theo từng nhóm của tour | Đã kiểm tra |
| S12 · 12-tour-anh-bia.png | 6.6 · /admin/tours | Tour an toàn có ảnh; Thông tin → Hình ảnh | Ảnh bìa, Đặt làm bìa, Tên ảnh, nút bỏ ảnh | Không đổi bìa, sửa tên hay chọn tệp | Ảnh tour với nhãn ảnh bìa và tên ảnh | Chưa chụp — cần ảnh an toàn |
| S13 · 13-tour-sau-luu.png | 6.7 · /admin/tours | Cần môi trường ghi được phê duyệt riêng để kiểm chứng lưu | Kết quả lưu và mở lại cùng nội dung mẫu | Không gửi lưu trên production | Nội dung tour sau khi lưu và mở lại để kiểm tra | Bị chặn — chỉ đọc |
| S14a · 14a-xac-nhan-xoa-tour.png | 6.8 · /admin/tours | Nút đầu chỉ mở hộp thoại đã đối chiếu nguồn; mở rồi Hủy | Chỉ hộp thoại cảnh báo không thể hoàn tác và hai nút | Không xác nhận xóa; nền không lộ dữ liệu | Cảnh báo trước khi xóa tour | Chưa chụp |
| S14b · 14b-xoa-diem-den.png | 4.3 · /admin/destinations | Hộp xác nhận rồi Hủy; hoặc nút khóa trên dòng an toàn | Cảnh báo liên kết tour hoặc trạng thái không thể xóa | Không gỡ liên kết để bật nút | Điểm đến đang liên kết tour không thể xóa | Chưa chụp |
| S14c · 14c-xoa-dich-vu.png | 5.3 · /admin/services | Hộp xác nhận rồi Hủy; hoặc nút khóa trên dòng an toàn | Cảnh báo và Hủy; hoặc trạng thái khóa | Không xác nhận xóa | Giới hạn xóa dịch vụ đang được dùng trong tour | Chưa chụp |
| S15 · 15-settings-trang-chu.png | 7.1 · /admin/settings/home | Mở Settings → Trang chủ | Tiêu đề, tìm kiếm, bảng và thao tác | Dữ liệu bảng đã che phẳng | Nhóm cấu hình Trang chủ | Đã kiểm tra |
| S16 · 16-settings-chung.png | 7.1 · /admin/settings/general | Mở Settings → Chung | Tiêu đề và nhãn Không thể xóa | Dữ liệu bảng, gồm giá trị liên hệ, đã che phẳng | Nhóm cấu hình Chung và cấu hình được bảo vệ | Đã kiểm tra |
| S17 · 17-settings-van-ban-dinh-dang.png | 7.2 · /admin/settings/home hoặc /general | Mở cấu hình text an toàn | Key, Loại cố định, thẻ ngôn ngữ, editor và nút lưu | Không sửa; không chụp nội dung riêng tư | Cấu hình văn bản có định dạng và nội dung từng ngôn ngữ | Chưa chụp |
| S18 · 18-settings-van-ban-thuan.png | 7.2 · /admin/settings/home hoặc /general | Mở cấu hình plain_text an toàn | Ô nhập một dòng và ngôn ngữ | Không đưa email/số điện thoại riêng tư vào ảnh | Cấu hình văn bản thuần | Chưa chụp |
| S19a · 19a-settings-anh.png | 7.3 · /admin/settings/home hoặc /general | Mở cấu hình ảnh an toàn | Vùng chọn ảnh, preview có sẵn, thông báo tải khi lưu | Không chọn/thay ảnh | Khu vực ảnh của cấu hình | Chưa chụp |
| S19b · 19b-settings-video.png | 7.3 · /admin/settings/home hoặc /general | Mở cấu hình video an toàn | Video hiện tại, Chọn video/Thay video, giới hạn MP4 | Không chọn/thay tệp; không chụp khung video riêng tư | Khu vực video MP4 của cấu hình | Chưa chụp |
| S20 · 20-loi-bieu-mau.png | 9 · tùy biểu mẫu | Chỉ sau khi có môi trường kiểm thử và quyền gửi riêng | Lỗi rõ ràng cùng tên trường liên quan | Không tạo lỗi trên production | Thông báo yêu cầu kiểm tra trường nhập liệu | Bị chặn — không gửi biểu mẫu |
| S21 · 21-tao-setting.png | 7.4 · /admin/settings/home hoặc /general | Mở Tạo setting trống rồi Hủy | Key, Loại, Cho phép xóa, nhóm hiện tại | Không nhập hoặc thay tùy chọn | Biểu mẫu tạo cấu hình và lựa chọn cho phép xóa | Chưa chụp |
| S22 · 22-thanh-soan-thao.png | 8.1 · bất kỳ editor an toàn | Chỉ xem vùng editor | Sáu nút định dạng, nội dung trống/an toàn | Không bấm định dạng làm đổi nội dung | Các công cụ định dạng văn bản | Chưa chụp |

## Sau khi nhận ảnh

Kiểm tra từng ảnh ở kích thước gốc; loại ảnh chưa che kín dữ liệu riêng tư, mờ hoặc sai phiên bản. Ghi bằng chứng trình duyệt vào `verification-notes.md`; không dùng ảnh mở bản ghi cũ để xác nhận một lần lưu mới. Thay dòng chờ ảnh tương ứng trong Markdown bằng liên kết tương đối, ví dụ `![Hình 1. Màn hình đăng nhập](screenshots/01-dang-nhap.png)`, rồi dựng lại Word. Đánh số hình theo thứ tự xuất hiện; ID Sxx vẫn giữ ổn định để truy vết.
