import os
from utils import cargar_datos, preprocesar_datos
from sklearn.ensemble import GradientBoostingClassifier
import joblib

# Obtener la ruta base del script actual
base_dir = os.path.dirname(os.path.abspath(__file__))

def entrenar_modelo_dieta():
    # 1. Cargar y preprocesar datos
    datos = cargar_datos()
    X, y = preprocesar_datos(datos, target='dieta_asignada')
    
    # 2. Entrenar modelo
    modelo = GradientBoostingClassifier()
    modelo.fit(X, y)
    
    # 3. Guardar modelo
    modelos_dir = os.path.join(base_dir, 'modelos')
    os.makedirs(modelos_dir, exist_ok=True)  # Crear directorio si no existe
    modelo_path = os.path.join(modelos_dir, 'modelo_dieta.pkl')
    joblib.dump(modelo, modelo_path)
    print(f"✅ Modelo de dietas guardado en: {modelo_path}")

if __name__ == "__main__":
    entrenar_modelo_dieta()