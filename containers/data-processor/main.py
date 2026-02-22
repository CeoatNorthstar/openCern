import uproot
import numpy as np
import json
import os
import sys
import awkward as ak
from pathlib import Path
from tqdm import tqdm
from datetime import datetime

def open_file(filepath: str):
    # TODO 1: Open ROOT file and print all keys
    print(f"\nOpening {filepath}...")
    file = uproot.open(filepath)
    print("\nKeys in file:")
    for key in file.keys():
        print(f"  {key}")
    return file

def get_tree(file):
    # TODO 2: Extract main Events tree and print all branches
    tree = None
    for key in ["Events", "events", "tree", "Tree", "ntuple"]:
        if key in file:
            tree = file[key]
            break
    if tree is None:
        tree = file[file.keys()[0]]
    
    print(f"\nTree: {tree.name} — {tree.num_entries} events")
    print("\nAvailable branches:")
    for branch in tree.keys():
        print(f"  {branch}")
    return tree

def safe_array(tree, branch):
    # TODO 20: Handle missing branches gracefully
    try:
        return tree[branch].array(library="ak")
    except:
        return None

def extract_muons(tree):
    # TODO 3: Extract muon branches
    return {
        "n":       safe_array(tree, "nMuon"),
        "pt":      safe_array(tree, "Muon_pt"),
        "eta":     safe_array(tree, "Muon_eta"),
        "phi":     safe_array(tree, "Muon_phi"),
        "charge":  safe_array(tree, "Muon_charge"),
        "mass":    safe_array(tree, "Muon_mass"),
        "iso":     safe_array(tree, "Muon_pfRelIso03_all"),
        "tightId": safe_array(tree, "Muon_tightId"),
        "softId":  safe_array(tree, "Muon_softId"),
    }

def extract_electrons(tree):
    # TODO 4: Extract electron branches
    return {
        "n":      safe_array(tree, "nElectron"),
        "pt":     safe_array(tree, "Electron_pt"),
        "eta":    safe_array(tree, "Electron_eta"),
        "phi":    safe_array(tree, "Electron_phi"),
        "charge": safe_array(tree, "Electron_charge"),
        "mass":   safe_array(tree, "Electron_mass"),
        "iso":    safe_array(tree, "Electron_pfRelIso03_all"),
        "cutId":  safe_array(tree, "Electron_cutBasedId"),
    }

def extract_jets(tree):
    # TODO 5: Extract jet branches
    return {
        "n":     safe_array(tree, "nJet"),
        "pt":    safe_array(tree, "Jet_pt"),
        "eta":   safe_array(tree, "Jet_eta"),
        "phi":   safe_array(tree, "Jet_phi"),
        "mass":  safe_array(tree, "Jet_mass"),
        "btag":  safe_array(tree, "Jet_btag"),
        "jetId": safe_array(tree, "Jet_jetId"),
        "puId":  safe_array(tree, "Jet_puId"),
    }

def extract_taus(tree):
    # TODO 6: Extract tau branches
    return {
        "n":          safe_array(tree, "nTau"),
        "pt":         safe_array(tree, "Tau_pt"),
        "eta":        safe_array(tree, "Tau_eta"),
        "phi":        safe_array(tree, "Tau_phi"),
        "charge":     safe_array(tree, "Tau_charge"),
        "mass":       safe_array(tree, "Tau_mass"),
        "decayMode":  safe_array(tree, "Tau_decayMode"),
        "idDecay":    safe_array(tree, "Tau_idDecayMode"),
    }

def extract_photons(tree):
    # TODO 7: Extract photon branches
    return {
        "n":     safe_array(tree, "nPhoton"),
        "pt":    safe_array(tree, "Photon_pt"),
        "eta":   safe_array(tree, "Photon_eta"),
        "phi":   safe_array(tree, "Photon_phi"),
        "mass":  safe_array(tree, "Photon_mass"),
        "cutId": safe_array(tree, "Photon_cutBasedId"),
        "iso":   safe_array(tree, "Photon_pfRelIso03_all"),
    }

def extract_met(tree):
    # TODO 8: Extract MET
    return {
        "pt":  safe_array(tree, "MET_pt"),
        "phi": safe_array(tree, "MET_phi"),
        "sig": safe_array(tree, "MET_significance"),
    }

