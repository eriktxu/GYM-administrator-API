import sys
import os

from predecir import Predictor

# Datos de ejemplo (completa con todos los campos que necesita tu modelo)
datos_ejemplo = {
    'edad': 28,
    'genero': 'F',
    'altura': 165,
    'peso': 60,
    'imc': 22.04,
    'cintura': 70,  
    'tipo_cuerpo': 'Mesomorfo',
    'nivel_actividad': 'Activo',
    'objetivo': 'Ganar masa muscular',
    'restricciones_comida': "['Lacteos']", 
    'enfermedades': "['Asma']",
}

if __name__ == "__main__":
    try:
        predictor = Predictor()
        resultado = predictor.predecir(datos_ejemplo)
        print("\n🔍 Resultado de la predicción:")
        print(f"Rutina recomendada: {resultado['rutina']}")
        print(f"Dieta recomendada: {resultado['dieta']}")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("\nℹ️ Asegúrate de incluir TODAS estas columnas:")
        print("- edad, genero, altura, peso, imc, cintura")
        print("- tipo_cuerpo, nivel_actividad, objetivo")
        print("- restricciones_comida (ej: \"['Vegetariano']\")")
        print("- enfermedades (ej: \"['Asma']\")")