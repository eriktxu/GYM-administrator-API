import pandas as pd
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from sklearn.compose import ColumnTransformer
import numpy as np
import os
import joblib

# Obtener la ruta base del script actual
base_dir = os.path.dirname(os.path.abspath(__file__))

def cargar_datos():
    data_path = os.path.join(base_dir, 'modelos', 'data.csv')
    
    # Cargar datos con codificación explícita y eliminar filas vacías
    datos = pd.read_csv(data_path, encoding='latin1').dropna(how='all')
    
    # Limpieza adicional de datos (opcional)
    datos = datos.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
    
    return datos

def preprocesar_datos(datos, target, guardar_codificador=False):
    # 1. Procesar columnas con listas
    datos['num_restricciones'] = datos['restricciones_comida'].apply(lambda x: len(eval(x)) if pd.notnull(x) else 0)
    datos['num_enfermedades'] = datos['enfermedades'].apply(lambda x: len(eval(x)) if pd.notnull(x) else 0)
    
    # 2. Definir columnas
    categoricas = ['genero', 'tipo_cuerpo', 'nivel_actividad', 'objetivo']
    numericas = ['edad', 'altura', 'cintura', 'imc', 'peso', 'num_restricciones', 'num_enfermedades']
    
    # 3. Crear y entrenar el transformador
    transformador = ColumnTransformer(
        [('onehot', OneHotEncoder(handle_unknown='ignore'), categoricas)],
        remainder='passthrough'
    )
    
    # Ajustar el transformador a los datos
    X = transformador.fit_transform(datos[categoricas + numericas])
    y = datos[target]
    
    # 4. Guardar el codificador
    if guardar_codificador:
        modelos_dir = os.path.join(base_dir, 'modelos')
        os.makedirs(modelos_dir, exist_ok=True)
        codificador_path = os.path.join(modelos_dir, 'codificador.pkl')
        joblib.dump(transformador, codificador_path)
        print(f"✅ Codificador guardado en '{codificador_path}'")
    
    return X, y