#!/bin/bash

# =====================================================
# Setup Photo Cleanup Cron Job
# =====================================================
# This script sets up automated daily cleanup of expired original photos
# for privacy compliance (GDPR, CCPA)
# =====================================================

set -e

echo "🔧 Setting up photo cleanup automation..."

# Detect if we're using systemd or cron
if command -v systemctl &> /dev/null; then
    echo "📋 Detected systemd - creating timer unit..."
    
    # Create service file
    sudo tee /etc/systemd/system/photo-cleanup.service > /dev/null <<EOF
[Unit]
Description=Clean up expired original photos for privacy compliance
After=network.target postgresql.service

[Service]
Type=oneshot
User=$(whoami)
WorkingDirectory=$(pwd)/../pictureme-go
Environment="DATABASE_URL=${DATABASE_URL}"
Environment="MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}"
Environment="MINIO_SECRET_KEY=${MINIO_SECRET_KEY}"
Environment="MINIO_ENDPOINT=${MINIO_ENDPOINT}"
Environment="MINIO_BUCKET=${MINIO_BUCKET:-pictureme-media}"
ExecStart=/usr/local/go/bin/go run scripts/cleanup_expired_originals.go
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Create timer file
    sudo tee /etc/systemd/system/photo-cleanup.timer > /dev/null <<EOF
[Unit]
Description=Run photo cleanup daily at 3 AM
Requires=photo-cleanup.service

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Reload systemd and enable timer
    sudo systemctl daemon-reload
    sudo systemctl enable photo-cleanup.timer
    sudo systemctl start photo-cleanup.timer
    
    echo "✅ Systemd timer created and enabled"
    echo ""
    echo "📊 Timer status:"
    sudo systemctl status photo-cleanup.timer --no-pager
    
    echo ""
    echo "📝 Useful commands:"
    echo "  - Check timer status: sudo systemctl status photo-cleanup.timer"
    echo "  - View logs: sudo journalctl -u photo-cleanup.service -f"
    echo "  - Run manually: sudo systemctl start photo-cleanup.service"
    echo "  - Disable: sudo systemctl disable photo-cleanup.timer"
    
else
    echo "📋 Detected cron - creating crontab entry..."
    
    # Create cron job (runs daily at 3 AM)
    CRON_JOB="0 3 * * * cd $(pwd)/../pictureme-go && /usr/local/go/bin/go run scripts/cleanup_expired_originals.go >> /var/log/photo-cleanup.log 2>&1"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "cleanup_expired_originals.go"; then
        echo "⚠️  Cron job already exists, skipping..."
    else
        # Add to crontab
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo "✅ Cron job added"
    fi
    
    echo ""
    echo "📊 Current crontab:"
    crontab -l | grep "cleanup_expired_originals" || echo "No cleanup jobs found"
    
    echo ""
    echo "📝 Useful commands:"
    echo "  - View crontab: crontab -l"
    echo "  - Edit crontab: crontab -e"
    echo "  - View logs: tail -f /var/log/photo-cleanup.log"
    echo "  - Run manually: cd ../pictureme-go && go run scripts/cleanup_expired_originals.go"
fi

echo ""
echo "🎉 Photo cleanup automation setup complete!"
echo ""
echo "⏰ Original photos will be automatically deleted after 30 days"
echo "📅 Cleanup runs daily at 3:00 AM"
echo ""
echo "To test immediately:"
echo "  cd ../pictureme-go && go run scripts/cleanup_expired_originals.go"
