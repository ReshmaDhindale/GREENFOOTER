# GreenFooter - Carbon Footprint Calculator

GreenFooter is a comprehensive web application designed to help families track, analyze, and reduce their carbon footprint through personalized recommendations and data-driven insights.

## 🌱 Project Overview

GreenFooter empowers users to make environmentally conscious decisions by providing a user-friendly platform to monitor household carbon emissions across various categories. The application leverages machine learning to deliver customized recommendations based on user input and activity patterns.

## ✨ Features

### User Management
- **User Authentication**: Secure login and registration system
- **Family Profiles**: Create and manage profiles for family members
- **User Dashboard**: Personalized overview of carbon emissions and stats

### Carbon Footprint Calculation
- **Multi-category Assessment**: Track emissions across energy, transportation, water usage, waste, diet, and shopping
- **Real-time Estimation**: Immediate feedback as users input their data
- **ML-Powered Predictions**: Backend ML model for accurate carbon footprint calculations

### Visualization and Reporting
- **Interactive Reports**: Detailed emissions analytics with charts and graphs
- **Historical Comparisons**: Track progress over time with historical data
- **Category Breakdown**: Visualize emission sources to identify high-impact areas

### Recommendations
- **Personalized Tips**: Custom suggestions based on user behavior and emission patterns
- **Impact Estimation**: Quantified potential impact of implementing recommendations
- **Achievement Tracking**: Monitor progress towards carbon reduction goals

### Gamification
- **Leaderboard**: Compare performance with other families
- **Carbon Offset**: Virtual tree planting and carbon credit system
- **Challenges**: Complete eco-friendly challenges to earn rewards

## 🔧 Technologies Used

### Frontend
- HTML5, CSS3, JavaScript
- Chart.js for data visualization
- Local Storage for client-side data persistence

### Backend
- FastAPI for RESTful API endpoints
- Python for backend logic and ML model integration
- SQLite/PostgreSQL for database management

### Machine Learning
- Scikit-learn for predictive modeling
- Pandas for data preprocessing

## 📋 Project Structure

```
/GREENFOOTER
│
├── index.html            # Main dashboard and landing page
├── members.html          # Family member management page
├── report.html           # Analytics and reporting page
├── leaderboard.html      # Community comparison page
├── offset.html           # Carbon offset initiatives page
├── profile.html          # User profile management page
├── style.css             # Global styles
├── script.js             # Common JavaScript functionality
│
├── /backend              # Backend API code
│   ├── api.py            # API endpoints
│   └── database.py       # Database models
│
└── /Model                # Machine learning model
    ├── main.py           # FastAPI application
    ├── model.pkl         # Trained ML model
    └── preprocessor.py   # Data preprocessing utilities
```

## 🚀 Setup Instructions

### Prerequisites
- Python 3.8+ for running the backend and ML model
- Modern web browser for the frontend
- Node.js and npm (optional, for development tools)

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/greenfooter.git
cd greenfooter
```

2. Set up the backend environment:
```
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up the ML model:
```
cd ../Model
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Start the backend server:
```
cd ../backend
python api.py
```

5. Start the ML model API:
```
cd ../Model
uvicorn main:app --reload
```

6. Open the frontend in your browser:
- Simply open the `index.html` file in your browser, or
- Use a local development server like Live Server in VS Code

## 📝 Usage Guide

### Getting Started
1. Create an account or log in
2. Add family members to your household
3. Complete the carbon footprint assessment on the dashboard
4. View your personalized carbon footprint report
5. Implement recommended actions to reduce your emissions

### Regular Usage
1. Update your carbon usage data regularly for more accurate tracking
2. Check the reports page to monitor progress
3. Visit the leaderboard to see how you compare to others
4. Explore carbon offset options to neutralize unavoidable emissions

## 🤝 Contributors

- [Your Name] - Initial development and project setup

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Special thanks to all the libraries and frameworks used in this project
- Environmental data sources that helped model accurate carbon calculations
