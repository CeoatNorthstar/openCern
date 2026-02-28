"""
OpenCERN Data Processor — Multi-Experiment ROOT → JSON Pipeline
================================================================
Supports CMS (NanoAOD), ATLAS (flat ntuples), and ALICE (VSD/ESD)
with smart auto-detection and vectorized Awkward Array processing.

Usage:
  python main.py ~/opencern-datasets/data/TTbar.root
  python main.py data/*.root --experiment atlas --workers 4
  python main.py data/alice/ --experiment alice --max-events 10000
"""

import uproot
import numpy as np
import awkward as ak
import json
import os
import sys
import glob
import argparse
import logging
import time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ProcessPoolExecutor, as_completed

# ──────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("opencern.processor")


# ══════════════════════════════════════════════════════════════════
# EXPERIMENT PROFILES
# ══════════════════════════════════════════════════════════════════
# Each profile defines: tree names to search, particle branches,
# scalar branches, particle colors, and filtering criteria.

PROFILES = {
    # ──────────────────────────────────────────────────────────────
    # CMS — NanoAOD format
    # Tree: "Events", branches: Muon_pt, Jet_pt, MET_pt, etc.
    # ──────────────────────────────────────────────────────────────
    "cms": {
        "trees": ["Events", "events"],
        "detect_branches": ["Muon_pt", "Jet_pt", "MET_pt"],
        "particles": {
            "muon": {
                "pt": "Muon_pt", "eta": "Muon_eta", "phi": "Muon_phi",
                "charge": "Muon_charge", "mass": "Muon_mass",
                "iso": "Muon_pfRelIso03_all", "tightId": "Muon_tightId",
            },
            "electron": {
                "pt": "Electron_pt", "eta": "Electron_eta", "phi": "Electron_phi",
                "charge": "Electron_charge", "mass": "Electron_mass",
            },
            "jet": {
                "pt": "Jet_pt", "eta": "Jet_eta", "phi": "Jet_phi",
                "mass": "Jet_mass", "btag": "Jet_btag", "jetId": "Jet_jetId",
            },
            "tau": {
                "pt": "Tau_pt", "eta": "Tau_eta", "phi": "Tau_phi",
                "charge": "Tau_charge", "mass": "Tau_mass",
            },
            "photon": {
                "pt": "Photon_pt", "eta": "Photon_eta", "phi": "Photon_phi",
                "mass": "Photon_mass",
            },
        },
        "scalars": {
            "MET_pt": "met_pt", "MET_phi": "met_phi",
            "MET_significance": "met_sig",
            "HLT_IsoMu24": "trig_IsoMu24",
            "HLT_Ele27_WPTight_Gsf": "trig_Ele27",
        },
        "colors": {
            "muon": "#ff6b6b", "electron": "#7fbbb3", "jet": "#dbbc7f",
            "tau": "#d699b6", "photon": "#a7c080",
        },
        "filter": {
            "min_lep_pt": 20, "min_met": 20, "min_jet_pt": 30,
        },
    },

    # ──────────────────────────────────────────────────────────────
    # ATLAS — flat ntuple format
    # Tree: "mini", branches: lep_pt, jet_pt, met_et, etc.
    # ──────────────────────────────────────────────────────────────
    "atlas": {
        "trees": ["mini", "truth", "nominal", "CollectionTree"],
        "detect_branches": ["lep_pt", "lep_eta", "jet_pt"],
        "particles": {
            "lepton": {
                "pt": "lep_pt", "eta": "lep_eta", "phi": "lep_phi",
                "energy": "lep_e", "charge": "lep_charge", "type": "lep_type",
                "tight": "lep_isTightID",
            },
            "jet": {
                "pt": "jet_pt", "eta": "jet_eta", "phi": "jet_phi",
                "energy": "jet_e", "btag": "jet_MV2c10",
            },
            "tau": {
                "pt": "tau_pt", "eta": "tau_eta", "phi": "tau_phi",
                "energy": "tau_e", "charge": "tau_charge",
            },
            "photon": {
                "pt": "photon_pt", "eta": "photon_eta", "phi": "photon_phi",
                "energy": "photon_e",
            },
            "largeRjet": {
                "pt": "largeRjet_pt", "eta": "largeRjet_eta",
                "phi": "largeRjet_phi", "energy": "largeRjet_e",
                "mass": "largeRjet_m",
            },
        },
        "scalars": {
            "met_et": "met_pt", "met_phi": "met_phi",
            "mcWeight": "mc_weight",
            "scaleFactor_PILEUP": "sf_pileup",
            "scaleFactor_ELE": "sf_ele",
            "scaleFactor_MUON": "sf_muon",
            "trigE": "trig_electron", "trigM": "trig_muon",
            "lep_n": "n_leptons", "jet_n": "n_jets",
        },
        "colors": {
            "lepton": "#ff6b6b", "jet": "#dbbc7f", "tau": "#d699b6",
            "photon": "#a7c080", "largeRjet": "#e5c07b",
        },
        "filter": {
            "min_lep_pt": 25, "min_met": 25, "min_jet_pt": 25,
        },
    },

    # ──────────────────────────────────────────────────────────────
    # ALICE — VSD (Visual Server Display) / ESD format
    # Tree: "TE" (Tree of Events), branches: track arrays
    # Also handles AliVSD MasterClass format
    # ──────────────────────────────────────────────────────────────
    "alice": {
        "trees": ["TE", "VSD", "ESDTree", "esdTree", "aodTree", "TreeR"],
        "detect_branches": ["AliVSD", "ESDfriend", "Tracks", "SPDVertex"],
        "particles": {
            "track": {
                "pt": "fP.fUniqueID",  # Placeholder — ALICE uses nested objects
                "eta": "fP.fBits",
                "phi": "fP.fBits",
            },
            "muon": {
                "pt": "AliVSD.fR.fMuP.fX",
                "eta": "AliVSD.fR.fMuP.fY",
                "phi": "AliVSD.fR.fMuP.fZ",
            },
        },
        "scalars": {},
        "colors": {
            "track": "#7fbbb3", "muon": "#ff6b6b",
            "v0": "#a7c080", "cascade": "#e5c07b",
        },
        "filter": {
            "min_lep_pt": 0, "min_met": 0, "min_jet_pt": 0,
        },
    },
}


