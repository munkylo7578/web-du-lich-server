# Thiết kế nhiều ảnh cho chặng lịch trình

## 1. Quyết định nghiệp vụ

- Mỗi chặng có từ không đến nhiều ảnh, có thứ tự riêng, không có ảnh bìa riêng.
- Một ảnh được dùng ở nhiều chặng và trong thư viện ảnh chung của cùng tour.
- Ảnh tải lên chặng không tự động xuất hiện trong thư viện ảnh chung.
- Phạm vi tái sử dụng hiện tại là cùng tour; không xây thư viện media toàn hệ thống.
- Tên ảnh hiện tại là metadata dùng chung: sửa tên ảnh sẽ ảnh hưởng mọi nơi dùng ảnh đó. Chú thích riêng theo chặng và bản dịch chú thích chưa thuộc phạm vi.

## 2. Hiện trạng đã kiểm tra

- [Domain chặng](../apps/admin/src/domains/tour/domain/tour-plan.ts) chưa có định danh và ảnh.
- [Aggregate tour](../apps/admin/src/domains/tour/domain/tour.ts) quản lý danh sách chặng, thay thế toàn bộ khi lưu và kiểm tra thứ tự chặng không trùng.
- [Biểu mẫu](../apps/admin/src/components/admin/tours/tour-form-drawer.tsx) chỉ có tên/mô tả chặng; ảnh mới đang được quản lý riêng ở cấp tour.
- [Thao tác lưu](../apps/admin/src/app/admin/tours/actions.ts) kiểm tra ảnh cũ chỉ dựa trên thư viện ảnh chung; tải ảnh trước transaction và dọn file mới nếu thất bại.
- [Schema](../libs/database/src/schema/tour-media.ts) lưu toàn bộ chặng trong JSON của tour; ảnh là tài nguyên riêng với bảng liên kết ảnh tour.
- [Repository](../apps/admin/src/features/admin-tours/repository.ts) xóa bản ghi ảnh ngay khi gỡ khỏi thư viện; xóa tour cũng xóa những ảnh lấy từ thư viện.
- [API](../apps/api/src/app/content/content.service.ts) đọc trực tiếp database, không qua admin domain; cả danh sách và chi tiết cùng ánh xạ chặng, có fallback từng trường về tiếng Việt.

## 3. Domain đề xuất

- Giữ tour là aggregate root và repository duy nhất để lưu lịch trình.
- Chặng trở thành entity con có UUID ổn định. Dùng tên trường định danh chặng là mã chặng, tách biệt khóa giao diện tự sinh của thư viện form.
- Dữ liệu chặng: mã chặng, tên đa ngôn ngữ, mô tả đa ngôn ngữ, thứ tự chặng và danh sách tham chiếu ảnh.
- Tham chiếu ảnh chặng là value object riêng: mã ảnh và thứ tự ảnh; không mang vai trò cover/gallery của ảnh tour.
- Không đưa URL, file, đường dẫn vật lý hoặc trạng thái upload vào entity chặng; repository ánh xạ metadata vào mô hình đọc admin/API.
- Tạo mã chặng một lần khi thêm chặng; giữ nguyên khi sửa, đổi thứ tự và đọc lại. Rehydrate phải giữ mã đã lưu, không tự sinh mã mới.
- Validate: mã hợp lệ; không trùng mã chặng trong tour; thứ tự chặng không âm và không trùng; ảnh không trùng trong một chặng; thứ tự ảnh không âm và không trùng trong một chặng; vẫn cho phép cùng ảnh ở các chặng khác nhau.
- Giữ yêu cầu tên/mô tả tiếng Việt và fallback tiếng Anh hiện có. Snapshot phải sao chép collection/nội dung để tránh sửa ngoài aggregate.
- Không cần repository chặng hay API ghi chặng độc lập trong phạm vi hiện tại.

## 4. Database đề xuất: chuẩn hóa quan hệ, giữ nội dung đa ngôn ngữ trong JSON

### Bảng chặng mới

