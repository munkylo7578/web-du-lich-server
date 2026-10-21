# Nguồn dữ liệu tỉnh/thành và GIS cho Lào, Campuchia

## Phạm vi và mức xác minh

- Giai đoạn đầu: danh mục tỉnh/thành cấp ADM1, ranh giới, tọa độ đại diện và liên kết điểm đến.
- Chưa bổ sung cấp huyện, xã hoặc bản; không sửa dữ liệu xã Việt Nam.
- Đã kiểm tra schema và các luồng liên quan trong repository, chưa truy vấn database đang chạy.
- Chưa duyệt web hoặc tải dữ liệu trong phiên nghiên cứu này. Các liên kết dưới đây là điểm truy cập đề xuất; phiên bản hiện hành, độ phủ, giấy phép và trạng thái tải cần được xác minh trước khi import.

## 1. Nguồn ưu tiên: geoBoundaries gbOpen

- [Trang dự án](https://www.geoboundaries.org/)
- [Tài liệu API](https://www.geoboundaries.org/api.html)
- [Metadata ADM1 Lào](https://www.geoboundaries.org/api/current/gbOpen/LAO/ADM1/)
- [Metadata ADM1 Campuchia](https://www.geoboundaries.org/api/current/gbOpen/KHM/ADM1/)

Hai đường dẫn quốc gia là endpoint metadata, không phải đường dẫn tải trực tiếp dữ liệu ranh giới. Lấy liên kết GeoJSON từ metadata trả về, đồng thời lưu metadata và bản dữ liệu đã tải để tái lập lần import.

Lý do ưu tiên: phù hợp luồng nhập ranh giới cấp tỉnh, định dạng dễ chuyển vào PostGIS và có dòng gbOpen phục vụ sử dụng mở. Tuy nhiên phải đọc giấy phép, nguồn gốc, niên đại ranh giới và yêu cầu ghi công của chính bản dữ liệu được chọn; không mặc định mọi sản phẩm geoBoundaries có cùng điều kiện.

Lưu ý: mã đối tượng của nguồn không nhất thiết là mã hành chính chính thức hoặc ổn định qua các phiên bản. Cần một bảng ánh xạ hoặc manifest giữ mã nội bộ ổn định; không sinh lại mã tỉnh khi cập nhật ranh giới.

## 2. Nguồn đối chiếu/thay thế: HDX và OCHA COD-AB

- [Tìm administrative boundaries của Lào trên HDX](https://data.humdata.org/dataset/?q=laos%20administrative%20boundaries)
- [Tìm administrative boundaries của Campuchia trên HDX](https://data.humdata.org/dataset/?q=cambodia%20administrative%20boundaries)

Ưu tiên bộ Common Operational Datasets - Administrative Boundaries nếu có, kiểm tra đơn vị cung cấp, ngày hiệu lực, cấp ADM1, mã P-code và giấy phép. Tùy bộ dữ liệu, tài nguyên có thể là Shapefile, GeoPackage hoặc GeoJSON; không mặc định tất cả đều có đủ định dạng hoặc cấp hành chính.

Điểm mạnh: thường có hệ mã và quan hệ hành chính hữu ích cho mở rộng cấp huyện/xã sau này. HDX là nền tảng tập hợp dữ liệu, không phải bảo đảm rằng mọi bộ đều chính thức, cập nhật hoặc tự do dùng thương mại. Ngày cập nhật trang cũng không nhất thiết là ngày hiệu lực ranh giới.

Nếu HDX có bộ mới hơn, xuất xứ tốt hơn và giấy phép phù hợp, có thể ưu tiên HDX thay geoBoundaries sau khi kiểm tra mẫu thực tế. Không ghép tên/mã từ một nguồn với hình học từ nguồn khác chỉ bằng tên tỉnh.

## 3. Các nguồn bổ sung

| Nguồn | Vai trò | Lưu ý |
|---|---|---|
| [Open Development Mekong](https://data.opendevelopmentmekong.net/) | Tìm dữ liệu địa phương, đối chiếu niên đại và tên gọi | Kiểm tra từng bộ và đơn vị xuất bản; dữ liệu có thể được tái xuất bản từ nguồn khác |
| [Open Development Cambodia](https://opendevelopmentcambodia.net/) | Đối chiếu dữ liệu hành chính Campuchia | Xác minh ngày hiệu lực, giấy phép và khả năng tải GIS |
| [GADM](https://gadm.org/download_country.html) | Tham khảo ranh giới hành chính nhiều cấp | Không chọn mặc định cho website du lịch thương mại: điều kiện sử dụng thường hạn chế thương mại và phân phối lại; phải kiểm tra điều khoản hoặc xin phép |
| [Geofabrik Asia / OpenStreetMap](https://download.geofabrik.de/asia.html) | Dự phòng hoặc bổ sung địa điểm du lịch | Trích xuất ranh giới hành chính phức tạp hơn; cần kiểm tra độ đầy đủ và tuân thủ ODbL/ghi công |

## 4. Những điểm đã xác nhận trong dự án

1. [Danh mục tỉnh](libs/database/src/schema/geo-location.ts:39) có mã duy nhất toàn bảng, tối đa 20 ký tự, nhưng chưa có liên kết quốc gia. Tên và tên đầy đủ là bắt buộc; tên tiếng Anh là tùy chọn.
2. [Dữ liệu GIS tỉnh](libs/database/src/schema/geo-location.ts:88) tham chiếu mã tỉnh, nhận hình học MultiPolygon hệ tọa độ EPSG:4326 và hộp bao Polygon cùng hệ tọa độ. Diện tích và mã GIS nguồn có thể để trống.
3. [Chỉ mục mã tỉnh của GIS](libs/database/src/schema/geo-location.ts:108) chưa bảo đảm duy nhất. Nếu có nhiều hình học cho một tỉnh, phải hợp nhất hoặc định nghĩa rõ bản hiện hành trước khi đọc tọa độ.
4. [Hợp đồng quốc gia](libs/database/src/contracts/destination-country.ts:2) dùng LA, CB, VN. CB là mã nội bộ cho Campuchia; nguồn quốc tế thường dùng KH hoặc KHM. Lào thường dùng LA hoặc LAO. Cần ánh xạ rõ, không đưa KHM trực tiếp vào trường quốc gia hiện có.
5. [Hàm chuẩn hóa liên kết tỉnh](libs/database/src/contracts/destination-country.ts:16) loại bỏ toàn bộ mã tỉnh nếu quốc gia không phải Việt Nam. Import xong mà chưa sửa hàm này thì vẫn không lưu được liên kết tỉnh cho Lào/Campuchia.
6. [Tìm kiếm tỉnh](apps/admin/src/features/admin-tours/repository.ts:95) chưa lọc quốc gia. [Lưu điểm đến](apps/admin/src/features/admin-tours/repository.ts:163) kiểm tra tỉnh tồn tại nhưng cần bổ sung kiểm tra tỉnh thuộc đúng quốc gia.
7. [Giao diện quản lý điểm đến](apps/admin/src/components/admin/destinations/destination-management.tsx:280) còn chặn chọn/tìm tỉnh ngoài Việt Nam.
8. [API lấy tọa độ](apps/api/src/app/content/content.service.ts:616) đang lấy một điểm nằm trên bề mặt hình học tỉnh. Đây là tọa độ đại diện, không phải vị trí chính xác của thắng cảnh hoặc trung tâm thành phố.
9. [Phản hồi điểm đến](apps/api/src/app/content/content.service.ts:544) hiện trả tên và tọa độ tỉnh, không trả hình học ranh giới. Chưa tìm thấy luồng xuất GeoJSON ranh giới trong phần API đã rà soát. Muốn tô vùng trên bản đồ cần bổ sung cách phục vụ ranh giới, không chỉ import database.

## 5. Quy tắc ánh xạ đề xuất

| Nội dung nguồn | Đích và cách xử lý |
|---|---|
| Quốc gia | Bổ sung liên kết quốc gia vào danh mục tỉnh; ánh xạ LAO → LA, KHM/KH → CB; backfill dữ liệu Việt Nam sau khi kiểm tra dữ liệu thực tế |
| Mã ADM1 hoặc mã đối tượng | Giữ mã nguồn kèm xuất xứ; cấp mã nội bộ ổn định, không trùng và không quá 20 ký tự; không thay đổi mã Việt Nam hiện có |
| Tên tỉnh/thành | Điền tên và tên đầy đủ bắt buộc; giữ tên nguồn, chỉ ghi tên tiếng Anh khi nguồn hoặc bản biên tập được xác nhận |
| Loại đơn vị | Phân biệt tỉnh, thủ đô và đơn vị tương đương; không gán tự động loại đơn vị của Việt Nam; có thể để trống liên kết loại đơn vị ở bước đầu |
| Ranh giới | Kiểm tra CRS gốc, chuyển thực sự về EPSG:4326, chuẩn hóa MultiPolygon, kiểm tra hình học hợp lệ và không rỗng |
| Hộp bao và diện tích | Tính lại từ hình học đã chuẩn hóa; diện tích theo phép đo địa lý hoặc hệ chiếu thích hợp, không lấy độ vuông làm km² |
| Metadata | Lưu URL, bản phát hành, nguồn gốc, giấy phép, yêu cầu ghi công, ngày tải và checksum trong manifest hoặc bảng quản lý lần import |

Không cần dữ liệu xã để liên kết tỉnh với điểm đến. Một bộ ranh giới ADM1 có tên/mã phù hợp có thể cung cấp cả danh mục tỉnh lẫn hình học, tránh ghép hai bộ không cùng phiên bản.

## 6. Checklist triển khai sau khi được duyệt

- [ ] Tải thử ADM1 của hai nước; xác minh giấy phép thương mại/ghi công, niên đại, tên tỉnh, hệ mã và CRS; lưu bản nguồn bất biến.
- [ ] Đối chiếu số lượng đơn vị và các thay đổi hành chính với nguồn đáng tin cậy tại ngày hiệu lực; dùng khoảng 18 đơn vị cấp tỉnh của Lào và 25 của Campuchia làm mốc kiểm tra ban đầu, không coi là số đếm đã xác minh cho năm hiện tại.
- [ ] Kiểm tra dữ liệu thực tế, sao lưu, bổ sung quốc gia cho tỉnh và backfill Việt Nam; giữ nguyên mọi mã và liên kết hiện có.
- [ ] Chốt mã nội bộ ổn định và ánh xạ mã nguồn; kiểm tra độ dài, trùng mã và khả năng cập nhật không phá liên kết điểm đến.
- [ ] Nhập vào vùng staging; kiểm tra hình học, hợp nhất các phần cùng tỉnh nếu cần, tính hộp bao và diện tích; kiểm tra mẫu bằng QGIS.
- [ ] Import danh mục tỉnh trước, hình học sau trong giao dịch; chạy lại không nhân đôi dữ liệu; có báo cáo và phương án rollback; chỉ thay đổi phạm vi Lào/Campuchia.
- [ ] Bỏ giới hạn chỉ Việt Nam trong hợp đồng và giao diện; lọc tìm kiếm theo quốc gia và từ chối liên kết khác quốc gia ở phía server; xóa lựa chọn không còn hợp lệ khi đổi quốc gia.
- [ ] Giữ API tọa độ đại diện; bổ sung endpoint hoặc tài nguyên GeoJSON riêng cho ranh giới, có đơn giản hóa phù hợp, bộ nhớ đệm và ghi công; không nhét toàn bộ polygon vào mọi phản hồi danh sách.
- [ ] Kiểm thử liên kết điểm đến Lào/Campuchia, tọa độ, thứ tự kinh độ/vĩ độ khi xuất GeoJSON, hiển thị ranh giới, nhập lặp và hồi quy dữ liệu Việt Nam.

## Kết luận

Đề xuất bắt đầu với geoBoundaries gbOpen ADM1 cho hai nước, đối chiếu HDX trước khi chốt bản nhập. Giai đoạn này chỉ cần hai bảng cấp tỉnh, nhưng phải bổ sung quốc gia và gỡ các quy tắc chỉ cho Việt Nam thì ứng dụng mới sử dụng được. Đây là kết quả nghiên cứu và kế hoạch, chưa phải xác nhận đã tải/kiểm định dữ liệu hoặc đã triển khai.