# ──────────────────────────────────────────────────────────────────
# Smart Experiment Detection
# ──────────────────────────────────────────────────────────────────
def detect_experiment(filepath: str) -> str:
    """
    Auto-detect the experiment by inspecting tree names and branches.
    Returns 'cms', 'atlas', or 'alice'.
    """
    with uproot.open(filepath) as f:
        keys = set(f.keys())
        key_names = {k.split(";")[0] for k in keys}

        for exp_name, profile in PROFILES.items():
            # Check if any known tree exists
            for tree_name in profile["trees"]:
                if tree_name in key_names:
                    # Found a matching tree — verify with branch names
                    try:
                        tree = f[tree_name]
                        branches = set(tree.keys())
                        detect = profile["detect_branches"]
                        matches = sum(1 for b in detect if b in branches)
                        if matches >= 1:
                            log.info(f"  Auto-detected: {exp_name.upper()} "
                                     f"(tree={tree_name}, matched {matches}/{len(detect)} branches)")
                            return exp_name
                    except Exception:
                        continue

        # Fallback: inspect all trees for branch patterns
        for key in key_names:
            try:
                obj = f[key]
                if not hasattr(obj, "keys"):
                    continue
                branches = set(obj.keys())

                # CMS signature: Muon_pt or Electron_pt
                if any(b.startswith("Muon_") or b.startswith("Electron_") for b in branches):
                    log.info(f"  Auto-detected: CMS (fallback, tree={key})")
                    return "cms"

                # ATLAS signature: lep_pt, jet_pt
                if any(b.startswith("lep_") for b in branches):
                    log.info(f"  Auto-detected: ATLAS (fallback, tree={key})")
                    return "atlas"

                # ALICE signature: nested objects with Ali*
                if any("Ali" in b or "ESD" in b for b in branches):
                    log.info(f"  Auto-detected: ALICE (fallback, tree={key})")
                    return "alice"
            except Exception:
                continue

    log.warning("  Could not auto-detect experiment. Defaulting to CMS.")
    return "cms"


# ──────────────────────────────────────────────────────────────────
# Vectorized Physics Helpers
# ──────────────────────────────────────────────────────────────────
def vec_to_cartesian(pt, eta, phi, mass):
    """Vectorized pt/eta/phi/mass → px/py/pz/energy."""
    px = pt * np.cos(phi)
    py = pt * np.sin(phi)
    pz = pt * np.sinh(eta)
    energy = np.sqrt(px**2 + py**2 + pz**2 + mass**2)
    return px, py, pz, energy


