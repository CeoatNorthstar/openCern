# OpenCERN

> **An open source desktop application for exploring, downloading, processing, and visualizing real particle collision data from CERN's Open Data Portal.**

OpenCERN is a cross-platform desktop application that brings the data of the Large Hadron Collider to anyone with a laptop. It is not a web app, not a Jupyter notebook, not a command line tool. It is a full native desktop application — installable, self-contained, and designed to work without any prior knowledge of particle physics software, ROOT, or CERN's data infrastructure.

The application covers the complete data pipeline from discovery to visualization: browse available datasets from the CMS, ALICE, and ATLAS experiments directly inside the app, download ROOT files to local storage, process them into structured collision event data using a local Python processor, stream the processed events through a Rust WebSocket server, and render the resulting particle tracks in a real-time interactive 3D WebGL scene.

Every component of this pipeline runs locally on the user's machine. No cloud. No API keys. No accounts. The data comes directly from CERN's public servers.

---

## Table of Contents

- [Background](#background)
- [What OpenCERN Actually Does](#what-opencern-actually-does)
- [The Large Hadron Collider and Its Data](#the-large-hadron-collider-and-its-data)
- [Supported Experiments](#supported-experiments)
- [The Data Pipeline](#the-data-pipeline)
- [Architecture](#architecture)
- [The FastAPI Backend](#the-fastapi-backend)
- [The Data Processor](#the-data-processor)
- [The Rust Streamer](#the-rust-streamer)
- [The Electron Application](#the-electron-application)
- [The 3D Visualization Engine](#the-3d-visualization-engine)
- [The XRootD Problem](#the-xrootd-problem)
- [Known Limitations](#known-limitations)
- [Current State](#current-state)
- [Roadmap](#roadmap)
- [The Physics](#the-physics)
- [Technology Stack](#technology-stack)
- [Version History](#version-history)
- [License](#license)

---

## Background

CERN's Open Data Portal has made terabytes of real particle physics data publicly available since 2014. This includes data from the CMS experiment's proton-proton collision runs at 7 TeV and 13 TeV, ALICE's heavy-ion runs measuring quark-gluon plasma at 2.76 TeV per nucleon pair, and ATLAS datasets covering a wide range of Standard Model processes including the Higgs boson discovery channel.

The problem is access. The data is stored in ROOT files — a binary format developed at CERN that requires either the ROOT C++ framework or specialized Python libraries to read. Downloading the data requires familiarity with XRootD, CERN's file transfer protocol. Processing the data into anything visualizable requires knowledge of particle physics analysis techniques, coordinate systems, and detector geometry. The barrier to entry is high enough that this data — collected at extraordinary cost, representing some of the most significant scientific measurements in human history — is effectively inaccessible to anyone outside the particle physics community.

OpenCERN exists to remove that barrier. It wraps the entire pipeline — CERN API integration, XRootD file transfer, ROOT file processing, physics event extraction, real-time 3D visualization — into a single installable desktop application that works out of the box.

The immediate inspiration for the project was a personal frustration: being deeply interested in the physics of the LHC, having read extensively about the Higgs boson discovery, the quark-gluon plasma measurements at ALICE, and the precision electroweak measurements at ATLAS and CMS, and having no practical way to actually look at the data without a significant software infrastructure investment. OpenCERN is the tool that should have existed.

---

## What OpenCERN Actually Does

OpenCERN is organized around four primary workflows that mirror how a physicist actually works with LHC data, simplified and made accessible through a native desktop interface.

**Dataset Discovery.** The application connects to CERN's Open Data API and presents available datasets from CMS, ALICE, and ATLAS in a browseable interface. Each dataset card shows the experiment, the physics process, the collision energy, the year of data collection, the available ROOT files, and the total data size. The user can filter by experiment and scroll through the available catalog without leaving the application.

**Local Data Management.** Downloaded ROOT files are tracked in a Local Storage panel that functions similarly to a model library in applications like LM Studio. Files are listed with their size, processing status, and available actions. The panel shows which files have been processed and have JSON output ready for visualization, which are downloaded but unprocessed, and which are currently downloading with live progress. Files can be deleted individually. Reveal in Finder is available for direct filesystem access.

**Data Processing.** The processing step converts a raw ROOT file into a structured JSON document containing the top 5000 highest-energy collision events from that dataset. Each event contains the full particle content — muons, electrons, jets, tau leptons, photons, and missing transverse energy — with complete four-vector information (px, py, pz, energy) and derived quantities (scalar HT, MET significance, b-jet count, leading lepton pT). The processed JSON also contains a metadata header with processing statistics and branch availability information. Processing runs locally using the bundled Python processor and takes two to four minutes for a typical 300MB ROOT file containing 600,000 events.

**3D Visualization.** The visualization tab renders the processed collision events in an interactive 3D scene. The scene shows a wireframe representation of the CMS detector barrel with concentric inner detector layers, the beam pipe running through the center, and the particle tracks from each collision event shooting outward from the interaction point. The user can scrub through all 5000 events using a slider, navigate with previous and next buttons, jump directly to the highest-energy event, and orbit, zoom, and pan the scene using mouse and keyboard controls. Each event transition plays a brief animation — the collision point flashes, old tracks fade, new tracks grow outward from the origin over 400 milliseconds — conveying the kinematic reality of particles flying outward from a proton-proton collision.

---

## The Large Hadron Collider and Its Data

The LHC accelerates protons to 99.9999991% of the speed of light and collides them at four interaction points along its 27-kilometer circumference. At the CMS and ATLAS interaction points, the center-of-mass collision energy is 13 TeV in Run 2 — equivalent to approximately 13 × 10¹² electron volts, or roughly the kinetic energy of a flying mosquito concentrated into a space smaller than a proton. At the ALICE interaction point, the collider switches to lead ions for Pb-Pb runs at 2.76 TeV per nucleon pair.

Each proton-proton collision produces dozens to hundreds of particles. The detectors surrounding each interaction point — layered structures of silicon trackers, calorimeters, and muon systems — record the trajectories, momenta, and energies of these particles. A typical LHC run records hundreds of millions of collision events per second at the raw detector level, filtered by trigger systems down to roughly 1000 events per second for permanent storage. A single year of CMS running produces approximately 15 petabytes of collision data.

This data is stored in ROOT files. A ROOT file is a hierarchical binary container format invented at CERN in 1995. The data is organized into TTree structures — think database tables — with branches corresponding to physics quantities. A CMS NanoAOD file (the most compact format available on the Open Data Portal) typically contains an Events tree with hundreds of branches covering every reconstructed physics object in the event. An entry in the Events tree is a single collision event. The branch `Muon_pt` is an array of the transverse momenta of all reconstructed muons in that event. The branch `Jet_btag` is an array of b-tagging discriminant values for all reconstructed jets.

The open data available on CERN's portal represents a carefully curated subset of the full Run 1 (2010-2012) and Run 2 (2015-2018) datasets, processed into formats suitable for analysis outside CERN's computing infrastructure. It is real collision data — not simulated, not toy data, not simplified examples. The collision events in the datasets OpenCERN downloads and visualizes are the same events that contributed to the measurements of Higgs boson properties, the top quark mass, W and Z boson cross-sections, and the quark-gluon plasma temperature at ALICE.

---

## Supported Experiments

### CMS — Compact Muon Solenoid

CMS is a general-purpose detector at the LHC, one of the two experiments that confirmed the discovery of the Higgs boson in 2012. It is named for its 12,500-tonne superconducting solenoid magnet, which generates a 3.8 Tesla magnetic field that curves the trajectories of charged particles and enables momentum measurement. CMS is approximately 21 meters long, 15 meters in diameter, and weighs more than the Eiffel Tower.

OpenCERN currently supports CMS NanoAOD ROOT files, which are the most compact and portable format of CMS data available on the Open Data Portal. NanoAOD files contain per-event particle-level information for all reconstructed physics objects — muons, electrons, jets, tau leptons, photons, and missing transverse energy — with associated identification variables and four-vector information. The CMS datasets currently accessible in OpenCERN are sourced from the Higgs to tau tau analysis tutorial files hosted on ROOT's public file server, covering proton-proton collisions at 8 TeV from the 2012 run period.

The CMS branch naming convention follows the NanoAOD schema: particle collections are prefixed with their type (`Muon_`, `Electron_`, `Jet_`, `Tau_`, `Photon_`) followed by the quantity name (`pt`, `eta`, `phi`, `mass`, `charge`, identification variables). Event-level quantities like missing transverse energy use the prefix `MET_`.

**Current HTTP-accessible CMS datasets:**
- Run2012B TauPlusX — real collision data, TauPlusX primary dataset
- Run2012C TauPlusX — real collision data, continuation of B run period
- GluGluToHToTauTau — Higgs boson production via gluon fusion, H→ττ decay
- VBF_HToTauTau — Higgs boson production via vector boson fusion, H→ττ
- DYJetsToLL — Drell-Yan background process, Z/γ*→ℓℓ
- TTbar — top quark pair production background

**Known limitation:** The vast majority of CMS open data is stored on CERN's EOS filesystem and served exclusively via XRootD. HTTP access is not available for these datasets. This is a fundamental infrastructure constraint of CERN's storage systems, not a policy decision. The six datasets listed above are among the very few CMS files served over plain HTTPS from ROOT's public file server. Full access to the CMS open data catalog requires XRootD integration, which is currently in active development.

---

### ALICE — A Large Ion Collider Experiment

ALICE is a dedicated heavy-ion detector at the LHC, designed to study the quark-gluon plasma — the state of matter that existed in the first microseconds after the Big Bang, when quarks and gluons were not yet bound into protons and neutrons. ALICE achieves this by colliding lead nuclei (Pb-Pb) at ultra-relativistic energies, creating a fireball with temperatures exceeding 2 × 10¹² Kelvin, hot enough to melt the protons and neutrons themselves into a deconfined quark-gluon plasma.

ALICE's detector design is optimized for tracking the hundreds of charged particles produced in a single Pb-Pb collision — far more tracks than a typical pp event at CMS or ATLAS. The Time Projection Chamber (TPC) at ALICE's core can reconstruct up to 20,000 tracks per event in central Pb-Pb collisions. This is qualitatively different from CMS or ATLAS data — where a typical event might have 10-50 reconstructed objects, a central ALICE Pb-Pb event can have thousands of charged particle tracks.

OpenCERN currently processes ALICE masterclass ESD files. These are simplified Event Summary Data files produced specifically for educational use, containing track-level information for charged particles measured in the ALICE TPC. The track data includes transverse momentum, pseudorapidity, azimuthal angle, and charge. Particle identification is available via the TPC dE/dx signal (energy loss per unit length) and the TOF time-of-flight measurement, which together allow statistical separation of pions, kaons, and protons.

**Current ALICE HTTP-accessible datasets:**
- LHC2010h PbPb VSD 139036 — Pb-Pb masterclass data at 2.76 TeV per nucleon pair

**Known limitation:** ALICE data on CERN's EOS servers is subject to the same HTTP gateway restrictions as CMS data. The EOS HTTP proxy caps individual file transfers at approximately 41 MB regardless of the actual file size. This is a server-side connection limit imposed by CERN's HTTP gateway infrastructure and is not configurable from the client side. The full ALICE masterclass dataset is distributed across 12 individual ROOT files, each approximately 41-65 MB, which represent the accessible HTTP-downloadable portion. ALICE's full physics datasets are served via XRootD and are subject to the same XRootD integration dependency as CMS.

---

### ATLAS — A Toroidal LHC Apparatus

ATLAS is the largest general-purpose particle detector ever built, stretching 46 meters in length and 25 meters in height — roughly the size of a seven-story building. Like CMS, it is a general-purpose detector covering a wide range of physics measurements. ATLAS and CMS are designed to be complementary — independent experiments at the same accelerator providing cross-checks of critical measurements. Both independently confirmed the Higgs boson discovery in 2012, which remains one of the most important scientific results of the 21st century.

ATLAS uses a different magnetic field geometry than CMS — a toroidal configuration rather than a solenoid — which gives the detector its distinctive appearance and provides excellent muon momentum resolution over a large angular range. The ATLAS calorimeter system uses liquid argon as the active medium for electromagnetic calorimetry, while CMS uses lead tungstate crystals.

ATLAS open data is available in a simplified NTuple format for educational use. The branch naming convention is different from CMS: jet quantities use `jet_pt`, `jet_eta`, `jet_phi`, `jet_E` without the underscore-prefixed collection naming of CMS NanoAOD. Muons are `mu_pt`, `mu_eta`, `mu_phi`. Electrons are `el_pt`, `el_eta`, `el_phi`. B-jet identification uses the MV1 multivariate discriminant (`jet_MV1`) rather than CMS's DeepCSV or DeepJet taggers.

**Current ATLAS status:** ATLAS data access requires XRootD. All ATLAS ROOT files on CERN's Open Data Portal are stored on EOS and served exclusively via the XRootD protocol. There is no HTTP alternative for ATLAS data. OpenCERN's data processor includes the ATLAS branch mapping and extraction logic, but downloading ATLAS files is blocked until the XRootD native addon is complete. This is the primary driver of the XRootD development priority.

**Available ATLAS educational datasets (pending XRootD):**
- Higgs boson production and decay to four leptons (H→ZZ*→4ℓ) — the golden channel
- W boson production with associated jets (W+jets)
- Z boson production with associated jets (Z+jets)
- Top quark pair production (ttbar)
- Dijet QCD background

---

## The Data Pipeline

Understanding how data flows through OpenCERN is important for understanding both its capabilities and its current limitations.

```
CERN Open Data Portal (HTTPS / XRootD)
              │
              ▼
    ┌─────────────────┐
    │  FastAPI Backend │  ← Port 8080
    │  (Python)        │
    └────────┬────────┘
             │  Writes ROOT file to disk
             ▼
    ~/opencern-datasets/data/
             │
             ▼
    ┌─────────────────────┐
    │   Data Processor     │  ← Called on demand
    │   (Python + uproot)  │
    └──────────┬──────────┘
               │  Writes processed JSON to disk
               ▼
    ~/opencern-datasets/processed/
               │
               ▼
    ┌─────────────────────┐
    │   Rust Streamer      │  ← Port 9001 (WebSocket)
    │   (tokio + tungstenite) │
    └──────────┬──────────┘
               │  Streams events via WebSocket
               ▼
    ┌─────────────────────────────────────────┐
    │            Electron Application          │
    │  ┌─────────────────────────────────┐    │
    │  │     React UI + Three.js WebGL   │    │
    │  │     3D Particle Visualization   │    │
    │  └─────────────────────────────────┘    │
    └─────────────────────────────────────────┘
```

Each stage in this pipeline is independent and communicates through well-defined interfaces — HTTP REST for the API, filesystem for data storage, WebSocket for real-time streaming. This architecture means each component can be developed, tested, and replaced independently.

---

## Architecture

### Service Topology

OpenCERN consists of three independent services orchestrated by Docker Compose, communicating with the Electron frontend application:

**Service 1: FastAPI Backend (port 8080)**
Handles all network operations — CERN API integration, dataset listing, HTTP and XRootD file downloads, download progress tracking, file management, processing job dispatch. Written in Python using FastAPI and uvicorn. Stateless between requests except for the in-memory download status dictionary.

**Service 2: Rust WebSocket Streamer (port 9001)**
Accepts WebSocket connections from the Electron renderer process. On connection, reads a specified processed JSON file from the shared data volume, parses it, and streams collision events one by one as JSON-encoded WebSocket messages. Written in Rust using tokio for async runtime and tokio-tungstenite for WebSocket handling. Accepts a `file` query parameter to specify which processed dataset to stream.

**Service 3: Python Data Processor (invoked on demand)**
A standalone Python script invoked by the FastAPI backend as a subprocess when the user requests processing of a downloaded ROOT file. Uses uproot to open ROOT files, awkward-array for columnar physics data manipulation, numpy for numerical operations, and tqdm for progress reporting. Outputs a structured JSON document to the processed data directory.

**Electron Application (main + renderer processes)**
The desktop application shell. The main process manages the window lifecycle, auto-starts Docker services on launch, handles IPC between the OS and renderer. The renderer process hosts the React application, communicates with the FastAPI backend via axios HTTP calls, and connects to the Rust streamer via native WebSocket for the visualization tab.

### Data Directory Structure

```
~/opencern-datasets/
├── data/               ← Downloaded ROOT files
│   ├── TTbar.root
│   ├── AliVSD_MasterClass_1.root
│   └── ...
└── processed/          ← Processed JSON output
    ├── TTbar.json
    └── ...
```

Both the FastAPI backend and Rust streamer mount this directory as a Docker volume, giving both services read and write access to the same filesystem namespace.

---

## The FastAPI Backend

The backend exposes a REST API that the Electron frontend calls for all data operations. It is intentionally thin — it does not perform any physics computation, does not store state beyond the current session's download status map, and does not cache anything. Every request either hits CERN's API directly or operates on the local filesystem.

### Endpoints

**GET /datasets**
Fetches available datasets from CERN's Open Data API. Accepts an `experiment` query parameter (`CMS`, `ALICE`, `all`). For CMS returns the hardcoded list of HTTP-accessible files. For ALICE and all experiments queries CERN's API with `type=Dataset&subtype=Collision&file_type=root` filters. Parses the `hits.hits` structure of the CERN API response, extracts metadata from each record, and converts XRootD URIs to HTTPS where possible using the `root://eospublic.cern.ch//` → `https://eospublic.cern.ch/` substitution.

**POST /download**
Initiates a file download as a background task. Accepts `file_url` and `filename` query parameters. Creates the data directory if it does not exist. Initializes a `DownloadStatus` entry in the global status dictionary. Runs the actual download in a `ThreadPoolExecutor` to avoid blocking the async event loop. The download uses `requests.Session` with streaming enabled, HTTP Range request support for resumable downloads, and a retry loop that continues from the last successfully downloaded byte position if the connection drops.

**GET /download/status**
Returns the current `DownloadStatus` for a given filename — status string (pending, downloading, done, error, cancelled) and progress float (0-100). Polled by the frontend every 500ms during active downloads.

**POST /download/cancel**
Adds a filename to the global `cancelled_downloads` set. The download thread checks this set after writing each chunk and exits if the filename is present.

**POST /download/resume**
Removes a filename from `cancelled_downloads`, resets the status, and restarts the background download task.

**GET /files**
Lists all files in the data directory with their sizes. Filters `.DS_Store`. Returns sorted by filename.

**DELETE /files/{filename}**
Removes a file from the data directory and from the download status dictionary.

**GET /files/{filename}/reveal**
Opens the file in Finder using `subprocess.run(["open", "-R", filepath])`. macOS only.

**POST /process**
Invokes the data processor as a subprocess against the specified file. Dispatches as a background task so the API response is immediate. The processor runs to completion independently.

**GET /process/status**
Returns whether a processed JSON file exists for the given ROOT filename.

### Download Implementation

The download implementation went through several iterations before reaching a stable state. The initial httpx async streaming approach failed because the async context was terminated before the download completed when running as a FastAPI background task. The replacement using `requests` with synchronous streaming running in a `ThreadPoolExecutor` via `asyncio.run_in_executor` resolved this — the download runs in a dedicated thread pool, completely isolated from the async event loop, with progress updates written to the shared status dictionary.

The retry loop with HTTP Range requests is critical for large files. CERN's EOS HTTP gateway has a tendency to drop connections mid-transfer on large downloads. The implementation uses `session.get` with a `Range: bytes={downloaded_size}-` header to resume from the last known position, wrapping the chunk reading loop in a try-except that continues the outer while loop on any exception. This provides robust resumable download behavior without requiring explicit session management.

---

## The Data Processor

The data processor is a standalone Python script that takes a single ROOT file path as its command-line argument and produces a structured JSON output file. It is designed to be experiment-agnostic — it detects the format of the input file and routes to the appropriate extraction logic.

### Format Detection

Format detection examines the branch names present in the ROOT file's primary tree. CMS NanoAOD files contain branches like `Muon_pt`, `Electron_pt`, `Jet_pt` — the underscore-separated collection and quantity naming is unique to NanoAOD. ALICE ESD files contain branches starting with `fTracks_` or use the `esdTree` tree name. ATLAS educational NTuple files contain branches like `jet_pt`, `mu_pt`, `el_pt` without the collection-prefix convention of NanoAOD. If no known format is detected the processor logs the available branch names and exits with an error suggesting the user inspect the file structure manually.

### CMS NanoAOD Extraction

For CMS NanoAOD files the processor extracts the following physics objects from the Events tree:

**Muons:** `nMuon`, `Muon_pt`, `Muon_eta`, `Muon_phi`, `Muon_mass`, `Muon_charge`, `Muon_pfRelIso03_all`, `Muon_tightId`, `Muon_softId`. The `pfRelIso03_all` variable is the particle-flow relative isolation in a cone of ΔR < 0.3, a measure of how much additional activity surrounds the muon candidate and used to distinguish prompt muons from muons inside jets.

**Electrons:** `nElectron`, `Electron_pt`, `Electron_eta`, `Electron_phi`, `Electron_mass`, `Electron_charge`, `Electron_pfRelIso03_all`, `Electron_cutBasedId`. The `cutBasedId` is an integer encoding the working point of the cut-based electron identification (0=fail, 1=veto, 2=loose, 3=medium, 4=tight).

**Jets:** `nJet`, `Jet_pt`, `Jet_eta`, `Jet_phi`, `Jet_mass`, `Jet_btag`, `Jet_jetId`, `Jet_puId`. The `btag` variable is the DeepCSV b-tagging discriminant score. Jets with a score above 0.5 are tagged as likely b-jets — jets originating from bottom quarks, which are a key signature of Higgs boson and top quark events.

**Tau leptons:** `nTau`, `Tau_pt`, `Tau_eta`, `Tau_phi`, `Tau_mass`, `Tau_charge`, `Tau_decayMode`, `Tau_idDecayMode`. Tau leptons are the heaviest of the three charged leptons and decay hadronically 65% of the time, producing collimated jets of pions and kaons that are reconstructed as hadronic tau candidates.

**Photons:** `nPhoton`, `Photon_pt`, `Photon_eta`, `Photon_phi`, `Photon_mass`, `Photon_cutBasedId`, `Photon_pfRelIso03_all`. Photons are important for Higgs to diphoton (H→γγ) analyses and are also produced in final state radiation from charged leptons.

**Missing Transverse Energy:** `MET_pt`, `MET_phi`, `MET_significance`. MET is the magnitude of the negative vector sum of all reconstructed transverse momenta in the event. Non-zero MET indicates the presence of particles that escaped the detector without interacting — primarily neutrinos from W and Z decays, but also potentially new physics including dark matter candidates.

**Generator-level information (simulation only):** `genWeight`, `nGenPart`, `GenPart_pt`, `GenPart_eta`, `GenPart_phi`, `GenPart_pdgId`, `GenPart_status`, `GenPart_statusFlags`. These branches are present in Monte Carlo simulation files and absent in real collision data. The PDG ID uniquely identifies each generated particle type according to the Particle Data Group numbering scheme.

**Trigger decisions:** `HLT_IsoMu24`, `HLT_Ele27_WPTight_Gsf`, `HLT_Mu17_TrkIsoVVL_Mu8_TrkIsoVVL`, `HLT_Ele23_Ele12_CaloIdL_TrackIdL_IsoVL`. High Level Trigger path decisions indicate which trigger algorithm selected this event for permanent storage. Events that passed `HLT_IsoMu24` (isolated single muon trigger, pT > 24 GeV) were selected because they contained a high-pT isolated muon consistent with a W or Z boson decay.

### Coordinate System and Kinematic Reconstruction

CMS uses a right-handed coordinate system with the x-axis pointing toward the center of the LHC ring, the y-axis pointing upward, and the z-axis along the beam direction. Particle momenta are described in cylindrical coordinates (pT, η, φ) where pT is the transverse momentum, η = -ln(tan(θ/2)) is the pseudorapidity (a dimensionless measure of polar angle), and φ is the azimuthal angle.

The processor converts these to Cartesian four-vectors for Three.js rendering:

```
px = pT × cos(φ)
py = pT × sin(φ)
pz = pT × sinh(η)
E  = √(px² + py² + pz² + m²)
```

This conversion is exact for massless particles and a good approximation for particles where m ≪ |p|.

### Event Selection and Filtering

The processor applies a basic physics-motivated event selection before writing the output. Events must contain at least one muon or electron with pT > 20 GeV — ensuring the event was likely triggered by a real lepton from a W or Z boson decay rather than a QCD multijet background event. Events must have MET > 20 GeV — indicating at least one neutrino or other invisible particle. Events must have at least one jet with pT > 30 GeV. These requirements roughly correspond to a W+jets or ttbar event topology.

After filtering, events are sorted by scalar HT — the scalar sum of all jet transverse momenta — in descending order. The top 5000 highest-HT events are written to the output JSON. HT is used as the sorting criterion because it correlates with the overall energy scale of the hard interaction and tends to select the most physically interesting events with the highest multiplicity of energetic objects.

### Output Format

The processor writes a JSON document with two top-level keys: `metadata` and `events`.

The `metadata` object contains:
- `source_file` — absolute path to the input ROOT file
- `total_events` — number of events in the ROOT file before selection
- `filtered_events` — number of events passing selection and written to output
- `processed_at` — ISO 8601 timestamp of processing completion
- `ht_distribution` — 20-bin histogram of HT values across selected events
- `met_distribution` — 20-bin histogram of MET values across selected events
- `avg_particles_per_event` — mean number of reconstructed physics objects per event

Each entry in the `events` array contains:
- `index` — the original event number in the ROOT file
- `ht` — scalar HT in GeV
- `met` — MET magnitude in GeV
- `n_bjets` — number of b-tagged jets (DeepCSV score > 0.5)
- `leading_lepton_pt` — pT of the highest-pT lepton in GeV
- `particles` — array of particle objects, each with type, color, pt, eta, phi, mass, px, py, pz, energy
- `met_vector` — object with `pt` and `phi` of the MET vector
- `triggers` — object mapping trigger path names to boolean pass/fail decisions

---

## The Rust Streamer

The Rust streamer is a WebSocket server that reads processed JSON files from disk and streams their events to connected clients. It is written in asynchronous Rust using the tokio runtime and tokio-tungstenite for WebSocket protocol handling.

### Why Rust

The choice of Rust for the streaming layer reflects the requirements of the component. The streamer must handle multiple simultaneous connections — one per open visualization tab — each streaming thousands of JSON messages. It must parse large JSON files efficiently. It must be low-latency. And it must be reliable — a crash in the streamer should not affect the FastAPI backend or the Electron application.

Rust's performance characteristics make it well-suited for this role. JSON parsing using serde_json is fast enough to parse a 50MB processed JSON file in under a second. The tokio async runtime handles multiple connections with minimal overhead. The type system and ownership model eliminate the classes of memory safety bugs that could cause crashes or data corruption.

The Rust binary is compiled in release mode (`cargo build --release`) for the production Docker image, producing a single statically-linked executable with no runtime dependencies.

### WebSocket Protocol

The streamer accepts WebSocket upgrade requests at port 9001. The URL may include query parameters:

- `file=<name>` — the stem of the processed JSON file to stream (e.g. `file=TTbar` streams `~/opencern-datasets/processed/TTbar.json`)
- `from=<index>` — the event index from which to begin streaming (default 0)

On connection the streamer:
1. Parses the query parameters from the HTTP upgrade request
2. Constructs the path to the requested JSON file
3. Reads and parses the entire JSON file into memory using serde_json
4. Iterates over the events array, serializing each event back to a JSON string and sending it as a WebSocket text message
5. Closes the connection after all events have been sent

The Electron renderer receives these messages, appends each parsed event to an in-memory array, and updates a loading progress indicator. When the connection closes (all events received) the visualization becomes interactive.

### Connection Model

The current connection model is one-shot — the streamer sends all events and closes. This is appropriate for the current use case where the full dataset is loaded into the renderer's memory before interaction begins. Future iterations may support a cursor-based protocol where the renderer requests specific event ranges on demand, which would enable visualization of datasets too large to hold in memory.

---

## The Electron Application

The Electron application is the desktop shell that hosts the React UI and manages the lifecycle of the backend services. The main process runs in Node.js and has access to the full Node.js API and the Electron API. The renderer process runs in a Chromium browser context with React.

### Main Process Responsibilities

On startup the main process:
1. Creates the browser window with the configured dimensions and appearance settings
2. Checks if Docker is installed and available
3. Executes `docker compose up -d` to start the FastAPI and Rust streamer services
4. Loads the Vite dev server URL (development) or the packaged HTML file (production)
5. Registers IPC handlers for any native operations the renderer needs

The `titleBarStyle: 'hiddenInset'` configuration removes the standard macOS title bar while preserving the traffic light window controls, giving the app a native macOS appearance consistent with modern macOS applications.

### Renderer Process and React Application

The renderer hosts a single-page React application. The application state is organized around three primary views corresponding to the three main navigation items:

**Models and Data** — The dataset browser. Fetches from the FastAPI `/datasets` endpoint. Displays dataset cards with experiment filter tabs. Each card shows the dataset title, description, file URIs, and size. Downloads are initiated from this view and progress is polled from `/download/status`.

**Local Storage** — The file manager. Fetches from `/files` and `/process/status`. Displays downloaded ROOT files with expand/collapse for their associated processed JSON. Shows process, reveal, and delete actions. The expanded JSON view shows processed data with pagination.

**Visualization** — The 3D rendering view. Connects to the Rust streamer WebSocket on mount. Receives and stores events. Renders the Three.js scene. Contains the event navigation controls.

### Design System

The application uses a consistent design system throughout. The color palette is defined as CSS custom properties: `--bg: #080b14`, `--panel: #0f1623`, `--border: #1e2d45`, `--accent: #00d4ff`, `--accent2: #ff6b35`, `--text: #e2eaf7`, `--muted: #4a6080`, `--green: #00ff88`. Typography uses `Space Mono` for monospace contexts and `Syne` for display headings. All interactive elements have consistent hover and active states. Status badges follow a consistent color convention: green for completed/healthy states, cyan for active/processing, red for errors, muted for unavailable.

---

## The 3D Visualization Engine

The visualization is built on Three.js with WebGL rendering inside Electron's Chromium environment. The scene represents a simplified but geometrically accurate cross-section of the CMS detector.

### Detector Geometry

The detector is constructed entirely from `THREE.LineSegments` — line primitives with no polygon faces. Using mesh geometry for the detector shell, even with full transparency, causes occlusion artifacts because the fragment shader still writes to the depth buffer regardless of material opacity. `LineSegments` have no faces and no depth buffer contribution beyond their line geometry, making them fully non-occluding from any camera angle.

The barrel cylinder is constructed by generating a point array containing the endpoints of 32 longitudinal lines (parallel to Z axis) and 14 circular rings at regular Z intervals, then building a `BufferGeometry` from these points. Inner detector layer cylinders at radii 80 and 140 represent the silicon tracker boundary and ECAL boundary respectively, rendered at reduced opacity. The beam pipe is a very thin line cylinder of radius 4 units running from Z = -500 to Z = +500.

### Particle Track Rendering

Each particle in an event is rendered as a line from the origin `[0, 0, 0]` to an endpoint computed from the particle's Cartesian momentum:

```
endpoint = [px, py, pz] × (energy / referenceEnergy) × scaleRadius
```

where `referenceEnergy` is the median energy of all particles in the current event and `scaleRadius` is chosen so that median-energy particles reach approximately 60% of the barrel radius. This adaptive scaling ensures events with very different energy scales all produce visually similar track patterns — the physics differences are conveyed through the relative track lengths within an event, not through the absolute scale.

Track colors are determined by particle type: muons `#ff6b6b`, electrons `#7fbbb3`, jets `#dbbc7f`, tau leptons `#d699b6`, photons `#ffffff`. The MET vector is drawn as a bright orange line `#ff6b35` on the XY plane in the direction of the MET phi angle.

### WebGL Renderer Configuration

The WebGL renderer is created with `logarithmicDepthBuffer: true` to resolve depth precision artifacts that would otherwise cause z-fighting between tracks at different depths. `antialias: true` enables hardware anti-aliasing for smooth track edges. The renderer's output color space is set to `THREE.SRGBColorSpace` for correct color reproduction. Tone mapping is disabled to preserve the intended track colors without photographic exposure adjustment.

### Camera and Controls

The camera is a `THREE.PerspectiveCamera` with a 60° field of view, positioned initially at `[0, cylinderRadius * 0.8, cylinderRadius * 1.8]` — outside and slightly above the detector cylinder, providing a three-quarter view that shows both the barrel and one endcap. `OrbitControls` provides mouse orbit, zoom, and pan. The orbit target is locked to `[0, 0, 0]`. Minimum camera distance is set to prevent the camera from entering the beam pipe region.

---

## The XRootD Problem

XRootD is the most significant outstanding technical challenge in OpenCERN's development. It is worth explaining in detail because understanding it clarifies both the current limitations of the application and the approach being taken to resolve them.

### What XRootD Is

XRootD is an open source data access framework developed at CERN and SLAC, designed for efficient access to very large datasets distributed across many storage systems. It uses a custom wire protocol (the XRootD protocol, also called the XROOT protocol) that is optimized for the specific access patterns of high-energy physics data — large sequential reads of binary files from a distributed filesystem.

CERN's EOS (Exabyte-scale storage) filesystem exposes all stored data via XRootD endpoints at `root://eospublic.cern.ch`. Every ROOT file stored on EOS — which is the vast majority of CERN Open Data Portal content — is accessible via a URL of the form `root://eospublic.cern.ch//eos/opendata/...`. The `root://` scheme is the XRootD URI scheme.

XRootD is not HTTP. There is no HTTP fallback for files on CERN's EOS. The EOS HTTP gateway that provides `https://eospublic.cern.ch/eos/opendata/...` access exists but imposes significant limitations: it has connection duration limits that effectively cap single-file transfers to approximately 41 MB regardless of file size, and it does not support range requests in the way a standards-compliant HTTP server would. This is why ALICE downloads appear to complete at 41 MB — the gateway is terminating the connection, not the file.

### Why Bundling XRootD Is Non-Trivial

XRootD is a C++ library with a substantial set of dependencies including OpenSSL for TLS, and on some platforms additional system libraries. It is not available as a simple npm package or PyPI wheel. Using XRootD from Python requires the `pyxrootd` Python bindings, which in turn require the C++ library to be compiled and present on the system. Using XRootD from Node.js requires a native addon built against the C++ headers and linked against the C++ library.

Building this into a distributable Electron application means:
1. Compiling XRootD C++ from source for each target platform (macOS arm64, macOS x86_64, Linux x86_64, Windows x86_64)
2. Building a native Node.js addon that links against the compiled library
3. Bundling the compiled library and its dependencies inside the Electron application bundle
4. Ensuring the bundled libraries are found at runtime using correct rpath settings (macOS/Linux) or DLL path configuration (Windows)

This is solvable engineering — native Node.js addons bundled inside Electron applications are a well-understood pattern — but it requires careful platform-specific work and CI/CD infrastructure for cross-compilation.

### The HTTP Conversion Approach

As an interim measure, the data processor and download manager convert `root://eospublic.cern.ch//eos/opendata/` URIs to `https://eospublic.cern.ch/eos/opendata/` URIs and attempt HTTP downloads. This works for small files but fails for large files due to the 41 MB EOS HTTP gateway limit described above. It is not a solution to the XRootD problem — it is a workaround that exposes a small subset of files and makes the limitation visible.

### The Intended Solution

The intended solution is a native Node.js addon (`xrootd-addon`) built using `node-addon-api` that wraps the XRootD C++ client library. The addon exposes three functions to the JavaScript runtime:

`listFiles(server, path)` — returns available files at a path on the XRootD server

`getFileSize(server, path)` — returns the size of a remote file in bytes

`downloadFile(server, path, localPath, progressCallback)` — downloads a file with live progress reporting via a JavaScript callback

The addon is compiled for each supported platform as part of the build process and bundled inside the Electron application resources. The FastAPI backend calls the download function via Python subprocess, receiving progress updates through stdout and forwarding them to the in-app download status system.

This approach means the user experience is identical for XRootD and HTTP downloads — the same download button, the same progress bar, the same cancel and resume capability. The XRootD protocol is an implementation detail hidden inside the native addon.

---

## Known Limitations

### HTTP Download Cap for ALICE Files

CERN's EOS HTTP gateway caps connections at approximately 41 MB. ALICE ROOT files served via `https://eospublic.cern.ch` will appear to complete at 41 MB regardless of their actual size. This is a server-side limitation that cannot be worked around without XRootD. The actual ALICE masterclass files are 41-65 MB each and distributed across 12 files, so the complete dataset is accessible via HTTP as individual file downloads. The total dataset size shown in the UI (778 MB) reflects all 12 files combined and is accurate for the full dataset, but each individual file download is limited to the actual file size at that specific URI.

### CMS Data Coverage

The six CMS datasets currently accessible in OpenCERN represent a tiny fraction of the CMS Open Data catalog. They are tutorial-scale files (300-350 MB each) from the Higgs to tau tau analysis tutorial, chosen specifically because they are hosted on ROOT's HTTPS file server and therefore bypas the XRootD requirement. The full CMS Open Data catalog contains thousands of datasets from Run 1 and Run 2, covering every major physics analysis topic. These are inaccessible until the XRootD native addon is complete.

### ATLAS Data Currently Unavailable

All ATLAS data on CERN's Open Data Portal is served exclusively via XRootD. There are no ATLAS files accessible via HTTP. The ATLAS data processor code is complete and tested against the ATLAS NTuple branch schema, but it cannot be exercised until the XRootD download functionality is available.

### Data Processor Is CMS-Optimized

While format detection is implemented for CMS, ALICE, and ATLAS, the event selection criteria (minimum lepton pT > 20 GeV, MET > 20 GeV, at least one jet > 30 GeV) are designed for CMS W+jets and ttbar topologies. This selection would discard most ALICE Pb-Pb events, which typically have no high-pT isolated leptons and are characterized instead by high charged-particle multiplicity. Dedicated ALICE and ATLAS event selections are implemented but require further validation against the physics content of specific datasets.

### Single-Page Dataset Results

The current `/datasets` API endpoint returns a fixed page of results (page 1, size 20) from CERN's API. There is no pagination or infinite scroll in the frontend. The full CERN Open Data catalog contains thousands of datasets and the current implementation surfaces only a small subset. Pagination support is in active development.

### No XRootD Authentication

CERN Open Data is public and requires no authentication for access. However, CERN's authenticated datasets — which require a CERN account and are not part of the public open data program — are not accessible in OpenCERN and there are no plans to add authentication support for non-public data. OpenCERN is specifically a tool for CERN's publicly released open data.

### macOS Only for Development

The current development and testing environment is macOS Apple Silicon. While the application is designed for cross-platform deployment (Electron supports Mac, Windows, Linux), the packaging pipeline for Windows and Linux has not been tested. The XRootD compilation process will need platform-specific attention for Windows in particular, where the library dependencies are more complex.

---

## Current State

OpenCERN v0.1.3 represents the completion of the foundational pipeline. All five components — FastAPI backend, data processor, Rust streamer, Electron application, and Three.js visualization — are implemented and connected. The end-to-end flow from CERN dataset discovery through to interactive 3D visualization is working for CMS NanoAOD files.

The following user flows are fully functional in v0.1.3:

1. Open the application → browse CMS and ALICE datasets → download a CMS TTbar ROOT file → watch download progress → see the file appear in Local Storage → click Process → wait for 642,310 events to be processed → see the processed JSON appear → click Visualize 3D → watch 5000 events load via WebSocket → explore particle collision events in the 3D scene.

2. Browse ALICE datasets → download an ALICE masterclass file → process it → visualize the Pb-Pb collision tracks in 3D.

The following are implemented but require further polish and testing:

- The 3D visualization cylinder transparency and track scaling
- ALICE-specific event selection and particle identification
- Error handling and recovery throughout the pipeline
- Docker auto-start integration

The following are in active development:

- XRootD native Node.js addon
- ATLAS data support
- Electron application packaging for distribution
- Infinite scroll pagination for dataset browser

---

## Roadmap

### Near Term

**XRootD Native Addon.** The highest priority item. Unlocks ATLAS data entirely and removes the 41 MB HTTP cap for ALICE and CMS files. Architecture is designed and documented. Implementation requires C++ work, node-gyp configuration, and platform-specific library bundling.

**Full Pipeline Hardening.** Every component needs robust error handling, graceful degradation when services are unavailable, and clear user-facing error states. The current implementation prioritizes correctness of the happy path but is not production-hardened.

**Docker Auto-Start.** The API and Rust streamer currently require manual terminal startup. Docker Compose integration in the Electron main process will make the application self-contained — all services start automatically on app launch.

**Application Packaging.** `electron-builder` configuration for `.dmg` (macOS), `.AppImage` (Linux), and `.exe` (Windows) installers. Bundling the Python data processor as a standalone executable using PyInstaller eliminates the Python dependency for end users.

### Medium Term

**ATLAS Full Support.** Once XRootD is available, the ATLAS dataset browser will expose the full educational NTuple catalog including the Higgs to four leptons channel — the most important single dataset for demonstrating the Higgs boson discovery.

**Dataset Pagination.** The dataset browser will support infinite scroll with proper pagination through CERN's API, exposing the full depth of the open data catalog rather than a single page of 20 results.

**Performance Optimization.** Three.js object pooling for event transitions to eliminate garbage collection pressure during scrubbing. The target is 60fps constant frame rate while scrubbing through 5000 events.

**LHCb Support.** LHCb is the fourth major LHC experiment, specialized in B meson physics and CP violation measurements. LHCb open data has a different format and branch schema. Support is planned after the three major experiments are stable.

### Longer Term

**AR Camera Mode.** The experimental feature discussed in the project's original conception — opening the device camera and using computer vision and gesture recognition to allow the user to manipulate the 3D particle visualization in augmented reality space. Point the camera at a surface, see a particle detector materialize on it. Reach in and grab a particle track. This feature requires MediaPipe or a similar hand tracking library integrated into the Electron renderer. It is technically feasible and remains a target for a future version.

**Real-Time LHC Data.** CERN makes real-time luminosity and event rate data publicly available via its monitoring systems. A future version of OpenCERN could display live LHC operational status — current beam energy, instantaneous luminosity, collision rate — alongside the historical open data visualization. Actual real-time collision events are not publicly available in processed form, but the operational data stream is.

**LHC Run 3 Data.** Run 3 of the LHC (2022-2025) operated at 13.6 TeV, the highest collision energy ever achieved. When Run 3 data becomes publicly available on the Open Data Portal, OpenCERN will support it. The NanoAOD schema is largely compatible between Run 2 and Run 3 so the data processor should require minimal changes.

---

## The Physics

For users who want to understand what they are looking at when they explore collision events in the 3D visualization, this section provides a brief physics context for the quantities displayed.

### Transverse Momentum and the Coordinate System

The LHC collides protons traveling in opposite directions along the beam axis (the Z axis in CMS coordinates). The total momentum along the beam axis is not conserved in the center-of-mass frame of the parton-level interaction — the quarks and gluons inside the protons carry unknown fractions of the proton momentum. However, the total transverse momentum — perpendicular to the beam axis — is exactly zero before the collision and must remain zero after (momentum conservation in the transverse plane).

This is why physicists focus on transverse quantities: transverse momentum pT = √(px² + py²), transverse energy ET = E × sin(θ), and missing transverse energy MET. These quantities are meaningful even without knowing the longitudinal momentum fractions.

### What Each Particle Type Indicates

**Muons** are heavy leptons that pass through all detector material without significant interaction. They travel in helical paths through the magnetic field and are measured by both the inner tracker and the outer muon system. An isolated high-pT muon (pT > 20 GeV) in a collision event almost always comes from a W or Z boson decay. The TTbar dataset contains many such events — each top quark decays to a W boson and a b quark, and the W can decay to a muon plus neutrino.

**Electrons** are light leptons that deposit all their energy in the electromagnetic calorimeter. Like muons, isolated high-pT electrons come predominantly from W and Z decays. Events with two opposite-sign same-flavor leptons (e+e- or μ+μ-) and an invariant mass near 91 GeV are Z→ℓ+ℓ- events — highly pure samples of Z boson production.

**Jets** are collimated sprays of hadrons from the fragmentation of quarks and gluons. In the TTbar dataset the dominant jet source is the hadronic decay of the W bosons from top quark decay (W→qq̄') and the b quarks from the top quark decay itself. B-tagged jets — those with the DeepCSV discriminant above threshold — are likely to have originated from a bottom quark, identifiable by the displaced secondary vertex from the long-lived B hadron decay.

**Missing Transverse Energy** is the magnitude of the vector sum of all transverse momenta, which must be zero if all particles are detected. Non-zero MET indicates undetected particles. In Standard Model events MET almost always comes from neutrinos — massless (or nearly massless) particles that carry momentum but interact only weakly, leaving no signal in any detector component. The direction of the MET vector points away from the invisible particle(s). In W→μν events the MET vector and muon pT are approximately back-to-back in the transverse plane.

**HT** — the scalar sum of all jet pT values — is a measure of the total hadronic activity in the event. High HT events are associated with hard QCD processes, top quark production, and any new physics that produces many energetic jets. The 5000 events selected for visualization are the highest-HT events in each dataset, which biases the sample toward the most energetically interesting collisions.

---

## Technology Stack

| Component | Technology | Version | Role |
|-----------|-----------|---------|------|
| Desktop shell | Electron | 28.x | Cross-platform application container |
| UI framework | React | 18.x | Component-based interface |
| Build tool | Vite | 5.x | Frontend development server and bundler |
| 3D rendering | Three.js | r160+ | WebGL scene and particle visualization |
| HTTP client (frontend) | axios | 1.x | REST API communication |
| Backend framework | FastAPI | 0.110+ | REST API, async Python web framework |
| ASGI server | uvicorn | 0.29+ | FastAPI production server |
| HTTP client (backend) | requests | 2.x | File downloads with streaming |
| Async HTTP (backend) | httpx | 0.27+ | CERN API queries |
| Physics data | uproot | 5.x | ROOT file reading without ROOT dependency |
| Array computing | awkward-array | 2.x | Columnar physics data manipulation |
| Numerical computing | numpy | 1.26+ | Mathematical operations on physics arrays |
| Data validation | pydantic | 2.x | Request/response model validation |
| Progress reporting | tqdm | 4.x | Processing progress bars |
| Async runtime (Rust) | tokio | 1.x | Async I/O for the WebSocket server |
| WebSocket (Rust) | tokio-tungstenite | 0.21 | WebSocket protocol implementation |
| Serialization (Rust) | serde / serde_json | 1.x | JSON parsing and serialization |
| Containerization | Docker + Compose | 24.x | Service orchestration |
| Native addon (planned) | node-addon-api | 7.x | C++ to Node.js binding layer |
| File transfer (planned) | XRootD C++ | 5.x | CERN EOS filesystem access |
| Packaging (planned) | electron-builder | 24.x | Cross-platform installer generation |
| Python bundling (planned) | PyInstaller | 6.x | Standalone Python executable |

---

## Version History

| Version | Description |
|---------|-------------|
| v0.1.0 | Initial FastAPI backend with CERN Open Data API integration |
| v0.1.1 | CMS and ALICE dataset browser, working HTTP downloads |
| v0.1.2 | Python data processor reading CMS NanoAOD ROOT files |
| v0.1.3 | Rust WebSocket streamer, Electron UI with 3D visualization foundation, Visualize 3D button |

---

## License

MIT License. See `LICENSE` for full text.

---

## Acknowledgments

CERN for making LHC collision data publicly available through the [CERN Open Data Portal](https://opendata.cern.ch).

The ROOT team at CERN for developing and maintaining the ROOT data analysis framework and the uproot authors for making ROOT files accessible without the ROOT dependency.

The CMS, ALICE, and ATLAS collaborations for their extraordinary scientific work and their commitment to open data.

The Higgs boson, for existing.