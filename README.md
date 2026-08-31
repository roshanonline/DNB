# 🎓 Digital Notice Board and Alert Management System (DNB)

An intelligent, real-time college notice management system built with **Django + React**.  
It includes machine learning-based prioritization, semantic search, personalized recommendations, and real-time notifications.

---

## 🚀 Features

- Role-based login (Admin / Department / Student)
- Real-time notifications using WebSockets
- Notice management with attachments
- Smart dashboard with analytics
- Semantic search using NLP
- Personalized recommendations
- Deadline risk prediction
- Email reminders system
- Responsive UI with modern design

---

## 🛠 Tech Stack

**Frontend**
- React (Vite)
- Tailwind CSS
- Framer Motion

**Backend**
- Django
- Django REST Framework
- SQLite

**Machine Learning**
- LightGBM
- DistilBERT (Transformers)
- Scikit-learn

---

## ⚙️ Setup Instructions

### Backend
```bash
cd backend
python manage.py runserver

Set-Location 'C:\Users\kirthick Roshan S\OneDrive\Documents\DNB\backend'; & 'C:\Users\kirthick Roshan S\AppData\Local\Programs\Python\Python311\python.exe' manage.py runserver 0.0.0.0:8000python manage.py runserver


 cmd /d /c "cd /d C:\Users\kirthick Roshan S\OneDrive\Documents\DNB\frontend && set PATH=C:\Program Files\nodejs;%PATH%&& npm run dev -- --host 0.0.0.0 --port 3000"