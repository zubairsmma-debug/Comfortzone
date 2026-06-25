# Database Schema

The MVP stores JSON files on disk. The schema is intentionally compatible with a future SQL database.

## Project
```json
{
  "id": "uuid",
  "title": "string",
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime",
  "details": {
    "customer": "string",
    "contactPerson": "string",
    "telNo": "string",
    "email": "string",
    "project": "string",
    "date": "YYYY-MM-DD",
    "validity": "string",
    "enquiryNo": "string",
    "preparedBy": "string"
  },
  "quotation": {
    "quotationNo": "string",
    "generatedDocId": "string",
    "generatedPdfId": "string"
  },
  "nodes": [
    {
      "id": "string",
      "type": "projectDetails|thermalUpload|thermalTable|vrvUpload|costingTable|boqTable|quotation|vrvSchedule|file",
      "title": "string",
      "x": 0,
      "y": 0,
      "locked": false,
      "data": {}
    }
  ],
  "uploads": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "nodeId": "string",
      "originalName": "string",
      "storedName": "string",
      "mimeType": "string",
      "size": 0,
      "createdAt": "ISO datetime"
    }
  ],
  "tables": {
    "thermal": { "columns": [], "rows": [] },
    "costing": { "columns": [], "rows": [], "summary": {} },
    "boq": { "columns": [], "rows": [], "summary": {} },
    "vrvSchedule": { "columns": [], "rows": [] }
  },
  "priceList": {
    "items": [
      {
        "model": "string",
        "description": "string",
        "origin": "string",
        "boqDescription": "string",
        "listPrice": 0,
        "multiplier": 0,
        "costPrice": 0,
        "tr": 0
      }
    ]
  },
  "lookup": {
    "indoorData": [],
    "outdoorData": []
  }
}
```

## Future SQL Tables
- users
- projects
- project_nodes
- uploads
- table_snapshots
- price_list_items
- indoor_lookup_items
- outdoor_lookup_items
- generated_documents
- audit_events
