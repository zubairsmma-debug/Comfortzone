import json
import os
import sys
from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


INK = (0.07, 0.12, 0.22)
MUTED = (0.34, 0.39, 0.48)
LINE = (0.72, 0.76, 0.82)
HEADER = (0.86, 0.88, 0.91)


def esc(value):
    return "" if value is None else str(value)


def number(value):
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def money(value):
    return f"{number(value):,.2f}"


def fmt_date(value):
    text = esc(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d %b %Y"):
        try:
            return datetime.strptime(text[:11].strip(), fmt).strftime("%d/%m/%Y")
        except Exception:
            pass
    return text


def wrap_text(text, max_chars):
    lines = []
    for raw in esc(text).replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        words = raw.split()
        if not words:
            lines.append("")
            continue
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


def draw_background(c, letterhead, width, height):
    if letterhead and os.path.exists(letterhead):
        c.drawImage(letterhead, 0, 0, width=width, height=height, preserveAspectRatio=False, mask="auto")
    else:
        c.setFillColorRGB(1, 1, 1)
        c.rect(0, 0, width, height, stroke=0, fill=1)


def draw_table_text(c, text, x, y, width, height, bold=False):
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", 8.4)
    lines = wrap_text(text, max(8, int(width / 4.6)))[:2]
    start_y = y + height - 14
    for line in lines:
        c.drawString(x + 6, start_y, line)
        start_y -= 10


def draw_detail_table(c, quote, customer, x, y, width):
    label_w = 88
    value_w = 168
    label2_w = 96
    value2_w = width - label_w - value_w - label2_w
    row_h = 25
    rows = [
        ("Customer:", quote.get("customer"), "Date:", fmt_date(quote.get("date"))),
        ("Contact Person:", customer.get("contact"), "Quotation No:", quote.get("no")),
        ("Email:", customer.get("email"), "Salesperson:", quote.get("salesperson")),
        ("Payment Terms:", quote.get("paymentTerms"), "Availability:", quote.get("deliveryTime")),
    ]
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(0.55)
    table_h = row_h * (len(rows) + 1)
    c.rect(x, y - table_h, width, table_h, stroke=1, fill=0)

    col_x = [x, x + label_w, x + label_w + value_w, x + label_w + value_w + label2_w, x + width]
    current_y = y
    for label, value, label2, value2 in rows:
        c.line(x, current_y - row_h, x + width, current_y - row_h)
        for line_x in col_x[1:-1]:
            c.line(line_x, current_y - row_h, line_x, current_y)
        draw_table_text(c, label, col_x[0], current_y - row_h, label_w, row_h, True)
        draw_table_text(c, value, col_x[1], current_y - row_h, value_w, row_h)
        draw_table_text(c, label2, col_x[2], current_y - row_h, label2_w, row_h, True)
        draw_table_text(c, value2, col_x[3], current_y - row_h, value2_w, row_h)
        current_y -= row_h

    c.line(x + label_w, current_y - row_h, x + label_w, current_y)
    draw_table_text(c, "Project:", x, current_y - row_h, label_w, row_h, True)
    draw_table_text(c, quote.get("project"), x + label_w, current_y - row_h, width - label_w, row_h)
    return y - table_h


def draw_intro(c, quote, customer, width, height):
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", 14.2)
    c.drawCentredString(width / 2, height - 128, "Quotation")

    left_x = 46
    y = draw_detail_table(c, quote, customer, left_x, height - 154, width - left_x * 2)
    y -= 20
    c.setFont("Helvetica-Bold", 9.2)
    c.drawString(left_x, y, "Subject: Supply of Daikin AC Units")
    y -= 16
    c.setFont("Helvetica", 8.9)
    c.drawString(left_x, y, "Thank you very much for your valid enquiry. We are offering our best quote as below.")
    return y - 24


def item_row_height(item):
    return max(23, 12 + len(wrap_text(item.get("description"), 66)[:4]) * 10)


def draw_item_header(c, x, y, widths):
    headers = ["S. No.", "Description", "Qty", "Unit"]
    c.setFillColorRGB(*HEADER)
    c.rect(x, y - 22, sum(widths), 22, stroke=1, fill=1)
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.55)
    pos = x
    for idx, title in enumerate(headers):
        c.line(pos, y - 22, pos, y)
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 8.2)
        c.drawCentredString(pos + widths[idx] / 2, y - 14, title)
        pos += widths[idx]
    c.line(pos, y - 22, pos, y)
    return y - 22


def draw_item_row(c, item, x, y, widths, serial):
    row_h = item_row_height(item)
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.45)
    c.rect(x, y - row_h, sum(widths), row_h, stroke=1, fill=0)
    pos = x
    for width in widths[:-1]:
        pos += width
        c.line(pos, y - row_h, pos, y)

    c.setFillColorRGB(0, 0, 0)
    mid_y = y - row_h / 2 - 3
    c.setFont("Helvetica", 8.2)
    c.drawCentredString(x + widths[0] / 2, mid_y, str(serial))

    desc_x = x + widths[0] + 7
    desc_lines = wrap_text(item.get("description"), 66)[:4]
    desc_y = y - 14
    for line in desc_lines:
        c.drawString(desc_x, desc_y, line)
        desc_y -= 10

    qty_x = x + widths[0] + widths[1]
    unit_x = qty_x + widths[2]
    c.drawCentredString(qty_x + widths[2] / 2, mid_y, money(item.get("qty")).rstrip("0").rstrip("."))
    c.drawCentredString(unit_x + widths[3] / 2, mid_y, esc(item.get("unit") or "Nos"))
    return y - row_h


