import json
import sys
from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def esc(value):
    return "" if value is None else str(value)


def challan_no(value):
    text = esc(value).strip() or "DN"
    upper = text.upper()
    if upper.startswith("DN/"):
        return text
    if upper.startswith("DN-"):
        return "DN/" + text[3:]
    if upper.startswith("DN "):
        return "DN/" + text[3:]
    return text


def current_date_label():
    return datetime.now().strftime("%d %b %Y")


def money(value):
    try:
        return f"{float(value):.2f}"
    except Exception:
        return "0.00"


def draw_lines(c, lines, x, y, leading=13, font="Helvetica", size=10):
    c.setFont(font, size)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def wrap_text(text, max_chars):
    words = esc(text).split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) > max_chars and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or [""]


def main():
    payload = json.load(sys.stdin)
    dn = payload.get("deliveryNote") or payload
    letterhead = payload.get("letterheadPath", "")

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    if letterhead:
        c.drawImage(letterhead, 0, 0, width=width, height=height, preserveAspectRatio=False, mask="auto")

    # Top company block and title alignment tuned to match the edited DN-2060 reference.
    company_x = 44
    company_y = height - 144
    c.setFillColorRGB(0.20, 0.20, 0.20)
    c.setFont("Helvetica-Bold", 10.8)
    c.drawString(company_x, company_y, "COMFORT ZONE A/C. DEVICES TR. LLC")
    company_lines = [
        "SHOWROOM 1",
        "INDUSTRIAL AREA 18",
        "SHARJAH Sharjah 343105",
        "U.A.E",
        "TRN 100543358400003",
        "00971561772530",
        "mudassir@comfortzoneuae.com",
        "https://comfortzoneuae.com/",
    ]
    draw_lines(c, company_lines, company_x, company_y - 14, leading=12.4, size=9.5)

    title_x = width - 39
    title_y = height - 162
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica", 27)
    c.drawRightString(title_x, title_y, "DELIVERY CHALLAN")
    c.setFont("Helvetica-Bold", 10)
    c.setFillColorRGB(0.22, 0.22, 0.22)
    c.drawRightString(title_x, title_y - 20, f"Delivery Challan# {challan_no(dn.get('dnNo'))}")

    # Deliver-to and date/ref area.
    meta_top = height - 272
    c.setFont("Helvetica", 10.5)
    c.setFillColorRGB(0.25, 0.25, 0.25)
    c.drawString(47, meta_top, "Deliver To")
    c.setFont("Helvetica-Bold", 9.7)
    c.drawString(47, meta_top - 14, esc(dn.get("customerName")))
    c.setFont("Helvetica", 9.7)
    deliver_lines = []
    if dn.get("deliveryLocation"):
        deliver_lines.append(esc(dn.get("deliveryLocation")))
    deliver_lines.append("U.A.E")
    draw_lines(c, deliver_lines, 47, meta_top - 28, leading=12.5, size=9.7)

    label_x = 439
    value_x = width - 45
    c.setFont("Helvetica", 10.5)
    c.drawRightString(label_x, meta_top + 1, "Challan Date :")
    c.drawRightString(value_x, meta_top + 1, current_date_label())
    c.drawRightString(label_x, meta_top - 28, "Ref :")
    c.drawRightString(value_x, meta_top - 28, esc(dn.get("projectName")))

    # Item table.
    table_x = 46
    table_w = width - 92
    header_y = meta_top - 85
    header_h = 24
    c.setFillColorRGB(0.22, 0.23, 0.22)
    c.rect(table_x, header_y, table_w, header_h, stroke=0, fill=1)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica", 9.5)
    c.drawString(table_x + 13, header_y + 8, "#")
    c.drawString(table_x + 40, header_y + 8, "Item & Description")
    c.drawRightString(table_x + table_w - 8, header_y + 8, "Qty")

    c.setFillColorRGB(0, 0, 0)
    row_y = header_y - 23
    row_h = 43
    for index, line in enumerate(dn.get("lines") or [], 1):
        c.setFont("Helvetica", 9.5)
        c.drawString(table_x + 13, row_y + 3, str(index))
        c.drawString(table_x + 40, row_y + 3, esc(line.get("modelNo")))
        c.setFont("Helvetica", 8.4)
        desc_lines = wrap_text(line.get("description"), 62)
        desc_y = row_y - 10
        for desc in desc_lines[:2]:
            c.drawString(table_x + 40, desc_y, desc)
            desc_y -= 10
        c.setFont("Helvetica", 9.5)
        c.drawRightString(table_x + table_w - 8, row_y + 3, money(line.get("qtyGoingOut")))
        c.setFont("Helvetica", 8.4)
        c.drawRightString(table_x + table_w - 8, row_y - 10, "pcs")
        c.setStrokeColorRGB(0.62, 0.62, 0.62)
        c.line(table_x, row_y - 25, table_x + table_w, row_y - 25)
        row_y -= row_h

    # Receiver block, no delivery/contact duplicate details below the item table.
    receiver_x = 345
    receiver_y = max(row_y - 25, 155)
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica", 10.5)
    draw_lines(c, ["Receivers Name:", "Receiver Number:", "Date & Signature:"], receiver_x, receiver_y, leading=25, size=10.5)

    c.showPage()
    c.save()
    sys.stdout.buffer.write(buf.getvalue())


if __name__ == "__main__":
    main()
