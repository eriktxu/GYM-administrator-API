from utils import cargar_datos, preprocesar_datos
from sklearn.ensemble import RandomForestClassifier
import joblib

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
    joblib.dump(modelo, 'D:/Dev/Proyectos/GYMS/GYM-administrator-API/ML/modelos/modelo_rutina.pkl')
    print("✅ Modelo de rutinas entrenado y guardado")

if __name__ == "__main__":
    entrenar_modelo_rutina()