def vec_to_cartesian_from_energy(pt, eta, phi, energy):
    """Vectorized pt/eta/phi/energy → px/py/pz/mass (ATLAS style)."""
    px = pt * np.cos(phi)
    py = pt * np.sin(phi)
    pz = pt * np.sinh(eta)
    mass_sq = energy**2 - (px**2 + py**2 + pz**2)
    mass = np.sqrt(np.maximum(mass_sq, 0))
    return px, py, pz, mass


def vec_ht(jet_pt):
    if jet_pt is None:
        return None
    return ak.sum(jet_pt, axis=1)


def vec_leading_pt(*pt_arrays):
    maxes = []
    for pt in pt_arrays:
        if pt is not None and len(pt) > 0:
            safe_max = ak.fill_none(ak.max(pt, axis=1), 0.0)
            maxes.append(safe_max)
    if not maxes:
        return None
    combined = maxes[0]
    for m in maxes[1:]:
        combined = np.maximum(combined, m)
    return combined


# ──────────────────────────────────────────────────────────────────
# Tree & Branch Resolution
# ──────────────────────────────────────────────────────────────────
def resolve_tree(filepath: str, profile: dict) -> str:
    """Find the main TTree in the file using the profile's tree list."""
    with uproot.open(filepath) as f:
        key_names = {k.split(";")[0] for k in f.keys()}
        for candidate in profile["trees"]:
            if candidate in key_names:
                return candidate
        # Fallback: first object with entries
        for key in f.keys():
            obj = f[key]
            if hasattr(obj, "num_entries"):
                return key.split(";")[0]
    raise RuntimeError(f"No TTree found in {filepath}")


def resolve_branches(filepath: str, tree_name: str, profile: dict):
    """Return the subset of branches from the profile that exist in the file."""
    with uproot.open(filepath) as f:
        tree = f[tree_name]
        available = set(tree.keys())

    particle_branches = {}
    for ptype, mapping in profile["particles"].items():
        resolved = {}
        for alias, root_name in mapping.items():
            if root_name in available:
                resolved[alias] = root_name
        # Need at least pt + (eta or energy) to be useful
        if "pt" in resolved and ("eta" in resolved or "energy" in resolved):
            particle_branches[ptype] = resolved

    scalar_resolved = {}
    for root_name, alias in profile["scalars"].items():
        if root_name in available:
            scalar_resolved[alias] = root_name

    return particle_branches, scalar_resolved


