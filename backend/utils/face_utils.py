import numpy as np
import cv2
from scipy.spatial.distance import cosine

def preprocess_image(img):
    """
    Tiền xử lý hình ảnh trước khi phát hiện khuôn mặt
    """
    # Chuyển sang grayscale nếu cần
    # gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Cân bằng histogram để cải thiện độ tương phản
    # gray = cv2.equalizeHist(gray)
    
    # Bạn có thể thêm các bước tiền xử lý khác tùy vào yêu cầu cụ thể
    
    return img

def compare_embeddings(embedding, reference_embeddings):
    """
    So sánh embedding của khuôn mặt với các embedding tham chiếu
    Trả về điểm tương đồng và chỉ số của embedding có độ tương đồng cao nhất
    """
    scores = []
    for ref_embedding in reference_embeddings:
        similarity = 1 - cosine(embedding, ref_embedding)
        scores.append(similarity)
    
    max_score_idx = np.argmax(scores)
    return scores, max_score_idx

def draw_face_box(image, bbox, name, confidence):
    """
    Vẽ bounding box và hiển thị tên, độ tin cậy lên hình ảnh
    """
    x1, y1, x2, y2 = bbox
    
    # Vẽ bounding box
    cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
    
    # Hiển thị tên và độ tin cậy
    label = f"{name} ({confidence:.2f})"
    cv2.putText(image, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    
    return image