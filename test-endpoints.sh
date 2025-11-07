#!/bin/bash

# Script de pruebas para API ConfiaPE
BASE_URL="http://localhost:5000"

echo "========================================"
echo "   Testing ConfiaPE Backend API"
echo "========================================"
echo ""

# 1. HEALTH CHECK
echo "1. Testing Health Check..."
curl -X GET "$BASE_URL/health" -w "\nStatus: %{http_code}\n\n"

# 2. RUTA 404
echo "2. Testing 404 Route..."
curl -X GET "$BASE_URL/ruta-inexistente" -w "\nStatus: %{http_code}\n\n"

# 3. AUTH - Sin token (debe fallar 401)
echo "3. Testing Auth Middleware - Sin token..."
curl -X GET "$BASE_URL/api/tecnicos/me" -w "\nStatus: %{http_code}\n\n"

# 4. AUTH - Token inválido (debe fallar 401)
echo "4. Testing Auth Middleware - Token invalido..."
curl -X GET "$BASE_URL/api/tecnicos/me" \
  -H "Authorization: Bearer token_invalido" \
  -w "\nStatus: %{http_code}\n\n"

# 5. VALIDACIÓN - Datos incompletos
echo "5. Testing Validation Middleware - Datos incompletos..."
curl -X POST "$BASE_URL/api/auth/register/cliente" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}' \
  -w "\nStatus: %{http_code}\n\n"

# 6. VALIDACIÓN - Email inválido
echo "6. Testing Validation - Email invalido..."
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "email-invalido", "password": "123"}' \
  -w "\nStatus: %{http_code}\n\n"

# 7. TÉCNICOS - Lista pública (sin auth)
echo "7. Testing Tecnicos List - Public..."
curl -X GET "$BASE_URL/api/tecnicos" -w "\nStatus: %{http_code}\n\n"

# 8. TÉCNICOS - Con filtros
echo "8. Testing Tecnicos List - With filters..."
curl -X GET "$BASE_URL/api/tecnicos?disponible=true&limit=5" \
  -w "\nStatus: %{http_code}\n\n"

# 9. REVIEWS - Lista pública
echo "9. Testing Reviews List - Public (sin tecnicoId debe fallar)..."
curl -X GET "$BASE_URL/api/reviews/tecnico/fake-uuid" \
  -w "\nStatus: %{http_code}\n\n"

# 10. DASHBOARD - Sin auth (debe fallar 401)
echo "10. Testing Dashboard - Sin auth..."
curl -X GET "$BASE_URL/api/dashboard/stats" \
  -w "\nStatus: %{http_code}\n\n"

# 11. CHAT - Crear conversación sin auth (debe fallar)
echo "11. Testing Chat - Sin auth..."
curl -X POST "$BASE_URL/api/chat/conversations" \
  -H "Content-Type: application/json" \
  -d '{"tecnicoId": "fake-id"}' \
  -w "\nStatus: %{http_code}\n\n"

# 12. TRABAJOS - Sin auth (debe fallar)
echo "12. Testing Trabajos - Sin auth..."
curl -X GET "$BASE_URL/api/trabajos" \
  -w "\nStatus: %{http_code}\n\n"

echo ""
echo "========================================"
echo "   Tests Completados"
echo "========================================"
echo ""
echo "Resumen esperado:"
echo "- Health check: 200 OK"
echo "- 404 routes: 404"
echo "- Auth sin token: 401"
echo "- Validaciones: 400"
echo "- Rutas publicas sin DB: 200 o error de DB"
echo "- Rutas protegidas sin auth: 401"
