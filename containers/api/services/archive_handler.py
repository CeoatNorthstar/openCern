"""
OpenCERN API — Archive Handler Service
Auto-detects and extracts .zip, .tar.gz, .tar, .gz archives after download.
Extracts only ROOT files and cleans up the archive afterwards.
"""
import os
import zipfile
import tarfile
import logging
import shutil
from typing import List, Optional

log = logging.getLogger("opencern.archive")

# Supported archive extensions
ARCHIVE_EXTENSIONS = {".zip", ".tar.gz", ".tgz", ".tar", ".gz"}


def is_archive(filepath: str) -> bool:
    """Check if a file is a supported archive by extension + magic bytes."""
    lower = filepath.lower()

    # Extension check
    for ext in ARCHIVE_EXTENSIONS:
        if lower.endswith(ext):
            return True

    # Magic bytes fallback (first 4 bytes)
    try:
        with open(filepath, "rb") as f:
            magic = f.read(4)
            # ZIP: PK\x03\x04
            if magic[:4] == b"PK\x03\x04":
                return True
            # GZIP: \x1f\x8b
            if magic[:2] == b"\x1f\x8b":
                return True
    except Exception:
        pass

    return False


def extract_archive(filepath: str, dest_dir: str) -> List[str]:
    """
    Extract ROOT files from an archive into dest_dir.

    Returns list of extracted ROOT file paths (relative to dest_dir).
    Removes the original archive after successful extraction.
    """
    lower = filepath.lower()
    extracted = []

    try:
        if lower.endswith(".zip") or _is_zip(filepath):
            extracted = _extract_zip(filepath, dest_dir)
        elif lower.endswith((".tar.gz", ".tgz")) or lower.endswith(".tar"):
            extracted = _extract_tar(filepath, dest_dir)
        elif lower.endswith(".gz") and not lower.endswith(".tar.gz"):
            extracted = _extract_gzip_single(filepath, dest_dir)
        else:
            # Try zip first (most common for ATLAS), then tar
            if _is_zip(filepath):
                extracted = _extract_zip(filepath, dest_dir)
            else:
                extracted = _extract_tar(filepath, dest_dir)

        if extracted:
            log.info(f"Extracted {len(extracted)} ROOT file(s) from {os.path.basename(filepath)}")
            for f in extracted:
                log.info(f"  → {f}")

            # Remove the original archive
            try:
                os.remove(filepath)
                log.info(f"Removed archive: {os.path.basename(filepath)}")
            except Exception as e:
                log.warning(f"Failed to remove archive: {e}")
        else:
            log.warning(f"No ROOT files found in archive: {os.path.basename(filepath)}")

    except Exception as e:
        log.error(f"Archive extraction failed: {filepath} — {e}")

    return extracted


def _is_zip(filepath: str) -> bool:
    """Check ZIP magic bytes."""
    try:
        with open(filepath, "rb") as f:
            return f.read(4) == b"PK\x03\x04"
    except Exception:
        return False


def _is_root_file(name: str) -> bool:
    """Check if a filename is a ROOT file (not a directory or metadata)."""
    basename = os.path.basename(name)
    return (
        basename.lower().endswith(".root")
        and not basename.startswith(".")
        and not basename.startswith("__")
    )


def _extract_zip(filepath: str, dest_dir: str) -> List[str]:
    """Extract ROOT files from a ZIP archive."""
    extracted = []

    with zipfile.ZipFile(filepath, "r") as zf:
        root_files = [n for n in zf.namelist() if _is_root_file(n)]
        log.info(f"ZIP contains {len(zf.namelist())} entries, {len(root_files)} ROOT files")

        for member in root_files:
            # Flatten the extraction — put ROOT files directly in dest_dir
            basename = os.path.basename(member)
            dest_path = os.path.join(dest_dir, basename)

            # Avoid name collisions
            if os.path.exists(dest_path):
                stem, ext = os.path.splitext(basename)
                counter = 1
                while os.path.exists(dest_path):
                    dest_path = os.path.join(dest_dir, f"{stem}_{counter}{ext}")
                    counter += 1
                basename = os.path.basename(dest_path)

            # Extract to temp then move (handles nested paths)
            with zf.open(member) as src, open(dest_path, "wb") as dst:
                shutil.copyfileobj(src, dst)

            size_mb = os.path.getsize(dest_path) / (1024 * 1024)
            log.info(f"  Extracted: {basename} ({size_mb:.1f} MB)")
            extracted.append(basename)

    return extracted


def _extract_tar(filepath: str, dest_dir: str) -> List[str]:
    """Extract ROOT files from a TAR/TAR.GZ archive."""
    extracted = []
    mode = "r:gz" if filepath.lower().endswith((".tar.gz", ".tgz")) else "r:"

    try:
        with tarfile.open(filepath, mode) as tf:
            root_members = [m for m in tf.getmembers()
                            if m.isfile() and _is_root_file(m.name)]
            log.info(f"TAR contains {len(tf.getmembers())} entries, "
                     f"{len(root_members)} ROOT files")

            for member in root_members:
                basename = os.path.basename(member.name)
                dest_path = os.path.join(dest_dir, basename)

                # Avoid collisions
                if os.path.exists(dest_path):
                    stem, ext = os.path.splitext(basename)
                    counter = 1
                    while os.path.exists(dest_path):
                        dest_path = os.path.join(dest_dir, f"{stem}_{counter}{ext}")
                        counter += 1
                    basename = os.path.basename(dest_path)

                # Extract member
                member.name = basename
                tf.extract(member, dest_dir)

                size_mb = os.path.getsize(dest_path) / (1024 * 1024)
                log.info(f"  Extracted: {basename} ({size_mb:.1f} MB)")
                extracted.append(basename)

    except tarfile.ReadError:
        log.error(f"Failed to read as tar archive: {filepath}")

    return extracted


def _extract_gzip_single(filepath: str, dest_dir: str) -> List[str]:
    """Extract a single gzip-compressed .root.gz file."""
    import gzip

    basename = os.path.basename(filepath)
    if basename.lower().endswith(".gz"):
        out_name = basename[:-3]  # Remove .gz
    else:
        out_name = basename + ".root"

    if not out_name.lower().endswith(".root"):
        return []  # Not a ROOT file

    dest_path = os.path.join(dest_dir, out_name)

    try:
        with gzip.open(filepath, "rb") as gz, open(dest_path, "wb") as out:
            shutil.copyfileobj(gz, out)

        size_mb = os.path.getsize(dest_path) / (1024 * 1024)
        log.info(f"  Decompressed: {out_name} ({size_mb:.1f} MB)")
        return [out_name]
    except Exception as e:
        log.error(f"Gzip extraction failed: {e}")
        return []
