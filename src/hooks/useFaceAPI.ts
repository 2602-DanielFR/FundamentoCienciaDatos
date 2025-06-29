import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { SavedFace, EmotionThresholds, DetectionBox } from '../types';

export const useFaceAPI = () => {
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);
    const [isDetecting, setIsDetecting] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState({ message: 'Loading Face-API models...', type: 'loading' as const });

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const detectionIntervalRef = useRef<number | null>(null);

    const loadModels = useCallback(async () => {
        try {
            setStatus({ message: 'Loading TinyFaceDetector model...', type: 'loading' });
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');

            setStatus({ message: 'Loading FaceLandmark model...', type: 'loading' });
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');

            setStatus({ message: 'Loading FaceRecognition model...', type: 'loading' });
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

            setStatus({ message: 'Loading FaceExpression model...', type: 'loading' });
            await faceapi.nets.faceExpressionNet.loadFromUri('/models');

            setIsModelLoaded(true);
            setStatus({ message: 'Models loaded successfully! Starting camera...', type: 'success' });

            await loadSavedFaces();

            // Auto start camera after 1 second
            setTimeout(() => {
                startCamera();
            }, 1000);

        } catch (error) {
            console.error('Error loading models:', error);
            setStatus({ message: `Error loading models: ${error}`, type: 'error' });
        }
    }, []);

    const loadSavedFaces = useCallback(async () => {
        try {
            const response = await fetch('/faces/faces.json');
            const data = await response.json();
            const faceFiles = data.faces;

            console.log(`Loading ${faceFiles.length} face files...`);
            const loadedFaces: SavedFace[] = [];

            for (const file of faceFiles) {
                try {
                    const img = await faceapi.fetchImage(`/faces/${file}`);
                    const detection = await faceapi
                        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (detection) {
                        loadedFaces.push({
                            name: file.replace(/\.[^/.]+$/, ''),
                            descriptor: Array.from(detection.descriptor),
                            timestamp: new Date().toISOString(),
                            emotions: null,
                            imageData: img.src,
                        });
                        console.log(`Face loaded: ${file}`);
                    } else {
                        console.warn(`No face detected in ${file}`);
                    }
                } catch (error) {
                    console.error(`Error loading ${file}:`, error);
                }
            }

            setSavedFaces(loadedFaces);
            console.log(`Total faces loaded: ${loadedFaces.length}`);

        } catch (error) {
            console.error('Error loading faces.json:', error);
        }
    }, []);

    const startCamera = useCallback(async () => {
        if (!isModelLoaded) {
            alert('Models not loaded yet. Please wait.');
            return;
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
            });

            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;

                videoRef.current.addEventListener('playing', () => {
                    updateCanvasSize();
                    setStatus({
                        message: 'Camera started. Position face in view to detect emotions.',
                        type: 'success'
                    });

                    setTimeout(() => {
                        startFaceDetection();
                    }, 1000);
                });
            }
        } catch (error) {
            console.error('Camera error:', error);
            setStatus({ message: `Error accessing camera: ${error}`, type: 'error' });
        }
    }, [isModelLoaded]);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        setIsDetecting(false);
        setStatus({ message: 'Camera stopped.', type: 'success' });
    }, [stream]);

    const updateCanvasSize = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            canvasRef.current.style.width = '640px';
            canvasRef.current.style.height = '480px';
        }
    }, []);

    const startFaceDetection = useCallback(() => {
        setIsDetecting(true);
        console.log('Starting face detection...');

        const detectFaces = async () => {
            if (!isDetecting || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
                return;
            }

            try {
                const detections = await faceapi
                    .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptors()
                    .withFaceExpressions();

                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                        if (detections.length > 0) {
                            const videoDisplayWidth = videoRef.current.offsetWidth;
                            const videoDisplayHeight = videoRef.current.offsetHeight;
                            const scaleX = videoDisplayWidth / videoRef.current.videoWidth;
                            const scaleY = videoDisplayHeight / videoRef.current.videoHeight;

                            detections.forEach(detection => {
                                const box: DetectionBox = {
                                    x: detection.detection.box.x * scaleX,
                                    y: detection.detection.box.y * scaleY,
                                    width: detection.detection.box.width * scaleX,
                                    height: detection.detection.box.height * scaleY,
                                };

                                // Draw face rectangle
                                ctx.strokeStyle = '#00FF00';
                                ctx.lineWidth = 3;
                                ctx.strokeRect(box.x, box.y, box.width, box.height);

                                // Find matching face
                                const matchedFace = findMatchingFace(detection.descriptor);

                                if (matchedFace) {
                                    // Update emotions
                                    setSavedFaces(prev => prev.map(face =>
                                        face.name === matchedFace.name
                                            ? { ...face, emotions: detection.expressions, lastDetection: new Date().toISOString() }
                                            : face
                                    ));

                                    drawNameLabel(ctx, box, matchedFace.name, true);

                                    const { emotion, value } = getMainEmotion(detection.expressions);
                                    if (emotion) {
                                        drawEmotionLabel(ctx, box, `${emotion} (${(value * 100).toFixed(0)}%)`);
                                    }
                                } else {
                                    drawNameLabel(ctx, box, 'Unknown', false);
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Detection error:', error);
            }

            requestAnimationFrame(detectFaces);
        };

        detectFaces();
    }, [isDetecting, savedFaces]);

    const findMatchingFace = useCallback((descriptor: Float32Array) => {
        let bestMatch = null;
        let minDistance = Infinity;

        for (const savedFace of savedFaces) {
            const savedDescriptor = new Float32Array(savedFace.descriptor);
            const distance = faceapi.euclideanDistance(savedDescriptor, descriptor);

            if (distance < minDistance && distance < 0.6) {
                minDistance = distance;
                bestMatch = savedFace;
            }
        }

        return bestMatch;
    }, [savedFaces]);

    const getMainEmotion = (expressions: any) => {
        let maxEmotion = null;
        let maxValue = -Infinity;

        for (const [emotion, value] of Object.entries(expressions)) {
            if (typeof value === 'number' && value > maxValue) {
                maxValue = value;
                maxEmotion = emotion;
            }
        }

        return { emotion: maxEmotion, value: maxValue };
    };

    const drawNameLabel = (ctx: CanvasRenderingContext2D, box: DetectionBox, name: string, isRegistered: boolean) => {
        const { x, y } = box;

        ctx.fillStyle = isRegistered ? '#4CAF50' : '#FF9800';
        ctx.font = '16px Arial';

        const textMetrics = ctx.measureText(name);
        const textWidth = textMetrics.width;
        const textHeight = 20;

        ctx.fillRect(x, y - textHeight - 5, textWidth + 10, textHeight + 5);
        ctx.fillStyle = 'white';
        ctx.fillText(name, x + 5, y - 8);
    };

    const drawEmotionLabel = (ctx: CanvasRenderingContext2D, box: DetectionBox, text: string) => {
        const { x, y, width } = box;

        ctx.font = 'bold 16px Arial';
        ctx.textBaseline = 'top';

        const textWidth = ctx.measureText(text).width;
        const labelX = x + width / 2 - textWidth / 2;
        const labelY = Math.max(y - 24, 0);

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(labelX - 4, labelY - 2, textWidth + 8, 22);
        ctx.fillStyle = '#ffeb3b';
        ctx.fillText(text, labelX, labelY);
    };

    useEffect(() => {
        loadModels();

        return () => {
            stopCamera();
        };
    }, []);

    return {
        videoRef,
        canvasRef,
        isModelLoaded,
        savedFaces,
        setSavedFaces,
        isDetecting,
        stream,
        status,
        startCamera,
        stopCamera,
    };
};