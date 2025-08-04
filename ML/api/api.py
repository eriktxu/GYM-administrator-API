from fastapi import FastAPI
from predictor import Predictor

app = FastAPI()
predictor = Predictor()

@app.post("/predecir")
async def predecir_plan(usuario: dict):
    return predictor.predecir(usuario)

# Ejemplo de uso:
# POST /predecir
# Body: {"edad": 30, "genero": "hombre", "altura": 175, ...}