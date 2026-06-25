# HVAC Workflow App MVP PRD

## Objective
Create an internal web application for Daikin VRV project workflow automation: thermal sheet extraction, VRV material costing, BOQ generation, quotation generation, and VRV schedule preparation inside a movable canvas.

## Users
- Estimation/application engineers
- Sales engineers
- Managers reviewing quotations

## Core Navigation
- **New Project**: creates a saved workflow canvas.
- **Documents**: searchable saved project library.

## Main Canvas Nodes
- Project / Client Details
- Thermal Sheet
- Thermal Export Table
- VRV Selection Report
- Costing Sheet
- BOQ / Price
- Quotation
- VRV Schedule
- Custom uploaded file nodes

## Project Details Fields
- Customer
- Contact Person
- Tel. No.
- Email
- Project
- Date, default current date
- Validity
- Enquiry No.
- Prepared By

## Quotation Number
- Lives on the Quotation node.
- Editable.
- Defaults from the previous quotation number with only the sequence changing.

## Thermal Sheet Workflow
- User clicks Thermal Sheet node.
- Small chat panel opens.
- User uploads scanned PDF/image.
- App guides extraction decisions.
- Thermal preview table supports manual editing.
- Air Flow Rate is included as the final column and is used by VRV Schedule.
- User confirms/extracts table.
- Table appears on canvas and can be edited/downloaded.

Thermal output columns:
1. Indoor
2. Room
3. Mode
4. Family or Model
5. Cooling DBT
6. Cooling WBT
7. Heating T
8. Tot Cool Cap
9. Sens Cool Cap
10. Heat Cap
11. Air Flow Rate

## VRV Selection Workflow
- User uploads PDF, DOC/DOCX, or image.
- App extracts material list.
- Costing and BOQ tables are generated automatically.
- No chat required for normal flow.
- Missing price-list matches keep model and qty; remaining cells stay blank/editable.
- Costing and BOQ are linked.

Costing columns:
1. S.No
2. Model
3. Qty
4. TR
5. List Price
6. Multiplier
7. Cost
8. Amount
9. Selling Price / Unit

Default margin: 10%, editable in table summary.

Costing formulas:
- Cost = List Price * Multiplier
- Amount = Cost * Qty
- Selling Price / Unit = Cost * (1 + Margin)
- Total Cost = Sum Amount
- Selling Price = Total Cost * (1 + Margin)
- Profit = Selling Price - Total Cost
- Price / Ton = Selling Price / Total TR

BOQ columns:
1. S.No
2. Description
3. Qty
4. Unit

BOQ summary:
- Total = costing selling price
- VAT 5%
- Net Amount = Total + VAT

No item-wise prices appear in the quotation BOQ.

## Quotation Workflow
- Uses provided Word template concept with BOQ placeholder.
- Project/client details fill the header table.
- BOQ table is inserted.
- Generates Word-compatible document and browser-printable PDF view in MVP.
- Costing sheet remains internal.

## VRV Schedule Workflow
- Wide editable table below workflow.
- Uses VRV Selection Report as the main row source.
- Thermal sheet matched by FCU name, case-insensitive.
- If a thermal match exists, fill Location, Rq TC, Rq SC, Air Flow Rate.
- If no thermal match exists, still keep VRV Selection FCU name/details and leave thermal fields blank.
- Preserve duplicate rows exactly.
- FCU model drives proposed indoor values from Indoor Data.
- Outdoor models drive proposed outdoor values from Outdoor Data.
- Download Excel option via three-dot menu.

## Canvas Behavior
- All nodes are movable.
- Node positions are saved with the project.
- Tables have a three-dot menu:
  - Lock/Unlock
  - Download Excel
  - Delete
- Locked tables cannot be edited or moved.
- Deleted generated tables can be regenerated from source uploads.
- Custom file nodes can be added with a plus button and show file preview/download.

## MVP Scope Notes
- The MVP includes the full workflow UI, storage, editable formulas, downloads, and document generation shell.
- OCR/scanned PDF extraction is represented by guided/manual table extraction hooks. Production OCR can be connected behind the same APIs later.
