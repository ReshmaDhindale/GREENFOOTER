from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load carbon footprint model
model = joblib.load("carbon_footprint_mode.pkl")

class CarbonData(BaseModel):
    # Energy consumption features
    bulb_count: int
    bulb_wattage: float
    bulb_hours: int
    ac_hours: int
    ac_wattage: float
    
    # Transportation features
    distance: float
    vehicle_type: str
    
    # Water usage features
    shower_minutes: int
    laundry_loads: int
    
    # Waste management
    trash_bags: int
    
    # Lifestyle features
    diet_type: str
    clothing_purchases: int
    electronics_purchases: int
    flights_per_year: int

@app.get("/")
def read_root():
    return {"message": "Carbon Footprint Calculator API is running"}

@app.post("/predict")
def predict(data: CarbonData):
    try:
        # Map vehicle type to numerical value
        vehicle_map = {
            "car": 0,
            "motorbike": 1,
            "public": 2,
            "ev": 3
        }
        
        # Map diet type to numerical value
        diet_map = {
            "omnivore": 0,
            "vegetarian": 1,
            "vegan": 2
        }
        
        # Create input array with all 14 features
        input_array = np.array([[
            data.bulb_count,
            data.bulb_wattage,
            data.bulb_hours,
            data.ac_hours,
            data.ac_wattage,
            data.distance,
            vehicle_map.get(data.vehicle_type, 0),
            data.shower_minutes,
            data.laundry_loads,
            data.trash_bags,
            diet_map.get(data.diet_type, 0),
            data.clothing_purchases,
            data.electronics_purchases,
            data.flights_per_year
        ]])

        # Make prediction
        prediction = model.predict(input_array)[0]
         
        return {
            "carbon_footprint": float(prediction),
            "unit": "kg CO2e/day"
        }
    except Exception as e:
        return {"error": str(e)}
