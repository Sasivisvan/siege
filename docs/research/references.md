# Open-Source References — SIEGE

Resources identified for reference and potential integration.

---

## Proctoring & Browser Signals (Client / AI Module)

| Project | Link | What to learn |
|---------|------|---------------|
| **OpenProctor** | [github.com/Codseg/openproctor](https://github.com/Codseg/openproctor) | Browser-side media capture, BlazeFace detection, tab-switch hooks. Reference for Dev 3's face detection module. |
| **react-proctoring** | [github.com/ansh-saini/react-proctoring](https://github.com/ansh-saini/react-proctoring) | Headless React library for fullscreen, tab-switch, copy-prevention. Reference for Dev 2's telemetry hooks. |
| **ProctorX** | [github.com/ANUBHAVNATANI/ProctorX](https://github.com/ANUBHAVNATANI/ProctorX) | Full proctoring project with session controls and event capture. Reference architecture for all devs. |

---

## Code Plagiarism Detection (Server Module)

| Project | Link | Language | Technique | Use in SIEGE |
|---------|------|----------|-----------|--------------|
| **JPlag** | [github.com/jplag/JPlag](https://github.com/jplag/JPlag) | Java (CLI) | Token/AST-based pairwise comparison | Algorithmic inspiration for our tokenization pipeline. Supports JS, Python, C/C++, Java, Go, Rust. |
| **copydetect** | [github.com/blingenf/copydetect](https://github.com/blingenf/copydetect) | Python | Fingerprint-based (winnowing) | Winnowing algorithm reference for k-gram fingerprinting fallback. |
| **ac2** | [github.com/manuel-freire/ac2](https://github.com/manuel-freire/ac2) | Java | Comparative analysis | Benchmarking tool to validate our engine against JPlag results. |
| **resava** | [github.com/BojanStipic/resava](https://github.com/BojanStipic/resava) | Rust | String-metric similarity | Lightweight screening inspiration. Aligns with our `string-similarity` approach. |

---

## Benchmarking Dataset

| Dataset | Link | Contents |
|---------|------|----------|
| **sourcecodeplagiarismdataset** | [github.com/oscarkarnalim/sourcecodeplagiarismdataset](https://github.com/oscarkarnalim/sourcecodeplagiarismdataset) | 467 Java files across 7 tasks with multi-level plagiarism variants (L0–L6). Use for tuning similarity thresholds. |
