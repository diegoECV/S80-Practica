# GUÍA COMPLETA: INFORME TÉCNICO EN GOOGLE DOCS Y GUION DEL VIDEO

Este documento contiene todo el texto, estructura y guion que necesitas para obtener los **20/20 puntos** de la rúbrica en la entrega de la **Sesión S08 | AP6**.

---

# PARTE 1: PLANTILLA PARA EL DOCUMENTO DE GOOGLE (INFORME TÉCNICO)

> **Instrucciones:** Copia este contenido directamente a tu nuevo documento de Google Docs. En las secciones de capturas, pega las capturas reales que tomes al ejecutar los comandos.

---

## [PORTADA]
# UNIVERSIDAD / INSTITUTO
### Curso: Orquestación y Automatización de Software
### Sesión S08 | AP6: Exposición de Servicios y Configuración Segura en Minikube

- **Estudiante:** Diego [Apellidos]
- **Docente:** Jean Carlos Simón Rojas
- **Fecha:** Noviembre 2026
- **Enlace al Repositorio de GitHub:** `https://github.com/tu-usuario/practica-s08-k8s` *(Reemplazar con tu URL pública)*
- **Enlace al Video Demostrativo:** `https://youtu.be/...` o `https://drive.google.com/...` *(Con permisos de lectura)*

---

## 1. INTRODUCCIÓN Y OBJETIVOS DEL PROYECTO

El presente laboratorio práctico tiene como finalidad diseñar, implementar y validar una arquitectura desacoplada y segura de dos capas (**Backend API** en Node.js/Express y base de datos **MongoDB**) en un entorno local gestionado por **Kubernetes (Minikube)**.

### Objetivos Específicos:
1. **Desacoplamiento de Configuración:** Aislar variables operativas no confidenciales de la imagen de contenedor utilizando **ConfigMaps**.
2. **Seguridad y Confidencialidad:** Proteger credenciales sensibles mediante **Secrets** de tipo Opaque codificados en Base64.
3. **Inyección Dinámica:** Consumir de manera unificada ambos recursos mediante la directiva `envFrom` en el manifiesto de Deployment.
4. **Segmentación y Exposición de Red:** Aislar MongoDB dentro del clúster con un servicio de tipo **ClusterIP** y exponer el Backend al usuario final mediante un servicio de tipo **NodePort**.

---

## 2. ARQUITECTURA Y DECISIONES TÉCNICAS

### 2.1. Topología del Clúster (Namespace: `practica-s08`)
Para garantizar aislamiento de otros despliegues, se definió el namespace `practica-s08`. La arquitectura consta de:
- **Capa de Persistencia (MongoDB):** Un Pod con MongoDB 6.0 configurado con credenciales de autenticación inyectadas desde el Secret `db-secret` y expuesto únicamente al interior del clúster vía `ClusterIP` en el puerto `27017` con el DNS `mongo-service`.
- **Capa de Aplicación (Backend API):** Un Pod Node.js/Express que consume todas las variables de entorno de forma desacoplada mediante `envFrom`.
- **Capa de Exposición Externa:** Un servicio `NodePort` en el puerto `30080` que traduce las peticiones desde el exterior hacia el puerto `3000` del contenedor.

### 2.2. Justificación Técnica: ConfigMap vs Secret
- **ConfigMap (`app-configmap`):** Almacena `DB_HOST`, `DB_NAME` y `APP_PORT`. Son valores de configuración operativa que cambian entre entornos (dev, staging, prod) pero no representan un riesgo de seguridad si se leen en texto claro.
- **Secret (`db-secret`):** Almacena `DB_USER` y `DB_PASS`. Cumple con el estándar de Kubernetes para datos confidenciales, almacenándose codificado en Base64. Esto evita almacenar credenciales en duro (*hardcoded*) en el código fuente o en la imagen Docker, cumpliendo las buenas prácticas de la metodología *Twelve-Factor App*.

---

## 3. INFORME TÉCNICO Y CAPTURAS DE EVIDENCIA

### 3.1. Evidencia 1: Estado General del Clúster
Comando ejecutado:
```bash
kubectl get pods,svc,configmaps,secrets -n practica-s08
```