def extract_gen(tree):
    # TODO 9: Extract generator level MC truth
    return {
        "weight":  safe_array(tree, "genWeight"),
        "n":       safe_array(tree, "nGenPart"),
        "pt":      safe_array(tree, "GenPart_pt"),
        "eta":     safe_array(tree, "GenPart_eta"),
        "phi":     safe_array(tree, "GenPart_phi"),
        "pdgId":   safe_array(tree, "GenPart_pdgId"),
        "status":  safe_array(tree, "GenPart_status"),
        "flags":   safe_array(tree, "GenPart_statusFlags"),
    }

def extract_triggers(tree):
    # TODO 10: Extract trigger information
    return {
        "IsoMu24":      safe_array(tree, "HLT_IsoMu24"),
        "Ele27":        safe_array(tree, "HLT_Ele27_WPTight_Gsf"),
        "DoubleMu":     safe_array(tree, "HLT_Mu17_TrkIsoVVL_Mu8_TrkIsoVVL"),
        "DoubleEle":    safe_array(tree, "HLT_Ele23_Ele12_CaloIdL_TrackIdL_IsoVL"),
    }

def extract_pileup(tree):
    # TODO 11: Extract pileup info
    return {
        "nTrueInt":  safe_array(tree, "Pileup_nTrueInt"),
        "pudensity": safe_array(tree, "Pileup_pudensity"),
    }

def to_xyz(pt, eta, phi, mass=None):
    # TODO 12: Convert pt/eta/phi to cartesian coordinates
    pt = np.array(pt, dtype=float)
    eta = np.array(eta, dtype=float)
    phi = np.array(phi, dtype=float)
    px = pt * np.cos(phi)
    py = pt * np.sin(phi)
    pz = pt * np.sinh(eta)
    if mass is not None:
        mass = np.array(mass, dtype=float)
        energy = np.sqrt(px**2 + py**2 + pz**2 + mass**2)
    else:
        energy = np.sqrt(px**2 + py**2 + pz**2)
    return px.tolist(), py.tolist(), pz.tolist(), energy.tolist()

def compute_event_quantities(muons, electrons, jets, met, i):
    # TODO 13: Compute per event quantities
    result = {
        "ht": 0.0,
        "n_bjets": 0,
        "met_pt": 0.0,
        "leading_lepton_pt": 0.0,
        "inv_mass_lepton_pair": 0.0,
    }

    # HT
    if jets["pt"] is not None:
        try:
            result["ht"] = float(np.sum(jets["pt"][i]))
        except: pass

    # b-jets
    if jets["btag"] is not None:
        try:
            result["n_bjets"] = int(np.sum(np.array(jets["btag"][i]) > 0.5))
        except: pass

    # MET
    if met["pt"] is not None:
        try:
            result["met_pt"] = float(met["pt"][i])
        except: pass

    # Leading lepton pt
    pts = []
    if muons["pt"] is not None:
        try:
            pts += list(muons["pt"][i])
        except: pass
    if electrons["pt"] is not None:
        try:
            pts += list(electrons["pt"][i])
        except: pass
    if pts:
        result["leading_lepton_pt"] = float(max(pts))

    return result

def build_particles(data, i, particle_type, color):
    # Helper to build particle list for one event
    particles = []
    pt_arr  = data.get("pt")
    eta_arr = data.get("eta")
    phi_arr = data.get("phi")
    mass_arr = data.get("mass")

    if pt_arr is None or eta_arr is None or phi_arr is None:
        return particles

    try:
        pts  = list(pt_arr[i])
        etas = list(eta_arr[i])
        phis = list(phi_arr[i])
        masses = list(mass_arr[i]) if mass_arr is not None else [0.0] * len(pts)

        for j in range(len(pts)):
            px, py, pz, e = to_xyz(
                [pts[j]], [etas[j]], [phis[j]], [masses[j]]
            )
            particles.append({
                "type":   particle_type,
                "color":  color,
                "pt":     round(pts[j], 3),
                "eta":    round(etas[j], 3),
                "phi":    round(phis[j], 3),
                "mass":   round(masses[j], 4),
                "px":     round(px[0], 3),
                "py":     round(py[0], 3),
                "pz":     round(pz[0], 3),
                "energy": round(e[0], 3),
            })
    except:
        pass
    return particles

