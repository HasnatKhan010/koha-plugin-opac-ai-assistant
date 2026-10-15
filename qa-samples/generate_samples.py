"""Create repeatable, fictional book-list inputs for Sadi's comparison UI."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.oxml.ns import qn
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


OUT = Path(__file__).resolve().parent
ROWS = [
    ("Computer Networks", "Andrew S. Tanenbaum", "9780136764052"),
    ("Computer Networks", "Andrew S. Tanenbaum", "9780132126953"),
    ("The Paper Moon Atlas of 2099", "Fictional Writer", ""),
]


def main() -> None:
    OUT.mkdir(exist_ok=True)

    with (OUT / "book-list.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(("Title", "Author", "ISBN"))
        writer.writerows(ROWS)

    (OUT / "book-list.json").write_text(
        json.dumps(
            {"books": [dict(zip(("title", "author", "isbn"), row)) for row in ROWS]},
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    (OUT / "book-list.txt").write_text(
        "Sadi Book List Test\n"
        + "\n".join(" | ".join(row) for row in ROWS) + "\n",
        encoding="utf-8",
    )

    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.7)
    section.bottom_margin = Inches(0.7)
    title_style = doc.styles["Title"]
    title_style.font.color.rgb = RGBColor(0, 0, 0)
    title_style.font.underline = False
    title_style.font.size = Pt(20)
    ppr = title_style.element.pPr
    if ppr is not None:
        border = ppr.find(qn("w:pBdr"))
        if border is not None:
            ppr.remove(border)
    title = doc.add_paragraph(style="Title")
    title.add_run("Sadi Book List Test")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for row in ROWS:
        p = doc.add_paragraph(" | ".join(row))
        p.style = "Normal"
        p.paragraph_format.space_after = Pt(10)
    doc.core_properties.title = "Sadi Book List Test"
    doc.save(OUT / "book-list.docx")

    wb = Workbook()
    ws = wb.active
    ws.title = "Book List"
    ws.append(("Title", "Author", "ISBN"))
    for row in ROWS:
        ws.append(row)
    for cell in ws[1]:
        cell.fill = PatternFill("solid", fgColor="193A5E")
        cell.font = Font(bold=True, color="FFFFFF")
    for column, width in enumerate((39, 29, 20), start=1):
        ws.column_dimensions[get_column_letter(column)].width = width
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:C{ws.max_row}"
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.print_area = f"A1:C{ws.max_row}"
    wb.properties.title = "Sadi Book List Test"
    wb.save(OUT / "book-list.xlsx")

    pdf = canvas.Canvas(str(OUT / "book-list.pdf"), pagesize=A4)
    page_width, page_height = A4
    pdf.setTitle("Sadi Book List Test")
    pdf.setFillColor(colors.HexColor("#193A5E"))
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(48, page_height - 60, "Sadi Book List Test")
    pdf.setFillColor(colors.black)
    pdf.setFont("Helvetica", 10)
    for index, row in enumerate(ROWS):
        pdf.drawString(48, page_height - 105 - index * 26, " | ".join(row))
    pdf.save()

    records = []
    for title, author, isbn in ROWS:
        lines = ["=LDR  00000nam a2200000 a 4500"]
        if isbn:
            lines.append(f"=020  \\$a{isbn}")
        lines.extend((f"=100  1\\$a{author}", f"=245  10$a{title}"))
        records.append("\n".join(lines))
    (OUT / "book-list.mrk").write_text("\n\n".join(records) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
