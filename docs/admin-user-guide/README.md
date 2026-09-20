# Hướng dẫn cập nhật tài liệu quản trị

## Bàn giao hiện tại

**BẢN NHÁP — CHƯA ĐỦ ẢNH/XÁC MINH**, ngày 20/09/2026.

Đã tạo tài liệu Word và nguồn Markdown tiếng Việt dựa trên revision `2b38b7ecf2552f60bd1e951cf4341920969b661a`. Bao gồm đăng nhập, điều hướng, điểm đến, dịch vụ, tour, cả hai nhóm Settings, soạn thảo, tải tệp, xử lý lỗi và checklist cuối công việc.

Browser automation đã truy cập `https://admin.kindtraveldmc.com/` và đăng nhập qua luồng bình thường bằng thông tin chủ sở hữu cung cấp. Đã xác minh điều hướng, danh sách và biểu mẫu trống; **số ảnh thật đã chụp và nhúng: 13**. Các ảnh danh sách đã che phẳng dữ liệu bản ghi, gồm giá trị liên hệ. Không thực hiện lưu, upload, tạo bản ghi hoặc xóa dữ liệu. Không khởi chạy dự án cục bộ, không sửa dữ liệu production và không thay đổi mã ứng dụng/dependencies.

Word được dựng bằng python-docx từ Markdown. Có khổ A4, lề 2 cm, Arial 11 pt, bảng 10 pt, heading chuẩn, số trang và mục lục tự động. Đã thử công cụ `render_docx.py`; bị chặn vì runtime không có `soffice.exe`. **Chưa xem được các trang Word/PDF, chưa xác minh bố cục hoặc số trang, mục lục cần cập nhật trong Word.** Không có PDF hay PNG trang tài liệu để bàn giao. Kiểm tra cấu trúc không thay thế kiểm tra hiển thị.

## Danh sách tệp

- [huong-dan-su-dung-admin.docx](huong-dan-su-dung-admin.docx): tài liệu chính, đang là bản nháp.
- [huong-dan-su-dung-admin.md](huong-dan-su-dung-admin.md): nguồn nội dung chỉnh sửa được.
- [screenshot-checklist.md](screenshot-checklist.md): danh sách trạng thái cần chụp và hướng dẫn thủ công.
- [verification-notes.md](verification-notes.md): nguồn bằng chứng và giới hạn xác minh.
- [screenshots/](screenshots/): 13 PNG thật đã kiểm tra và nhúng; các ảnh còn thiếu trong checklist vẫn để trạng thái Chưa chụp/Bị chặn.
- [build_manual.py](build_manual.py): tạo Word từ Markdown, không kết nối mạng hoặc ứng dụng.
- [verify_manual.py](verify_manual.py): kiểm tra cấu trúc Word, bảng, heading, ảnh và liên kết Markdown.

## Cập nhật nội dung và ảnh

1. Đọc lại giới hạn chỉ đọc và checklist trước khi truy cập production.
2. Có URL thì kiểm tra truy cập trước khi đề nghị chủ sở hữu đăng nhập trực tiếp. Không lưu thông tin đăng nhập/session vào repo.
3. Đối chiếu phiên bản website với nguồn. Nếu có khác biệt, xác nhận bản cần tài liệu hóa rồi mới sửa hướng dẫn.
4. Chỉ chụp bản ghi an toàn đã được duyệt hoặc biểu mẫu trống. Không dựng cảnh bằng thao tác ghi. S13 và S20 vẫn bị chặn cho đến khi có phạm vi kiểm thử được phê duyệt riêng.
5. Kiểm tra từng ảnh PNG ở kích thước gốc, tên tệp và dữ liệu riêng tư. Đánh dấu **Đã kiểm tra** trong checklist.
6. Thay dòng “Hình minh họa Sxx: chờ ảnh...” bằng ảnh Markdown tương đối, ví dụ:

```markdown
![Hình 1. Màn hình đăng nhập](screenshots/01-dang-nhap.png)
```

7. Giữ chú thích sát quy trình. Tách ảnh các phần của drawer dài để chữ không quá nhỏ. Builder nhúng tệp vào Word và giữ tỷ lệ, không dùng ảnh từ xa.
8. Cập nhật trạng thái từng quy trình trong verification-notes. Ảnh mở màn hình chỉ xác minh giao diện đó; không chứng minh tạo/sửa/xóa thành công.
9. Dựng Word, kiểm tra cấu trúc, cập nhật mục lục và xem từng trang. Chỉ bỏ nhãn bản nháp sau khi hoàn tất ảnh, đối chiếu và duyệt bố cục; vẫn ghi đúng giới hạn không thử thao tác ghi trên production.

## Dựng lại Word

Không cần chạy npm, cài dependency hoặc khởi động admin. Dùng Python được cung cấp qua `load_workspace_dependencies`, không dùng Python hệ thống hoặc sửa lockfile. Tại máy thực hiện đợt này, lệnh PowerShell từ gốc repo là:

```powershell
& 'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 docs/admin-user-guide/build_manual.py
& 'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 docs/admin-user-guide/verify_manual.py
```

Nếu runtime đổi vị trí, tra lại bằng công cụ workspace dependency loader và thay đường dẫn Python. `-X utf8` giúp hiển thị tiếng Việt đúng trên console Windows. Builder ghi đè đúng tệp DOCX đầu ra; luôn sửa Markdown trước, tránh chỉnh Word riêng rồi bị ghi đè mất nội dung.

Builder hỗ trợ tiêu đề, đoạn văn, chữ đậm, danh sách, bảng Markdown đơn giản và ảnh tương đối trên một dòng riêng. Không đặt ký tự `|` không escape trong ô bảng hoặc dùng bảng lồng. Tên trường/nút phải giữ nguyên như giao diện.

## Duyệt bố cục và mục lục

Mở DOCX bằng Word, cập nhật toàn bộ trường bằng **Ctrl + A**, **F9**; tại mục lục chọn cập nhật toàn bộ bảng. Kiểm tra từng trang: dấu tiếng Việt, không tràn/cắt chữ, không tách hàng bảng sai, không để tiêu đề lẻ, ảnh đọc được và có chú thích, số trang đúng. Lưu lại Word sau khi cập nhật trường.

Khi có renderer phù hợp được cấp, chạy `render_docx.py` của skill documents với runtime và LibreOffice đi kèm được hỗ trợ; xem mọi ảnh `page-*.png` ở 100%. Đợt hiện tại đã thử nhưng thiếu LibreOffice đi kèm trên Windows. Không tự cài phần mềm hoặc dùng LibreOffice desktop thay thế trong luồng công cụ này. Không ghi nhận “đã duyệt trực quan” cho đến khi thật sự mở/render và xem toàn bộ trang.

Các tệp QA tạm nằm trong `.qa/`, không phải đầu ra bàn giao. Không commit ảnh nguyên bản nhạy cảm, traces, cookie, session state hay thông tin truy cập. Không tự động chạy kiểm thử ghi dữ liệu để “hoàn thành” bằng chứng còn thiếu.