# ──────────────────────────────────────────────────────────────────
# Core: process a single chunk (vectorized)
# ──────────────────────────────────────────────────────────────────
def process_chunk(chunk_data, particle_branches, scalar_resolved,
                  profile, experiment, global_offset):
    """
    Process one chunk of events with vectorized operations.
    Handles CMS (mass-based) and ATLAS (energy-based) kinematics.
    """
    n_events = 0
    for ptype, mapping in particle_branches.items():
        for alias, root_name in mapping.items():
            if root_name in chunk_data.get(ptype, {}):
                arr = chunk_data[ptype][root_name]
                n_events = len(arr)
                break
        if n_events > 0:
            break
    if n_events == 0:
        # Try scalars
        for alias, root_name in scalar_resolved.items():
            if root_name in chunk_data.get("_scalars", {}):
                n_events = len(chunk_data["_scalars"][root_name])
                break
    if n_events == 0:
        return []

    # ── Read particle arrays ──
    particle_arrays = {}
    for ptype, mapping in particle_branches.items():
        arrays = {}
        for alias, root_name in mapping.items():
            if root_name in chunk_data.get(ptype, {}):
                arrays[alias] = chunk_data[ptype][root_name]
        particle_arrays[ptype] = arrays

    # ── Read scalar arrays ──
    scalars = {}
    for alias, root_name in scalar_resolved.items():
        if root_name in chunk_data.get("_scalars", {}):
            scalars[alias] = chunk_data["_scalars"][root_name]

    # ── Get primary particle pT arrays for filtering ──
    # CMS: muon/electron, ATLAS: lepton, ALICE: track
    primary_pts = []
    for ptype in particle_arrays:
        if "pt" in particle_arrays[ptype]:
            primary_pts.append(particle_arrays[ptype]["pt"])

    jet_pt = None
    for ptype in ["jet"]:
        if ptype in particle_arrays and "pt" in particle_arrays[ptype]:
            jet_pt = particle_arrays[ptype]["pt"]

    ht = vec_ht(jet_pt)
    leading_lep_pt = vec_leading_pt(*primary_pts) if primary_pts else None

    met_pt = scalars.get("met_pt")
    met_phi = scalars.get("met_phi")

    # ── Filtering ──
    filt = profile.get("filter", {})
    mask = np.ones(n_events, dtype=bool)

    if leading_lep_pt is not None and filt.get("min_lep_pt", 0) > 0:
        mask &= np.asarray(leading_lep_pt) > filt["min_lep_pt"]

    if met_pt is not None and filt.get("min_met", 0) > 0:
        mask &= np.asarray(met_pt) > filt["min_met"]

    if jet_pt is not None and filt.get("min_jet_pt", 0) > 0:
        jet_max = ak.fill_none(ak.max(jet_pt, axis=1), 0.0)
        mask &= np.asarray(jet_max) > filt["min_jet_pt"]

    # For ALICE, accept all events (no MET/jet cuts)
    if experiment == "alice":
        mask = np.ones(n_events, dtype=bool)

    indices = np.where(mask)[0]
    if len(indices) == 0:
        return []

    colors = profile.get("colors", {})
    uses_energy = experiment == "atlas"

    # ── Build events ──
    events = []
    for idx in indices:
        i = int(idx)
        event = {
            "index": global_offset + i,
            "experiment": experiment.upper(),
            "ht": round(float(ht[i]), 2) if ht is not None else 0.0,
            "met": round(float(met_pt[i]), 2) if met_pt is not None else 0.0,
            "leading_lepton_pt": round(float(leading_lep_pt[i]), 2) if leading_lep_pt is not None else 0.0,
            "particles": [],
            "met_vector": {
                "pt": round(float(met_pt[i]), 2) if met_pt is not None else 0.0,
                "phi": round(float(met_phi[i]), 3) if met_phi is not None else 0.0,
            },
        }

        for ptype, arrays in particle_arrays.items():
            if "pt" not in arrays:
                continue
            try:
                pts = np.asarray(arrays["pt"][i], dtype=np.float64)
                if len(pts) == 0:
                    continue

                etas = np.asarray(arrays["eta"][i], dtype=np.float64) if "eta" in arrays else np.zeros_like(pts)
                phis = np.asarray(arrays["phi"][i], dtype=np.float64) if "phi" in arrays else np.zeros_like(pts)

                if uses_energy and "energy" in arrays:
                    energies = np.asarray(arrays["energy"][i], dtype=np.float64)
                    px, py, pz, masses = vec_to_cartesian_from_energy(pts, etas, phis, energies)
                else:
                    masses = np.asarray(arrays.get("mass", ak.zeros_like(arrays["pt"]))[i], dtype=np.float64)
                    px, py, pz, energies = vec_to_cartesian(pts, etas, phis, masses)

                color = colors.get(ptype, "#ffffff")

                for j in range(len(pts)):
                    particle = {
                        "type": ptype,
                        "color": color,
                        "pt": round(float(pts[j]), 3),
                        "eta": round(float(etas[j]), 3),
                        "phi": round(float(phis[j]), 3),
                        "mass": round(float(masses[j]), 4) if not uses_energy else round(float(masses[j]), 4),
                        "px": round(float(px[j]), 3),
                        "py": round(float(py[j]), 3),
                        "pz": round(float(pz[j]), 3),
                        "energy": round(float(energies[j]), 3),
                    }
                    event["particles"].append(particle)
            except Exception:
                continue

        events.append(event)

    return events