> **[PEGAR AQUÍ CAPTURA DE PANTALLA 1]**
> *La captura debe mostrar claramente:*
> - *Pod `mongo-deployment-...` en estado Running (1/1).*
> - *Pod `backend-deployment-...` en estado Running (1/1).*
> - *Servicio `mongo-service` de tipo `ClusterIP`.*
> - *Servicio `backend-service` de tipo `NodePort` (puerto 3000:30080/TCP).*
> - *ConfigMap `app-configmap`.*
> - *Secret `db-secret` de tipo `Opaque`.*

**Análisis de la Evidencia 1:**
Todos los objetos de Kubernetes fueron inicializados en el orden correcto y alcanzaron el estado `Running` sin reiniciar (`RESTARTS = 0`), lo que confirma la estabilidad de los contenedores y la correcta resolución de dependencias.

---

### 3.2. Evidencia 2: Inyección de Variables en el Contenedor (Verificación de Seguridad)
Comando ejecutado para ingresar al pod del Backend y comprobar las variables de entorno activas:
```bash
kubectl exec -it <nombre-del-pod-backend> -n practica-s08 -- env
```

> **[PEGAR AQUÍ CAPTURA DE PANTALLA 2]**
> *La captura debe mostrar la salida de las variables del contenedor, destacando:*
> - `DB_HOST=mongo-service` *(Proveniente del ConfigMap)*
> - `DB_NAME=appdb` *(Proveniente del ConfigMap)*
> - `APP_PORT=3000` *(Proveniente del ConfigMap)*
> - `DB_USER=admin` *(Proveniente del Secret decodificado)*
> - `DB_PASS=SecretPass123` *(Proveniente del Secret decodificado)*

**Análisis de la Evidencia 2:**
Se verifica empíricamente que la directiva `envFrom` inyectó automáticamente las variables en el proceso del contenedor. Kubernetes decodifica transparentemente los valores Base64 del Secret en tiempo de ejecución, entregando al contenedor las credenciales en memoria sin que estas queden expuestas en el código fuente ni en el historial del repositorio.

---

### 3.3. Evidencia 3: Conexión y Exposición Externa vía NodePort
Comando ejecutado para obtener la URL del servicio expuesto:
```bash
minikube service backend-service -n practica-s08 --url
```

> **[PEGAR AQUÍ CAPTURA DE PANTALLA 3]**
> *La captura debe mostrar el navegador web abierto con la interfaz visual generada por la aplicación (`http://<IP-Minikube>:30080`), donde se aprecie:*
> - *Título: "S08 | AP6 - Exposición de Servicios y Configuración Segura".*
> - *Estado de Base de Datos: "CONECTADO" en verde con indicador de pulso.*
> - *Desglose de variables públicas inyectadas desde ConfigMap.*
> - *Confirmación de credenciales inyectadas desde Secret.*
> - *(Opcional pero recomendable) Resultado de presionar el botón "Probar CRUD DB" mostrando inserción exitosa en MongoDB.*

**Análisis de la Evidencia 3:**
El acceso mediante el navegador confirma que el servicio de tipo `NodePort` realiza correctamente el ruteo de paquetes TCP desde fuera del clúster hacia los endpoints del backend. A su vez, el estado `CONECTADO` valida la comunicación de red este-oeste (*East-West*) entre el Backend y MongoDB mediante el servicio `ClusterIP`.

---

## 4. CONCLUSIONES
1. La separación de responsabilidades entre **ConfigMaps** (datos de entorno abiertos) y **Secrets** (credenciales) permite desplegar la misma imagen Docker en múltiples entornos sin recompilar ni filtrar secretos.
2. El uso de `envFrom` simplifica radicalmente los manifiestos YAML al evitar declarar manualmente mapeo variable por variable.
3. La segmentación de red con `ClusterIP` protege la base de datos de accesos externos directos, cumpliendo con el principio de mínimo privilegio en seguridad de infraestructuras cloud-native.

---
---

# PARTE 2: GUION DETALLADO PARA EL VIDEO DEMOSTRATIVO (3 A 5 MINUTOS)

