class FaceEmotionApp {
  constructor() {
    this.video = document.getElementById("video");
    this.canvas = document.getElementById("overlay");
    this.ctx = this.canvas.getContext("2d");
    this.savedFaces = [];
    this.isModelLoaded = false;
    this.stream = null;
    this.isDetecting = false;
    this.emotionDetectionActive = false;

    this.initializeElements();
    this.loadModels(); // Only call this here
  }

  initializeElements() {
    this.statusEl = document.getElementById("status");
    this.startCameraBtn = document.getElementById("startCamera");
    this.stopCameraBtn = document.getElementById("stopCamera");
    this.saveFaceBtn = document.getElementById("saveFace");
    this.clearFacesBtn = document.getElementById("clearFaces");
    this.detectEmotionsBtn = document.getElementById("detectEmotions");
    this.faceNameInput = document.getElementById("faceName");
    this.savedFaceSelect = document.getElementById("savedFaceSelect");
    this.facesListEl = document.getElementById("facesList");
    this.alertsEl = document.getElementById("alerts");

    this.bindEvents();
  }

  bindEvents() {
    this.startCameraBtn.addEventListener("click", () => this.startCamera());
    this.stopCameraBtn.addEventListener("click", () => this.stopCamera());
    this.saveFaceBtn.addEventListener("click", () => this.saveFace());
    this.clearFacesBtn.addEventListener("click", () => this.clearFaces());
    this.detectEmotionsBtn.addEventListener("click", () =>
      this.toggleEmotionDetection()
    );
  }

  getMainEmotion(expressions) {
    let maxEmotion = null;
    let maxValue = -Infinity;
    for (const [emotion, value] of Object.entries(expressions)) {
      if (value > maxValue) {
        maxValue = value;
        maxEmotion = emotion;
      }
    }
    return { emotion: maxEmotion, value: maxValue };
  }

  drawEmotionLabel(box, text) {
    const { x, y, width } = box;
    this.ctx.font = "bold 16px Arial";
    this.ctx.fillStyle = "#222";
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 4;

    // Draw white outline for readability
    this.ctx.strokeText(
      text,
      x + width / 2 - this.ctx.measureText(text).width / 2,
      y - 28
    );
    // Draw black text
    this.ctx.fillStyle = "#ffeb3b";
    this.ctx.fillText(
      text,
      x + width / 2 - this.ctx.measureText(text).width / 2,
      y - 28
    );
  }

  async loadSavedFaces() {
    // Manually list known face images for demo
    const faceFiles = ["andre.jpg"]; // Add more as needed

    for (const file of faceFiles) {
      const img = await faceapi.fetchImage(`faces/${file}`);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        this.savedFaces.push({
          name: file.replace(/\.[^/.]+$/, ""),
          descriptor: Array.from(detection.descriptor),
          timestamp: new Date().toISOString(),
          emotions: null,
          imageData: img.src,
        });
      } else {
        console.warn(`No face detected in ${file}`);
      }
    }

