#!/bin/bash

# Integreco Publish Script
# Автоматизирует Commit и Push на GitHub

echo "📡 Подготовка к публикации на GitHub..."

# 1. Добавляем все изменения
git add .

# 2. Создаем коммит (сообщение с текущей датой)
MESSAGE="Update: $(date +'%Y-%m-%d %H:%M')"
git commit -m "$MESSAGE"

# 3. Отправляем в облако
echo "📤 Отправка файлов..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Готово! Код на GitHub."
    echo "🌐 Если ты уже настроил GitHub Pages, приложение обновится через минуту."
else
    echo "❌ Ошибка! Возможно, репозиторий еще не опубликован на сайте."
    echo "👉 Пожалуйста, нажми кнопку 'Опубликовать бранч' в своей IDE."
fi
