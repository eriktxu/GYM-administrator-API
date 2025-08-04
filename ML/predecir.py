import joblib
import pandas as pd
import os
from sklearn.compose import ColumnTransformer

class Predictor:
    def __init__(self):
        # Cargar modelos y preprocesadores
        self.modelo_rutina = joblib.load('D:/Dev/Proyectos/GYMS/GYM-administrator-API/ML/modelos/modelo_rutina.pkl')
        self.modelo_dieta = joblib.load('D:/Dev/Proyectos/GYMS/GYM-administrator-API/ML/modelos/modelo_dieta.pkl')
        self.codificador = joblib.load('D:/Dev/Proyectos/GYMS/GYM-administrator-API/ML/modelos/codificador.pkl')

    def predecir(self, datos_usuario):
        try:
            usuario_df = pd.DataFrame([datos_usuario])
            usuario_df['num_restricciones'] = usuario_df['restricciones_comida'].apply(lambda x: len(eval(x)) if pd.notna(x) else 0)
            usuario_df['num_enfermedades'] = usuario_df['enfermedades'].apply(lambda x: len(eval(x)) if pd.notna(x) else 0)
            
            X = self.codificador.transform(usuario_df)
            rutina = self.modelo_rutina.predict(X)[0]
            dieta = self.modelo_dieta.predict(X)[0]
            
            return {
                'rutina': rutina,
                'dieta': dieta,
                'detalles': f"Recomendación: {rutina} y {dieta}"
            }
        except Exception as e:
            missing = [col for col in self.codificador.feature_names_in_ if col not in usuario_df.columns]
            if missing:
                return {'error': f"columns are missing: {set(missing)}"}
            return {'error': str(e)}