- Khóa chính: UUID mã chặng.
- Khóa ngoại mã tour, bắt buộc; xóa tour thì cascade chặng.
- Tên và mô tả: hai cột JSONB bắt buộc, giữ cấu trúc ngôn ngữ hiện tại.
- Thứ tự: số nguyên không âm; unique theo cặp mã tour và thứ tự.
- Thời điểm tạo/cập nhật; giữ thời điểm tạo khi sửa chặng.
- Check cấu trúc JSON là object và giá trị tiếng Việt là chuỗi không rỗng; không chỉ dựa vào kiểu TypeScript.

### Bảng liên kết ảnh chặng mới

- Mã chặng: khóa ngoại đến bảng chặng, cascade khi xóa chặng.
- Mã ảnh: khóa ngoại đến bảng ảnh hiện tại, restrict khi ảnh còn được dùng.
- Thứ tự ảnh: số nguyên không âm.
- Khóa chính kép mã chặng + mã ảnh; unique mã chặng + thứ tự ảnh.
- Index mã ảnh để tra cứu nơi sử dụng và dọn ảnh không còn tham chiếu.
- Không lưu URL, bản sao file, mã tour dư thừa hay vai trò ảnh bìa trong bảng này.

### Ranh giới bảo đảm

- Database bảo đảm ảnh/chặng tồn tại, thứ tự và liên kết không trùng.
- Quy tắc chỉ tái sử dụng ảnh trong cùng tour được kiểm tra trong transaction bằng các liên kết đã lưu; FK đơn thuần không chứng minh quyền dùng ảnh của tour.
- Không cần bảng tài sản media của tour riêng lúc này: tập ảnh có thể dùng lại là hợp của ảnh thư viện và ảnh của tất cả chặng. Ảnh không còn được dùng ở đâu không được giữ như một thư viện độc lập.
- Chưa cần bảng bản dịch chặng riêng vì chưa có yêu cầu tìm kiếm/lọc nội dung chặng theo ngôn ngữ. Có thể chuẩn hóa bản dịch sau mà không đổi định danh hay quan hệ ảnh.

## 5. Luồng ghi và vòng đời ảnh

1. Kiểm tra session, payload, mã chặng và manifest file; ảnh mới có khóa upload tạm duy nhất, các nơi sử dụng chỉ tham chiếu khóa đó.
2. Kiểm tra mã chặng cũ thuộc tour, mã mới không chiếm mã chặng của tour khác; không dùng upsert không giới hạn theo mã chặng.
3. Tập ảnh cũ hợp lệ lấy từ cả thư viện và tất cả chặng của tour trước chỉnh sửa. Không tin URL hoặc mã ảnh tùy ý do client gửi.
4. Upload mỗi file đúng một lần, tạo một bản ghi ảnh và ánh xạ khóa upload tạm sang mã ảnh dùng chung; không trộn thứ tự upload với thứ tự hiển thị.
5. Trong transaction, khóa bản ghi tour khi cập nhật để tuần tự hóa thao tác lưu/xóa cùng tour; kiểm tra lại quyền dùng ảnh và dữ liệu cũ trước khi thay liên kết.
6. Lưu tour, ảnh mới, chặng và liên kết ảnh. Giữ UUID chặng; xóa chặng không còn trong payload. Khi đổi thứ tự, dùng bước dịch thứ tự cũ sang vùng tạm không xung đột rồi ghi thứ tự cuối, tránh vi phạm unique lúc hoán đổi. Có thể xóa/tạo lại các liên kết ảnh trong cùng transaction.
7. Sau khi đã ghi liên kết cuối cùng, chỉ xóa bản ghi ảnh ứng viên nếu không còn tham chiếu ở bất kỳ bảng ảnh tour, ảnh chặng hay ảnh dịch vụ nào. Gỡ một liên kết không đồng nghĩa xóa tài nguyên ảnh.
8. Khi xóa tour, thu thập ảnh từ thư viện và mọi chặng trước cascade; sau đó áp dụng cùng quy tắc dọn ảnh không còn tham chiếu.
9. Lỗi trước commit: rollback database và dọn file mới. Sau commit: không chạy nhánh dọn file mới nếu chỉ bước refresh/invalidation thất bại.
10. Xóa file cũ chỉ sau commit, với đường dẫn do server quản lý và cơ chế retry/log lỗi; không xóa file trước khi database xác nhận không còn sử dụng. Không suy diễn đường dẫn vật lý từ URL client.