def draw_summary(c, quote, x, y, w):
    item_subtotal = sum(number(item.get("qty")) * number(item.get("unitPrice")) for item in quote.get("items") or [])
    manual = esc(quote.get("manualSubtotal")).replace(",", "").strip()
    subtotal = number(manual) if manual else item_subtotal
    discount = number(quote.get("discount"))
    taxable = max(0, subtotal - discount)
    vat = taxable * 0.05
    total = taxable + vat
    rows = [("Total", money(subtotal))]
    if discount:
        rows.append(("Discount", f"-{money(discount)}"))
        rows.append(("Subtotal", money(taxable)))
    rows.extend([("VAT 5%", money(vat)), ("Net Amount", money(total))])
    label_x = x + w - 148
    value_x = x + w - 4
    c.setFont("Helvetica-Bold", 8.4)
    for label, value in rows:
        c.drawRightString(label_x, y, label)
        c.drawRightString(value_x, y, value)
        y -= 14
    return y


def parse_terms(text):
    sections = []
    current_label = ""
    current_lines = []
    for raw in esc(text).replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = raw.strip()
        if line.endswith(":") and len(line) <= 40:
            if current_label or current_lines:
                sections.append((current_label, "\n".join(current_lines).strip()))
            current_label = line[:-1]
            current_lines = []
        else:
            current_lines.append(raw)
    if current_label or current_lines:
        sections.append((current_label, "\n".join(current_lines).strip()))
    return sections


def draw_multiline_block(c, title, text, x, y, width, bottom, new_page):
    if not esc(text).strip():
        return y
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 8.8)
    c.drawString(x, y, title)
    y -= 15
    c.setFont("Helvetica", 8.2)
    for raw in esc(text).replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        wrapped = wrap_text(raw, 102)
        for line in wrapped:
            if y < bottom:
                c.showPage()
                new_page()
                y = 660
                c.setFont("Helvetica", 8.2)
            c.drawString(x, y, line)
            y -= 11
    return y - 6


def draw_terms(c, terms, x, y, width, bottom, new_page):
    sections = parse_terms(terms)
    if not sections:
        return y
    if y < bottom + 24:
        c.showPage()
        new_page()
        y = 660
    label_w = 98
    colon_w = 14
    text_w = width - label_w - colon_w - 16
    for label, body in sections:
        body_lines = []
        for raw in body.split("\n"):
            body_lines.extend(wrap_text(raw, 82))
        row_h = max(22, len(body_lines) * 10 + 8)
        if y - row_h < bottom:
            c.showPage()
            new_page()
            y = 660
        c.setFont("Helvetica-Bold", 8.3)
        c.drawString(x + 5, y - 12, label)
        c.drawString(x + label_w, y - 12, ":")
        c.setFont("Helvetica", 8.2)
        text_y = y - 12
        for line in body_lines:
            c.drawString(x + label_w + colon_w, text_y, line)
            text_y -= 10
        y -= row_h
    return y


def make_pdf(payload):
    quote = payload.get("quote") or payload
    customer = payload.get("customer") or {}
    letterhead = payload.get("letterheadPath", "")
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    left = 46
    table_w = width - left * 2
    bottom = 86

    def page_bg():
        draw_background(c, letterhead, width, height)

    page_bg()
    y = draw_intro(c, quote, customer, width, height)
    widths = [42, table_w - 162, 60, 60]
    y = draw_item_header(c, left, y, widths)
    for index, item in enumerate(quote.get("items") or [], 1):
        row_h = item_row_height(item)
        if y - row_h < bottom + 90:
            c.showPage()
            page_bg()
            y = 660
            y = draw_item_header(c, left, y, widths)
        y = draw_item_row(c, item, left, y, widths, index)
    y = draw_summary(c, quote, left, y - 12, table_w) - 18

    y = draw_multiline_block(c, "Notes", quote.get("notes"), left, y, table_w, bottom, page_bg)
    if esc(quote.get("terms")).strip() and y < bottom + 34:
        c.showPage()
        page_bg()
        y = 660
    if esc(quote.get("terms")).strip():
        c.setFont("Helvetica-Bold", 9.2)
        c.drawString(left, y, "Terms & Conditions")
        y -= 18
    y = draw_terms(c, quote.get("terms"), left, y, table_w, bottom, page_bg)

    c.save()
    return buf.getvalue()


def main():
    payload = json.load(sys.stdin)
    sys.stdout.buffer.write(make_pdf(payload))


if __name__ == "__main__":
    main()
