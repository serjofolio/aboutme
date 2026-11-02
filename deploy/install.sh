#!/usr/bin/env bash
# 个人网站 aboutme —— 服务器安装 / 更新脚本（由 deploy.ps1 上传后自动运行，不用手动执行）
#  - 网站文件放 /opt/aboutme，模型配置放 /var/lib/aboutme
#  - 服务只监听 127.0.0.1:5200，由 tkagent 已有的 Cloudflare 隧道转发到 aboutme.hyff.cc.cd
#  - 不改动 tkagent，也不改动 cloudflared
set -euo pipefail

BUNDLE=/tmp/aboutme.tar.gz
CONF=/tmp/aboutme-twin.json
APP_DIR=/opt/aboutme
DATA_DIR=/var/lib/aboutme
SVC=aboutme
PORT="${PORT:-5200}"
DOMAIN="${DOMAIN:-aboutme.hyff.cc.cd}"

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[错误]\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "请以 root 运行"
[ -f "$BUNDLE" ] || die "找不到网站安装包 $BUNDLE（上传没有成功）"
command -v node >/dev/null || die "服务器上没有 Node.js"
log "使用 Node.js $(node -v)"

# 账户与目录（第一次部署时创建，之后复用）
id "$SVC" >/dev/null 2>&1 || useradd --system --shell /sbin/nologin "$SVC"
mkdir -p "$APP_DIR" "$DATA_DIR"

# 网站文件：整体替换成新版本
log "更新网站文件 $APP_DIR"
find "$APP_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$BUNDLE" -C "$APP_DIR"
rm -rf "$APP_DIR/data" "$BUNDLE"

# 模型配置：用你电脑上后台里配好的那份（旧的先备份）
if [ -f "$CONF" ]; then
  [ -f "$DATA_DIR/twin.json" ] && cp "$DATA_DIR/twin.json" "$DATA_DIR/twin.json.bak"
  install -m 600 "$CONF" "$DATA_DIR/twin.json"
  rm -f "$CONF"
  log "已同步模型配置（API Key 只存在 $DATA_DIR/twin.json）"
fi
chown -R "$SVC:$SVC" "$APP_DIR" "$DATA_DIR"

# 系统服务：开机自启、崩溃自动重启
cat > /etc/systemd/system/$SVC.service <<EOF
[Unit]
Description=aboutme personal site
After=network-online.target

[Service]
User=$SVC
WorkingDirectory=$APP_DIR
Environment=HOST=127.0.0.1
Environment=PORT=$PORT
Environment=DATA_DIR=$DATA_DIR
Environment=ALLOWED_HOSTS=$DOMAIN
Environment=TWIN_ADMIN_LOCAL=1
ExecStart=/usr/bin/env node server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable "$SVC" >/dev/null 2>&1
log "重启网站"
systemctl restart "$SVC"

# 自检
code=000
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" "http://127.0.0.1:$PORT/" || true)
  [ "$code" = 200 ] && break
  sleep 1
done
[ "$code" = 200 ] || { journalctl -u "$SVC" -n 40 --no-pager; die "网站没有启动成功，上面是错误日志"; }

echo
log "部署完成！线上已更新：https://$DOMAIN"
echo "   分身状态：$(curl -s -H "Host: $DOMAIN" "http://127.0.0.1:$PORT/api/twin/status")"
echo "   tkagent ：$(systemctl is-active tkagent 2>/dev/null)   隧道：$(systemctl is-active cloudflared 2>/dev/null)"
