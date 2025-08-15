import os
from sklearn.ensemble import RandomForestClassifier
import joblib

# Obtener la ruta base del script actual (dentro de ML/)
base_dir = os.path.dirname(os.path.abspath(__file__)) 
ruta_modelos = os.path.join(base_dir, 'modelos')  

# Importar utilS
from utils import cargar_datos, preprocesar_datos

def entrenar_modelo_rutina():
    # 1. Cargar y preprocesar datos
    datos = cargar_datos()
    X, y = preprocesar_datos(datos, target='rutina_asignada', guardar_codificador=True)
    
    # 2. Entrenar modelo
    modelo = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
        random_state=42
    )
    modelo.fit(X, y)
    
    # 3. Guardar modelo
    os.makedirs(ruta_modelos, exist_ok=True) 
    modelo_path = os.path.join(ruta_modelos, "modelo_rutina.pkl")
    joblib.dump(modelo, modelo_path)
    print(f"✅ Modelo guardado en: {modelo_path}")

if __name__ == "__main__":
    entrenar_modelo_rutina()