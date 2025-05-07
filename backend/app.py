# from fastapi import FastAPI, File, UploadFile, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import JSONResponse
# import numpy as np
# import cv2
# import insightface
# from insightface.app import FaceAnalysis
# from scipy.spatial.distance import cosine
# import base64
# from io import BytesIO
# from PIL import Image
# import os

# app = FastAPI()

# # Cấu hình CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # Trong môi trường production nên chỉ định cụ thể origin
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Khởi tạo Face Analysis
# face_analyzer = FaceAnalysis(providers=['CPUExecutionProvider'])
# face_analyzer.prepare(ctx_id=0, det_size=(640, 640))

# # Load embeddings từ file npy có sẵn
# USER_EMBEDDINGS = np.load('models/face_vectors.npy', allow_pickle=True)
# USER_NAMES = ["Trường", "Vinh"]  # Tên tương ứng với 2 vector trong file npy

# @app.get("/")
# def read_root():
#     return {"message": "Hệ thống nhận diện khuôn mặt đang hoạt động"}

# @app.post("/detect-face")
# async def detect_face(file: UploadFile = File(...)):
#     try:
#         # Đọc và xử lý hình ảnh
#         contents = await file.read()
#         nparr = np.frombuffer(contents, np.uint8)
#         img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
#         if img is None:
#             raise HTTPException(status_code=400, detail="Không thể đọc hình ảnh")
        
#         # Phát hiện khuôn mặt
#         faces = face_analyzer.get(img)
        
#         if not faces:
#             return {"faces": []}
        
#         result = []
        
#         for face in faces:
#             # Lấy bounding box và landmarks
#             bbox = face.bbox.astype(int).tolist()
#             embedding = face.embedding
            
#             # Tính độ tương đồng cosine với các vector có sẵn
#             cosine_scores = [1 - cosine(embedding, USER_EMBEDDINGS[i]) for i in range(len(USER_EMBEDDINGS))]
            
#             # Xác định người dùng dựa trên độ tương đồng
#             max_score_idx = np.argmax(cosine_scores)
#             max_score = cosine_scores[max_score_idx]
            
#             recognition_result = {
#                 "name": USER_NAMES[max_score_idx] if max_score > 0.5 else "Không xác định",
#                 "bbox": bbox,
#                 "confidence": float(max_score),
#                 "cosine_scores": [float(score) for score in cosine_scores]
#             }
            
#             result.append(recognition_result)
            
#         return {"faces": result}
        
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Lỗi xử lý: {str(e)}")

# @app.post("/detect-face-realtime")
# async def detect_face_realtime(file: UploadFile = File(...)):
#     try:
#         # Đọc và xử lý hình ảnh
#         contents = await file.read()
#         nparr = np.frombuffer(contents, np.uint8)
#         img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
#         if img is None:
#             raise HTTPException(status_code=400, detail="Không thể đọc hình ảnh")
        
#         # Phát hiện khuôn mặt
#         faces = face_analyzer.get(img)
        
#         if not faces:
#             return {"faces": []}
        
#         result = []
        
#         for face in faces:
#             # Lấy bounding box và landmarks
#             bbox = face.bbox.astype(int).tolist()
#             embedding = face.embedding
            
#             # Tính độ tương đồng cosine với các vector có sẵn
#             cosine_scores = [1 - cosine(embedding, USER_EMBEDDINGS[i]) for i in range(len(USER_EMBEDDINGS))]
            
#             # Xác định người dùng dựa trên độ tương đồng
#             max_score_idx = np.argmax(cosine_scores)
#             max_score = cosine_scores[max_score_idx]
            
#             recognition_result = {
#                 "name": USER_NAMES[max_score_idx] if max_score > 0.5 else "Không xác định",
#                 "bbox": bbox,
#                 "confidence": float(max_score),
#                 "cosine_scores": [float(score) for score in cosine_scores]
#             }
            
#             result.append(recognition_result)
            
#         return {"faces": result}
        
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Lỗi xử lý: {str(e)}")

# if __name__ == "__main__":
#     import uvicorn
    
#     uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import cv2
import insightface
from insightface.app import FaceAnalysis
from scipy.spatial.distance import cosine
from concurrent.futures import ThreadPoolExecutor
import asyncio
import hashlib
import time
import os

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
face_analyzer = FaceAnalysis(providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
face_analyzer.prepare(ctx_id=0, det_size=(640, 640))

# Load embeddings và tên
USER_EMBEDDINGS = np.load('models/face_vectors.npy', allow_pickle=True)
USER_NAMES = ["Trường", "Vinh"]

# Thread executor để không block FastAPI event loop
executor = ThreadPoolExecutor()

# Bộ nhớ cache tạm thời để tránh xử lý ảnh giống nhau
last_img_hash = None
last_result = None

def hash_image(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()

def detect_faces_sync(img: np.ndarray):
    return face_analyzer.get(img)

def recognize_faces(faces):
    result = []
    for face in faces:
        bbox = face.bbox.astype(int).tolist()
        embedding = face.embedding
        cosine_scores = [1 - cosine(embedding, vec) for vec in USER_EMBEDDINGS]
        max_score_idx = np.argmax(cosine_scores)
        max_score = cosine_scores[max_score_idx]
        result.append({
            "name": USER_NAMES[max_score_idx] if max_score > 0.5 else "Không xác định",
            "bbox": bbox,
            "confidence": float(max_score),
            "cosine_scores": [float(s) for s in cosine_scores]
        })
    return result

@app.get("/")
def read_root():
    return {"message": "Hệ thống nhận diện khuôn mặt đang hoạt động"}

@app.post("/detect-face-realtime")
async def detect_face_realtime(file: UploadFile = File(...)):
    global last_img_hash, last_result

    try:
        start_time = time.time()
        contents = await file.read()
        img_hash = hash_image(contents)

        if img_hash == last_img_hash and last_result is not None:
            return last_result

        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Không thể đọc hình ảnh")

        # Gọi xử lý khuôn mặt ở thread pool
        faces = await asyncio.get_event_loop().run_in_executor(executor, detect_faces_sync, img)
        results = recognize_faces(faces)

        response = {
            "faces": results,
            "num_faces": len(results),
            "processing_time": round(time.time() - start_time, 3)
        }

        # Cache ảnh và kết quả cuối
        last_img_hash = img_hash
        last_result = response
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
