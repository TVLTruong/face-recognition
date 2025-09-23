from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from insightface.app import FaceAnalysis
from scipy.spatial.distance import cosine
from concurrent.futures import ThreadPoolExecutor
import logging
logging.basicConfig(level=logging.INFO)
from fastapi.responses import StreamingResponse
import cv2

app = FastAPI()

# CORS cho frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Chỉ định cụ thể origin trong production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GPU nếu có
# face_analyzer = FaceAnalysis(providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
face_analyzer = FaceAnalysis(providers=['CUDAExecutionProvider'], download=True)
face_analyzer.prepare(ctx_id=0, det_size=(640, 640))

# Load embeddings và tên
USER_EMBEDDINGS = np.load('models/face_vectors.npy', allow_pickle=True)
USER_NAMES = ["Truong", "Vinh"]

def recognize_faces(faces):
    result = []
    for face in faces:
        bbox = face.bbox.astype(int).tolist()
        embedding = face.embedding
        cosine_scores = [1 - cosine(embedding, vec) for vec in USER_EMBEDDINGS]
        max_score_idx = np.argmax(cosine_scores)
        max_score = cosine_scores[max_score_idx]
        result.append({
            "name": USER_NAMES[max_score_idx] if max_score > 0.4 else "Unknown",
            "bbox": bbox,
            "confidence": float(max_score),
            "cosine_scores": [float(s) for s in cosine_scores]
        })
    return result

@app.get("/")
def read_root():
    return {"message": "Hệ thống nhận diện khuôn mặt đang hoạt động"}

def gen_frames():  
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Không mở được webcam")

    while True:
        success, frame = cap.read()
        if not success:
            break

        # Resize (optional)
        frame = cv2.resize(frame, (640, 480))

        # Detect faces
        faces = face_analyzer.get(frame)
        results = recognize_faces(faces)

        # Vẽ bounding box và tên
        for res in results:
            bbox = res['bbox']
            name = res['name']
            cv2.rectangle(frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
            cv2.putText(frame, name, (bbox[0], bbox[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()

        # MJPEG stream
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()

@app.get("/video-feed")
def video_feed():
    return StreamingResponse(gen_frames(), media_type='multipart/x-mixed-replace; boundary=frame')


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