> **Requisitos de la rúbrica:**
> - Duración: 3 a 5 minutos.
> - Formato: YouTube (No listado) o Google Drive con permisos abiertos.
> - 3 partes obligatorias:
>   1. Explicación conceptual (ConfigMaps vs Secrets).
>   2. Muestra rápida de los manifiestos YAML en el editor de código.
>   3. Demostración en vivo en la terminal (acceso NodePort e inspección con `kubectl exec`).

---

### ⏱️ Cronograma sugerido del video:

| Tiempo | Sección | Qué mostrar en pantalla | Qué decir (Guion hablado) |
|---|---|---|---|
| **0:00 - 0:50** | **Introducción y Conceptos** | Portada / Diagrama de arquitectura del README | *"Hola, bienvenidos a la sustentación del proyecto práctico de la Sesión S08 sobre Exposición de Servicios y Configuración Segura en Minikube. En este proyecto implementamos una arquitectura de dos capas: un backend API y una base de datos MongoDB. El pilar fundamental de esta práctica es el desacoplamiento de configuración según las buenas prácticas de Twelve-Factor App. Separamos los parámetros no sensibles en un ConfigMap (como el host, nombre de BD y puerto) y las credenciales críticas en un Secret de tipo Opaque codificado en Base64. Esto garantiza que el código sea agnóstico del entorno y que las contraseñas nunca se guarden en el repositorio de código."* |
| **0:50 - 2:00** | **Revisión de Manifiestos YAML** | VS Code mostrando la carpeta `k8s/` | *"Pasando al código, en la carpeta `k8s` tenemos cuatro manifiestos ordenados: <br>1. `01-app-configmap.yaml`: Define DB_HOST apuntando al servicio de mongo, DB_NAME y APP_PORT.<br>2. `02-db-secret.yaml`: Contiene DB_USER y DB_PASS codificados en Base64.<br>3. `03-mongo-stack.yaml`: Despliega MongoDB y expone el servicio ClusterIP interno en el puerto 27017, inyectando las credenciales de root desde el Secret.<br>4. `04-backend-stack.yaml`: Aquí vemos el Deployment del Backend, el cual consume la configuración de manera limpia y desacoplada mediante la directiva `envFrom`, enlazando tanto al ConfigMap como al Secret. Y finalmente, un servicio de tipo NodePort expuesto en el puerto 30080."* |
| **2:00 - 3:30** | **Demostración en Terminal (Evidencias 1 y 2)** | Terminal dividida o maximizada | *"Ahora vamos a la terminal en vivo. Ejecutamos `kubectl get pods,svc,configmaps,secrets -n practica-s08`. Como podemos ver, todos los recursos están creados: el pod de Mongo y el del Backend están en estado Running 1 de 1; el servicio de Mongo está en ClusterIP y el del backend en NodePort.<br><br>A continuación, validamos la inyección segura de variables con `kubectl exec -it <pod-backend> -n practica-s08 -- env`. Filtramos por DB y APP: aquí confirmamos que DB_HOST, DB_NAME y APP_PORT provienen del ConfigMap, mientras que DB_USER y DB_PASS fueron inyectados y decodificados automáticamente por Kubernetes desde el Secret."* |
| **3:30 - 4:40** | **Acceso al Servicio vía NodePort (Evidencia 3)** | Terminal y Navegador Web | *"Por último, verificamos la exposición externa. Ejecutamos `minikube service backend-service -n practica-s08 --url`. Tomamos la URL generada y la abrimos en el navegador. Como se aprecia en pantalla, la aplicación carga correctamente. Nos muestra el estado de la base de datos en estado 'CONECTADO' en verde, lo que valida que el Backend se está comunicando perfectamente con MongoDB a través del servicio ClusterIP interno. Si damos clic en 'Probar CRUD DB', vemos cómo se realiza una inserción y lectura exitosa en MongoDB."* |
| **4:40 - 5:00** | **Conclusión y Cierre** | Pantalla con el GitHub Repo | *"Con esto demostramos el cumplimiento total de los objetivos: desacoplamiento con ConfigMaps, confidencialidad con Secrets, aislamiento de persistencia con ClusterIP y exposición al usuario mediante NodePort. Muchas gracias."* |
