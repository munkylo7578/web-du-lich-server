# Tính năng setting loại Video

## 1. Mục tiêu và trạng thái

Bổ sung loại Video vào màn hình Settings để admin quản lý một video cho mỗi key cấu hình, phù hợp với clip giới thiệu hoặc banner ngắn.

**Trạng thái:** tài liệu đề xuất triển khai; chưa thay đổi code, database hay cấu hình upload.

**Phương án ưu tiên:** tận dụng hạ tầng lưu ảnh hiện có, lưu file video lên ổ đĩa server và chỉ lưu URL trong database. Chỉ upload khi admin bấm Lưu setting.

### Giả định cần xác nhận trước khi triển khai

- Production chạy trên VPS hoặc server có vùng lưu trữ bền vững, không phải filesystem tạm của serverless.
- Số lượng video ít, admin upload không thường xuyên.
- Video được nén và xuất đúng định dạng trước khi upload.
- Giới hạn đề xuất ban đầu là **20 MB/video**; chưa phải giá trị được áp dụng.

Nếu các giả định này không đúng, cần đánh giá lại phương án ở mục 10.

## 2. Hiện trạng liên quan

| Thành phần | Hiện trạng |
|---|---|
| [Giao diện Settings](../apps/admin/src/components/admin/settings/settings-management.tsx) | Hỗ trợ text đa ngôn ngữ và ảnh; ảnh được chọn và xem trước trước khi lưu |
| [Action lưu setting](../apps/admin/src/app/admin/settings/actions.ts:17) | Xác thực phiên đăng nhập, kiểm tra dữ liệu, upload ảnh rồi lưu setting |
| [Upload dùng chung cho ảnh](../apps/admin/src/features/shared/image-upload.ts:29) | Kiểm tra MIME và dung lượng, sinh tên file, ghi xuống ổ đĩa |
| [Dọn file khi lưu thất bại](../apps/admin/src/app/admin/settings/actions.ts:92) | Có cơ chế xóa file vừa upload nếu xử lý lưu thất bại |
| [Giới hạn request hiện tại](../apps/admin/next.config.js:6) | Server Actions giới hạn 10 MB/request |
| [Schema settings](../libs/database/src/schema/site-settings.ts:6) | Chỉ khai báo hai loại text và ảnh |
| [Ràng buộc giá trị theo loại](../libs/database/src/schema/site-settings.ts:29) | Ảnh phải có giá trị không rỗng; text không lưu giá trị tại cột chung |

Lưu ý: cơ chế ghi ảnh hiện tại đọc toàn bộ file vào RAM trước khi ghi tại [hàm upload ảnh](../apps/admin/src/features/shared/image-upload.ts:76). Chỉ nên tận dụng cách này cho video nhỏ và mức đồng thời thấp.

## 3. Phạm vi phiên bản đầu

### Bao gồm

- Thêm lựa chọn Video khi tạo setting.
- Mỗi setting chứa đúng một video, dùng chung giữa các ngôn ngữ.
- Chọn file từ máy, xem trước, thay lựa chọn hoặc bỏ file đang chọn.
- Chỉ upload khi bấm Lưu; chọn file không tạo dữ liệu trên server.
- Cho phép thay video của setting đã tồn tại.
- Hiển thị nhãn Video và đường dẫn trong bảng Settings.
- API đọc settings trả về loại và URL video, không xử lý như nội dung dịch.
- Giữ nguyên quy tắc key và loại không được thay đổi sau khi tạo, cùng quyền cho phép xóa hiện có.

### Không bao gồm

- Thư viện quản lý video riêng hoặc bảng dữ liệu video riêng.
- Nhập link YouTube/Vimeo hoặc nhúng trình phát bên thứ ba.
- Tự nén, chuyển mã, tạo thumbnail hoặc nhiều độ phân giải.
- Upload từng phần, tiếp tục upload sau gián đoạn hoặc thanh tiến trình theo phần trăm.
- Tự động dọn mọi file cũ trên server khi chưa có cơ chế kiểm tra tham chiếu đáng tin cậy.
- Triển khai phần hiển thị banner/video trên website khách hàng; tài liệu này tập trung vào Settings và dữ liệu API.

