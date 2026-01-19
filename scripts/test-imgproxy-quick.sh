#!/bin/bash
#
# Test rápido de imgproxy - Verificar que IMGPROXY_ALLOWED_SOURCES funciona
#

R2_URL="https://pub-57622ef7fab343e28d70b45859294410.r2.dev/creations/4da7a76f-7670-4397-aaed-ee884a4a5db3/restored_1768757398961_06dedf6e.png"
ENCODED=$(echo -n "$R2_URL" | base64 | tr '+/' '-_' | tr -d '=')

echo "🔍 Test rápido de imgproxy"
echo ""

# Test simple: Feed 600px
curl -sk "https://img.pictureme.now/insecure/rs:fit:600:0/plain/${ENCODED}@webp" -o /tmp/imgproxy_test.webp 2>&1
SIZE=$(wc -c < /tmp/imgproxy_test.webp 2>/dev/null || echo "0")

if [ "$SIZE" -gt 50000 ]; then
  REDUCTION=$(( (2012389 - SIZE) * 100 / 2012389 ))
  echo "✅ ¡FUNCIONA!"
  echo ""
  echo "   Original:   1.9 MB"
  echo "   Comprimido: $(($SIZE / 1024)) KB"
  echo "   Reducción:  ${REDUCTION}%"
  echo ""
  echo "🎉 imgproxy está procesando correctamente"
  echo "   Recarga tu app para ver las imágenes comprimidas"
else
  ERROR=$(cat /tmp/imgproxy_test.webp 2>/dev/null)
  echo "❌ No funciona"
  echo ""
  echo "   Error: $ERROR"
  echo ""
  echo "Verificar:"
  echo "  1. ¿Esperaste 30-60 segundos después del redeploy?"
  echo "  2. ¿El docker-compose tiene IMGPROXY_ALLOWED_SOURCES: \"*\"?"
  echo "  3. Verifica que la variable esté presente:"
  echo "     docker inspect <container> | grep ALLOWED_SOURCES"
fi
