#!/bin/bash

# Test script para verificar todos los presets de imgproxy

HTTPS_URL="https://pub-57622ef7fab343e28d70b45859294410.r2.dev/creations/4da7a76f-7670-4397-aaed-ee884a4a5db3/restored_1768757398961_06dedf6e.png"
ENCODED=$(echo -n "$HTTPS_URL" | base64 | tr '+/' '-_' | tr -d '=')
ORIGINAL_SIZE=2012389

echo "🔄 Verificando todos los presets de imgproxy..."
echo ""

declare -A PRESETS=(
    ["feed"]="600px, calidad 80"
    ["thumbnail"]="300x300, calidad 80"
    ["view"]="2048px, calidad 90"
    ["hero"]="1920px, calidad 90"
)

SUCCESS_COUNT=0
FAIL_COUNT=0

for preset in "${!PRESETS[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Testing preset: $preset (${PRESETS[$preset]})"
    
    curl -sk "https://img.pictureme.now/preset:${preset}/${ENCODED}" -o "/tmp/test_${preset}.webp" 2>&1
    SIZE=$(wc -c < "/tmp/test_${preset}.webp" 2>/dev/null || echo "0")
    TYPE=$(file -b "/tmp/test_${preset}.webp" 2>/dev/null | head -c 40)
    
    echo "  Tamaño: ${SIZE} bytes"
    echo "  Tipo: ${TYPE}"
    
    if [ "$SIZE" -gt 5000 ]; then
        SAVED=$(( (ORIGINAL_SIZE - SIZE) * 100 / ORIGINAL_SIZE ))
        echo "  ✅ FUNCIONA - $(($SIZE / 1024)) KB (${SAVED}% reducción)"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "  ❌ FALLO - $(cat /tmp/test_${preset}.webp)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumen:"
echo "  ✅ Funcionando: ${SUCCESS_COUNT}"
echo "  ❌ Fallando: ${FAIL_COUNT}"
echo ""

if [ "$SUCCESS_COUNT" -eq 4 ]; then
    echo "🎉 ¡Todos los presets funcionan!"
    echo ""
    echo "Ahora actualiza cdn.ts para usar los presets correctos:"
    echo "  - feed → preset:feed (150KB)"
    echo "  - thumbnail → preset:thumbnail (50KB)"
    echo "  - view → preset:view (300KB)"
    echo "  - hero → preset:hero (400KB)"
else
    echo "⚠️ Algunos presets no funcionan todavía"
    echo "Verifica el archivo presets.yml y redeploy imgproxy"
fi
