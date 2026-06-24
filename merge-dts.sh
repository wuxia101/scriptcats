#!/usr/bin/env bash
# merge-dts.sh - 将项目中所有 *.d.ts 合并到 global.d.ts
#
# 用法:
#   ./merge-dts.sh          # 合并并写入 global.d.ts
#   ./merge-dts.sh --dry-run # 仅输出合并结果，不写文件
#
# 规则:
#   - 排除 global.d.ts（输出文件本身）
#   - 排除 skill-creator/references/ 下的重复 scriptcat.d.ts
#   - 每个源文件以注释分隔标记来源

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/global.d.ts"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# 收集所有 .d.ts 文件，排序后合并
# 排除: global.d.ts 和 skill-creator/references/scriptcat.d.ts
SOURCE_FILES=$(find "$SCRIPT_DIR" -name "*.d.ts" \
  ! -path "$OUTPUT_FILE" \
  ! -path "*skill-creator/references/scriptcat.d.ts" \
  | sort)

if [[ -z "$SOURCE_FILES" ]]; then
  echo "没有找到任何 .d.ts 文件"
  exit 0
fi

FILE_COUNT=$(echo "$SOURCE_FILES" | wc -l | tr -d ' ')

# 构建合并内容
{
  # 头部注释
  echo "/**"
  echo " * global.d.ts - 项目全局类型声明（自动合并生成）"
  echo " *"
  echo " * 由 merge-dts.sh 从以下文件合并而来："
  echo "$SOURCE_FILES" | while read -r f; do
    rel_path="${f#$SCRIPT_DIR/}"
    echo " *   - ${rel_path}"
  done
  echo " *"
  echo " * ⚠️ 请勿手动编辑此文件，修改请编辑对应的源 .d.ts 后重新运行 merge-dts.sh"
  echo " */"
  echo ""
  echo ""

  # 合并每个文件
  echo "$SOURCE_FILES" | while read -r f; do
    rel_path="${f#$SCRIPT_DIR/}"
    echo "// ─── ${rel_path} ───────────────────────────────────────"
    echo ""
    cat "$f"
    echo ""
    echo ""
  done
} > /tmp/merge-dts-output.txt

# 去除末尾多余空行
RESULT=$(sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' /tmp/merge-dts-output.txt)

if $DRY_RUN; then
  echo "$RESULT"
  echo ""
  echo "--- 合并了 ${FILE_COUNT} 个文件 ---"
else
  echo "$RESULT" > "$OUTPUT_FILE"
  echo "已合并 ${FILE_COUNT} 个文件到 global.d.ts"
  echo ""
  echo "源文件列表:"
  echo "$SOURCE_FILES" | while read -r f; do
    rel_path="${f#$SCRIPT_DIR/}"
    echo "  - $rel_path"
  done
fi

rm -f /tmp/merge-dts-output.txt