def filter_event(muons, electrons, jets, met, i):
    # TODO 15: Filter events
    try:
        n_muons = len(muons["pt"][i]) if muons["pt"] is not None else 0
        n_electrons = len(electrons["pt"][i]) if electrons["pt"] is not None else 0
        met_pt = float(met["pt"][i]) if met["pt"] is not None else 0.0
        n_jets = len(jets["pt"][i]) if jets["pt"] is not None else 0

        has_lepton = (
            (n_muons > 0 and float(np.max(muons["pt"][i])) > 20) or
            (n_electrons > 0 and float(np.max(electrons["pt"][i])) > 20)
        )
        has_met = met_pt > 20
        has_jet = n_jets > 0 and float(np.max(jets["pt"][i])) > 30

        return has_lepton and has_met and has_jet
    except:
        return False

def convert_to_serializable(obj):
    if isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    if isinstance(obj, (np.int32, np.int64)):
        return int(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, bool):
        return bool(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def process_root_file(filepath: str):
    filepath = os.path.expanduser(filepath)
    filename = Path(filepath).stem

    # TODO 1 + 2
    file = open_file(filepath)
    tree = get_tree(file)

    total_events = tree.num_entries
    print(f"\nTotal events: {total_events}")

    # TODO 3-11: Extract all data
    muons     = extract_muons(tree)
    electrons = extract_electrons(tree)
    jets      = extract_jets(tree)
    taus      = extract_taus(tree)
    photons   = extract_photons(tree)
    met       = extract_met(tree)
    gen       = extract_gen(tree)
    triggers  = extract_triggers(tree)
    pileup    = extract_pileup(tree)

    events = []
    missing_branches = []

    # TODO 19: Progress bar
    for i in tqdm(range(total_events), desc="Processing events"):

        # TODO 15: Filter
        if not filter_event(muons, electrons, jets, met, i):
            continue

        # TODO 13: Compute quantities
        quantities = compute_event_quantities(muons, electrons, jets, met, i)

        # TODO 14: Build event object
        event = {
            "index": i,
            "ht":    quantities["ht"],
            "met":   quantities["met_pt"],
            "n_bjets": quantities["n_bjets"],
            "leading_lepton_pt": quantities["leading_lepton_pt"],
            "particles": (
                build_particles(muons,     i, "muon",     "#ff6b6b") +
                build_particles(electrons, i, "electron", "#7fbbb3") +
                build_particles(jets,      i, "jet",      "#dbbc7f") +
                build_particles(taus,      i, "tau",      "#d699b6") +
                build_particles(photons,   i, "photon",   "#a7c080")
            ),
            "met_vector": {
                "pt":  quantities["met_pt"],
                "phi": float(met["phi"][i]) if met["phi"] is not None else 0.0,
            },
            "triggers": {
                k: bool(v[i]) if v is not None else False
                for k, v in triggers.items()
            },
        }
        events.append(event)

    # TODO 16: Sort by HT and keep top 5000
    events.sort(key=lambda e: e["ht"], reverse=True)
    events = events[:5000]

    print(f"\nFiltered to {len(events)} events")

    # TODO 17: Write output JSON
    output_dir = os.path.expanduser("~/opencern-datasets/processed/")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{filename}.json")

    # TODO 18: Metadata + summary
    summary = {
        "source_file":      filepath,
        "total_events":     total_events,
        "filtered_events":  len(events),
        "processed_at":     datetime.now().isoformat(),
        "ht_distribution":  np.histogram([e["ht"] for e in events], bins=20)[0].tolist(),
        "met_distribution": np.histogram([e["met"] for e in events], bins=20)[0].tolist(),
        "avg_particles_per_event": round(
            np.mean([len(e["particles"]) for e in events]), 2
        ) if events else 0,
    }

    output = {
        "metadata": summary,
        "events":   events,
    }

    with open(output_path, "w") as f:
        json.dump(output, f, default=convert_to_serializable)

    print(f"\nOutput written to {output_path}")

    # TODO 22: Final summary report
    print("\n--- SUMMARY ---")
    print(f"Source file:       {filepath}")
    print(f"Total events:      {total_events}")
    print(f"Filtered events:   {len(events)}")
    print(f"Output:            {output_path}")
    print(f"Avg particles/evt: {summary['avg_particles_per_event']}")

    return output_path

if __name__ == "__main__":
    # TODO 21: Accept file path as command line argument
    if len(sys.argv) < 2:
        print("Usage: python main.py <path_to_root_file>")
        print("Example: python main.py ~/opencern-datasets/data/TTbar.root")
        sys.exit(1)

    filepath = sys.argv[1]
    process_root_file(filepath)
