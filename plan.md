To survive a 16-hour Live Game Window on free-tier infrastructure, your AI architecture cannot be a monolithic Python server that crashes under load. If your AI processing takes too long or runs out of memory, attackers will easily DoS (Denial of Service) your system, costing you severe SL-1/SL-2 point penalties.

The strategy is **Distributed Edge AI**: Shift the heavy lifting of computer vision to the candidate's browser (Frontend) and keep the backend focused strictly on aggregation, fast text analysis (Plagiarism), and database writes.

Here is the detailed parallel design document specifically for the AI and Security components, split across your 3 developers.

---

### **Dev 3: The Watcher (Core AI Models & Risk Engine)**

_Your objective is to design the AI logic, train/configure the pre-built models, and formulate the exact algorithm for the "Explainable Risk Score."_

**1. Client-Side Vision (TensorFlow.js)**
Instead of sending video to a backend, you will write a lightweight JavaScript module using **TensorFlow.js** and the **BlazeFace** or **Face-api.js** pre-trained models.

- **The Pipeline:** Capture a frame from the `<canvas>` every 3–5 seconds. Run `faceDetection`.
- **The Outputs:** The model returns the number of faces detected in the bounding box.
- **The Triggers:** \* `faces == 0`: Flag "Candidate Missing".
- `faces > 1`: Flag "Multiple People Detected".

- _Deliverable for Dev 2:_ An encapsulated React hook or JS utility function (`useProctoring()`) that Dev 2 can simply drop into the frontend exam page.

**2. The Explainable Risk Scoring Engine**
Design a weighted scoring algorithm that translates raw data into human-readable insights for the recruiter.

- **Algorithm Logic (Example):**
- Start at 0% Risk.
- Tab Switch (Loss of Window Focus): +15% (Max 45%).
- Copy-Paste Event detected in code editor: +20%.
- Face Missing (for > 10 seconds): +30%.
- Multiple Faces (for > 5 seconds): +50%.

- **Explainability String Generation:** Write a function that takes the flags and outputs the exact reason for the score.
- _Output format:_ `85% Risk - Critical. Candidate switched tabs 3 times. Multiple faces detected at 14:22 and 14:28. Code pasted directly into editor.`

---

### **Dev 2: The Gate (Frontend Telemetry & AI Integration)**

_Your objective is to execute Dev 3's AI models efficiently in the browser without lagging the UI, and to build the invisible behavioral tracking system._

**1. AI Model Execution (Main-Thread Protection)**
Running TensorFlow.js on the main React thread will cause the Monaco Code Editor to lag when a candidate types. If the editor lags, attackers will file an SL-2 bug ("Severe workflow/reliability problem").

- **The Fix:** You must run Dev 3's TensorFlow.js module inside a **Web Worker**. This offloads the webcam frame analysis to a background thread.
- **Implementation:** Use the `MediaStream API` to access the webcam, draw the video to a hidden `<canvas>`, extract the image data, and send it to the Web Worker via `postMessage()`.

**2. Behavioral Telemetry (The Silent Alarms)**
You must capture browser events and bundle them efficiently to send to the backend.

- **Events to Track:**
- `window.onblur` / `document.hidden` (Tab switching).
- `paste` event listener on the code editor.
- Keystroke velocity (Are they typing at 400 WPM? If yes, it's a scripted paste bypass).

- **Batch Uploading:** Do not send an API request for every single keystroke or face detection. Batch the logs into an array and send a single `POST /api/telemetry` request to Dev 1's backend every 10 seconds.

---

### **Dev 1: The Vault (Backend AI Ingestion & Plagiarism)**

_Your objective is to ingest the telemetry from Dev 2, calculate final metrics, and build the backend Code Plagiarism detector._

**1. High-Speed Telemetry Ingestion**
You will be hammered with telemetry logs every 10 seconds from every active candidate.

- **Data Structure:** Use a fast NoSQL document (MongoDB) or a JSONB column in PostgreSQL to store the timeline array.
- **Endpoint Security:** Attackers will try to send fake payloads (e.g., `{ riskScore: 0 }`). Your endpoint must re-verify the weights of the logs on the server side using Dev 3's logic. Do not trust the frontend's final math.

**2. Fast Code Plagiarism Engine (AST & String Math)**
You do not have time to build a Machine Learning code-similarity engine, nor will a free-tier server support it. You will build a deterministic, token-based engine.

- **The Strategy (Dolos/MOSS style):**

1. Strip all comments and whitespace from the submitted code.
2. Standardize variable names (e.g., regex replace all `let [varName]` with `let V`).
3. Use an npm library like `string-similarity` (which uses the Sørensen-Dice coefficient) or `jscpd` to compare the normalized string against a database of "known solutions" and other candidates' submissions.

- **Execution:** Run this comparison _asynchronously_ after the code is submitted, so you don't block the HTTP response returning to the candidate.

---

### **🛡️ Adversarial Defense: How to survive the Live Game**

Other teams will actively try to bypass or break your AI. Here is how your 3 developers must collaborate to patch the vulnerabilities before the attack window opens.

- **Attack Vector 1: The Virtual Camera Spoof (Dev 3 Defense)**
- _The Attack:_ A team uses OBS Virtual Camera to feed a looping video of themselves looking at the screen.
- _The Fix:_ Have Dev 3 implement a "Liveness Check." Randomly ask the user to "Look Left" or "Smile" at the start of the exam, utilizing Face-api.js blendshapes/landmarks to verify actual movement.

- **Attack Vector 2: Telemetry Blocking (Dev 2 Defense)**
- _The Attack:_ An attacker uses Chrome DevTools to block network requests to `/api/telemetry`, effectively blinding your AI.
- _The Fix:_ Dev 2 must implement a heartbeat check. If Dev 1's backend does not receive a heartbeat with valid telemetry every 30 seconds, Dev 1 automatically pauses the exam timer and locks the candidate out until connection is restored.

- **Attack Vector 3: Payload Tampering (Dev 1 Defense)**
- _The Attack:_ An attacker intercepts the batch upload via Burp Suite and changes `"event": "MULTIPLE_FACES"` to `"event": "ALL_CLEAR"`.
- _The Fix:_ Dev 1 and Dev 2 must agree on a lightweight HMAC signing process. The frontend signs the telemetry payload with a session-specific secret. If the signature doesn't match on the backend, Dev 1 instantly flags the exam for "Severe API Manipulation" (100% Risk Score).