Lưu cả aggregate hiện vẫn có nguy cơ ghi đè nội dung từ biểu mẫu cũ: khóa transaction không thay thế optimistic concurrency. Nếu cần cảnh báo hai admin sửa đồng thời, bổ sung kiểm tra phiên bản riêng, không coi tính năng đó đã có sẵn.

## 6. Admin và API

- Mỗi chặng có quản lý ảnh ngoài tab ngôn ngữ; chọn ảnh có sẵn trong cùng tour hoặc tải ảnh mới; hỗ trợ gỡ liên kết và đổi thứ tự.
- Danh sách chọn ảnh gộp và loại trùng ảnh thư viện, ảnh chặng và ảnh đang chờ tải; file dùng nhiều nơi vẫn chỉ gửi một lần.
- Khóa trạng thái chặng bằng định danh ổn định, không bằng chỉ số mảng; bỏ chặng/đổi thứ tự không làm ảnh chuyển nhầm chặng.
- Dọn preview khi không còn nơi dùng hoặc đóng form; không dọn preview ảnh vẫn được chặng khác sử dụng.
- Cập nhật schema validation, mô hình đọc admin và thao tác lưu; không để validation loại bỏ trường ảnh mới.
- API đọc quan hệ chặng và ảnh theo lô/quan hệ Drizzle, tránh truy vấn riêng cho từng chặng. Cập nhật cả danh sách và chi tiết.
- Giữ cấu trúc văn bản/thứ tự/fallback cũ; bổ sung mã chặng và danh sách ảnh gồm mã ảnh, URL public, tên ảnh và thứ tự. Chặng chưa có ảnh trả danh sách rỗng. Thư viện tour không tự động gộp ảnh chặng.
- Giữ database library độc lập với domain của admin; khai báo kiểu persistence và ánh xạ rõ ràng ở từng ứng dụng.
- Trước khi sửa code Next.js, đọc hướng dẫn phiên bản đang cài trong thư mục tài liệu của dependency theo quy tắc dự án.

## 7. Migration và kiểm thử

1. Kiểm tra dữ liệu thật: số chặng, thứ tự trùng/không hợp lệ, cấu trúc nội dung đa ngôn ngữ. Dữ liệu sai phải được báo và xử lý rõ ràng, không âm thầm bỏ chặng.
2. Tạo hai bảng và constraints; chuyển từng phần tử JSON cũ thành một dòng chặng với UUID mới sinh một lần, giữ tên, mô tả và thứ tự hợp lệ; không tạo liên kết ảnh cho dữ liệu cũ.
3. Đối chiếu số lượng theo tour và nội dung trước/sau. Giữ cột cũ để đối chiếu trong giai đoạn chuyển đổi.
4. Chốt cửa sổ tạm dừng ghi để backfill và chuyển cả admin/API sang nguồn mới; nếu phải triển khai không dừng ghi, cần phương án dual-write/backfill catch-up riêng trước khi thực hiện.
5. Sau chuyển đổi chỉ đọc/ghi bảng mới; cột cũ không còn đồng bộ nên không được dùng để rollback mù quáng. Chỉ xóa cột cũ bằng migration riêng sau xác minh và sao lưu.
6. Test domain/snapshot, validation, quyền dùng ảnh cùng tour, mã chặng khác tour, lưu-đọc lại, thứ tự hỗn hợp ảnh mới/cũ, ảnh mới dùng nhiều nơi chỉ upload một lần.
7. Test gỡ ảnh gallery còn dùng trong chặng, xóa chặng còn dùng chung ảnh, xóa tour, ảnh còn tham chiếu dịch vụ, rollback upload, lỗi sau commit và FK không cho xóa ảnh đang được dùng.
8. Test API danh sách/chi tiết, URL public, fallback ngôn ngữ, chặng không ảnh; chạy migration thử với dữ liệu cũ và kiểm tra kiểu/lint/test các ứng dụng liên quan.
