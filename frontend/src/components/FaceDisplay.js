import React, { useEffect, useRef } from 'react';
import './FaceDisplay.css';

const FaceDisplay = ({ imageSrc, detectionResults, isLoading }) => {
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // Vẽ bounding box và thông tin nhận diện lên ảnh
  useEffect(() => {
    if (imageSrc && detectionResults && canvasRef.current && imageRef.current) {
      const image = imageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const drawBoxes = () => {
        // Đảm bảo hình ảnh đã được tải
        canvas.width = image.width;
        canvas.height = image.height;
        
        // Vẽ lại hình ảnh gốc
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        
        // Vẽ các bounding box và thông tin nhận diện
        detectionResults.faces.forEach((face) => {
          const [x1, y1, x2, y2] = face.bbox;
          const name = face.name;
          const confidence = face.confidence;
          // const cosineScores = face.cosine_scores;
          
          // Vẽ bounding box
          ctx.strokeStyle = confidence > 0.7 ? '#00ff00' : confidence > 0.5 ? '#ffff00' : '#ff0000';
          ctx.lineWidth = 3;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          
          // Hiển thị tên và độ tin cậy
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(x1, y1 - 40, x2 - x1, 40);
          
          ctx.font = '16px Arial';
          ctx.fillStyle = 'white';
          ctx.fillText(`${name}`, x1 + 5, y1 - 22);
          
          // Hiển thị các điểm cosine
          // let scoreText = cosineScores.map((score, idx) => `Người ${idx + 1}: ${score.toFixed(2)}`).join(', ');
          // ctx.font = '12px Arial';
          // ctx.fillText(scoreText, x1 + 5, y1 - 5);
        });
      };

      if (image.complete) {
        drawBoxes();
      } else {
        image.onload = drawBoxes;
      }
    }
  }, [imageSrc, detectionResults]);

  return (
    <div className="face-display">
      <div className="image-container">
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Captured"
          style={{ display: 'none' }}
        />
        <canvas ref={canvasRef} className="face-canvas" />
        
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Đang phân tích...</p>
          </div>
        )}
      </div>
      
      {detectionResults && (
        <div className="detection-info">
          <h3>Kết quả nhận diện</h3>
          {detectionResults.faces.length === 0 ? (
            <p>Không phát hiện khuôn mặt nào.</p>
          ) : (
            <ul>
              {detectionResults.faces.map((face, index) => (
                <li key={index}>
                  <strong>{face.name}</strong> - Cosine similarity: {(face.confidence * 100).toFixed(2)}%
                  {/* <div className="cosine-scores">
                    {face.cosine_scores.map((score, idx) => (
                      <div key={idx}>
                        Cosine với Người {idx + 1}: {score.toFixed(4)}
                      </div>
                    ))}
                  </div> */}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default FaceDisplay;