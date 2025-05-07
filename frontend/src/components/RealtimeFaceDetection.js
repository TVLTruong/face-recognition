import React, { useRef, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import './RealtimeFaceDetection.css';

// Hàm tính toán trung bình của hai điểm
const averagePoints = (p1, p2, weight = 0.7) => {
    return p1.map((val, i) => val * weight + p2[i] * (1 - weight));
};

// Hàm tính khoảng cách giữa hai bounding box
const calculateBoxDistance = (box1, box2) => {
    const center1 = [(box1[0] + box1[2]) / 2, (box1[1] + box1[3]) / 2];
    const center2 = [(box2[0] + box2[2]) / 2, (box2[1] + box2[3]) / 2];
    return Math.sqrt(
        Math.pow(center1[0] - center2[0], 2) +
        Math.pow(center1[1] - center2[1], 2)
    );
};

// Hàm tìm khuôn mặt tương ứng giữa hai frame
const findMatchingFace = (currentFace, previousFaces, maxDistance = 100) => {
    let bestMatch = null;
    let minDistance = maxDistance;

    for (const prevFace of previousFaces) {
        const distance = calculateBoxDistance(currentFace.bbox, prevFace.bbox);
        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = prevFace;
        }
    }

    return bestMatch;
};

const RealtimeFaceDetection = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [isWebcamActive, setIsWebcamActive] = useState(false);
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [apiErrorCount, setApiErrorCount] = useState(0); // Đếm số lỗi API
    const maxRetries = 3; // Số lần thử lại tối đa trước khi hiển thị lỗi
    
    // Thêm trạng thái để cấu hình API
    const [apiConfig, setApiConfig] = useState({
        url: process.env.REACT_APP_API_URL || 'http://localhost:8000',
        endpoint: '/detect-face-realtime'
    });

    // Thêm refs để lưu trữ kết quả nhận diện
    const previousFacesRef = useRef([]);
    const lastUpdateTimeRef = useRef(0);
    const smoothingFactor = 0.8; // Hệ số làm mượt
    const maxBoxDistance = 100; // Khoảng cách tối đa giữa các bounding box
    const faceHistoryRef = useRef(new Map()); // Lưu lịch sử các khuôn mặt

    // Cấu hình timeout và timeout cho API request
    const apiTimeout = 10000; // 10 giây timeout
    const apiRetryDelay = 1000; // Delay 1 giây trước khi thử lại

    const startWebcam = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setIsWebcamActive(true);
                setError(null);
                setApiErrorCount(0); // Reset bộ đếm lỗi
                faceHistoryRef.current.clear(); // Xóa lịch sử khi bắt đầu mới
            }
        } catch (err) {
            setError("Không thể kết nối với webcam: " + err.message);
        }
    }, []);

    const stopWebcam = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsWebcamActive(false);
            if (videoRef.current) videoRef.current.srcObject = null;
            faceHistoryRef.current.clear(); // Xóa lịch sử khi dừng
        }
    }, [stream]);

    const drawResults = useCallback((results) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video || !results) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Kiểm tra kết quả có cấu trúc đúng không
        if (!results.faces || !Array.isArray(results.faces)) {
            console.warn("Kết quả không hợp lệ:", results);
            return;
        }

        const currentFaces = results.faces;
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

        // Xử lý kết quả nhận diện
        if (previousFacesRef.current.length > 0 && timeSinceLastUpdate < 500) {
            // Tìm và cập nhật các khuôn mặt tương ứng
            currentFaces.forEach(currentFace => {
                // Kiểm tra cấu trúc của face
                if (!currentFace.bbox || !Array.isArray(currentFace.bbox) || currentFace.bbox.length !== 4) {
                    console.warn("Khuôn mặt không hợp lệ:", currentFace);
                    return;
                }

                const matchingFace = findMatchingFace(currentFace, previousFacesRef.current);

                if (matchingFace) {
                    // Làm mượt vị trí và độ tin cậy
                    currentFace.bbox = averagePoints(matchingFace.bbox, currentFace.bbox, smoothingFactor);
                    currentFace.confidence = matchingFace.confidence * smoothingFactor +
                        currentFace.confidence * (1 - smoothingFactor);

                    // Cập nhật lịch sử khuôn mặt
                    const faceId = `${currentFace.name || 'unknown'}_${matchingFace.bbox.join('_')}`;
                    faceHistoryRef.current.set(faceId, {
                        ...currentFace,
                        lastSeen: now,
                        history: faceHistoryRef.current.get(faceId)?.history || []
                    });
                }
            });

            // Giữ lại các khuôn mặt đã biết nếu không có kết quả mới
            const knownFaces = Array.from(faceHistoryRef.current.values())
                .filter(face => now - face.lastSeen < 1000); // Giữ kết quả trong 1 giây

            if (currentFaces.length === 0 && knownFaces.length > 0) {
                currentFaces.push(...knownFaces);
            }
        }

        // Vẽ các bounding box
        currentFaces.forEach(face => {
            if (!face.bbox || face.bbox.length !== 4) return;

            const [x1, y1, x2, y2] = face.bbox;
            ctx.strokeStyle = face.confidence > 0.7 ? '#00ff00' :
                face.confidence > 0.5 ? '#ffff00' : '#ff0000';
            ctx.lineWidth = 3;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x1, y1 - 40, x2 - x1, 40);
            ctx.font = '16px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText(`${face.name || 'Unknown'} (${((face.confidence || 0) * 100).toFixed(1)}%)`, x1 + 5, y1 - 22);
        });

        // Lưu kết quả hiện tại
        previousFacesRef.current = currentFaces;
        lastUpdateTimeRef.current = now;
        
        // Reset bộ đếm lỗi khi có kết quả thành công
        setApiErrorCount(0);
    }, []);

    const processFrame = useCallback(async () => {
        if (!isWebcamActive || isProcessing) return;
    
        // Kiểm tra cấu hình API
        if (!apiConfig.url || !apiConfig.endpoint) {
            setError("Vui lòng cấu hình URL và endpoint API");
            return;
        }
    
        setIsProcessing(true);
        const video = videoRef.current;
        const canvas = canvasRef.current;
    
        if (video && canvas) {
            const context = canvas.getContext('2d');
            canvas.width = 320;
            canvas.height = 240;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
            try {
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.5));
                const formData = new FormData();
                formData.append('file', blob, 'frame.jpg');
    
                // Sử dụng cấu hình API từ state
                const apiUrl = apiConfig.url.trim();
                const apiEndpoint = apiConfig.endpoint.trim();
                
                console.log(`Gửi request đến: ${apiUrl}${apiEndpoint}`);
                
                // Thêm timeout cho request API
                const response = await axios.post(`${apiUrl}${apiEndpoint}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: apiTimeout
                });
    
                // Kiểm tra cấu trúc response
                if (response.data && response.status === 200) {
                    drawResults(response.data);
                } else {
                    console.warn("Phản hồi API không hợp lệ:", response);
                    throw new Error("Phản hồi API không hợp lệ");
                }
            } catch (error) {
                console.error('Lỗi khi xử lý frame:', error);
                
                // Tăng bộ đếm lỗi
                const newErrorCount = apiErrorCount + 1;
                setApiErrorCount(newErrorCount);
                
                // Chỉ hiển thị lỗi nếu vượt quá số lần thử lại
                if (newErrorCount > maxRetries) {
                    let errorMessage = "Lỗi khi xử lý frame";
                    
                    if (error.code === 'ECONNABORTED') {
                        errorMessage = "Kết nối API bị timeout, vui lòng kiểm tra kết nối mạng hoặc máy chủ";
                    } else if (error.response) {
                        // Lỗi từ server
                        errorMessage = `Lỗi từ máy chủ (${error.response.status}): ${error.response.data?.detail || "Không có thông tin chi tiết"}`;
                    } else if (error.request) {
                        // Không nhận được phản hồi
                        errorMessage = "Không thể kết nối đến máy chủ, vui lòng kiểm tra kết nối mạng";
                    }
                    
                    setError(errorMessage);
                }
            } finally {
                setIsProcessing(false);
            }
        }
    }, [isWebcamActive, isProcessing, drawResults, apiErrorCount, maxRetries, apiConfig.url, apiConfig.endpoint]);

    useEffect(() => {
        let animationFrameId;
        let lastFrameTime = 0;
        const frameInterval = 300; // 300 ms ~ 3 FPS

        const loop = (timestamp) => {
            if (timestamp - lastFrameTime > frameInterval) {
                processFrame();
                lastFrameTime = timestamp;
            }
            animationFrameId = requestAnimationFrame(loop);
        };

        if (isWebcamActive) {
            animationFrameId = requestAnimationFrame(loop);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isWebcamActive, processFrame]);

    useEffect(() => {
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [stream]);

    return (
        <div className="realtime-detection">
            <div className="video-container">
                <video ref={videoRef} autoPlay playsInline muted className={isWebcamActive ? "active" : ""} />
                <canvas ref={canvasRef} className="detection-canvas" />
            </div>

            <div className="controls">
                {!isWebcamActive ? (
                    <button className="webcam-button start" onClick={startWebcam}>
                        Bật Webcam
                    </button>
                ) : (
                    <button className="webcam-button stop" onClick={stopWebcam}>
                        Tắt Webcam
                    </button>
                )}
            </div>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <div className="error-actions">
                        <button 
                            className="retry-button" 
                            onClick={() => {
                                setError(null);
                                setApiErrorCount(0);
                            }}
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            )}
            
            {/* <div className="api-config">
                <h3>Cấu hình API</h3>
                <div className="form-group">
                    <label>URL máy chủ:</label>
                    <input 
                        type="text" 
                        value={apiConfig.url} 
                        onChange={(e) => setApiConfig({...apiConfig, url: e.target.value})}
                        placeholder="http://localhost:8000"
                    />
                </div>
                <div className="form-group">
                    <label>Endpoint:</label>
                    <input 
                        type="text" 
                        value={apiConfig.endpoint} 
                        onChange={(e) => setApiConfig({...apiConfig, endpoint: e.target.value})}
                        placeholder="/api/face-detection"
                    />
                </div>
            </div> */}
        </div>
    );
};

export default RealtimeFaceDetection;