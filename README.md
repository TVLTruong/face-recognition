# Face Recognition System

Hệ thống nhận diện khuôn mặt sử dụng React cho frontend và Python cho backend.

## Yêu cầu hệ thống

- Node.js (phiên bản 14.0.0 trở lên)
- Python 3.8 trở lên
- pip (Python package manager)

## Cài đặt

### Backend

1. Di chuyển vào thư mục backend:
```bash
cd backend
```

2. Tạo môi trường ảo Python (khuyến nghị):
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. Cài đặt các dependencies:
```bash
pip install -r requirements.txt
```

### Frontend

1. Di chuyển vào thư mục frontend:
```bash
cd frontend
```

2. Cài đặt các dependencies:
```bash
npm install
```

## Chạy ứng dụng

### Backend

1. Đảm bảo bạn đang ở trong thư mục backend và môi trường ảo đã được kích hoạt
2. Chạy server với Gunicorn:
```bash
unicorn app:app --host 0.0.0.0 --port 8000 --reload
```
Server sẽ chạy tại `http://localhost:8000`


### Frontend

1. Đảm bảo bạn đang ở trong thư mục frontend
2. Chạy ứng dụng React:
```bash
npm start
```
Ứng dụng sẽ chạy tại `http://localhost:3000`
