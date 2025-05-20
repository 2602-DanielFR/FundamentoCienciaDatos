const video = document.getElementById('video');

// Carga de modelos necesarios
Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models'),
  faceapi.nets.ageGenderNet.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(startVideo);

function GetDevice(){
  navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {
    console.log(devices)
  })
  .catch(function(err) {
    console.log(err.name + ": " + err.message);
  });
}

// Inicia la transmisión de video
function startVideo() {
  GetDevice();
  navigator.mediaDevices.getUserMedia({ video: { deviceId: "d07a10347a6477b8515a5f744a787202e181ee6bf52b244416738611a813859d"} })
    .then(stream => {
      video.srcObject = stream;
      console.log('funciona')
    })
    .catch(err => console.error('Error al acceder a la cámara:', err));
}

// Función para traducir las expresiones al español
function translateExpression(expression) {
  const translations = {
    neutral: "Neutral",
    happy: "Feliz",
    sad: "Triste",
    angry: "Enojado",
    fearful: "Temeroso",
    disgusted: "Disgustado",
    surprised: "Sorprendido"
  };
  return translations[expression] || expression;
}

// Función para traducir el género al español
function translateGender(gender) {
  const genderTranslations = {
    male: "Masculino",
    female: "Femenino"
  };
  return genderTranslations[gender] || "Indefinido";
}

// Carga de imágenes de referencia y creación de descriptores faciales
async function loadLabeledImages() {
  const labels = ['Jorge','Lusdith','Alexis','Daniel','Jhon','Kennet']; // Agrega más nombres si tienes más personas
  return Promise.all(
    labels.map(async label => {
      const imgUrl = `/images/${label}.jpg`; // Asegúrate de tener imágenes etiquetadas en esta carpeta
      const img = await faceapi.fetchImage(imgUrl);
      const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      return new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
    })
  );
}

let labeledFaceDescriptors;
let faceMatcher;

// Inicializa la detección facial y los descriptores etiquetados
video.addEventListener('play', async () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  labeledFaceDescriptors = await loadLabeledImages();
  faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

    // Dibuja las expresiones faciales, edad, género y nombre con traducción al español
    resizedDetections.forEach(detection => {
      const { age, gender, expressions, descriptor } = detection;
      const maxExpression = Object.entries(expressions).reduce((a, b) => a[1] > b[1] ? a : b)[0];
      const translatedExpression = translateExpression(maxExpression);
      const translatedGender = translateGender(gender);
      const bestMatch = faceMatcher.findBestMatch(descriptor);
      const name = bestMatch.label === 'unknown' ? 'Desconocido' : bestMatch.label;
      const textAnchor = detection.detection.box.bottomRight;
      const drawBox = new faceapi.draw.DrawTextField(
        [
          `Nombre: ${name}`,
          `Edad: ${Math.round(age)}`,
          `Género: ${translatedGender}`,
          `Estado Emocional : ${translatedExpression}`
        ],
        textAnchor
      );
      drawBox.draw(canvas);
    });
  }, 100);
});