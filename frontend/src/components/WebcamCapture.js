import React, { useRef, useState, useCallback } from 'react';
import axios from 'axios';
import './WebcamCapture.css';

const WebcamCapture = ({ onCapture, onDetectionResults, onError, onLoading }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  // Bắt đầu sử dụng webcam
  const startWebcam = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1200 },
          height: { ideal: 800 },
          facingMode: "user"
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsWebcamActive(true);
      }
    } catch (err) {
      onError("Không thể kết nối với webcam: " + err.message);
    }
  }, [onError]);

  // Dừng webcam
  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsWebcamActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  // Chụp ảnh từ webcam
  const captureImage = useCallback(() => {
    if (!isWebcamActive) {
      onError("Webcam chưa được bật");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Vẽ hình ảnh từ video lên canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Chuyển canvas thành data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      onCapture(imageDataUrl);
      
      // Gửi ảnh đến backend để phân tích
      sendImageToBackend(canvas);
    }
  }, [isWebcamActive, onCapture, onError, onLoading, onDetectionResults]);

  // Gửi ảnh đến backend
  const sendImageToBackend = async (canvas) => {
    try {
      onLoading(true);

      // Chuyển canvas thành blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      // Gửi request đến API
      const response = await axios.post('http://localhost:8000/detect-face-realtime', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      onDetectionResults(response.data);
    } catch (error) {
      console.error('Error sending image to backend:', error);
      onError(error.response?.data?.detail || "Lỗi khi gửi ảnh đến server");
      onLoading(false);
    }
  };

  // Xử lý khi component được mount/unmount
  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="webcam-container">
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={isWebcamActive ? "active" : ""}
          onLoadedMetadata={() => {
            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className="controls">
        {!isWebcamActive ? (
          <button className="webcam-button start" onClick={startWebcam}>
            Bật Webcam
          </button>
        ) : (
          <>
            <button className="webcam-button capture" onClick={captureImage}>
              Chụp ảnh
            </button>
            <button className="webcam-button stop" onClick={stopWebcam}>
              Tắt Webcam
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;