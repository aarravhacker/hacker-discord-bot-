#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Lavalink v4 Production Setup Script (Linux/macOS)
# ═══════════════════════════════════════════════════════════

set -e

LAVALINK_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGINS_DIR="$LAVALINK_DIR/plugins"
LOGS_DIR="$LAVALINK_DIR/logs"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   LAVALINK v4 PRODUCTION SETUP           ║"
echo "  ║   36-Agent Swarm Deployment               ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ─── Step 1: Verify Java ─────────────────────────────────
echo "[1/6] Verifying Java Runtime..."
JAVA_VER=$(java -version 2>&1 | head -1 | cut -d'"' -f2)
JAVA_MAJOR=$(echo $JAVA_VER | cut -d'.' -f1)
if [ "$JAVA_MAJOR" -ge 17 ]; then
    echo "  Java $JAVA_VER detected ✓"
else
    echo "  Java 17+ required! Found: $JAVA_VER"
    exit 1
fi

# ─── Step 2: Verify Lavalink JAR ─────────────────────────
echo "[2/6] Verifying Lavalink JAR..."
JAR="$LAVALINK_DIR/Lavalink.jar"
if [ -f "$JAR" ]; then
    SIZE=$(du -m "$JAR" | cut -f1)
    echo "  Lavalink.jar found (${SIZE}MB) ✓"
else
    echo "  Downloading Lavalink.jar..."
    curl -L -o "$JAR" "https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar"
    echo "  Downloaded! ✓"
fi

# ─── Step 3: Create directories ──────────────────────────
echo "[3/6] Creating directories..."
mkdir -p "$PLUGINS_DIR" "$LOGS_DIR" "$LAVALINK_DIR/data" "$LAVALINK_DIR/temp"
echo "  Directories created ✓"

# ─── Step 4: Download plugins ────────────────────────────
echo "[4/6] Downloading plugins..."
[ ! -f "$PLUGINS_DIR/LavaSrc-4.8.3.jar" ] && \
    curl -L -o "$PLUGINS_DIR/LavaSrc-4.8.3.jar" \
    "https://github.com/topi314/LavaSrc/releases/latest/download/LavaSrc-4.8.3.jar"
[ ! -f "$PLUGINS_DIR/LavaSearch-1.0.0.jar" ] && \
    curl -L -o "$PLUGINS_DIR/LavaSearch-1.0.0.jar" \
    "https://github.com/topi314/LavaSearch/releases/latest/download/LavaSearch-1.0.0.jar"
[ ! -f "$PLUGINS_DIR/LavaLyrics-1.0.0.jar" ] && \
    curl -L -o "$PLUGINS_DIR/LavaLyrics-1.0.0.jar" \
    "https://github.com/topi314/LavaLyrics/releases/latest/download/LavaLyrics-1.0.0.jar"
echo "  Plugins downloaded ✓"

# ─── Step 5: Open firewall (Linux) ───────────────────────
echo "[5/6] Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 2333/tcp comment "Lavalink" 2>/dev/null || true
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=2333/tcp 2>/dev/null || true
    sudo firewall-cmd --reload 2>/dev/null || true
fi
echo "  Firewall configured ✓"

# ─── Step 6: Start Lavalink ──────────────────────────────
echo "[6/6] Starting Lavalink..."

# Kill existing
pkill -f "Lavalink.jar" 2>/dev/null || true
sleep 2

# JVM args
JAVA_OPTS="-Xms512m -Xmx1g -XX:+UseG1GC -XX:G1HeapRegionSize=4m -XX:MaxGCPauseMillis=200"

# Start in background
nohup java $JAVA_OPTS -jar "$JAR" > "$LOGS_DIR/lavalink.log" 2>&1 &
LAVALINK_PID=$!

echo "  Lavalink started (PID: $LAVALINK_PID)"

# Health check
echo ""
echo "  Waiting for Lavalink to initialize..."
for i in {1..15}; do
    sleep 2
    if curl -sf http://localhost:2333/version > /dev/null 2>&1; then
        echo ""
        echo "  ╔══════════════════════════════════════════╗"
        echo "  ║   LAVALINK IS RUNNING!                   ║"
        echo "  ║   Port: 2333                             ║"
        echo "  ║   PID: $LAVALINK_PID                            ║"
        echo "  ╚══════════════════════════════════════════╝"
        echo ""
        echo "  Connect from Discord bot:"
        echo "    URL:      localhost:2333"
        echo "    Password: youshallnotpass"
        echo ""
        exit 0
    fi
done

echo "  Lavalink took too long. Check logs: $LOGS_DIR/lavalink.log"
exit 1
