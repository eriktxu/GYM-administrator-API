import pandas as pd
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from sklearn.compose import ColumnTransformer
import numpy as np
import os
import joblib

def cargar_datos():
    # Cargar datos con codificación explícita y eliminar filas vacías
    datos = pd.read_csv(r"D:/Dev/Proyectos/GYMS/GYM-administrator-API/ML/modelos/data.csv", 
                encoding='latin1').dropna(how='all')
    
    # Limpieza adicional de datos (opcional)
    datos = datos.apply(lambda x: x.str.strip() if x.dtype == "object" else x)  # Elimina espacios en blanco
    
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
    
    # 4. Guardar el codificador si es necesario
    if guardar_codificador:
        os.makedirs('modelos', exist_ok=True)
        joblib.dump(transformador, 'D:/Dev/Proyectos/GYMS/GYM-administrator-API/ML/modelos/codificador.pkl')
        print("✅ Codificador guardado en 'modelos/codificador.pkl'")
    
    return X, y