## 4. Quy tắc file và dữ liệu

| Hạng mục | Đề xuất |
|---|---|
| Định dạng nhận | MP4 |
| Quy ước xuất video | H.264; âm thanh AAC nếu có |
| Dung lượng tối đa | 20 MB/file, có cấu hình riêng cho video |
| Số file | Một file/setting |
| Tên file | Server tự sinh tên duy nhất, không dùng tên người dùng làm đường dẫn |
| Nơi lưu | Thư mục con riêng cho video trong vùng upload hiện có |
| Database | Lưu URL vào [cột giá trị của setting](../libs/database/src/schema/site-settings.ts:17) |
| Ngôn ngữ | Video dùng chung, không tạo bản dịch nội dung |

MP4 là container, không bảo đảm mọi codec bên trong đều được trình duyệt hỗ trợ. H.264/AAC là quy ước chuẩn bị nội dung; phiên bản đầu không tự chuyển mã. Nếu cần bảo đảm codec bằng kiểm tra tự động, phải bổ sung bước phân tích media phía server.

Backend phải kiểm tra dung lượng, file rỗng và nhận diện container; không chỉ tin tên file hoặc MIME do trình duyệt cung cấp. Kiểm tra ở giao diện chỉ giúp phản hồi sớm, không thay thế validation phía server.

## 5. Luồng thao tác và lưu dữ liệu

1. Admin mở form tạo setting, chọn loại Video.
2. Admin chọn một file; giao diện kiểm tra sơ bộ định dạng và dung lượng.
3. Tạo bản xem trước cục bộ, hiển thị tên và dung lượng file cùng nút phát/dừng.
4. Khi thay lựa chọn, đổi loại trong form tạo mới hoặc đóng form, giải phóng tài nguyên xem trước cũ.
5. Khi bấm Lưu, khóa thao tác gửi lặp, thay file và đóng form trong thời gian lưu.
6. Backend xác thực admin, kiểm tra payload, key, loại bất biến và file trước khi ghi.
7. Nếu có file mới hợp lệ, ghi file vào vùng upload và nhận URL.
8. Lưu URL vào setting; nếu chỉ sửa mô tả thì giữ URL video hiện tại và không yêu cầu upload lại.
9. Nếu ghi file hoặc lưu database thất bại, dọn file mới/file ghi dở thuộc lần xử lý này, giữ nguyên dữ liệu cũ và trả lỗi rõ ràng.
10. Khi thành công, đóng form và làm mới danh sách.

### Nguyên tắc vòng đời file

- Hủy trước khi bấm Lưu: không có file mới trên server.
- Không xóa video cũ trước khi database lưu URL mới thành công.
- Phiên bản đầu có thể giữ file cũ khi thay/xóa setting để tránh xóa nhầm nội dung đang được tham chiếu; cần có quy trình rà soát dung lượng và dọn thủ công.
- Chỉ triển khai tự động dọn file cũ khi kiểm tra được file thuộc hệ thống quản lý và không còn tham chiếu.
- Tách lỗi lưu database khỏi lỗi làm mới giao diện/cache: khi database đã lưu thành công, không xóa file đang được bản ghi mới tham chiếu chỉ vì bước hậu xử lý thất bại.
- Việc ghi file và cập nhật database không phải một transaction duy nhất; sự cố tiến trình vẫn có thể để lại file mồ côi, cần đưa vào quy trình vận hành.

## 6. Thay đổi kỹ thuật dự kiến

### Database và domain

