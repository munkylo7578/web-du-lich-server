"""Kiểm tra cấu trúc bản Word, không thay thế kiểm tra hiển thị từng trang."""
from pathlib import Path
from zipfile import ZipFile
import re
import xml.etree.ElementTree as ET
from docx import Document
from docx.shared import Cm

root = Path(__file__).resolve().parent
path = root / "huong-dan-su-dung-admin.docx"
doc = Document(path)
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
all_text = "\n".join(p.text for p in doc.paragraphs)
assert "BẢN NHÁP — CHƯA ĐỦ ẢNH/XÁC MINH" in all_text
assert "\ufffd" not in all_text
assert len([p for p in doc.paragraphs if p.style.name == "Heading 1"]) == 10
assert len([p for p in doc.paragraphs if p.style.name == "Heading 2"]) >= 20
assert len(doc.tables) == 7
sec = doc.sections[0]
assert abs(sec.page_width - Cm(21)) < 1000
assert abs(sec.page_height - Cm(29.7)) < 1000
assert abs(sec.left_margin - Cm(2)) < 1000
assert doc.styles["Normal"].font.name == "Arial"
assert doc.styles["Normal"].font.size.pt == 11
links = []
for md in root.rglob("*.md"):
    contents = md.read_text(encoding="utf-8")
    # Bỏ khối code ví dụ: tệp ảnh ví dụ chưa được tạo không phải liên kết thực.
    contents = re.sub(r"```.*?```", "", contents, flags=re.S)
    contents = re.sub(r"`[^`]*`", "", contents)
    for target in re.findall(r"!?\[[^\]]*\]\(([^)]+)\)", contents):
        if "://" not in target:
            resolved = md.parent / target.split("#")[0]
            assert resolved.exists(), f"Liên kết không tồn tại: {md.name}: {target}"
            links.append(target)
with ZipFile(path) as z:
    xml = ET.fromstring(z.read("word/document.xml"))
    fields = [x.text for x in xml.findall(".//w:instrText", ns)]
    assert any("TOC" in (x or "") for x in fields)
    assert len(xml.findall(".//w:tblHeader", ns)) == 7
    assert z.testzip() is None
    rels = ET.fromstring(z.read("word/_rels/document.xml.rels"))
    assert not [x for x in rels if x.get("TargetMode") == "External"]
    media = [x for x in z.namelist() if x.startswith("word/media/")]
    footer = z.read("word/footer1.xml").decode("utf-8")
    assert "PAGE" in footer
    core = z.read("docProps/core.xml").decode("utf-8")
    assert "python-docx" not in core
expected_images = len(re.findall(r"^!\[.*?\]\(.*?\)$", (root / "huong-dan-su-dung-admin.md").read_text(encoding="utf-8"), re.M))
assert len(doc.inline_shapes) == expected_images
print(f"Đạt kiểm tra cấu trúc: {len(doc.paragraphs)} đoạn; 10 chương; {len(doc.tables)} bảng; {len(doc.inline_shapes)} ảnh; {len(links)} liên kết cục bộ hợp lệ.")
print("Có heading Word, TOC, PAGE, tiêu đề bảng lặp, metadata tác giả trống; không có quan hệ tài nguyên từ xa.")
print("CHƯA duyệt trực quan; CHƯA cập nhật mục lục bằng Word; CHƯA xác minh trình duyệt.")
