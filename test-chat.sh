#!/bin/bash

echo "=== Testing Chat Module ==="
echo ""

# Login cliente
echo "1. Login cliente..."
CLIENT_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"juan@example.com","password":"Password123"}')

CLIENT_TOKEN=$(echo $CLIENT_RESPONSE | jq -r '.data.tokens.accessToken')
echo "✓ Client token obtenido"

# Login técnico
echo "2. Login técnico..."
TECH_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"pedro@example.com","password":"Password123"}')

TECH_TOKEN=$(echo $TECH_RESPONSE | jq -r '.data.tokens.accessToken')
TECH_ID=$(echo $TECH_RESPONSE | jq -r '.data.user.perfilId')
echo "✓ Technician token obtenido (ID: $TECH_ID)"

# Crear conversación
echo ""
echo "3. Cliente crea conversación con técnico..."
CONV_RESPONSE=$(curl -s -X POST http://localhost:5000/api/chat/conversations \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"tecnicoId\":\"$TECH_ID\"}")

CHAT_ID=$(echo $CONV_RESPONSE | jq -r '.data.id')
echo "$CONV_RESPONSE" | jq .
echo "✓ Chat ID: $CHAT_ID"

# Enviar mensaje desde cliente
echo ""
echo "4. Cliente envía mensaje..."
curl -s -X POST http://localhost:5000/api/chat/messages \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"chatId\":\"$CHAT_ID\",\"texto\":\"Hola, necesito ayuda con una instalación eléctrica\"}" | jq .

# Enviar mensaje desde técnico
echo ""
echo "5. Técnico responde..."
curl -s -X POST http://localhost:5000/api/chat/messages \
  -H "Authorization: Bearer $TECH_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"chatId\":\"$CHAT_ID\",\"texto\":\"Hola! Claro que sí, cuéntame más sobre el trabajo\"}" | jq .

# Listar conversaciones del cliente
echo ""
echo "6. Listar conversaciones del cliente..."
curl -s -X GET http://localhost:5000/api/chat/conversations \
  -H "Authorization: Bearer $CLIENT_TOKEN" | jq .

# Obtener mensajes de la conversación
echo ""
echo "7. Obtener mensajes de la conversación..."
curl -s -X GET "http://localhost:5000/api/chat/conversations/$CHAT_ID/messages?page=1&limit=10" \
  -H "Authorization: Bearer $CLIENT_TOKEN" | jq .

echo ""
echo "=== Chat Test Completed ==="
