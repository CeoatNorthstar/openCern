// TODO: Data Table Component
//
// Renders tabular data in the terminal with styled borders and alignment.
//
// Used for:
//   - Dataset catalog listing (/download browsing)
//   - Event data tables (particle properties from processed JSON)
//   - Quantum results (classification probabilities per event)
//   - System status (/status)
//
// Features:
//   - Auto-column-width based on content and terminal width
//   - Sortable columns (press column header key to sort)
//   - Scrollable rows when data exceeds terminal height
//   - Alternating row colors for readability
//   - Selectable rows (highlight with ↑/↓, select with Enter)
//   - Number formatting (scientific notation for physics values)
//   - Unit display (GeV, rad, etc.)
//   - Truncation with "..." for long values
//
// Example:
//   ┌────┬──────────┬──────────┬────────┬─────────┐
//   │ #  │ Particle │ pT (GeV) │ η      │ φ (rad) │
//   ├────┼──────────┼──────────┼────────┼─────────┤
//   │ 1  │ muon     │ 45.23    │ -0.340 │ 2.141   │
//   │ 2  │ electron │ 32.87    │  1.203 │ -1.523  │
//   │ 3  │ photon   │ 28.41    │  0.012 │  0.847  │
//   └────┴──────────┴──────────┴────────┴─────────┘
