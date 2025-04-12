from main import app  # import your FastAPI app
from mangum import Mangum

handler = Mangum(app)
