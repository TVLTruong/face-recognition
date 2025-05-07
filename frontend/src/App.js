import React, { useState } from 'react';
import './App.css';
import WebcamCapture from './components/WebcamCapture.js';
import FaceDisplay from './components/FaceDisplay';
import RealtimeFaceDetection from './components/RealtimeFaceDetection';

function App() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [detectionResults, setDetectionResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeMode, setActiveMode] = useState('capture'); // 'capture' hoặc 'realtime'

  // Xử lý khi có ảnh được chụp từ webcam
  const handleCapture = (imageSrc) => {
    setCapturedImage(imageSrc);
    setDetectionResults(null);
    setError(null);
  };

  // Xử lý khi nhận được kết quả nhận diện từ backend
  const handleDetectionResults = (results) => {
    setDetectionResults(results);
    setIsLoading(false);
  };

  // Xử lý lỗi
  const handleError = (errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  // Xử lý trạng thái loading
  const handleLoading = (loading) => {
    setIsLoading(loading);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hệ thống Nhận diện Khuôn mặt</h1>
        <div className="mode-switch">
          <button
            className={`mode-button ${activeMode === 'capture' ? 'active' : ''}`}
            onClick={() => setActiveMode('capture')}
          >
            Chế độ Chụp ảnh
          </button>
          <button
            className={`mode-button ${activeMode === 'realtime' ? 'active' : ''}`}
            onClick={() => setActiveMode('realtime')}
          >
            Chế độ Thời gian thực
          </button>
        </div>
      </header>

      <main className="App-main">
        {activeMode === 'capture' ? (
          <>
            <div className="webcam-container">
              <WebcamCapture
                onCapture={handleCapture}
                onDetectionResults={handleDetectionResults}
                onError={handleError}
                onLoading={handleLoading}
              />
            </div>

            <div className="results-container">
              {capturedImage && (
                <FaceDisplay
                  imageSrc={capturedImage}
                  detectionResults={detectionResults}
                  isLoading={isLoading}
                />
              )}

              {error && (
                <div className="error-message">
                  <p>Lỗi: {error}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="realtime-container">
            <RealtimeFaceDetection />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;