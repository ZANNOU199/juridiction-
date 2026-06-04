#!/bin/bash

# Script d'installation et initialisation du projet JUGE

echo "🎭 Initialisation du projet JUGE..."
echo ""

# 1. Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
  echo "❌ Erreur lors de l'installation des dépendances"
  exit 1
fi

echo "✅ Dépendances installées"
echo ""

# 2. Initialiser Prisma
echo "🗄️  Initialisation de la base de données..."
npm run db:push

if [ $? -ne 0 ]; then
  echo "❌ Erreur lors de l'initialisation de la DB"
  exit 1
fi

echo "✅ Base de données initialisée"
echo ""

# 3. Message de démarrage
echo "🚀 Configuration terminée!"
echo ""
echo "Pour lancer le serveur en développement:"
echo "  npm run dev"
echo ""
echo "Pour voir les données Prisma Studio:"
echo "  npx prisma studio"
echo ""
