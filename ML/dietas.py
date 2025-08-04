from utils import cargar_datos, preprocesar_datos
from sklearn.ensemble import GradientBoostingClassifier  # Ejemplo: otro algoritmo
import joblib

def entrenar_modelo_dieta():
    datos = cargar_datos()
    X, y = preprocesar_datos(datos, target='dieta_asignada')
    
    modelo = GradientBoostingClassifier()  # Nota: Algoritmo distinto para comparar
    modelo.fit(X, y)
    
    joblib.dump(modelo, 'D:/Dev/Proyectos/GYMS/GYM-administrator-API/ML/modelos/modelo_dieta.pkl')
    print("✅ Modelo de dietas entrenado y guardado")

if __name__ == "__main__":
    entrenar_modelo_dieta()