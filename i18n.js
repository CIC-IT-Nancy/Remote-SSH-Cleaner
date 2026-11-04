"use strict";

const vscode = require("vscode");

const messages = {
  en: {
    targetMissing: "{0} does not exist.",
    pathRejected: "Path outside the user directory was rejected: {0}",
    downloadedVsix: "downloaded VSIX cache",
    cliLog: "CLI log",
    lruUnreadable: "Unable to read lru.json: {0}",
    oldServer: "old server version",
    lruMissing: "lru.json is missing: server versions are kept for safety.",
    temporaryInstall: "incomplete temporary installation",
    oldExtension: "old extension version: {0}",
    userCache: "complete user cache",
    localWindowWarning:
      "This is not a remote window. The local machine would be cleaned.",
    continueLocally: "Continue locally",
    cleanupError: "Remote SSH Cleaner: {0}",
    target: "Target: {0}",
    total: "Total: {0}",
    nothingToClean: "Remote SSH Cleaner: nothing to clean.",
    previewDone: "Preview: {0} item(s), {1}.",
    confirmDelete: "Permanently delete {0} item(s), approximately {1}?",
    delete: "Delete",
    deleteError: "ERROR | {0} | {1}",
    cleanupDone: "Remote SSH Cleaner: {0} deleted{1}.",
    failures: ", {0} failure(s)",
    startupCheckError: "Startup check failed: {0}",
    startupAvailable: "Remote SSH Cleaner: {0} item(s) can be cleaned ({1}).",
    cleanNow: "Clean now",
    showDetails: "Show details",
    ignore: "Ignore",
  },
  fr: {
    targetMissing: "{0} n’existe pas.",
    pathRejected: "Chemin situé hors du dossier utilisateur refusé : {0}",
    downloadedVsix: "cache des VSIX téléchargés",
    cliLog: "journal CLI",
    lruUnreadable: "Impossible de lire lru.json : {0}",
    oldServer: "ancienne version du serveur",
    lruMissing:
      "lru.json est absent : les versions du serveur sont conservées par sécurité.",
    temporaryInstall: "installation temporaire inachevée",
    oldExtension: "ancienne version de l’extension : {0}",
    userCache: "cache utilisateur complet",
    localWindowWarning:
      "Cette fenêtre n’est pas distante. Le nettoyage viserait la machine locale.",
    continueLocally: "Continuer localement",
    cleanupError: "Remote SSH Cleaner : {0}",
    target: "Cible : {0}",
    total: "Total : {0}",
    nothingToClean: "Remote SSH Cleaner : rien à nettoyer.",
    previewDone: "Prévisualisation : {0} élément(s), {1}.",
    confirmDelete:
      "Supprimer définitivement {0} élément(s), soit environ {1} ?",
    delete: "Supprimer",
    deleteError: "ERREUR | {0} | {1}",
    cleanupDone: "Remote SSH Cleaner : {0} supprimés{1}.",
    failures: ", {0} échec(s)",
    startupCheckError: "Vérification au démarrage impossible : {0}",
    startupAvailable:
      "Remote SSH Cleaner : {0} élément(s) peuvent être nettoyés ({1}).",
    cleanNow: "Nettoyer maintenant",
    showDetails: "Voir les détails",
    ignore: "Ignorer",
  },
};

const language = vscode.env.language.toLowerCase().startsWith("fr")
  ? "fr"
  : "en";

function t(key, ...values) {
  let text = messages[language][key] ?? messages.en[key] ?? key;
  values.forEach((value, index) => {
    text = text.replaceAll(`{${index}}`, String(value));
  });
  return text;
}

module.exports = { t };
