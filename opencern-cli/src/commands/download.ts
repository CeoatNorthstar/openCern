// TODO: /download Command Handler
//
// Handles dataset discovery and download from CERN Open Data.
//
// Usage:
//   /download                     → Interactive browser (search, filter, select)
//   /download higgs               → Search for "higgs" datasets
//   /download --save ~/mydata     → Download to custom location
//   /download --id 12345          → Download specific dataset by ID
//
// Flow:
//   1. Calls the OpenCERN API (/datasets/search) to browse available datasets
//   2. Renders a searchable, scrollable DataTable of results
//   3. User selects a dataset → shows file list with sizes
//   4. User selects files to download (multi-select with Space, Enter to confirm)
//   5. Starts download via API (/downloads/start)
//   6. Shows ProgressBar with speed and ETA
//   7. After download, auto-detects archives (.zip) and extracts ROOT files
//   8. Updates session context so AI knows what was downloaded
//
// Edge cases:
//   - Resume interrupted downloads
//   - Handle XRootD protocol for large files
//   - Show warning for very large datasets (>1GB)