    this.updateFacesList();
    this.updateSavedFaceSelect();
    this.showFacesGallery(faceFiles);
  }
  // Show loaded faces in a gallery
  showFacesGallery(faceFiles) {
    const gallery = document.getElementById("facesGallery");
    gallery.innerHTML = "<h3>Loaded Faces from Folder</h3>";
    faceFiles.forEach((file) => {
      const img = document.createElement("img");
      img.src = `faces/${file}`;
      img.style.width = "100px";
      img.style.margin = "5px";
      gallery.appendChild(img);
    });
  }

  async loadModels() {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri("face-api/weights");
      await faceapi.nets.faceLandmark68Net.loadFromUri("face-api/weights");
      await faceapi.nets.faceRecognitionNet.loadFromUri("face-api/weights");
      await faceapi.nets.faceExpressionNet.loadFromUri("face-api/weights");

      this.isModelLoaded = true;
      this.updateStatus(
        "Models loaded successfully! Ready to start.",
        "success"
      );
      this.startCameraBtn.disabled = false;

      // <-- ADD THIS LINE
      this.loadSavedFaces();
    } catch (error) {
      this.updateStatus("Error loading models: " + error.message, "error");
    }
  }
  async startCamera() {
    if (!this.isModelLoaded) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      this.video.srcObject = this.stream;

      this.video.addEventListener("loadedmetadata", () => {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        console.log("Canvas size:", this.canvas.width, this.canvas.height);
        this.startCameraBtn.disabled = true;
        this.stopCameraBtn.disabled = false;
        this.saveFaceBtn.disabled = false;
        this.updateStatus(
          "Camera started. Position face in view to save or detect emotions.",
          "success"
        );
        this.startFaceDetection();
      });
    } catch (error) {
      this.updateStatus("Error accessing camera: " + error.message, "error");
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.video.srcObject = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.startCameraBtn.disabled = false;
    this.stopCameraBtn.disabled = true;
    this.saveFaceBtn.disabled = true;
    this.isDetecting = false;
    this.updateStatus("Camera stopped.", "success");
  }

  async startFaceDetection() {
    this.isDetecting = true;
    const detectFaces = async () => {
      if (!this.isDetecting || this.video.paused || this.video.ended) return;

      const detections = await faceapi
        .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (detections.length > 0) {
        const resizedDetections = faceapi.resizeResults(detections, {
          width: this.canvas.width,
          height: this.canvas.height,
        });

        faceapi.draw.drawDetections(this.canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(this.canvas, resizedDetections);

        // Process each detected face
        for (let i = 0; i < detections.length; i++) {
          const detection = detections[i];
          const resizedDetection = resizedDetections[i];

          // Check if this face matches any saved face
          console.log("Detection box:", resizedDetection.detection.box);
          const matchedFace = this.findMatchingFace(detection.descriptor);

          if (matchedFace) {
            console.log("Matched face:", matchedFace.name);
            // Draw the name label above the box
            this.drawNameLabel(
              resizedDetection.detection.box,
              matchedFace.name,
              true
            );

            // Draw main emotion above the head (higher than the name)
            const { emotion, value } = this.getMainEmotion(
              detection.expressions
            );
            if (emotion) {
              this.drawEmotionLabel(
                {
                  ...resizedDetection.detection.box,
                  y: resizedDetection.detection.box.y - 30, // move higher above the head
                },
                `${emotion} (${(value * 100).toFixed(0)}%)`
              );
            }

            // Check emotion thresholds if emotion detection is active
            if (this.emotionDetectionActive) {
              this.checkEmotionThresholds(matchedFace);
            }
          } else {
            console.log("Unknown face detected");
            // Unregistered person - draw "Unknown" label but no emotion detection
            this.drawNameLabel(
              resizedDetection.detection.box,
              "Unknown",
              false
            );
          }
        }

        // Update the faces list to show current emotions
        this.updateFacesList();
      }

      requestAnimationFrame(detectFaces);
    };

    detectFaces();
  }

  findMatchingFace(descriptor) {
    let bestMatch = null;
    let minDistance = Infinity;

    for (const savedFace of this.savedFaces) {
      const savedDescriptor = new Float32Array(savedFace.descriptor);
      const distance = faceapi.euclideanDistance(savedDescriptor, descriptor);

      if (distance < minDistance && distance < 0.6) {
        // 0.6 is recognition threshold
        minDistance = distance;
        bestMatch = savedFace;
      }
    }

    return bestMatch;
  }

  drawNameLabel(box, name, isRegistered) {
    const { x, y, width } = box;

    // Set styles based on registration status
    this.ctx.fillStyle = isRegistered ? "#4CAF50" : "#FF9800";
    this.ctx.strokeStyle = isRegistered ? "#4CAF50" : "#FF9800";
    this.ctx.lineWidth = 2;
    this.ctx.font = "16px Arial";

    // Measure text for background
    const textMetrics = this.ctx.measureText(name);
    const textWidth = textMetrics.width;
    const textHeight = 20;

    // Draw background rectangle
    this.ctx.fillRect(x, y - textHeight - 5, textWidth + 10, textHeight + 5);

    // Draw text
    this.ctx.fillStyle = "white";
    this.ctx.fillText(name, x + 5, y - 8);
  }

  async saveFace() {
    if (!this.faceNameInput.value.trim()) {
      this.showAlert("Please enter a name for the face");
      return;
    }

    const detections = await faceapi
      .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      this.showAlert(
        "No face detected. Please position your face clearly in view."
      );
      return;
    }

    if (detections.length > 1) {
      this.showAlert(
        "Multiple faces detected. Please ensure only one face is visible."
      );
      return;
    }

    const faceName = this.faceNameInput.value.trim();

    // Save the entire camera frame as PNG
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = this.video.videoWidth;
    fullCanvas.height = this.video.videoHeight;
    const fullCtx = fullCanvas.getContext("2d");
    fullCtx.drawImage(this.video, 0, 0, fullCanvas.width, fullCanvas.height);

    const faceData = {
      name: faceName,
      descriptor: Array.from(detections[0].descriptor),
      timestamp: new Date().toISOString(),
      emotions: null,
      imageData: fullCanvas.toDataURL("image/png"),
    };

    // Save to faces folder (simulate file save)
    await this.saveFaceToFile(faceData);

    this.savedFaces.push(faceData);
    this.updateFacesList();
    this.updateSavedFaceSelect();
    this.faceNameInput.value = "";
    this.updateStatus(`Face "${faceData.name}" saved successfully!`, "success");
  }

  async saveFaceToFile(faceData) {
    try {
      // In a real implementation, this would save to the faces folder
      // For now, we'll simulate the save by downloading the image
      const link = document.createElement("a");
      link.download = `${faceData.name}.jpg`;
      link.href = faceData.imageData;

      // Create a temporary click to trigger download
      // In a real app, you'd send this to your server instead
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(
        `Face image for ${faceData.name} would be saved to faces folder`
      );
    } catch (error) {
      console.error("Error saving face file:", error);
    }
  }

  toggleEmotionDetection() {
    this.emotionDetectionActive = !this.emotionDetectionActive;

    if (this.emotionDetectionActive) {
      this.detectEmotionsBtn.textContent = "Stop Emotion Detection";
      this.detectEmotionsBtn.style.background =
        "linear-gradient(45deg, #ff6b6b, #ee5a52)";
      this.updateStatus(
        "Emotion detection started for registered faces",
        "success"
      );
    } else {
      this.detectEmotionsBtn.textContent = "Start Emotion Detection";
      this.detectEmotionsBtn.style.background =
        "linear-gradient(45deg, #667eea, #764ba2)";
      this.updateStatus("Emotion detection stopped", "success");
    }
  }

  async detectEmotions() {
    // This method is now replaced by toggleEmotionDetection
    // but kept for backward compatibility
    this.toggleEmotionDetection();
  }

  checkEmotionThresholds(faceData) {
    const thresholds = {
      happy: parseFloat(document.getElementById("happyThreshold").value),
      sad: parseFloat(document.getElementById("sadThreshold").value),
      angry: parseFloat(document.getElementById("angryThreshold").value),
      surprised: parseFloat(
        document.getElementById("surprisedThreshold").value
      ),
    };

    const emotions = faceData.emotions;
    const alerts = [];

    Object.keys(thresholds).forEach((emotion) => {
      if (emotions[emotion] >= thresholds[emotion]) {
        alerts.push(
          `${emotion.toUpperCase()} emotion detected above threshold (${(
            emotions[emotion] * 100
          ).toFixed(1)}%)`
        );
      }
    });

    if (alerts.length > 0) {
      alerts.forEach((alert) => this.showAlert(`${faceData.name}: ${alert}`));
    }
  }

  clearFaces() {
    if (confirm("Are you sure you want to clear all saved faces?")) {
      this.savedFaces = [];
      this.updateFacesList();
      this.updateSavedFaceSelect();
      this.updateStatus("All faces cleared.", "success");
    }
  }

  updateFacesList() {
    this.facesListEl.innerHTML = "";

    this.savedFaces.forEach((face, index) => {
      const faceDiv = document.createElement("div");
      faceDiv.className = "face-item";

      let emotionsHtml = "";
      if (face.emotions) {
        emotionsHtml = '<div class="emotion-display">';
        Object.entries(face.emotions).forEach(([emotion, value]) => {
          const percentage = (value * 100).toFixed(1);
          const isHigh = this.isEmotionHigh(emotion, value);
          emotionsHtml += `
                        <div class="emotion-item ${isHigh ? "high" : ""}">
                            <div>${emotion}: ${percentage}%</div>
                            <div class="emotion-bar">
                                <div class="emotion-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `;
        });
        emotionsHtml += "</div>";
      }

      faceDiv.innerHTML = `
                <div>
                    <strong>${face.name}</strong>
                    <div style="font-size: 12px; color: #666;">
                        Saved: ${new Date(face.timestamp).toLocaleString()}
                        ${
                          face.lastDetection
                            ? `<br>Last detection: ${new Date(
                                face.lastDetection
                              ).toLocaleString()}`
                            : ""
                        }
                    </div>
                    ${emotionsHtml}
                </div>
                <button onclick="app.deleteFace(${index})" style="background: #ff6b6b;">Delete</button>
            `;

      this.facesListEl.appendChild(faceDiv);
    });
  }

  isEmotionHigh(emotion, value) {
    const thresholds = {
      happy: parseFloat(document.getElementById("happyThreshold").value),
      sad: parseFloat(document.getElementById("sadThreshold").value),
      angry: parseFloat(document.getElementById("angryThreshold").value),
      surprised: parseFloat(
        document.getElementById("surprisedThreshold").value
      ),
    };

    return thresholds[emotion] && value >= thresholds[emotion];
  }

  updateSavedFaceSelect() {
    this.savedFaceSelect.innerHTML =
      '<option value="">Select a saved face</option>';
    this.savedFaces.forEach((face) => {
      const option = document.createElement("option");
      option.value = face.name;
      option.textContent = face.name;
      this.savedFaceSelect.appendChild(option);
    });

    this.detectEmotionsBtn.disabled = false; // Always enabled now
    this.detectEmotionsBtn.textContent = this.emotionDetectionActive
      ? "Stop Emotion Detection"
      : "Start Emotion Detection";
  }

  deleteFace(index) {
    if (confirm(`Delete face "${this.savedFaces[index].name}"?`)) {
      this.savedFaces.splice(index, 1);
      this.updateFacesList();
      this.updateSavedFaceSelect();
    }
  }

  showAlert(message) {
    const alertDiv = document.createElement("div");
    alertDiv.className = "alert";
    alertDiv.textContent = message;
    this.alertsEl.appendChild(alertDiv);

    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.parentNode.removeChild(alertDiv);
      }
    }, 5000);
  }

  updateStatus(message, type = "loading") {
    this.statusEl.textContent = message;
    this.statusEl.className = `status ${type}`;
  }
}

// Initialize the app
const app = new FaceEmotionApp();
