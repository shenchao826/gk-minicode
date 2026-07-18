#!/bin/bash
# 清除错误的代理设置，让 curl/WebFetch 直连
export HTTP_PROXY=""
export HTTPS_PROXY=""
export http_proxy=""
export https_proxy=""

echo "Proxy vars cleared. Testing direct connectivity..."

# 测试百度
result=$(curl -sL --max-time 10 "https://www.baidu.com" -w "%{http_code}" 2>/dev/null)
echo "Baidu: HTTP $result"

# 测试搜狗（搜索用）
result2=$(curl -sL --max-time 10 "https://www.sogou.com" -w "%{http_code}" 2>/dev/null)
echo "Sogou: HTTP $result2"

echo ""
echo "All proxy vars disabled. Now running with direct connections."

# 执行传入的命令（如果有）
if [ $# -gt 0 ]; then
    exec "$@"
fi
