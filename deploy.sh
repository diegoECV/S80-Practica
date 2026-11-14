#!/usr/bin/env bash
set -e

# ==============================================================================
# SCRIPT DE AUTOMATIZACIÓN DE DESPLIEGUE - PRÁCTICA S08 | AP6
# ==============================================================================

echo "=========================================================="
echo "🚀 Iniciando despliegue de la Práctica S08 en Minikube"
echo "=========================================================="

# 1. Crear namespace si no existe
echo -e "\n📌 Paso 1: Verificando / creando Namespace 'practica-s08'..."
kubectl get namespace practica-s08 >/dev/null 2>&1 || kubectl create namespace practica-s08

# 2. Construir imagen local en Minikube
echo -e "\n🐳 Paso 2: Construyendo imagen Docker local 'backend-api:1.0' en Minikube..."
if minikube image build -t backend-api:1.0 ./src; then
    echo "✔ Imagen construida exitosamente con 'minikube image build'."
else
    echo "Intentando alternativa con eval $(minikube docker-env)..."
    eval $(minikube docker-env)
    docker build -t backend-api:1.0 ./src
fi

# 3. Aplicar manifiestos
echo -e "\n📄 Paso 3: Aplicando manifiestos de Kubernetes..."
kubectl apply -f k8s/01-app-configmap.yaml
kubectl apply -f k8s/02-db-secret.yaml
kubectl apply -f k8s/03-mongo-stack.yaml
kubectl apply -f k8s/04-backend-stack.yaml

# 4. Esperar a que los pods estén listos
echo -e "\n⏳ Paso 4: Esperando a que los Pods inicien..."
kubectl wait --namespace practica-s08 --for=condition=ready pod -l app=mongodb --timeout=90s
kubectl wait --namespace practica-s08 --for=condition=ready pod -l app=backend-api --timeout=90s

# 5. Mostrar estado final
echo -e "\n✅ ¡Despliegue completado con éxito!"
echo "=========================================================="
echo "📊 Estado del Clúster (EVIDENCIA 1):"
kubectl get pods,svc,configmaps,secrets -n practica-s08

# 6. Inspección de variables
echo -e "\n🔐 Variables inyectadas en Backend (EVIDENCIA 2):"
POD_BACKEND=$(kubectl get pods -n practica-s08 -l app=backend-api -o jsonpath="{.items[0].metadata.name}")
kubectl exec -it $POD_BACKEND -n practica-s08 -- env | grep -E "DB_|APP_"

# 7. URL del servicio
echo -e "\n🌐 Para abrir en el navegador (EVIDENCIA 3), ejecuta:"
echo "minikube service backend-service -n practica-s08 --url"
echo "=========================================================="