# ──────────────────────────────────────────────────────────────────
# Core: process a single ROOT file
# ──────────────────────────────────────────────────────────────────
def process_root_file(filepath: str, chunk_size: int = 50_000,
                      max_events: int = 5_000, experiment: str = "auto") -> str:
    """
    Process a single ROOT file. Auto-detects experiment if needed.
    """
    filepath = os.path.expanduser(filepath)
    filename = Path(filepath).stem
    t0 = time.perf_counter()

    log.info("╔══════════════════════════════════════════════════════╗")
    log.info("║  OpenCERN Multi-Experiment Processor                ║")
    log.info("╚══════════════════════════════════════════════════════╝")
    log.info(f"  File     : {filepath}")

    # ── Detect or use forced experiment ──
    if experiment == "auto":
        experiment = detect_experiment(filepath)
    else:
        experiment = experiment.lower()
        log.info(f"  Forced   : {experiment.upper()}")

    profile = PROFILES.get(experiment)
    if not profile:
        log.error(f"  Unknown experiment: {experiment}")
        sys.exit(1)

    log.info(f"  Experiment: {experiment.upper()}")
    log.info(f"  Chunk    : {chunk_size:,} events/batch")
    log.info(f"  Max Out  : {max_events:,} events")

    # ── Resolve tree and branches ──
    tree_name = resolve_tree(filepath, profile)
    particle_branches, scalar_resolved = resolve_branches(filepath, tree_name, profile)

    log.info(f"  Tree     : {tree_name}")
    log.info(f"  Particles: {', '.join(particle_branches.keys()) or 'none'}")
    log.info(f"  Scalars  : {', '.join(scalar_resolved.keys()) or 'none'}")

    if not particle_branches and not scalar_resolved:
        log.warning("  No recognized branches found. Trying generic scan...")
        # Generic mode: just list what's in the tree
        with uproot.open(filepath) as f:
            tree = f[tree_name]
            log.info(f"  Available branches ({len(tree.keys())}):")
            for b in sorted(tree.keys())[:20]:
                log.info(f"    - {b}")
        log.error("  Cannot process — no matching branches for any profile.")
        return ""

    # Build flat branch list
    all_branches = []
    for mapping in particle_branches.values():
        all_branches.extend(mapping.values())
    all_branches.extend(scalar_resolved.values())
    all_branches = list(set(all_branches))

    # ── Chunked iteration ──
    all_events = []
    total_scanned = 0
    chunk_idx = 0

    for chunk in uproot.iterate(
        f"{filepath}:{tree_name}",
        expressions=all_branches,
        step_size=chunk_size,
        library="ak",
    ):
        chunk_len = len(chunk[all_branches[0]])
        chunk_idx += 1

        # Reorganize chunk
        chunk_data = {}
        for ptype, mapping in particle_branches.items():
            chunk_data[ptype] = {}
            for alias, root_name in mapping.items():
                if root_name in chunk.fields:
                    chunk_data[ptype][root_name] = chunk[root_name]

        chunk_data["_scalars"] = {}
        for alias, root_name in scalar_resolved.items():
            if root_name in chunk.fields:
                chunk_data["_scalars"][root_name] = chunk[root_name]

        events = process_chunk(
            chunk_data, particle_branches, scalar_resolved,
            profile, experiment, total_scanned
        )
        all_events.extend(events)
        total_scanned += chunk_len

        log.info(f"  Chunk {chunk_idx:>3} | scanned {total_scanned:>8,} | passed {len(all_events):>6,}")

        if len(all_events) >= max_events * 2:
            log.info("  Early exit: sufficient events collected.")
            break

    # ── Sort by HT descending and cap ──
    all_events.sort(key=lambda e: e.get("ht", 0), reverse=True)
    all_events = all_events[:max_events]

    elapsed = time.perf_counter() - t0

    # ── Write output ──
    output_dir = os.path.expanduser("~/opencern-datasets/processed/")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{filename}.json")

    summary = {
        "source_file": filepath,
        "experiment": experiment.upper(),
        "tree_name": tree_name,
        "total_scanned": total_scanned,
        "filtered_events": len(all_events),
        "processing_time_sec": round(elapsed, 2),
        "events_per_sec": round(total_scanned / max(elapsed, 0.001)),
        "processed_at": datetime.now().isoformat(),
        "particle_types": list(particle_branches.keys()),
        "ht_distribution": np.histogram(
            [e.get("ht", 0) for e in all_events], bins=20
        )[0].tolist() if all_events else [],
        "met_distribution": np.histogram(
            [e.get("met", 0) for e in all_events], bins=20
        )[0].tolist() if all_events else [],
        "avg_particles_per_event": round(
            np.mean([len(e["particles"]) for e in all_events]), 2
        ) if all_events else 0,
    }

    output = {"metadata": summary, "events": all_events}

    with open(output_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_mb = os.path.getsize(output_path) / (1024 * 1024)

    log.info("╔══════════════════════════════════════════════════════╗")
    log.info("║  Processing Complete                                ║")
    log.info("╚══════════════════════════════════════════════════════╝")
    log.info(f"  Experiment: {experiment.upper()}")
    log.info(f"  Scanned   : {total_scanned:>10,} events")
    log.info(f"  Filtered  : {len(all_events):>10,} events")
    log.info(f"  Elapsed   : {elapsed:>10.2f} sec")
    log.info(f"  Throughput: {total_scanned / max(elapsed, 0.001):>10,.0f} events/sec")
    log.info(f"  Output    : {output_path} ({size_mb:.1f} MB)")

    return output_path


# ──────────────────────────────────────────────────────────────────
# Multi-file Parallel Processing
# ──────────────────────────────────────────────────────────────────
def process_multiple(file_list, chunk_size, max_events, workers, experiment):
    log.info(f"Processing {len(file_list)} files with {workers} workers...")
    results = {}

    if workers <= 1 or len(file_list) == 1:
        for fp in file_list:
            try:
                out = process_root_file(fp, chunk_size, max_events, experiment)
                results[fp] = {"status": "ok", "output": out}
            except Exception as e:
                log.error(f"Failed: {fp} — {e}")
                results[fp] = {"status": "error", "error": str(e)}
    else:
        with ProcessPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(process_root_file, fp, chunk_size, max_events, experiment): fp
                for fp in file_list
            }
            for future in as_completed(futures):
                fp = futures[future]
                try:
                    out = future.result()
                    results[fp] = {"status": "ok", "output": out}
                    log.info(f"✔ {Path(fp).name}")
                except Exception as e:
                    log.error(f"✘ {Path(fp).name} — {e}")
                    results[fp] = {"status": "error", "error": str(e)}

    succeeded = sum(1 for r in results.values() if r["status"] == "ok")
    failed = len(results) - succeeded
    log.info(f"Done: {succeeded} succeeded, {failed} failed out of {len(file_list)} files.")
    return results