- Mở rộng [danh sách loại setting](../libs/database/src/schema/site-settings.ts:6) để nhận Video.
- Cập nhật [constraint giá trị](../libs/database/src/schema/site-settings.ts:29): ảnh và video phải có URL không rỗng; text giữ quy tắc hiện tại.
- Tạo migration, không chỉnh sửa migration lịch sử đã chạy.
- Kiểm tra yêu cầu commit của PostgreSQL khi thêm giá trị enum trước khi dùng giá trị mới trong constraint; tách migration/transaction nếu công cụ chạy migration yêu cầu.
- Mở rộng [domain setting](../apps/admin/src/domains/setting/domain/setting.ts), [kiểu dữ liệu admin](../apps/admin/src/features/admin-settings/settings-types.ts) và [schema form](../apps/admin/src/features/admin-settings/settings-form-schema.ts).
- Rà soát [repository settings](../apps/admin/src/features/admin-settings/repository.ts) để lưu/đọc URL video và không tạo bản dịch cho video.

### Backend upload và lưu setting

- Bổ sung hàm upload video với danh sách định dạng và giới hạn riêng; không nới lỏng validation của ảnh.
- Tận dụng cấu hình gốc lưu trữ và URL public của [upload hiện có](../apps/admin/src/features/shared/image-upload.ts:13).
- Mở rộng [action lưu setting](../apps/admin/src/app/admin/settings/actions.ts:17) để nhận file video, giữ giá trị cũ khi không thay file và dọn file mới khi thất bại trước khi commit dữ liệu.
- Không chấp nhận đường dẫn vật lý do client cung cấp; giới hạn URL video ở vùng upload được quản lý trong phạm vi phiên bản đầu.
- Đọc hướng dẫn Next.js tương ứng trong bộ tài liệu đi kèm phiên bản đã cài trước khi sửa Server Actions hoặc cấu hình request, theo quy định của [AGENTS.md](../AGENTS.md).

### Giao diện

- Mở rộng [form Settings](../apps/admin/src/components/admin/settings/settings-management.tsx:183) thành ba nhánh riêng: Text, Ảnh, Video.
- Tạo trường chọn một video với trạng thái file hiện có và file đang chờ upload.
- Hiển thị lỗi định dạng, quá dung lượng, thiếu video và upload/lưu thất bại.
- Xem trước có điều khiển phát/dừng, không tự phát; không tải sẵn toàn bộ video chỉ để hiển thị preview.
- Trong danh sách chỉ hiển thị biểu tượng, nhãn Video và URL; không tạo nhiều trình phát đồng thời.

### API đọc dữ liệu

- Rà soát [dịch vụ nội dung](../apps/api/src/app/content/content.service.ts) để xử lý video như media dùng chung giữa các ngôn ngữ.
- Giữ chính sách công khai key hiện có; không tự động công khai mọi video setting.
- Thống nhất URL tương đối hoặc tuyệt đối với cơ chế phục vụ uploads đang triển khai, bảo đảm website và admin đều truy cập được.

## 7. Cấu hình và triển khai

- Bổ sung biến môi trường giới hạn video riêng, mặc định đề xuất 20 MB, và mô tả trong [.env.example](../.env.example).
- Nếu dùng Server Actions với file 20 MB, tăng [giới hạn request](../apps/admin/next.config.js:6) lên mức có khoảng dư, ví dụ 25 MB, rồi kiểm tra bằng file sát giới hạn thực tế.
- Đồng bộ giới hạn body và timeout tại Nginx, reverse proxy hoặc hosting. Giới hạn request không thay thế kiểm tra dung lượng file trong backend.
- Không dùng việc tăng giới hạn request này để cho phép ảnh lớn hơn giới hạn ảnh hiện tại.
- Dùng vùng lưu trữ bền vững bên ngoài thư mục build/deploy; cấu hình quyền ghi và backup cho thư mục media.
- Cho Nginx hoặc web server phục vụ video trực tiếp với content type phù hợp và hỗ trợ byte-range để tua video; không cần đưa nội dung video qua API ứng dụng.
- Kiểm tra URL uploads hoạt động từ cả domain admin và website. Next.js không tự phục vụ một thư mục tùy ý ngoài vùng static đã cấu hình.
- Theo dõi dung lượng đĩa, băng thông và mức dùng RAM. Nếu chạy nhiều instance, cần storage dùng chung thay vì ổ đĩa riêng từng instance.
- Video phục vụ từ vùng uploads public có thể được truy cập bởi bất kỳ ai biết URL; đây không phải giải pháp lưu video riêng tư.

