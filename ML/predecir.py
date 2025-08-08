import joblib
import pandas as pd
import os
import json
import sys

class Predictor:
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        modelos_dir = os.path.join(base_dir, 'modelos')
        
        self.modelo_rutina = joblib.load(os.path.join(modelos_dir, 'modelo_rutina.pkl'))
        self.modelo_dieta = joblib.load(os.path.join(modelos_dir, 'modelo_dieta.pkl'))
        self.codificador = joblib.load(os.path.join(modelos_dir, 'codificador.pkl'))

    def predecir(self, datos_usuario):
        try:
            usuario_df = pd.DataFrame([datos_usuario])

            # Ya no necesitas json.loads() porque los campos ya son listas
            usuario_df['num_restricciones'] = usuario_df['restricciones_comida'].apply(
                lambda x: len(x) if pd.notna(x) else 0)
            usuario_df['num_enfermedades'] = usuario_df['enfermedades'].apply(
                lambda x: len(x) if pd.notna(x) else 0)

            usuario_df['restricciones_comida'] = usuario_df['restricciones_comida'].astype(str)
            usuario_df['enfermedades'] = usuario_df['enfermedades'].astype(str)

            X = self.codificador.transform(usuario_df)
            rutina = self.modelo_rutina.predict(X)[0]
            dieta = self.modelo_dieta.predict(X)[0]

            return {
                'rutina': rutina,
                'dieta': dieta,
            }
            
        except Exception as e:
            missing = [col for col in self.codificador.feature_names_in_
                    if col not in usuario_df.columns]
            if missing:
                return {'error': f"Faltan columnas: {set(missing)}"}
            return {'error': str(e)}

if __name__ == '__main__':
    try:
        input_json = sys.argv[1]
        datos = json.loads(input_json)

        predictor = Predictor()
        resultado = predictor.predecir(datos)

        print(json.dumps(resultado))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
