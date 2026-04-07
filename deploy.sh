#!/bin/bash

# Integreco Deploy Script
# Копирует рабочие файлы из папки разработки в папку приложения

SOURCE_DIR="/home/a/Projects/Integreco"
TARGET_DIR="/home/a/Projects/Integreco-App"

echo "🚀 Начинаю обновление Integreco-App..."

# Создаем целевую директорию, если её нет
mkdir -p "$TARGET_DIR/src"
mkdir -p "$TARGET_DIR/styles"

# Копируем основные файлы
cp "$SOURCE_DIR/index.html" "$TARGET_DIR/"
cp "$SOURCE_DIR/manifest.json" "$TARGET_DIR/"
cp "$SOURCE_DIR/sw.js" "$TARGET_DIR/"

# Копируем папки (целиком)
cp -r "$SOURCE_DIR/src/." "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/styles/." "$TARGET_DIR/styles/"

# Удаляем временные файлы отладки, если они есть в таргете
rm -f "$TARGET_DIR/save_backend.cjs"
rm -f "$TARGET_DIR/deploy.sh"

echo "✅ Обновление завершено! Файлы скопированы в $TARGET_DIR"