## 8. Checklist triển khai

- [ ] Xác nhận môi trường lưu trữ bền vững, quy mô upload và mức giới hạn video.
- [ ] Đọc tài liệu Next.js của phiên bản đã cài cho Server Actions và giới hạn request.
- [ ] Mở rộng schema database và tạo migration enum/constraint tương thích dữ liệu hiện có.
- [ ] Cập nhật domain, kiểu dữ liệu, schema validation và repository settings cho Video.
- [ ] Bổ sung upload video có xác thực, kiểm tra file, tên an toàn và dọn file thất bại.
- [ ] Cập nhật action lưu setting để upload/thay video mà không làm mất giá trị hiện tại khi lỗi.
- [ ] Bổ sung trường chọn video, preview, trạng thái lưu và nhãn Video trong màn hình Settings.
- [ ] Cập nhật API đọc settings để trả URL video độc lập ngôn ngữ, giữ nguyên chính sách công khai key.
- [ ] Cập nhật tài liệu biến môi trường, giới hạn request và hướng dẫn phục vụ file trên production.
- [ ] Bổ sung kiểm thử tự động và kiểm thử tích hợp theo tiêu chí nghiệm thu.
- [ ] Chạy kiểm tra kiểu dữ liệu, lint, test và build của các ứng dụng bị ảnh hưởng.

## 9. Tiêu chí nghiệm thu

- Tạo setting Video với một MP4 hợp lệ thành công; tải lại trang vẫn thấy URL và phát được video.
- API đọc setting trả đúng loại và URL với cả tiếng Việt lẫn tiếng Anh, không yêu cầu bản dịch video.
- Sửa mô tả mà không chọn video mới vẫn lưu được, giữ nguyên URL cũ.
- Thay video thành công chỉ đổi URL sau khi lưu dữ liệu thành công.
- Hủy form trước khi lưu không tạo file trên server.
- File rỗng, sai định dạng, giả MIME hoặc vượt giới hạn bị backend từ chối với thông báo phù hợp.
- Thiếu video khi tạo mới bị từ chối; request không có phiên đăng nhập hợp lệ không được ghi file.
- Khi lỗi ghi file hoặc lỗi database trước commit, không mất video cũ; file mới/file ghi dở được dọn hoặc ghi nhận lỗi dọn để xử lý.
- Key và loại của setting đã tạo không thể thay đổi bằng giao diện lẫn request tự gửi; quyền xóa vẫn được giữ nguyên.
- Text đa ngôn ngữ và upload ảnh hiện tại không bị thay đổi hành vi.
- Migration chạy được trên database có dữ liệu hiện tại và bản cài mới, không làm mất setting cũ.
- Trên môi trường triển khai thực tế: file sát giới hạn upload được, file quá giới hạn bị từ chối, video phát/tua được và không mất sau deploy.

## 10. Khi nào nên chọn giải pháp khác

| Nhu cầu hoặc điều kiện | Hướng nâng cấp |
|---|---|
| Serverless hoặc không có ổ đĩa bền vững | Object storage; trình duyệt upload trực tiếp qua URL ký sẵn, backend xác minh file trước khi lưu setting |
| Video lớn hoặc cần phần trăm upload | Endpoint upload riêng có tiến trình; streaming hoặc upload trực tiếp lên object storage |
| Mạng không ổn định, cần tiếp tục upload | Upload nhiều phần hoặc giao thức resumable |
| Nhiều lượt xem, nhiều vùng địa lý | CDN và lưu trữ phù hợp với chi phí băng thông |
| Nhiều định dạng đầu vào hoặc cần tự tối ưu | Pipeline chuyển mã hoặc dịch vụ video chuyên dụng |

**Kết luận:** với một số ít clip MP4 ngắn trên VPS, upload khi bấm Lưu và tái sử dụng vùng lưu trữ ảnh là phương án ít thay đổi nhất. Không mở rộng cách đọc toàn bộ file vào RAM sang video hàng trăm MB chỉ bằng việc tăng giới hạn request.