# ──────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────
def build_parser():
    parser = argparse.ArgumentParser(
        prog="opencern-processor",
        description="OpenCERN Multi-Experiment Data Processor — ROOT → JSON",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Experiments:
  auto    Smart auto-detection (default) — inspects tree/branch names
  cms     CMS NanoAOD format (Muon_pt, Jet_pt, MET_pt)
  atlas   ATLAS flat ntuples (lep_pt, jet_pt, met_et)
  alice   ALICE VSD/ESD format (tracks, V0s, muons)

Examples:
  python main.py ~/data/TTbar.root                          # auto-detect CMS
  python main.py ~/data/atlas_data.root --experiment atlas   # force ATLAS
  python main.py ~/data/*.root --workers 4                   # parallel multi-file
  python main.py ~/data/alice/ --experiment alice             # ALICE dataset folder
        """,
    )
    parser.add_argument(
        "files", nargs="+",
        help="Path(s) to ROOT file(s). Supports glob patterns.",
    )
    parser.add_argument(
        "--experiment", "-e", type=str, default="auto",
        choices=["auto", "cms", "atlas", "alice"],
        help="Experiment profile to use (default: auto-detect).",
    )
    parser.add_argument(
        "--chunk-size", type=int, default=50_000,
        help="Events per I/O chunk (default: 50000).",
    )
    parser.add_argument(
        "--max-events", type=int, default=5_000,
        help="Max events in output JSON (default: 5000).",
    )
    parser.add_argument(
        "--workers", type=int, default=1,
        help="Parallel processes for multi-file (default: 1).",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable DEBUG logging.",
    )
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Expand globs and directories
    expanded = []
    for pattern in args.files:
        p = os.path.expanduser(pattern)
        if os.path.isdir(p):
            expanded.extend(glob.glob(os.path.join(p, "*.root")))
        else:
            matched = glob.glob(p)
            if matched:
                expanded.extend(matched)
            else:
                expanded.append(p)

    valid_files = [fp for fp in expanded if os.path.isfile(fp)]
    for fp in expanded:
        if not os.path.isfile(fp):
            log.warning(f"File not found, skipping: {fp}")

    if not valid_files:
        log.error("No valid ROOT files found. Exiting.")
        sys.exit(1)

    t_global = time.perf_counter()

    if len(valid_files) == 1:
        process_root_file(valid_files[0], args.chunk_size, args.max_events, args.experiment)
    else:
        process_multiple(valid_files, args.chunk_size, args.max_events, args.workers, args.experiment)

    total = time.perf_counter() - t_global
    log.info(f"Total wall-clock time: {total:.2f}s")


if __name__ == "__main__":
    main()
