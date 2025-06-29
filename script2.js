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
    this.loadModels();
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
    // this.saveFaceBtn.addEventListener("click", () => this.saveFace());
    // this.clearFacesBtn.addEventListener("click", () => this.clearFaces());
    // this.detectEmotionsBtn.addEventListener("click", () =>
    //   this.toggleEmotionDetection()
    // );
  }

  async loadModels() {
    try {
      this.updateStatus("Loading TinyFaceDetector model...", "loading");
      await faceapi.nets.tinyFaceDetector.loadFromUri(
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model"
      );

      this.updateStatus("Loading FaceLandmark model...", "loading");
      await faceapi.nets.faceLandmark68Net.loadFromUri(
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model"
      );

      this.updateStatus("Loading FaceRecognition model...", "loading");
      await faceapi.nets.faceRecognitionNet.loadFromUri(
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model"
      );

      this.updateStatus("Loading FaceExpression model...", "loading");
      await faceapi.nets.faceExpressionNet.loadFromUri(
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model"
      );

      this.isModelLoaded = true;
      this.updateStatus(
        "Models loaded successfully! Ready to start.",
        "success"
      );
      this.startCameraBtn.disabled = false;
      // <-- ADD THIS LINE
      this.loadSavedFaces();
    } catch (error) {
      console.error("Error loading models:", error);
      this.updateStatus("Error loading models: " + error.message, "error");
    }
  }

  async startCamera() {
    if (!this.isModelLoaded) {
      this.showAlert("Models not loaded yet. Please wait.");
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      this.video.srcObject = this.stream;

      this.video.addEventListener("loadedmetadata", () => {
        // ...existing code...

        // Wait for video to actually start playing and get display dimensions
        this.video.addEventListener("playing", () => {
          this.updateCanvasSize();
          this.startCameraBtn.disabled = true;
          this.stopCameraBtn.disabled = false;

          this.updateStatus(
            "Camera started. Position face in view to save or detect emotions.",
            "success"
          );

          // Start face detection after a short delay
          setTimeout(() => {
            this.startFaceDetection();
          }, 1000);
        });
      });
    } catch (error) {
      console.error("Camera error:", error);
      this.updateStatus("Error accessing camera: " + error.message, "error");
    }
  }

  // Add this new method to properly size the canvas
  updateCanvasSize() {
    // Get the actual displayed size of the video element
    const videoRect = this.video.getBoundingClientRect();
    const videoDisplayWidth = this.video.offsetWidth;
    const videoDisplayHeight = this.video.offsetHeight;

    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.canvas.style.width = this.video.style.width = "640px";
    this.canvas.style.height = this.video.style.height = "480px";

    console.log("Video display size:", videoDisplayWidth, videoDisplayHeight);
    console.log(
      "Video actual size:",
      this.video.videoWidth,
      this.video.videoHeight
    );
    console.log("Canvas size:", this.canvas.width, this.canvas.height);
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // Clear the debug interval
    if (this.debugInterval) {
      clearInterval(this.debugInterval);
      this.debugInterval = null;
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
    console.log("Starting face detection...");

    // Add debugging interval that runs every 5 seconds
    this.debugInterval = setInterval(() => {
      this.logCoordinateDebugInfo();
    }, 5000);

    const detectFaces = async () => {
      if (!this.isDetecting || this.video.paused || this.video.ended) {
        console.log("Detection stopped");
        if (this.debugInterval) {
          clearInterval(this.debugInterval);
        }
        return;
      }

      try {
        // Use TinyFaceDetector consistently
        const detections = await faceapi
          .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withFaceExpressions();

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (detections.length > 0) {
          // Calculate scaling factors between video source and display
          const videoDisplayWidth = this.video.offsetWidth;
          const videoDisplayHeight = this.video.offsetHeight;
          const scaleX = videoDisplayWidth / this.video.videoWidth;
          const scaleY = videoDisplayHeight / this.video.videoHeight;

          // Process each detected face
          for (let i = 0; i < detections.length; i++) {
            const detection = detections[i];

            // Scale the detection box to match canvas size
            const box = {
              x: detection.detection.box.x * scaleX,
              y: detection.detection.box.y * scaleY,
              width: detection.detection.box.width * scaleX,
              height: detection.detection.box.height * scaleY,
            };

            // Log detailed positioning info for first detection only
            if (i === 0) {
              console.log("=== DETECTION COORDINATES DEBUG ===");
              console.log("Original detection box:", detection.detection.box);
              console.log("Scaled box for canvas:", box);
              console.log(
                "Canvas dimensions:",
                this.canvas.width,
                this.canvas.height
              );
              console.log(
                "Video display dimensions:",
                videoDisplayWidth,
                videoDisplayHeight
              );
              console.log(
                "Video actual dimensions:",
                this.video.videoWidth,
                this.video.videoHeight
              );
              console.log("Scale factors:", { scaleX, scaleY });

              // Get video element position on page
              const videoRect = this.video.getBoundingClientRect();
              const canvasRect = this.canvas.getBoundingClientRect();
              console.log("Video getBoundingClientRect:", videoRect);
              console.log("Canvas getBoundingClientRect:", canvasRect);
              console.log("Video offset:", {
                left: this.video.offsetLeft,
                top: this.video.offsetTop,
                width: this.video.offsetWidth,
                height: this.video.offsetHeight,
              });
              console.log("Canvas offset:", {
                left: this.canvas.offsetLeft,
                top: this.canvas.offsetTop,
                width: this.canvas.offsetWidth,
                height: this.canvas.offsetHeight,
              });
              console.log("=====================================");
            }

            // Draw a rectangle around the face for debugging
            this.ctx.strokeStyle = "#00FF00";
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw center point for debugging
            this.ctx.fillStyle = "#FF0000";
            this.ctx.fillRect(
              box.x + box.width / 2 - 2,
              box.y + box.height / 2 - 2,
              4,
              4
            );

            // Check if this face matches any saved face
            const matchedFace = this.findMatchingFace(detection.descriptor);

            if (matchedFace) {
              // Update matched face with current emotions
              matchedFace.emotions = detection.expressions;
              matchedFace.lastDetection = new Date().toISOString();

              // Draw the name label
              this.drawNameLabel(box, matchedFace.name, true);

              // Draw main emotion
              const { emotion, value } = this.getMainEmotion(
                detection.expressions
              );
              if (emotion) {
                this.drawEmotionLabel(
                  box,
                  `${emotion} (${(value * 100).toFixed(0)}%)`
                );
              }

              // Check emotion thresholds if emotion detection is active
              if (this.emotionDetectionActive) {
                this.checkEmotionThresholds(matchedFace);
              }
            } else {
              // Unknown face
              this.drawNameLabel(box, "Unknown", false);
            }
          }

          // Update the faces list to show current emotions
          this.updateFacesList();
        }
      } catch (error) {
        console.error("Detection error:", error);
      }

      // Continue detection loop
      requestAnimationFrame(detectFaces);
    };

    detectFaces();
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
    this.ctx.textBaseline = "top";
    // Draw background for readability
    const textWidth = this.ctx.measureText(text).width;
    const labelX = x + width / 2 - textWidth / 2;
    const labelY = Math.max(y - 24, 0); // Prevent going above canvas
    this.ctx.fillStyle = "rgba(0,0,0,0.7)";
    this.ctx.fillRect(labelX - 4, labelY - 2, textWidth + 8, 22);
    this.ctx.fillStyle = "#ffeb3b";
    this.ctx.fillText(text, labelX, labelY);
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
    // this.showFacesGallery(faceFiles);
  }

  // Show loaded faces in a gallery
  // showFacesGallery(faceFiles) {
  //   const gallery = document.getElementById("facesGallery");
  //   gallery.innerHTML = "<h3>Loaded Faces from Folder</h3>";
  //   faceFiles.forEach((file) => {
  //     const img = document.createElement("img");
  //     img.src = `faces/${file}`;
  //     img.style.width = "100px";
  //     img.style.margin = "5px";
  //     gallery.appendChild(img);
  //   });
  // }

  findMatchingFace(descriptor) {
    let bestMatch = null;
    let minDistance = Infinity;

    for (const savedFace of this.savedFaces) {
      const savedDescriptor = new Float32Array(savedFace.descriptor);
      const distance = faceapi.euclideanDistance(savedDescriptor, descriptor);

      if (distance < minDistance && distance < 0.6) {
        minDistance = distance;
        bestMatch = savedFace;
      }
    }

    return bestMatch;
  }

  async saveFace() {
    if (!this.faceNameInput.value.trim()) {
      this.showAlert("Please enter a name for the face");
      return;
    }

    try {
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

      // Create image data from current video frame
      const canvas = document.createElement("canvas");
      canvas.width = this.video.videoWidth;
      canvas.height = this.video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);

      const faceData = {
        name: faceName,
        descriptor: Array.from(detections[0].descriptor),
        timestamp: new Date().toISOString(),
        emotions: null,
        imageData: canvas.toDataURL("image/png"),
      };

      this.savedFaces.push(faceData);
      this.updateFacesList();
      this.updateSavedFaceSelect();
      this.faceNameInput.value = "";
      this.updateStatus(
        `Face "${faceData.name}" saved successfully!`,
        "success"
      );
    } catch (error) {
      console.error("Error saving face:", error);
      this.showAlert("Error saving face: " + error.message);
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
    if (!emotions) return;

    Object.keys(thresholds).forEach((emotion) => {
      if (emotions[emotion] && emotions[emotion] >= thresholds[emotion]) {
        this.showAlert(
          `${
            faceData.name
          }: ${emotion.toUpperCase()} emotion detected above threshold (${(
            emotions[emotion] * 100
          ).toFixed(1)}%)`
        );
      }
    });
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

  // Add comprehensive debug logging method
  logCoordinateDebugInfo() {
    console.log("\n=== PERIODIC COORDINATE DEBUG (every 5s) ===");
    console.log("Current time:", new Date().toLocaleTimeString());

    // Video element info
    const videoRect = this.video.getBoundingClientRect();
    console.log("Video element info:");
    console.log("  - getBoundingClientRect:", videoRect);
    console.log(
      "  - offsetWidth/Height:",
      this.video.offsetWidth,
      this.video.offsetHeight
    );
    console.log(
      "  - clientWidth/Height:",
      this.video.clientWidth,
      this.video.clientHeight
    );
    console.log(
      "  - videoWidth/Height:",
      this.video.videoWidth,
      this.video.videoHeight
    );
    console.log(
      "  - style.width/height:",
      this.video.style.width,
      this.video.style.height
    );

    // Canvas element info
    const canvasRect = this.canvas.getBoundingClientRect();
    console.log("Canvas element info:");
    console.log("  - getBoundingClientRect:", canvasRect);
    console.log(
      "  - canvas.width/height:",
      this.canvas.width,
      this.canvas.height
    );
    console.log(
      "  - offsetWidth/Height:",
      this.canvas.offsetWidth,
      this.canvas.offsetHeight
    );
    console.log(
      "  - style.width/height:",
      this.canvas.style.width,
      this.canvas.style.height
    );

    // Container info
    const container = document.querySelector(".video-container");
    if (container) {
      const containerRect = container.getBoundingClientRect();
      console.log("Container element info:");
      console.log("  - getBoundingClientRect:", containerRect);
      console.log(
        "  - offsetWidth/Height:",
        container.offsetWidth,
        container.offsetHeight
      );
    }

    // Calculate positioning differences
    const xOffset = canvasRect.left - videoRect.left;
    const yOffset = canvasRect.top - videoRect.top;
    const widthDiff = canvasRect.width - videoRect.width;
    const heightDiff = canvasRect.height - videoRect.height;

    console.log("Position differences:");
    console.log("  - X offset (canvas - video):", xOffset);
    console.log("  - Y offset (canvas - video):", yOffset);
    console.log("  - Width difference:", widthDiff);
    console.log("  - Height difference:", heightDiff);

    // Scale factors
    if (this.video.videoWidth && this.video.videoHeight) {
      const scaleX = this.video.offsetWidth / this.video.videoWidth;
      const scaleY = this.video.offsetHeight / this.video.videoHeight;
      console.log("Current scale factors:");
      console.log("  - scaleX:", scaleX);
      console.log("  - scaleY:", scaleY);
    }

    console.log("=== END PERIODIC DEBUG ===\n");
  }
}

// Initialize the app
const app = new FaceEmotionApp();
