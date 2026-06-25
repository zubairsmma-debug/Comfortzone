# API Design

## Projects
- `GET /api/projects`
  - Search/list saved projects.
- `POST /api/projects`
  - Create a project.
- `GET /api/projects/:id`
  - Load project canvas.
- `PUT /api/projects/:id`
  - Save full project state.
- `DELETE /api/projects/:id`
  - Delete project.

## Uploads
- `POST /api/projects/:id/uploads`
  - Multipart upload for PDF, DOC, DOCX, XLSX, images, or custom files.
- `GET /api/projects/:id/uploads/:uploadId`
  - Download/preview uploaded file.

## Workflow Actions
- `POST /api/projects/:id/actions/generate-costing`
  - Build costing and BOQ from extracted material rows and price list rows.
- `POST /api/projects/:id/actions/generate-boq`
  - Rebuild BOQ from costing table.
- `POST /api/projects/:id/actions/generate-vrv-schedule`
  - Build VRV Schedule from thermal table, VRV rows, indoor lookup, and outdoor lookup.
- `POST /api/projects/:id/actions/generate-quotation`
  - Generate quotation document from details and BOQ.

## Downloads
- `POST /api/export/table`
  - Export any posted table as Excel-compatible `.xls`.
- `POST /api/export/quotation`
  - Export quotation as Word-compatible `.doc`.

## Extraction Hooks
These are planned integration points for OCR/parsing:
- `POST /api/extract/thermal`
- `POST /api/extract/vrv-selection`
- `POST /api/extract/price-list`
- `POST /api/extract/vrv-schedule-template`

MVP behavior allows manual/editable data entry when automated extraction confidence is low.
