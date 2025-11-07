#!/bin/bash

curl -s -X POST http://localhost:5000/api/auth/register/tecnico \
  -H 'Content-Type: application/json' \
  -d '{"email":"pedro@example.com","password":"Password123","nombre":"Pedro López","dni":"11223344"}' | jq .
