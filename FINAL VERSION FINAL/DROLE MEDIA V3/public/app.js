// Configuration API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let adminToken = localStorage.getItem('adminToken');
let userToken = localStorage.getItem('userToken');
let currentUser = null;
let categories = [];
let currentCategory = 'all';
let allVideos = [];

// Variables pour gérer les chargements et éviter les conflits
let isLoadingData = false;
let loadingTimeout = null;
let lastTabSwitch = 0;

// Fonction de notification
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed d-flex justify-content-between align-items-center`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    // Icône selon le type
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    
    // Créer le contenu du message
    const messageContent = document.createElement('span');
    messageContent.textContent = `${icons[type] || icons.info} ${message}`;
    
    // Créer le bouton de fermeture
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.style.cssText = 'background-image: url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%23000\'%3e%3cpath d=\'M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z\'/%3e%3c/svg%3e"); background-size: 1.5em; background-repeat: no-repeat; background-position: center; width: 1.5em; height: 1.5em; border: 0; opacity: 0.5; cursor: pointer; background-color: transparent; margin-left: 10px;';
    
    // Ajouter l'événement de clic
    closeButton.addEventListener('click', function() {
        notification.remove();
    });
    
    // Assembler la notification
    notification.appendChild(messageContent);
    notification.appendChild(closeButton);
    
    // Ajouter au body
    document.body.appendChild(notification);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}



// Vérification des éléments nécessaires
function checkRequiredElements() {
    console.log('🔍 Vérification des éléments nécessaires...');
    
    const requiredElements = [
        'videoCount',
        'membersCount', 
        'pendingCount',
        'videosContainer',
        'libraryContainer'
    ];
    
    const missingElements = [];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            missingElements.push(id);
            console.warn(`⚠️ Élément manquant: ${id}`);
        } else {
            console.log(`✅ Élément trouvé: ${id}`);
        }
    });
    
    if (missingElements.length > 0) {
        console.error('❌ Éléments manquants:', missingElements);
        return false;
    }
    
    console.log('✅ Tous les éléments nécessaires sont présents');
    return true;
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de l\'application...');
    
    // Configuration de base immédiate
    setupDarkMode();
    setupEventListeners();
    setupModalCleanup();
    setupTabListeners();
    
    // Charger les données avec un délai pour s'assurer que tout est prêt
    setTimeout(async function() {
        try {
            // Vérifier les éléments nécessaires
            if (!checkRequiredElements()) {
                console.error('❌ Éléments manquants, initialisation interrompue');
                return;
            }
            
            // Vérifier l'état de connexion
            await checkAuthStatus();
            
            // Charger les données dans l'ordre
            console.log('📊 Chargement des données...');
            await loadCategories();
            await loadVideos();
            await updateStats();
            
            console.log('✅ Initialisation terminée avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
        }
    }, 100); // Délai de 100ms pour s'assurer que tout est chargé
});

// Fonction de debouncing pour éviter les appels multiples
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Fonction pour forcer le rechargement des données
async function forceReloadData() {
    console.log('🔄 Forçage du rechargement des données...');
    
    try {
        // Vider les variables globales
        categories = [];
        allVideos = [];
        
        // Recharger dans l'ordre
        await loadCategories();
        await loadVideos();
        await updateStats();
        
        console.log('✅ Rechargement forcé terminé');
    } catch (error) {
        console.error('❌ Erreur lors du rechargement forcé:', error);
    }
}

// Fonction pour gérer les changements d'onglets avec debouncing
function handleTabSwitch(loadFunction, tabName) {
    const now = Date.now();
    if (now - lastTabSwitch < 300) {
        console.log(`⏸️ Changement d'onglet trop rapide pour ${tabName}, ignoré`);
        return;
    }
    
    lastTabSwitch = now;
    
    // Annuler le chargement précédent s'il existe
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
    }
    
    // Masquer tous les contenus d'onglets avant de charger le nouveau
    const allTabPanes = document.querySelectorAll('.tab-pane');
    allTabPanes.forEach(pane => {
        pane.classList.remove('show', 'active');
        pane.style.display = 'none';
    });
    
    // Programmer le nouveau chargement avec un délai
    loadingTimeout = setTimeout(() => {
        console.log(`🔄 Chargement onglet ${tabName}`);
        
        // S'assurer que l'onglet actif est bien visible
        const activeTab = document.querySelector('.nav-link.active');
        if (activeTab) {
            const targetId = activeTab.getAttribute('href');
            const targetPane = document.querySelector(targetId);
            if (targetPane) {
                targetPane.classList.add('show', 'active');
                targetPane.style.display = 'block';
            }
        }
        
        loadFunction();
    }, 150);
}

// Configuration des gestionnaires d'onglets
function setupTabListeners() {
    console.log('🔧 Configuration gestionnaires d\'onglets...');
    
    // S'assurer qu'un seul onglet est actif à la fois
    function ensureSingleActiveTab() {
        const allTabs = document.querySelectorAll('#adminTabs .nav-link');
        let activeFound = false;
        
        allTabs.forEach(tab => {
            if (tab.classList.contains('active')) {
                if (activeFound) {
                    // Si on a déjà trouvé un onglet actif, retirer la classe active
                    tab.classList.remove('active');
                } else {
                    activeFound = true;
                }
            }
        });
        
        // Si aucun onglet actif trouvé, activer le premier
        if (!activeFound && allTabs.length > 0) {
            allTabs[0].classList.add('active');
        }
    }
    
    // Gestionnaires pour les onglets du panel admin
    const pendingTab = document.querySelector('a[href="#pendingVideos"]');
    const approvedTab = document.querySelector('a[href="#approvedVideos"]');
    const categoriesTab = document.querySelector('a[href="#categories"]');
    
    if (pendingTab) {
        pendingTab.addEventListener('shown.bs.tab', function() {
            ensureSingleActiveTab();
            handleTabSwitch(() => loadPendingVideos(), 'Vidéos en attente');
        });
    }
    
    if (approvedTab) {
        approvedTab.addEventListener('shown.bs.tab', function() {
            ensureSingleActiveTab();
            handleTabSwitch(() => loadApprovedVideos(), 'Vidéos approuvées');
        });
    }
    
    if (categoriesTab) {
        categoriesTab.addEventListener('shown.bs.tab', function() {
            ensureSingleActiveTab();
            handleTabSwitch(() => loadAdminCategories(), 'Catégories');
        });
    }
    
    const partnersTab = document.querySelector('a[href="#partners"]');
    if (partnersTab) {
        partnersTab.addEventListener('shown.bs.tab', function() {
            ensureSingleActiveTab();
            handleTabSwitch(() => loadAdminPartners(), 'Partenaires');
        });
    }
    
    const usersTab = document.querySelector('a[href="#users"]');
    if (usersTab) {
        usersTab.addEventListener('shown.bs.tab', function() {
            ensureSingleActiveTab();
            handleTabSwitch(() => loadAdminUsers(), 'Utilisateurs');
        });
    }
    
    // Gestionnaires pour les onglets du dashboard utilisateur
    const myVideosTab = document.querySelector('a[href="#myVideos"]');
    
    if (myVideosTab) {
        myVideosTab.addEventListener('shown.bs.tab', function() {
            handleTabSwitch(() => loadUserDashboard(), 'Mes vidéos');
        });
    }
    
    // S'assurer qu'un seul onglet est actif au démarrage
    ensureSingleActiveTab();
    
    console.log('✅ Gestionnaires d\'onglets configurés');
}

// Configuration du nettoyage automatique des modals
function setupModalCleanup() {
    console.log('🔧 Configuration nettoyage modals...');
    
    const userDashboardModal = document.getElementById('userDashboardModal');
    if (userDashboardModal) {
        userDashboardModal.addEventListener('hidden.bs.modal', function() {
            console.log('🚪 Dashboard utilisateur fermé - nettoyage...');
            cleanupModalBackdrop();
        });
    }
    
    const adminPanelModal = document.getElementById('adminPanelModal');
    if (adminPanelModal) {
        adminPanelModal.addEventListener('hidden.bs.modal', function() {
            console.log('🚪 Panel admin fermé - nettoyage...');
            cleanupModalBackdrop();
        });
    }
    
    const libraryModal = document.getElementById('libraryModal');
    if (libraryModal) {
        libraryModal.addEventListener('hidden.bs.modal', function() {
            console.log('🚪 Bibliothèque fermée - nettoyage...');
            cleanupModalBackdrop();
        });
    }
}

// Nettoyer les backdrops et remettre le body en état normal
function cleanupModalBackdrop() {
    // Nettoyer immédiatement
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 0) {
        console.log('🧹 Suppression immédiate de', backdrops.length, 'backdrop(s)');
            backdrops.forEach(backdrop => backdrop.remove());
        }
        
        // Remettre le body en état normal
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Nettoyer à nouveau après un délai pour s'assurer que tout est propre
    setTimeout(() => {
        const remainingBackdrops = document.querySelectorAll('.modal-backdrop');
        if (remainingBackdrops.length > 0) {
            console.log('🧹 Suppression finale de', remainingBackdrops.length, 'backdrop(s) restant(s)');
            remainingBackdrops.forEach(backdrop => backdrop.remove());
        }
        
        // S'assurer que le body est propre
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        console.log('✅ Nettoyage backdrop terminé');
    }, 100);
}

// Mode sombre (fonctionne déjà)
function setupDarkMode() {
    console.log('setupDarkMode appelée');
    const darkModeToggle = document.getElementById('darkModeToggle');
    console.log('Bouton dark mode trouvé:', darkModeToggle);
    
    if (!darkModeToggle) {
        console.error('Bouton dark mode non trouvé!');
        return;
    }
    
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    console.log('Mode sombre actuel:', isDarkMode);
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    darkModeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Clic sur le bouton dark mode');
        
        // Toggle du mode sombre
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark);
        console.log('Mode sombre activé:', isDark);
        
        if (isDark) {
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    });
}

// ===============================
// GESTION DE L'AUTHENTIFICATION
// ===============================

// Vérifier l'état de connexion au chargement
async function checkAuthStatus() {
    console.log('🔍 Vérification de l\'état de connexion...');
    console.log('🔑 adminToken:', adminToken ? 'Présent' : 'Absent');
    console.log('🔑 userToken:', userToken ? 'Présent' : 'Absent');
    
    // Masquer le lien "Soumettre" par défaut (sera affiché si connecté)
    const submitLink = document.querySelector('a[href="#submit"]');
    if (submitLink) {
        submitLink.style.display = 'none';
    }
    
    // Vérifier les paramètres de vérification dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const verification = urlParams.get('verification');
    
    if (verification) {
        switch (verification) {
            case 'success':
                showAlert('✅ Votre email a été vérifié avec succès ! Vous pouvez maintenant vous connecter.', 'success');
                break;
            case 'expired':
                showAlert('⚠️ Le lien de vérification a expiré. Veuillez vous inscrire à nouveau.', 'warning');
                break;
            case 'invalid':
                showAlert('❌ Lien de vérification invalide. Veuillez vérifier votre email.', 'danger');
                break;
            case 'error':
                showAlert('❌ Erreur lors de la vérification. Veuillez réessayer.', 'danger');
                break;
        }
        
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Vérifier d'abord le token admin
    if (adminToken) {
        try {
            // Pour les tokens admin, on peut les utiliser directement
            // car ils sont générés par le système admin
            currentUser = {
                isAdmin: true,
                username: 'admin@kghmedia.com'
            };
            updateUIForAuthenticatedUser();
            console.log('✅ Admin connecté:', currentUser);
            return;
        } catch (error) {
            console.error('❌ Erreur lors de la vérification du token admin:', error);
            // Nettoyer le token admin invalide
            adminToken = null;
            localStorage.removeItem('adminToken');
        }
    }
    
    // Vérifier le token utilisateur normal
    if (userToken) {
        try {
            const response = await fetch(`${API_BASE_URL}/users/verify`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                updateUIForAuthenticatedUser();
                console.log('✅ Utilisateur connecté:', currentUser);
            } else {
                // Token invalide
                logout();
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification du token utilisateur:', error);
            logout();
        }
    }
}

// Mettre à jour l'interface pour un utilisateur connecté
function updateUIForAuthenticatedUser() {
    const loginLink = document.getElementById('loginLink');
    
    if (loginLink && currentUser) {
        // Rediriger vers le bon panel selon le type d'utilisateur
        if (currentUser.isAdmin) {
            loginLink.innerHTML = `<i class="fas fa-user-shield me-1"></i>${currentUser.name}`;
            loginLink.setAttribute('data-bs-target', '#adminPanelModal');
            loginLink.title = 'Cliquer pour ouvrir le panel admin';
            // Ajouter un gestionnaire d'événement pour charger les données admin
            loginLink.onclick = function() {
                showAdminPanel();
            };
            // Afficher les sections admin dans les modals
            showAdminSections();
        } else {
            loginLink.innerHTML = `<i class="fas fa-user me-1"></i>Mon compte`;
            loginLink.setAttribute('data-bs-target', '#userDashboardModal');
            loginLink.title = 'Cliquer pour ouvrir votre dashboard';
            // Ajouter un gestionnaire d'événement pour charger le dashboard utilisateur
            loginLink.onclick = function() {
                const dashboardModal = new bootstrap.Modal(document.getElementById('userDashboardModal'));
                dashboardModal.show();
                loadUserDashboard();
            };
            // Afficher les sections publiques
            showPublicSections();
        }
    }
    
    // Afficher le lien "Soumettre" seulement si connecté
    const submitLink = document.querySelector('a[href="#submit"]');
    if (submitLink) {
        submitLink.style.display = 'inline-block';
    }
}

// Fonction pour afficher les sections admin dans les modals
function showAdminSections() {
    // Section admin des partenaires - NE PAS AFFICHER dans le modal public
    // La section admin des partenaires reste uniquement dans le dashboard admin
    const adminPartnersSection = document.getElementById('adminPartnersSection');
    const publicPartnersSection = document.getElementById('publicPartnersSection');
    
    if (adminPartnersSection && publicPartnersSection) {
        // Toujours garder la section publique visible
        adminPartnersSection.style.display = 'none';
        publicPartnersSection.style.display = 'block';
    }
}

// Fonction pour afficher les sections publiques (pour les utilisateurs non-admin)
function showPublicSections() {
    const adminPartnersSection = document.getElementById('adminPartnersSection');
    const publicPartnersSection = document.getElementById('publicPartnersSection');
    
    if (adminPartnersSection && publicPartnersSection) {
        adminPartnersSection.style.display = 'none';
        publicPartnersSection.style.display = 'block';
    }
}

// Connexion d'un utilisateur
async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            userToken = data.token;
            currentUser = data.user;
            localStorage.setItem('userToken', userToken);
            updateUIForAuthenticatedUser();
            
            // Fermer le modal de connexion
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            loginModal.hide();
            
            showNotification('Connexion réussie !', 'success');
            
            // Masquer le bouton de renvoi d'email
            hideResendEmailButton();
            
            // Sauvegarder le token admin si c'est un admin pour compatibilité
            if (currentUser.isAdmin) {
                adminToken = userToken;
                localStorage.setItem('adminToken', adminToken);
                // Forcer l'affichage des sections admin
                showAdminSections();
            } else {
                // Forcer l'affichage des sections publiques
                showPublicSections();
            }
        } else {
            if (data.needsVerification) {
                showAlert(data.message || 'Veuillez vérifier votre email avant de vous connecter. Vérifiez votre boîte de réception.', 'warning');
                
                // Afficher le bouton de renvoi d'email seulement si ce n'est pas la première tentative
                if (!data.firstAttempt) {
                    showResendEmailButton();
                } else {
                    // Pour la première tentative, masquer le bouton de renvoi
                    hideResendEmailButton();
                }
            } else {
                showAlert(data.message || 'Erreur de connexion', 'danger');
            }
        }
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        showNotification('Erreur de connexion', 'error');
    }
}

// Variables pour le timer de renvoi d'email
let resendTimer = null;
let resendCountdown = 60;

// Fonction pour afficher le bouton de renvoi d'email
function showResendEmailButton() {
    const loginModal = document.getElementById('loginModal');
    const resendSection = loginModal.querySelector('#resendEmailSection');
    const resendButton = loginModal.querySelector('#resendEmailBtn');
    const resendTimerSpan = loginModal.querySelector('#resendTimer');
    
    if (resendSection) {
        resendSection.style.display = 'block';
        resendTimerSpan.textContent = '';
        resendCountdown = 60;
        
        // Démarrer le timer
        startResendTimer();
    }
}

// Fonction pour démarrer le timer de renvoi
function startResendTimer() {
    const loginModal = document.getElementById('loginModal');
    const resendButton = loginModal.querySelector('#resendEmailBtn');
    const resendTimerSpan = loginModal.querySelector('#resendTimer');
    
    if (resendButton) {
        resendButton.disabled = true;
        resendCountdown = 60;
        
        resendTimer = setInterval(() => {
            resendCountdown--;
            resendTimerSpan.textContent = `(${resendCountdown}s)`;
            
            if (resendCountdown <= 0) {
                clearInterval(resendTimer);
                resendButton.disabled = false;
                resendTimerSpan.textContent = '';
            }
        }, 1000);
    }
}

// Fonction pour masquer le bouton de renvoi d'email
function hideResendEmailButton() {
    const loginModal = document.getElementById('loginModal');
    const resendSection = loginModal.querySelector('#resendEmailSection');
    
    if (resendSection) {
        resendSection.style.display = 'none';
    }
    
    // Arrêter le timer s'il est en cours
    if (resendTimer) {
        clearInterval(resendTimer);
        resendTimer = null;
    }
}

// Fonction pour renvoyer l'email de vérification
async function resendVerificationEmail() {
    const email = document.getElementById('loginEmail').value;
    
    if (!email) {
        showAlert('Veuillez entrer votre email', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message || 'Email de vérification renvoyé avec succès !', 'success');
            startResendTimer();
        } else {
            if (response.status === 429) {
                showAlert(data.error || 'Veuillez attendre avant de renvoyer un email', 'warning');
                // Mettre à jour le timer avec le temps restant
                resendCountdown = data.remainingTime || 60;
                startResendTimer();
            } else {
                showAlert(data.error || 'Erreur lors du renvoi de l\'email', 'danger');
            }
        }
    } catch (error) {
        console.error('Erreur lors du renvoi:', error);
        showAlert('Erreur lors du renvoi de l\'email', 'danger');
    }
}

// Inscription d'un nouvel utilisateur
async function registerUser(name, email, password, confirmPassword) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, confirmPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message || 'Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte.', 'success');
            
            // Fermer le modal d'inscription
            const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            if (registerModal) {
                registerModal.hide();
            }
            
            // Ne pas connecter automatiquement - attendre la vérification email
        } else {
            showAlert(data.message || 'Erreur lors de l\'inscription', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        showNotification('Erreur lors de l\'inscription', 'error');
    }
}

// Fonction utilitaire pour fermer tous les modals
function closeAllModals() {
    console.log('🚪 Fermeture forcée de tous les modals...');
    
    // Fermer tous les modals avec Bootstrap
    const openModals = document.querySelectorAll('.modal.show');
    openModals.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            console.log('🚪 Fermeture modal:', modal.id);
            modalInstance.hide();
        }
    });
    
    // Fermer aussi les modals qui n'ont pas d'instance Bootstrap
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    });
    
    // Nettoyer les backdrops immédiatement
    cleanupModalBackdrop();
    
    // Nettoyer après un délai pour s'assurer que tout est propre
    setTimeout(() => {
        // Supprimer tous les backdrops restants
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => {
            backdrop.remove();
        });
        
        // Retirer la classe modal-open du body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        console.log('🧹 Nettoyage des backdrops terminé');
    }, 150);
}

// Déconnexion
function logout() {
    userToken = null;
    currentUser = null;
    adminToken = null;
    localStorage.removeItem('userToken');
    localStorage.removeItem('adminToken');
    
    // Remettre l'interface à l'état initial
    const loginLink = document.getElementById('loginLink');
    
    if (loginLink) {
        loginLink.textContent = 'Se connecter';
        loginLink.setAttribute('data-bs-target', '#loginModal');
        loginLink.onclick = null;
        loginLink.removeAttribute('title');
    }
    
    // Masquer le lien "Soumettre" quand déconnecté
    const submitLink = document.querySelector('a[href="#submit"]');
    if (submitLink) {
        submitLink.style.display = 'none';
    }
    
    // Fermer tous les modals ouverts et nettoyer les backdrops
    closeAllModals();
    
    showNotification('Déconnexion réussie', 'success');
}

// Charger le dashboard utilisateur
async function loadUserDashboard() {
    if (!userToken) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/my-videos`, {
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayUserVideos(data.videos, data.stats);
            updateUserStats(data.stats);
            
            // Mettre à jour le nom d'utilisateur
            const userNameDisplay = document.getElementById('userNameDisplay');
            if (userNameDisplay && currentUser) {
                userNameDisplay.textContent = 'Mon compte';
            }
            
            // Attacher les event listeners après l'affichage des vidéos
            setTimeout(() => {
                attachVideoEventListeners();
            }, 100);
        } else {
            showNotification('Erreur lors du chargement des données', 'error');
        }
    } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error);
        showNotification('Erreur lors du chargement des données', 'error');
    }
}

// Afficher les vidéos de l'utilisateur
function displayUserVideos(videos, stats) {
    const container = document.getElementById('userVideosContainer');
    if (!container) return;
    
    if (videos.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Vous n\'avez pas encore soumis de vidéos.</p>';
        return;
    }
    
    container.innerHTML = videos.map(video => {
        // Gérer les URLs Cloudinary et locales
        let videoUrl = video.s3Url || video.videoUrl;
        
        // Si c'est une URL Cloudinary (commence par https://), l'utiliser directement
        if (videoUrl && videoUrl.startsWith('https://')) {
            // URL Cloudinary - utiliser directement
            console.log('☁️ URL Cloudinary détectée dans dashboard utilisateur:', videoUrl);
        } else if (videoUrl && !videoUrl.startsWith('http') && !videoUrl.startsWith('/uploads/')) {
            // URL locale relative - ajouter le préfixe
            videoUrl = `/uploads/${videoUrl}`;
            console.log('📁 URL locale détectée dans dashboard utilisateur:', videoUrl);
        } else if (videoUrl) {
            // URL locale avec préfixe - utiliser directement
            console.log('📁 URL locale avec préfixe dans dashboard utilisateur:', videoUrl);
        }
        
        // Vérifier si la vidéo a une URL valide
        const hasValidUrl = videoUrl && videoUrl.trim() !== '' && videoUrl !== 'undefined';
        const cursorStyle = hasValidUrl ? 'cursor: pointer;' : 'cursor: not-allowed;';
        const title = hasValidUrl ? 'Cliquer pour voir la vidéo' : 'Vidéo en cours de traitement';
        
        // Debug log pour comprendre le problème
        console.log(`Video ${video.title}: s3Url="${video.s3Url}", videoUrl="${videoUrl}", hasValidUrl=${hasValidUrl}, status=${video.status}`);
        
        // Encoder les paramètres pour éviter les problèmes d'URL
        const encodedTitle = encodeURIComponent(video.title);
        const encodedDescription = encodeURIComponent(video.description || 'Aucune description');
        const encodedCategory = encodeURIComponent(video.category ? video.category.name : 'Non catégorisé');
        
        return `
        <div class="card mb-3 user-video-card">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <div class="user-video-thumbnail" style="${cursorStyle}" title="${title}" ${hasValidUrl ? `data-video-url="${videoUrl}" data-video-title="${encodedTitle}" data-video-description="${encodedDescription}" data-video-category="${encodedCategory}"` : ''}>
                            ${hasValidUrl ? 
                                `<video src="${videoUrl}" preload="metadata" style="width: 100%; height: 80px; object-fit: contain; border-radius: 6px; pointer-events: none; background: #000;"></video>
                                <div class="user-video-overlay" style="opacity: 1;">
                                    <i class="fas fa-play"></i>
                                </div>` :
                                `<div style="width: 100%; height: 80px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-clock text-muted"></i>
                                </div>`
                            }
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6 class="card-title mb-1">${video.title}</h6>
                        <p class="card-text small text-muted mb-1">${video.description || 'Pas de description'}</p>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>Soumise le ${new Date(video.submittedAt).toLocaleDateString('fr-FR')}
                        </small>
                        ${video.category ? `<br><small class="text-info"><i class="fas fa-tag me-1"></i>${video.category.name}</small>` : ''}
                        
                        <!-- Informations de copyright -->
                        ${video.recordedVideo || video.copyrightOwnership ? `
                            <div class="mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-copyright me-1"></i>
                                    ${video.recordedVideo === 'yes' ? '✅ Enregistré' : '❌ Non enregistré'} | 
                                    ${video.copyrightOwnership === 'yes' ? '✅ Droits d\'auteur' : '❌ Pas de droits d\'auteur'}
                                </small>
                                ${video.recordedVideo === 'no' && video.recorderEmail ? `
                                    <small class="text-info d-block">
                                        <i class="fas fa-envelope me-1"></i>Enregistreur: ${video.recorderEmail}
                                    </small>
                                ` : ''}
                                ${video.copyrightOwnership === 'no' && video.ownerEmail ? `
                                    <small class="text-info d-block">
                                        <i class="fas fa-envelope me-1"></i>Propriétaire: ${video.ownerEmail}
                                    </small>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="col-md-2 text-center">
                        <span class="badge bg-${getStatusColor(video.status)}">${getStatusText(video.status)}</span>
                        ${video.rejectionReason ? `<br><small class="text-danger mt-1 d-block">${video.rejectionReason}</small>` : ''}
                    </div>
                    <div class="col-md-2 text-end">
                        <div class="btn-group" role="group">
                        ${hasValidUrl ? 
                            `<button class="btn btn-outline-primary btn-sm user-video-preview-btn" data-video-url="${videoUrl}" data-video-title="${encodedTitle}" data-video-description="${encodedDescription}" data-video-category="${encodedCategory}" title="Voir en grand">
                                <i class="fas fa-expand-alt"></i>
                            </button>` :
                            `<button class="btn btn-outline-secondary btn-sm" disabled title="Vidéo en cours de traitement">
                                <i class="fas fa-clock"></i>
                            </button>`
                        }
                            ${video.status === 'pending' ? 
                                `<button class="btn btn-outline-danger btn-sm user-video-cancel-btn" data-video-id="${video._id}" data-video-title="${video.title}" title="Annuler la soumission">
                                    <i class="fas fa-times"></i>
                                </button>` : ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// Mettre à jour les statistiques utilisateur
function updateUserStats(stats) {
    document.getElementById('approvedCount').textContent = stats.approved;
    document.getElementById('pendingUserCount').textContent = stats.pending;
    document.getElementById('rejectedCount').textContent = stats.rejected;
    document.getElementById('totalUserVideos').textContent = stats.total;
}

// Fonction pour annuler une vidéo utilisateur (seulement si en attente)
async function cancelUserVideo(videoId, title) {
    if (!confirm(`Êtes-vous sûr de vouloir annuler la soumission de "${title}" ? Cette action est irréversible.`)) {
        return;
    }
    
    try {
        const token = userToken || adminToken;
        if (!token) {
            showAlert('Vous devez être connecté pour annuler une vidéo.', 'warning');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/videos/${videoId}/cancel`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('Vidéo annulée avec succès !', 'success');
            // Recharger le dashboard utilisateur
            await loadUserDashboard();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Erreur lors de l\'annulation', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur annulation vidéo:', error);
        showAlert('Erreur lors de l\'annulation de la vidéo', 'danger');
    }
}

// Fonctions utilitaires pour l'affichage des statuts
function getStatusColor(status) {
    switch (status) {
        case 'validated': return 'success';
        case 'pending': return 'warning';
        case 'rejected': return 'danger';
        default: return 'secondary';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'validated': return 'Approuvée';
        case 'pending': return 'En attente';
        case 'rejected': return 'Rejetée';
        default: return 'Inconnu';
    }
}

// Fonction pour attacher les event listeners des vidéos
function attachVideoEventListeners() {
    console.log('🔗 Attachement des event listeners vidéos...');
    
    // Supprimer les anciens event listeners pour éviter les doublons
    document.querySelectorAll('.library-video-thumbnail, .video-thumbnail, .btn[data-video-url], .delete-approved-btn, .edit-partner-btn, .delete-partner-btn, .view-user-details, .view-user-payment, .toggle-user-ban, .user-video-thumbnail, .user-video-preview-btn, .user-video-cancel-btn, .toggle-fullscreen-btn, .download-video-btn, .retry-pending-btn, .retry-approved-btn, .category-select').forEach(element => {
        element.replaceWith(element.cloneNode(true));
    });
    
    // Event listeners pour les thumbnails de vidéos de la bibliothèque
    document.querySelectorAll('.library-video-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', function(e) {
            // Ne pas ouvrir le modal si l'utilisateur clique sur les contrôles vidéo
            if (e.target.tagName === 'VIDEO' || e.target.closest('video')) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            console.log('🎬 Clic sur thumbnail bibliothèque');
            const videoUrl = this.getAttribute('data-video-url');
            const videoTitle = this.getAttribute('data-video-title');
            const videoDescription = this.getAttribute('data-video-description');
            const videoCategory = this.getAttribute('data-video-category');
            console.log('📹 URL vidéo:', videoUrl);
            openVideoModal(videoUrl, videoTitle, videoDescription, videoCategory);
        });
    });

    // Event listeners pour les thumbnails de vidéos du dashboard utilisateur
    document.querySelectorAll('.user-video-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', function(e) {
            // Ne pas ouvrir le modal si l'utilisateur clique sur les contrôles vidéo
            if (e.target.tagName === 'VIDEO' || e.target.closest('video')) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            console.log('🎬 Clic sur thumbnail dashboard utilisateur');
            const videoUrl = this.getAttribute('data-video-url');
            const videoTitle = this.getAttribute('data-video-title');
            const videoDescription = this.getAttribute('data-video-description');
            const videoCategory = this.getAttribute('data-video-category');
            console.log('📹 URL vidéo:', videoUrl);
            openVideoModal(videoUrl, videoTitle, videoDescription, videoCategory);
        });
    });
    
    // Event listeners pour les thumbnails de vidéos récentes
    document.querySelectorAll('.video-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', function(e) {
            // Ne pas ouvrir le modal si l'utilisateur clique sur les contrôles vidéo
            if (e.target.tagName === 'VIDEO' || e.target.closest('video')) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            console.log('🎬 Clic sur thumbnail vidéos récentes');
            const videoUrl = this.getAttribute('data-video-url');
            const videoTitle = this.getAttribute('data-video-title');
            const videoDescription = this.getAttribute('data-video-description');
            const videoCategory = this.getAttribute('data-video-category');
            console.log('📹 URL vidéo:', videoUrl);
            openVideoModal(videoUrl, videoTitle, videoDescription, videoCategory);
        });
    });
    

    
    // Event listeners pour les boutons "Regarder"
    document.querySelectorAll('.btn[data-video-url]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎬 Clic sur bouton Regarder');
            const videoUrl = this.getAttribute('data-video-url');
            const videoTitle = this.getAttribute('data-video-title');
            const videoDescription = this.getAttribute('data-video-description');
            const videoCategory = this.getAttribute('data-video-category');
            console.log('📹 URL vidéo:', videoUrl);
            openVideoModal(videoUrl, videoTitle, videoDescription, videoCategory);
        });
    });
    
    // Event listeners pour les boutons de prévisualisation
    document.querySelectorAll('.btn[data-video-url][title="Prévisualiser"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const videoUrl = this.getAttribute('data-video-url');
            const videoTitle = this.getAttribute('data-video-title');
            previewApprovedVideo(videoUrl, videoTitle);
        });
    });

    // Event listeners pour les boutons de prévisualisation du dashboard utilisateur
    document.querySelectorAll('.user-video-preview-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const videoUrl = this.getAttribute('data-video-url');
            const videoTitle = this.getAttribute('data-video-title');
            const videoDescription = this.getAttribute('data-video-description');
            const videoCategory = this.getAttribute('data-video-category');
            console.log('🎬 Clic sur bouton prévisualisation dashboard utilisateur');
            openVideoModal(videoUrl, videoTitle, videoDescription, videoCategory);
        });
    });

    // Event listeners pour les boutons d'annulation du dashboard utilisateur
    document.querySelectorAll('.user-video-cancel-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const videoId = this.getAttribute('data-video-id');
            const videoTitle = this.getAttribute('data-video-title');
            console.log('🗑️ Clic sur bouton annulation dashboard utilisateur:', videoId);
            cancelUserVideo(videoId, videoTitle);
        });
    });
    
    // Event listeners pour les boutons de suppression des vidéos approuvées
    document.querySelectorAll('.delete-approved-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const videoId = this.getAttribute('data-video-id');
            const videoTitle = this.getAttribute('data-video-title');
            deleteApprovedVideo(videoId, videoTitle);
        });
    });
    
    console.log('✅ Event listeners vidéos attachés');
    
    // Event listeners pour les partenaires
    document.querySelectorAll('.edit-partner-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const partnerId = this.getAttribute('data-partner-id');
            console.log('✏️ Clic sur bouton Modifier partenaire:', partnerId);
            editPartner(partnerId);
        });
    });
    
    document.querySelectorAll('.delete-partner-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const partnerId = this.getAttribute('data-partner-id');
            console.log('🗑️ Clic sur bouton Supprimer partenaire:', partnerId);
            deletePartner(partnerId);
        });
    });
    
    console.log('✅ Event listeners partenaires attachés');
    
    // Event listeners pour les utilisateurs
    document.querySelectorAll('.view-user-details').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.getAttribute('data-user-id');
            viewUserDetails(userId);
        });
    });
    
    document.querySelectorAll('.view-user-payment').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.getAttribute('data-user-id');
            viewUserPayment(userId);
        });
    });
    
    document.querySelectorAll('.toggle-user-ban').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.getAttribute('data-user-id');
            const isBanned = this.getAttribute('data-is-banned') === 'true';
            toggleUserBan(userId, !isBanned);
        });
    });
    
    document.querySelectorAll('.delete-user-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.getAttribute('data-user-id');
            const userName = this.getAttribute('data-user-name');
            const userEmail = this.getAttribute('data-user-email');
            deleteUser(userId, userName, userEmail);
        });
    });
    
    console.log('✅ Event listeners utilisateurs attachés');
    
    // Event listeners pour les catégories
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const categoryId = this.getAttribute('data-category-id');
            const categoryName = this.getAttribute('data-category-name');
            deleteCategory(categoryId, categoryName);
        });
    });
    
    console.log('✅ Event listeners catégories attachés');
}

// Fonction pour attacher les event listeners des catégories
function attachCategoryEventListeners() {
    console.log('🔗 Attachement des event listeners catégories...');
    
    // Supprimer les anciens event listeners pour éviter les doublons
    document.querySelectorAll('.delete-category-btn').forEach(element => {
        element.replaceWith(element.cloneNode(true));
    });
    
    document.querySelectorAll('.edit-category-btn').forEach(element => {
        element.replaceWith(element.cloneNode(true));
    });
    
    // Event listeners pour les boutons de modification de catégories
    document.querySelectorAll('.edit-category-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const categoryId = this.getAttribute('data-category-id');
            const categoryName = this.getAttribute('data-category-name');
            editCategory(categoryId, categoryName);
        });
    });
    
    // Event listeners pour les boutons de suppression de catégories
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const categoryId = this.getAttribute('data-category-id');
            const categoryName = this.getAttribute('data-category-name');
            deleteCategory(categoryId, categoryName);
        });
    });
    
    console.log('✅ Event listeners catégories attachés');
    
    // Event listeners pour les boutons de plein écran
    document.querySelectorAll('.toggle-fullscreen-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖥️ Clic sur bouton plein écran');
            toggleFullscreen();
        });
    });
    
    // Event listeners pour les boutons de téléchargement
    document.querySelectorAll('.download-video-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const videoUrl = this.getAttribute('data-video-url');
            const videoTitle = this.getAttribute('data-video-title');
            console.log('📥 Clic sur bouton téléchargement:', videoUrl);
            downloadVideo(videoUrl, videoTitle);
        });
    });
    
    // Event listeners pour les boutons de retry pending
    document.querySelectorAll('.retry-pending-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔄 Clic sur bouton retry pending');
            loadPendingVideos();
        });
    });
    
    // Event listeners pour les boutons de retry approved
    document.querySelectorAll('.retry-approved-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔄 Clic sur bouton retry approved');
            loadApprovedVideos();
        });
    });
    
    // Event listeners pour les selects de catégorie
    document.querySelectorAll('.category-select').forEach(select => {
        select.addEventListener('change', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const videoId = this.getAttribute('data-video-id');
            const categoryId = this.value;
            console.log('🏷️ Changement de catégorie:', videoId, categoryId);
            updateVideoCategory(videoId, categoryId);
        });
    });
    
    console.log('✅ Event listeners supplémentaires attachés');
}

// Configuration des événements
function setupEventListeners() {
    // S'assurer que la checkbox des conditions fonctionne
    const termsCheckbox = document.getElementById('termsAgreement');
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', function() {
            console.log('Checkbox des conditions:', this.checked);
        });
        
        // S'assurer que le label peut aussi déclencher la checkbox
        const termsLabel = document.querySelector('label[for="termsAgreement"]');
        if (termsLabel) {
            termsLabel.addEventListener('click', function(e) {
                // Ne pas déclencher si on clique sur un lien dans le label
                if (e.target.tagName === 'A' || e.target.tagName === 'U') {
                    return;
                }
                termsCheckbox.checked = !termsCheckbox.checked;
                termsCheckbox.dispatchEvent(new Event('change'));
            });
        }
    }
    
    // Empêcher la propagation des clics sur les liens des conditions
    const termsLinks = document.querySelectorAll('.terms-link');
    termsLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    // Gestion des champs email conditionnels pour les droits d'auteur
    const recordedYes = document.getElementById('recordedYes');
    const recordedNo = document.getElementById('recordedNo');
    const recorderEmailSection = document.getElementById('recorderEmailSection');
    const recorderEmail = document.getElementById('recorderEmail');
    
    if (recordedYes && recordedNo && recorderEmailSection && recorderEmail) {
        recordedYes.addEventListener('change', function() {
            recorderEmailSection.style.display = 'none';
            recorderEmail.value = '';
        });
        
        recordedNo.addEventListener('change', function() {
            recorderEmailSection.style.display = 'block';
        });
    }
    
    const copyrightYes = document.getElementById('copyrightYes');
    const copyrightNo = document.getElementById('copyrightNo');
    const ownerEmailSection = document.getElementById('ownerEmailSection');
    const ownerEmail = document.getElementById('ownerEmail');
    
    if (copyrightYes && copyrightNo && ownerEmailSection && ownerEmail) {
        copyrightYes.addEventListener('change', function() {
            ownerEmailSection.style.display = 'none';
            ownerEmail.value = '';
        });
        
        copyrightNo.addEventListener('change', function() {
            ownerEmailSection.style.display = 'block';
        });
    }
    
    // Event listeners pour la section paiement
    const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
    const paypalSection = document.getElementById('paypalSection');
    const ibanSection = document.getElementById('ibanSection');
    const cryptoSection = document.getElementById('cryptoSection');
    
    if (paymentMethodRadios.length > 0) {
        paymentMethodRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                // Masquer toutes les sections
                paypalSection.style.display = 'none';
                ibanSection.style.display = 'none';
                cryptoSection.style.display = 'none';
                
                // Afficher la section correspondante
                switch(this.value) {
                    case 'paypal':
                        paypalSection.style.display = 'block';
                        break;
                    case 'iban':
                        ibanSection.style.display = 'block';
                        break;
                    case 'crypto':
                        cryptoSection.style.display = 'block';
                        break;
                }
            });
        });
    }
    
    // Gestion du formulaire de paiement
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentForm);
    }
    
    // Charger automatiquement les informations de paiement quand l'onglet s'ouvre
    const paymentTab = document.querySelector('a[href="#payment"]');
    if (paymentTab) {
        paymentTab.addEventListener('click', function() {
            // Charger les informations après un court délai pour laisser le temps à l'onglet de s'ouvrir
            setTimeout(() => {
                loadPaymentInfo();
            }, 100);
        });
    }
    
    // Charger automatiquement les utilisateurs quand l'onglet admin s'ouvre
    const usersTab = document.querySelector('a[href="#users"]');
    if (usersTab) {
        console.log('✅ Event listener ajouté pour l\'onglet utilisateurs');
        usersTab.addEventListener('click', function() {
            console.log('🖱️ Clic sur l\'onglet utilisateurs détecté');
            
            // Vérifier si l'utilisateur est connecté en tant qu'admin
            if (!adminToken && !userToken) {
                console.error('❌ Aucun token disponible');
                showAlert('Vous devez être connecté pour accéder à cette fonctionnalité', 'warning');
                return;
            }
            
            // Charger les utilisateurs après un court délai pour laisser le temps à l'onglet de s'ouvrir
            setTimeout(() => {
                console.log('⏰ Chargement des utilisateurs...');
                loadAdminUsers();
            }, 100);
        });
    } else {
        console.error('❌ Onglet utilisateurs non trouvé');
    }
    
    // Event listener pour la recherche d'utilisateurs
    const userSearchInput = document.getElementById('userSearch');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', debounce(searchUsers, 300));
    }
    
    console.log('Configuration des événements');
    
    // Formulaire d'upload
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleVideoUpload);
    }
    
    // Formulaires de connexion/inscription
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Event listener pour la validation du mot de passe lors de l'inscription
    const registerPassword = document.getElementById('registerPassword');
    if (registerPassword) {
        registerPassword.addEventListener('input', function() {
            updatePasswordStrength(this.value);
        });
    }
    
    // Boutons de déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    

    
    const logoutBtnAdmin = document.getElementById('logoutBtnAdmin');
    if (logoutBtnAdmin) {
        logoutBtnAdmin.addEventListener('click', logout);
    }
    
    // Connexion admin (garder l'ancien système)
    const adminLink = document.querySelector('[data-bs-target="#adminModal"]');
    if (adminLink) {
        adminLink.addEventListener('click', showAdminLogin);
    }
    
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Gestion de la fermeture des modals pour nettoyer le backdrop
    const adminModal = document.getElementById('adminModal');
    if (adminModal) {
        adminModal.addEventListener('hidden.bs.modal', function() {
            // Nettoyer le backdrop
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            // Réinitialiser le body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    }
    
    const adminPanelModal = document.getElementById('adminPanelModal');
    if (adminPanelModal) {
        adminPanelModal.addEventListener('hidden.bs.modal', function() {
            // Nettoyer le backdrop
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            // Réinitialiser le body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    }
    
    // Gestionnaire pour le modal utilisateur
    const userDashboardModal = document.getElementById('userDashboardModal');
    if (userDashboardModal) {
        userDashboardModal.addEventListener('hidden.bs.modal', function() {
            console.log('🚪 Modal utilisateur fermé, nettoyage...');
            // Nettoyer le backdrop
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            // Réinitialiser le body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            console.log('🧹 Nettoyage modal utilisateur terminé');
        });
    }
    
    // Gestionnaire global pour tous les modals
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
        modal.addEventListener('hidden.bs.modal', function() {
            console.log('🚪 Modal fermé:', modal.id);
            // Nettoyer le backdrop
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            // Réinitialiser le body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            console.log('🧹 Nettoyage modal terminé');
        });
    });
    
    // Compteur de caractères pour la description
    const descriptionTextarea = document.getElementById('description');
    if (descriptionTextarea) {
        descriptionTextarea.addEventListener('input', updateCharCounter);
        updateCharCounter();
    }
    
    // Gestion des catégories
    const addCategoryForm = document.getElementById('addCategoryForm');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', handleAddCategory);
    }
    
    // Navigation (seulement les liens avec href vers des sections)
    document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
        // Exclure les liens vers des modals et le bouton de mode sombre
        const hasModalTarget = link.hasAttribute('data-bs-target');
        const isDarkModeToggle = link.id === 'darkModeToggle';
        
        if (!hasModalTarget && !isDarkModeToggle) {
        link.addEventListener('click', handleNavigation);
        }
    });
    
    // Filtres de catégories
    setupCategoryFilterListeners();
    
    // Mode sombre - géré dans setupDarkMode()
    // Pas besoin d'ajouter un event listener ici car il est déjà géré
    
    // Recherche dans la bibliothèque
    const librarySearch = document.getElementById('librarySearch');
    if (librarySearch) {
        librarySearch.addEventListener('input', debounce(searchLibraryVideos, 500));
    }
    
    // Recherche dans les vidéos approuvées (admin)
    const searchApproved = document.getElementById('searchApproved');
    if (searchApproved) {
        searchApproved.addEventListener('input', debounce(searchApprovedVideos, 500));
    }
    
    // Compteur de caractères pour le formulaire de contact
    const contactMessage = document.getElementById('contactMessage');
    if (contactMessage) {
        contactMessage.addEventListener('input', updateContactCharCounter);
        updateContactCharCounter();
    }
    
    // Formulaire de contact
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }
    
    // Compteur de caractères pour le formulaire de partenaire
    const partnerDescription = document.getElementById('partnerDescription');
    if (partnerDescription) {
        partnerDescription.addEventListener('input', updatePartnerCharCounter);
        updatePartnerCharCounter();
    }
    
    // Formulaire de partenaire
    const partnerForm = document.getElementById('partnerForm');
    if (partnerForm) {
        partnerForm.addEventListener('submit', handlePartnerForm);
    }
    
    // Bouton Ajouter un partenaire
    const addPartnerBtn = document.getElementById('addPartnerBtn');
    if (addPartnerBtn) {
        addPartnerBtn.addEventListener('click', function() {
            // Vider complètement le formulaire
            document.getElementById('partnerForm').reset();
            document.getElementById('partnerId').value = '';
            document.getElementById('partnerModalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Ajouter un Partenaire';
            console.log('🧹 Formulaire vidé pour nouvel ajout');
            
            const modal = new bootstrap.Modal(document.getElementById('addPartnerModal'));
            modal.show();
        });
    }
    
    // Liens pour les conditions et politique de confidentialité
    const termsLink = document.getElementById('termsLink');
    if (termsLink) {
        termsLink.addEventListener('click', function(e) {
            e.preventDefault();
            openTermsModal();
        });
    }
    
    const privacyLink = document.getElementById('privacyLink');
    if (privacyLink) {
        privacyLink.addEventListener('click', function(e) {
            e.preventDefault();
            openPrivacyModal();
        });
    }
    
    // Bouton mot de passe oublié
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showForgotPassword();
        });
    }
    
    // Bouton fermer mot de passe oublié
    const closeForgotPasswordBtn = document.getElementById('closeForgotPasswordBtn');
    if (closeForgotPasswordBtn) {
        closeForgotPasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeForgotPasswordModal();
        });
    }
    
    // Bouton recherche vidéos approuvées
    const searchApprovedVideosBtn = document.getElementById('searchApprovedVideosBtn');
    if (searchApprovedVideosBtn) {
        searchApprovedVideosBtn.addEventListener('click', function(e) {
            e.preventDefault();
            searchApprovedVideos();
        });
    }
    
    // Bouton recherche utilisateurs
    const searchUsersBtn = document.getElementById('searchUsersBtn');
    if (searchUsersBtn) {
        searchUsersBtn.addEventListener('click', function(e) {
            e.preventDefault();
            searchUsers();
        });
    }
    
    // Bouton recherche bibliothèque
    const searchLibraryVideosBtn = document.getElementById('searchLibraryVideosBtn');
    if (searchLibraryVideosBtn) {
        searchLibraryVideosBtn.addEventListener('click', function(e) {
            e.preventDefault();
            searchLibraryVideos();
        });
    }
    
    // Formulaire de mot de passe oublié
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
    
    // Charger les partenaires quand le modal s'ouvre
    const partnersModal = document.getElementById('partnersModal');
    if (partnersModal) {
        partnersModal.addEventListener('shown.bs.modal', function() {
            // Toujours afficher la section publique des partenaires
            showPublicSections();
            loadPartners();
        });
    }
    
    // Réinitialiser le formulaire de partenaire quand le modal s'ouvre
    const addPartnerModal = document.getElementById('addPartnerModal');
    if (addPartnerModal) {
        addPartnerModal.addEventListener('shown.bs.modal', function() {
            resetPartnerForm();
        });
    }
    
    // Gestion des onglets du modal de login
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.addEventListener('shown.bs.modal', function() {
            // Masquer le bouton de renvoi d'email quand le modal s'ouvre
            hideResendEmailButton();
            
            // S'assurer que les onglets sont visibles
            const authTabs = document.getElementById('authTabs');
            if (authTabs) {
                const tabs = authTabs.querySelectorAll('.nav-link');
                tabs.forEach(tab => {
                    tab.style.visibility = 'visible';
                    tab.style.opacity = '1';
                    tab.style.display = 'block';
                });
                
                // Forcer les styles en mode sombre
                if (document.body.classList.contains('dark-mode')) {
                    setTimeout(() => {
                        tabs.forEach(tab => {
                            if (tab.classList.contains('active')) {
                                tab.style.background = 'var(--primary-color)';
                                tab.style.color = 'white';
                                tab.style.borderColor = 'var(--primary-color)';
                            } else {
                                tab.style.background = '#ffffff';
                                tab.style.color = '#333';
                                tab.style.borderColor = '#dee2e6';
                            }
                            tab.style.visibility = 'visible';
                            tab.style.opacity = '1';
                            tab.style.display = 'block';
                        });
                    }, 50);
                }
            }
        });
        
        // Masquer le bouton de renvoi d'email quand le modal se ferme
        loginModal.addEventListener('hidden.bs.modal', function() {
            hideResendEmailButton();
        });
        
        // Gestionnaire pour les onglets
        const authTabs = document.getElementById('authTabs');
        if (authTabs) {
            authTabs.addEventListener('click', function(e) {
                if (e.target.classList.contains('nav-link')) {
                    // S'assurer que tous les onglets restent visibles
                    const allTabs = authTabs.querySelectorAll('.nav-link');
                    allTabs.forEach(tab => {
                        tab.style.visibility = 'visible';
                        tab.style.opacity = '1';
                        tab.style.display = 'block';
                    });
                    
                    // Forcer le bon style en mode sombre
                    if (document.body.classList.contains('dark-mode')) {
                        setTimeout(() => {
                            allTabs.forEach(tab => {
                                if (tab.classList.contains('active')) {
                                    tab.style.background = 'var(--primary-color)';
                                    tab.style.color = 'white';
                                    tab.style.borderColor = 'var(--primary-color)';
                                } else {
                                    tab.style.background = '#ffffff';
                                    tab.style.color = '#333';
                                    tab.style.borderColor = '#dee2e6';
                                }
                            });
                        }, 10);
                    }
                }
            });
        }
        
        // Gestionnaire pour le bouton de renvoi d'email
        const resendEmailBtn = loginModal.querySelector('#resendEmailBtn');
        if (resendEmailBtn) {
            resendEmailBtn.addEventListener('click', function() {
                resendVerificationEmail();
            });
        }
    }
    
    console.log('Événements configurés');
}

// ===============================
// GESTION MOT DE PASSE OUBLIÉ
// ===============================

// Afficher le modal de mot de passe oublié
function showForgotPassword() {
    // Fermer le modal de login
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    if (loginModal) {
        loginModal.hide();
    }
    
    // Réinitialiser le formulaire
    document.getElementById('forgotEmail').value = '';
    document.getElementById('forgotPasswordStep1').style.display = 'block';
    document.getElementById('forgotPasswordStep2').style.display = 'none';
    
    // Afficher le modal de mot de passe oublié
    const forgotModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    forgotModal.show();
}

// Fermer le modal de mot de passe oublié
function closeForgotPasswordModal() {
    const forgotModal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
    if (forgotModal) {
        forgotModal.hide();
    }
    
    // Réafficher le modal de login
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

// Gérer la soumission du formulaire de mot de passe oublié
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgotEmail').value;
    
    if (!email) {
        showAlert('Veuillez entrer votre adresse email', 'warning');
        return;
    }
    
    try {
        showAlert('Envoi en cours...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        if (response.ok) {
            // Afficher l'étape 2
            document.getElementById('forgotPasswordStep1').style.display = 'none';
            document.getElementById('forgotPasswordStep2').style.display = 'block';
            showAlert('Email de récupération envoyé avec succès', 'success');
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de l\'envoi de l\'email', 'danger');
        }
    } catch (error) {
        console.error('Erreur mot de passe oublié:', error);
        showAlert('Erreur lors de l\'envoi de l\'email', 'danger');
    }
}

// ===============================
// GESTIONNAIRES D'ÉVÉNEMENTS AUTH
// ===============================

// Gestionnaire de connexion
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    await loginUser(email, password);
}

// Gestionnaire d'inscription
async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation de la force du mot de passe
    const { score } = checkPasswordStrength(password);
    if (score < 3) {
        showAlert('Le mot de passe doit être au moins de force moyenne (3/5). Veuillez choisir un mot de passe plus sécurisé.', 'warning');
        return;
    }
    
    // Validation de la correspondance des mots de passe
    if (password !== confirmPassword) {
        showAlert('Les mots de passe ne correspondent pas.', 'danger');
        return;
    }
    
    await registerUser(name, email, password, confirmPassword);
}

// Gestion des filtres de catégories
function setupCategoryFilterListeners() {
    const filterButtons = document.querySelectorAll('.category-filter:not(.reset-filter)');
    const resetButton = document.querySelector('.reset-filter');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.dataset.category;
            
            // Retirer la classe active de tous les boutons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Ajouter la classe active au bouton cliqué
            this.classList.add('active');
            
            // Filtrer les vidéos
            filterVideosByCategory(categoryId);
            
            // Afficher/masquer le bouton reset
            updateResetButton();
        });
    });
    
    // Event listener pour le bouton reset
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            // Retirer la classe active de tous les boutons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Activer le bouton "Toutes les vidéos"
            const allButton = document.querySelector('.category-filter[data-category="all"]');
            if (allButton) {
                allButton.classList.add('active');
            }
            
            // Afficher toutes les vidéos
            displayVideos(allVideos);
            
            // Masquer le bouton reset
            this.style.display = 'none';
        });
    }
}

function filterVideosByCategory(categoryId) {
    let filteredVideos;
    
    if (categoryId === 'all') {
        filteredVideos = allVideos;
    } else {
        filteredVideos = allVideos.filter(video => 
            video.category && video.category._id === categoryId
        );
    }
    
    displayVideos(filteredVideos);
}

function updateResetButton() {
    const resetButton = document.querySelector('.reset-filter');
    const activeFilters = document.querySelectorAll('.category-filter.active');
    
    if (activeFilters.length > 1) {
        resetButton.style.display = 'inline-block';
    } else {
        resetButton.style.display = 'none';
    }
}

// Gestion de l'upload de vidéo
async function handleVideoUpload(event) {
    event.preventDefault();
    console.log('Upload de vidéo');
    
    // Vérifier si l'utilisateur est connecté
    if (!userToken && !adminToken) {
        showAlert('Vous devez être connecté pour soumettre une vidéo. Veuillez vous connecter d\'abord.', 'warning');
        // Ouvrir automatiquement le modal de connexion
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
        return;
    }
    
    const formData = new FormData();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const videoFile = document.getElementById('video').files[0];
    
    // Nouveaux champs de copyright et propriété
    const recordedVideo = document.querySelector('input[name="recordedVideo"]:checked')?.value;
    const copyrightOwnership = document.querySelector('input[name="copyrightOwnership"]:checked')?.value;
    const termsAgreement = document.getElementById('termsAgreement').checked;
    const signature = document.getElementById('signature').value;
    
    // Nouveaux champs d'email conditionnels
    const recorderEmail = document.getElementById('recorderEmail')?.value || '';
    const ownerEmail = document.getElementById('ownerEmail')?.value || '';
    
    // Debug: Afficher les valeurs récupérées
    console.log('🔍 Valeurs du formulaire récupérées:');
    console.log('  - recordedVideo:', recordedVideo);
    console.log('  - copyrightOwnership:', copyrightOwnership);
    console.log('  - termsAgreement:', termsAgreement);
    console.log('  - signature:', signature);
    console.log('  - recorderEmail:', recorderEmail);
    console.log('  - ownerEmail:', ownerEmail);
    
    // Validation des nouveaux champs
    if (!recordedVideo) {
        showAlert('Veuillez indiquer si vous avez enregistré la vidéo', 'warning');
        return;
    }
    
    if (!copyrightOwnership) {
        showAlert('Veuillez indiquer si vous possédez les droits d\'auteur', 'warning');
        return;
    }
    
    if (!termsAgreement) {
        showAlert('Veuillez accepter les conditions de soumission', 'warning');
        return;
    }
    
    if (!signature.trim()) {
        showAlert('Veuillez signer le formulaire', 'warning');
        return;
    }
    
    if (!videoFile) {
        showAlert('Veuillez sélectionner un fichier vidéo', 'warning');
        return;
    }
    
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('video', videoFile);
    formData.append('recordedVideo', recordedVideo);
    formData.append('copyrightOwnership', copyrightOwnership);
    formData.append('termsAgreement', termsAgreement);
    formData.append('signature', signature);
    formData.append('recorderEmail', recorderEmail);
    formData.append('ownerEmail', ownerEmail);
    
    try {
        // Préparer les headers avec le token si l'utilisateur est connecté
        const headers = {};
        const token = userToken || adminToken; // Utiliser le token disponible (user ou admin)
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/videos/submit`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Vidéo soumise avec succès ! Elle sera visible après validation.', 'success');
            document.getElementById('uploadForm').reset();
            updateStats();
        } else {
            showAlert(result.error || 'Erreur lors de la soumission', 'danger');
        }
    } catch (error) {
        console.error('Erreur upload:', error);
        showAlert('Erreur lors de la soumission de la vidéo', 'danger');
    }
}

// Chargement des vidéos
async function loadVideos() {
    try {
        console.log('🔄 Chargement des vidéos...');
        console.log('🌐 URLs utilisées:', {
            validated: '/api/videos',
            pending: '/api/videos/pending'
        });
        
        // Charger les vidéos validées et en attente en parallèle
        const [validatedResponse, pendingResponse] = await Promise.all([
            fetch('/api/videos'),
            fetch('/api/videos/pending')
        ]);
        
        console.log('📡 Réponses reçues:', {
            validated: { status: validatedResponse.status, ok: validatedResponse.ok },
            pending: { status: pendingResponse.status, ok: pendingResponse.ok }
        });
        
        if (!validatedResponse.ok) {
            throw new Error(`Erreur HTTP ${validatedResponse.status}: ${validatedResponse.statusText}`);
        }
        
        if (!pendingResponse.ok) {
            throw new Error(`Erreur HTTP ${pendingResponse.status}: ${pendingResponse.statusText}`);
        }
        
        const validatedVideos = await validatedResponse.json();
        const pendingVideos = await pendingResponse.json();
        
        console.log('📹 Vidéos validées reçues:', validatedVideos.length);
        console.log('📹 Détails vidéos validées:', validatedVideos);
        console.log('⏳ Vidéos en attente reçues:', pendingVideos.length);
        
        // Mettre à jour les compteurs
        updateVideoCount(validatedVideos.length);
        updatePendingCount(pendingVideos.length);
        
        // Stocker les vidéos validées pour l'affichage public
        allVideos = validatedVideos;
        
        // Afficher uniquement les vidéos validées dans les sections publiques
        console.log('🎬 Affichage des vidéos dans les sections publiques...');
        displayVideos(validatedVideos);
        displayLibraryVideos(validatedVideos);
        
        console.log('✅ Chargement des vidéos terminé');
    } catch (error) {
        console.error('❌ Erreur chargement vidéos:', error);
        console.error('Détails de l\'erreur:', {
            message: error.message,
            stack: error.stack
        });
        showAlert('Erreur lors du chargement des vidéos', 'danger');
    }
}

// Afficher les vidéos dans la bibliothèque (modal)
function displayLibraryVideos(videos) {
    const container = document.getElementById('libraryContainer');
    const countElement = document.getElementById('libraryVideoCount');
    
    if (!container) {
        console.error('❌ Container libraryContainer non trouvé');
        return;
    }
    
    console.log('📚 Affichage de', videos.length, 'vidéos dans la bibliothèque');
    
    // Mettre à jour le compteur
    if (countElement) {
        countElement.textContent = videos.length;
    }
    
    if (videos.length === 0) {
        console.log('📭 Aucune vidéo à afficher dans la bibliothèque');
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="text-muted">
                    <i class="fas fa-video fa-3x mb-3"></i>
                    <h5>Aucune vidéo disponible</h5>
                    <p>La bibliothèque est actuellement vide.</p>
                </div>
            </div>
        `;
        return;
    }
    
    const libraryHTML = videos.map(video => {
        // Gérer les URLs Cloudinary et locales
        let videoUrl = video.s3Url || video.videoUrl;
        
        // Si c'est une URL Cloudinary (commence par https://), l'utiliser directement
        if (videoUrl && videoUrl.startsWith('https://')) {
            // URL Cloudinary - utiliser directement
            console.log('☁️ URL Cloudinary détectée:', videoUrl);
        } else if (videoUrl && !videoUrl.startsWith('http') && !videoUrl.startsWith('/uploads/')) {
            // URL locale relative - ajouter le préfixe
            videoUrl = `/uploads/${videoUrl}`;
            console.log('📁 URL locale détectée:', videoUrl);
        } else if (videoUrl) {
            // URL locale avec préfixe - utiliser directement
            console.log('📁 URL locale avec préfixe:', videoUrl);
        }
        
        return `
        <div class="col-xl-2 col-lg-3 col-md-4 col-sm-6">
            <div class="library-video-card h-100">
                <div class="library-video-thumbnail" data-video-url="${videoUrl}" data-video-title="${video.title}" data-video-description="${video.description || 'Aucune description'}" data-video-category="${video.category ? video.category.name : 'Non catégorisé'}">
                    <video controls preload="metadata" class="w-100 h-100">
                        <source src="${videoUrl}" type="video/mp4">
                        Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                    <div class="library-play-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                    ${(adminToken && currentUser && currentUser.isAdmin === true) ? `
                        <div class="library-admin-actions">
                            <button class="btn btn-danger btn-sm delete-approved-btn" data-video-id="${video._id}" data-video-title="${video.title}" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="library-video-info p-2">
                    <h6 class="library-video-title text-truncate" title="${video.title}">${video.title}</h6>
                    <small class="text-muted d-block">
                        <i class="fas fa-tag me-1"></i>${video.category ? video.category.name : 'Non catégorisé'}
                    </small>
                    <small class="text-muted">
                        <i class="fas fa-calendar me-1"></i>${new Date(video.submittedAt).toLocaleDateString('fr-FR')}
                    </small>
                </div>
            </div>
        </div>
    `}).join('');
    
    container.innerHTML = libraryHTML;
    console.log('✅ Vidéos affichées dans libraryContainer');
    
    // Re-attacher les event listeners pour les nouvelles vidéos avec un délai
    setTimeout(() => {
        attachVideoEventListeners();
    }, 100);
}

// Recherche dans la bibliothèque
function searchLibraryVideos() {
    const searchTerm = document.getElementById('librarySearch').value.toLowerCase();
    
    if (!allVideos) return;
    
    // Commencer par le filtre de catégorie actuel
    const activeFilter = document.querySelector('.library-filter.active');
    const activeCategoryId = activeFilter ? activeFilter.dataset.category : 'all';
    
    let filteredVideos = allVideos;
    
    // Appliquer le filtre de catégorie
    if (activeCategoryId !== 'all') {
        filteredVideos = allVideos.filter(video => 
            video.category && video.category._id === activeCategoryId
        );
    }
    
    // Appliquer la recherche sur les vidéos déjà filtrées par catégorie
    if (searchTerm) {
        filteredVideos = filteredVideos.filter(video => 
            video.title.toLowerCase().includes(searchTerm) ||
            (video.description && video.description.toLowerCase().includes(searchTerm)) ||
            (video.category && video.category.name.toLowerCase().includes(searchTerm))
        );
    }
    
    displayLibraryVideos(filteredVideos);
}

function displayVideos(videos) {
    const container = document.getElementById('videosContainer');
    if (!container) {
        console.error('❌ Container videosContainer non trouvé');
        return;
    }
    
    // Limiter à maximum 6 vidéos pour les vidéos récentes
    const limitedVideos = videos.slice(0, 6);
    
    console.log('🎬 Affichage de', limitedVideos.length, 'vidéos sur', videos.length, 'total dans videosContainer');
    
    if (limitedVideos.length === 0) {
        console.log('📭 Aucune vidéo à afficher');
        container.innerHTML = `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; text-align: center; padding-top: 50px;">
                <div class="alert alert-info text-center" style="max-width: 400px; margin: 0 auto; display: inline-block;">
                    <i class="fas fa-info-circle me-2"></i>
                    Aucune vidéo disponible pour le moment.
                </div>
            </div>
        `;
        return;
    }
    
    const videosHTML = limitedVideos.map(video => {
        // Gérer les URLs Cloudinary et locales
        let videoUrl = video.s3Url || video.videoUrl;
        
        console.log('🔍 DEBUG URL pour vidéo:', video.title);
        console.log('  - s3Url original:', video.s3Url);
        console.log('  - videoUrl original:', video.videoUrl);
        console.log('  - videoUrl sélectionnée:', videoUrl);
        
        // Si c'est une URL Cloudinary (commence par https://), l'utiliser directement
        if (videoUrl && videoUrl.startsWith('https://')) {
            // URL Cloudinary - utiliser directement
            console.log('☁️ URL Cloudinary détectée:', videoUrl);
        } else if (videoUrl && !videoUrl.startsWith('http') && !videoUrl.startsWith('/uploads/')) {
            // URL locale relative - ajouter le préfixe
            videoUrl = `/uploads/${videoUrl}`;
            console.log('📁 URL locale détectée:', videoUrl);
        } else if (videoUrl) {
            // URL locale avec préfixe - utiliser directement
            console.log('📁 URL locale avec préfixe:', videoUrl);
        } else {
            console.log('⚠️ Pas d\'URL trouvée pour la vidéo');
        }
        
        console.log('  - URL finale utilisée:', videoUrl);
        
        return `
        <div class="video-card fade-in-up">
            <div class="video-thumbnail" data-video-url="${videoUrl}" data-video-title="${video.title}" data-video-description="${video.description || 'Aucune description'}" data-video-category="${video.category ? video.category.name : 'Non catégorisé'}">
                <video controls preload="metadata" class="w-100 h-100">
                    <source src="${videoUrl}" type="video/mp4">
                    Votre navigateur ne supporte pas la lecture vidéo.
                </video>
                <div class="play-button">
                    <i class="fas fa-play"></i>
                </div>
                <div class="video-duration"></div>
            </div>
            <div class="video-info">
                <h5 class="video-title">${video.title}</h5>
                <p class="video-description">${video.description || 'Aucune description'}</p>
                <div class="video-meta">
                    <span class="video-category">
                        <i class="fas fa-tag me-1"></i>${video.category ? video.category.name : 'Non catégorisé'}
                    </span>
                    <small class="text-muted">
                        <i class="fas fa-calendar me-1"></i>${new Date(video.submittedAt).toLocaleDateString('fr-FR')}
                    </small>
                </div>
                <div class="video-actions mt-2 text-center">
                    <button class="btn btn-primary btn-sm" data-video-url="${videoUrl}" data-video-title="${video.title}" data-video-description="${video.description || 'Aucune description'}" data-video-category="${video.category ? video.category.name : 'Non catégorisé'}">
                        <i class="fas fa-play me-1"></i>Regarder
                    </button>
                    ${(adminToken && currentUser && currentUser.isAdmin) ? `
                        <button class="btn btn-outline-danger btn-sm ms-1 delete-approved-btn" data-video-id="${video._id}" data-video-title="${video.title}">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `}).join('');
    
    container.innerHTML = videosHTML;
    console.log('✅ Vidéos affichées dans videosContainer');
    
    // Re-attacher les event listeners pour les nouvelles vidéos avec un délai
    setTimeout(() => {
        attachVideoEventListeners();
    }, 100);
}

// Ouvrir un modal pour visionner une vidéo
function openVideoModal(videoUrl, title, description, category) {
    console.log('=== DEBUG openVideoModal ===');
    console.log('videoUrl reçue:', videoUrl);
    console.log('title:', title);
    console.log('description:', description);
    console.log('category:', category);
    console.log('==========================');
    
    // Vérifier si l'URL est valide
    if (!videoUrl || videoUrl.trim() === '') {
        console.error('❌ URL vidéo invalide:', videoUrl);
        showAlert('Erreur: URL vidéo invalide', 'error');
        return;
    }
    
    // Tester l'URL
    console.log('🧪 Test de l\'URL vidéo:', videoUrl);
    fetch(videoUrl, { method: 'HEAD' })
        .then(response => {
            console.log('✅ URL accessible:', response.status, response.statusText);
        })
        .catch(error => {
            console.error('❌ URL non accessible:', error.message);
        });
    
    // Empêcher l'ouverture de plusieurs modals
    if (document.getElementById('videoModal')) {
        console.log('Modal déjà ouvert, fermeture...');
        const existingModal = bootstrap.Modal.getInstance(document.getElementById('videoModal'));
        if (existingModal) {
            existingModal.hide();
        }
        return;
    }
    
    // Décoder les paramètres
    const decodedTitle = decodeURIComponent(title);
    const decodedDescription = decodeURIComponent(description);
    const decodedCategory = decodeURIComponent(category);
    
    // Créer un modal de visionnage
    const modalHtml = `
        <div class="modal fade" id="videoModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${decodedTitle}</h5>
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-8">
                                <div class="video-preview-container" style="background: #000; border-radius: 8px; overflow: hidden;">
                                    <video id="modalVideo" controls style="width: 100%; height: auto; max-height: 400px; object-fit: contain; display: block;">
                                        <source src="${videoUrl}" type="video/mp4">
                                        Votre navigateur ne supporte pas la lecture vidéo.
                                    </video>
                                    <div id="videoError" class="alert alert-danger mt-2" style="display: none;">
                                        Erreur de chargement de la vidéo. Vérifiez que le fichier existe.
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="video-details">
                                    <h6>Description</h6>
                                    <p class="text-muted">${decodedDescription}</p>
                                    
                                    <h6>Catégorie</h6>
                                    <span class="badge bg-secondary">
                                        <i class="fas fa-tag me-1"></i>${decodedCategory}
                                    </span>
                                    
                                    <div class="mt-4">
                                        <h6>Actions</h6>
                                        <button class="btn btn-outline-primary btn-sm toggle-fullscreen-btn">
                                            <i class="fas fa-expand me-1"></i>Plein écran
                                        </button>
                                        ${(adminToken && currentUser && currentUser.isAdmin) ? `
                                            <button class="btn btn-outline-secondary btn-sm ms-1 download-video-btn" data-video-url="${videoUrl}" data-video-title="${decodedTitle}">
                                                <i class="fas fa-download me-1"></i>Télécharger
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Supprimer le modal existant s'il existe
    const existingModal = document.getElementById('videoModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Ajouter le nouveau modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('videoModal'));
    modal.show();
    
    // Gérer les événements vidéo après que le modal soit affiché
    setTimeout(() => {
        const video = document.getElementById('modalVideo');
        const errorDiv = document.getElementById('videoError');
        
        if (video) {
            video.addEventListener('loadstart', () => {
                console.log('Début du chargement vidéo:', video.src);
                errorDiv.style.display = 'none';
            });
            
            video.addEventListener('canplay', () => {
                console.log('Vidéo prête à jouer:', video.src);
                errorDiv.style.display = 'none';
            });
            
            video.addEventListener('error', (e) => {
                console.error('Erreur de chargement vidéo:', video.src, e);
                errorDiv.style.display = 'block';
                errorDiv.textContent = `Erreur de chargement: ${video.error ? video.error.message : 'Fichier non trouvé'}`;
            });
            
            video.addEventListener('loadedmetadata', () => {
                console.log('Métadonnées vidéo chargées:', video.duration);
            });
        }
    }, 100);
    
    // Nettoyer après fermeture
    document.getElementById('videoModal').addEventListener('hidden.bs.modal', function() {
        // Arrêter la vidéo
        const video = this.querySelector('video');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        this.remove();
    });
}

// Basculer le plein écran pour la vidéo
function toggleFullscreen() {
    const video = document.querySelector('#videoModal video');
    if (video) {
        if (video.requestFullscreen) {
            video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
            video.msRequestFullscreen();
        }
    }
}

// Télécharger une vidéo
function downloadVideo(videoUrl, title) {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${title}.mp4`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Chargement des catégories
async function loadCategories() {
    try {
        console.log('🔄 Chargement des catégories...');
        
        const response = await fetch('/api/categories');
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        
        const categoriesData = await response.json();
        
        console.log('📂 Catégories reçues:', categoriesData.length);
        console.log('📂 Détails des catégories:', categoriesData);
        
        // Stocker dans la variable globale
        categories = categoriesData;
        window.categories = categoriesData; // Pour compatibilité
        
        // Mettre à jour l'interface
        updateCategorySelect();
        updateCategoryFilters(categoriesData);
        updateLibraryCategoryFilters(categoriesData);
        updateAdminCategoryFilters(categoriesData);
        
        console.log('✅ Chargement des catégories terminé');
    } catch (error) {
        console.error('❌ Erreur lors du chargement des catégories:', error);
        showAlert('Erreur lors du chargement des catégories', 'danger');
    }
}

function updateCategoryFilters(categories) {
    const filtersContainer = document.querySelector('.category-filters');
    if (!filtersContainer) return;
    
    // Vider le container
    filtersContainer.innerHTML = '';
    
    // Bouton "Toutes les vidéos"
    const allButton = document.createElement('button');
    allButton.className = 'category-filter active';
    allButton.dataset.category = 'all';
    allButton.innerHTML = `<i class="fas fa-video"></i> Toutes les vidéos`;
    filtersContainer.appendChild(allButton);
    
    // Boutons pour chaque catégorie
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-filter';
        button.dataset.category = category._id;
        button.innerHTML = `<i class="fas fa-tag"></i> ${category.name}`;
        filtersContainer.appendChild(button);
    });
    
    // Bouton "Reset" (initialement caché)
    const resetButton = document.createElement('button');
    resetButton.className = 'category-filter reset-filter';
    resetButton.style.display = 'none';
    resetButton.innerHTML = `<i class="fas fa-times"></i> Reset`;
    filtersContainer.appendChild(resetButton);
    
    // Ajouter les event listeners
    setupCategoryFilterListeners();
}

// Mise à jour des filtres de catégorie pour la bibliothèque
function updateLibraryCategoryFilters(categories) {
    const filtersContainer = document.getElementById('libraryCategoryFilters');
    if (!filtersContainer) return;
    
    console.log('Mise à jour des filtres bibliothèque avec:', categories);
    
    // Vider le container
    filtersContainer.innerHTML = '';
    
    // Bouton "Toutes les vidéos"
    const allButton = document.createElement('button');
    allButton.className = 'btn btn-outline-primary library-filter active';
    allButton.dataset.category = 'all';
    allButton.innerHTML = `<i class="fas fa-video me-1"></i>Toutes les vidéos`;
    filtersContainer.appendChild(allButton);
    
    // Boutons pour chaque catégorie
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-primary library-filter ms-2';
        button.dataset.category = category._id;
        button.innerHTML = `<i class="fas fa-tag me-1"></i>${category.name}`;
        filtersContainer.appendChild(button);
    });
    
    // Ajouter les event listeners pour la bibliothèque
    setupLibraryFilterListeners();
}

// Gestionnaire d'événements pour les filtres de la bibliothèque
function setupLibraryFilterListeners() {
    const filterButtons = document.querySelectorAll('.library-filter');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.dataset.category;
            
            // Retirer la classe active de tous les boutons
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline-primary');
            });
            
            // Ajouter la classe active au bouton cliqué
            this.classList.add('active');
            this.classList.remove('btn-outline-primary');
            this.classList.add('btn-primary');
            
            // Filtrer les vidéos de la bibliothèque
            filterLibraryVideosByCategory(categoryId);
        });
    });
}

// Filtrer les vidéos de la bibliothèque par catégorie
function filterLibraryVideosByCategory(categoryId) {
    let filteredVideos;
    
    if (categoryId === 'all') {
        filteredVideos = allVideos;
    } else {
        filteredVideos = allVideos.filter(video => 
            video.category && video.category._id === categoryId
        );
    }
    
    console.log(`Filtrage bibliothèque par catégorie ${categoryId}:`, filteredVideos);
    displayLibraryVideos(filteredVideos);
}

// Mise à jour des filtres de catégorie pour l'admin
function updateAdminCategoryFilters(categories) {
    const filtersContainer = document.getElementById('adminCategoryFilters');
    if (!filtersContainer) return;
    
    console.log('Mise à jour des filtres admin avec:', categories);
    
    // Vider le container
    filtersContainer.innerHTML = '';
    
    // Bouton "Toutes les vidéos"
    const allButton = document.createElement('button');
    allButton.className = 'btn btn-sm btn-outline-secondary admin-filter active me-1';
    allButton.dataset.category = 'all';
    allButton.innerHTML = `<i class="fas fa-video me-1"></i>Toutes`;
    filtersContainer.appendChild(allButton);
    
    // Boutons pour chaque catégorie
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'btn btn-sm btn-outline-secondary admin-filter me-1';
        button.dataset.category = category._id;
        button.innerHTML = `<i class="fas fa-tag me-1"></i>${category.name}`;
        filtersContainer.appendChild(button);
    });
    
    // Ajouter les event listeners pour l'admin
    setupAdminFilterListeners();
}

// Gestionnaire d'événements pour les filtres admin
function setupAdminFilterListeners() {
    const filterButtons = document.querySelectorAll('.admin-filter');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.dataset.category;
            
            // Retirer la classe active de tous les boutons
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-outline-secondary');
            });
            
            // Ajouter la classe active au bouton cliqué
            this.classList.add('active');
            this.classList.remove('btn-outline-secondary');
            this.classList.add('btn-secondary');
            
            // Filtrer les vidéos approuvées
            filterAdminVideosByCategory(categoryId);
        });
    });
}

// Filtrer les vidéos approuvées par catégorie (pour admin)
function filterAdminVideosByCategory(categoryId) {
    // Récupérer le terme de recherche actuel s'il y en a un
    const searchTerm = document.getElementById('searchApproved').value.toLowerCase();
    
    // Recharger les vidéos avec le nouveau filtre et la recherche actuelle
    loadApprovedVideosWithSearch(categoryId, searchTerm);
}

function updateCategorySelect() {
    const select = document.getElementById('category');
    if (!select) {
        console.error('Element select avec id "category" non trouvé');
        return;
    }
    
    console.log('Mise à jour du select des catégories avec:', categories);
    
    const currentValue = select.value;
    
    // Réinitialiser le select
    select.innerHTML = '<option value="">Sélectionner une catégorie (optionnel)</option>';
    
    // Ajouter les catégories
    if (categories && categories.length > 0) {
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category._id;
            option.textContent = category.name;
            select.appendChild(option);
        });
        console.log(`${categories.length} catégories ajoutées au select`);
    } else {
        console.warn('Aucune catégorie disponible');
    }
    
    // Restaurer la valeur précédente si elle existe
    if (currentValue) {
        select.value = currentValue;
    }
}

// Gestion de la connexion admin
function showAdminLogin(event) {
    event.preventDefault();
    const modal = new bootstrap.Modal(document.getElementById('adminModal'));
    modal.show();
}

async function handleAdminLogin(event) {
    event.preventDefault();
    console.log('Tentative de connexion admin');
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        console.log('Résultat de la connexion admin:', result);
        
        if (response.ok && result.token) {
            adminToken = result.token;
            localStorage.setItem('adminToken', adminToken);
            
            // Définir currentUser pour les vérifications admin
            currentUser = {
                isAdmin: true,
                username: username
            };
            
            showAdminLink();
            
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
            if (loginModal) {
                loginModal.hide();
            }
            
            showAdminPanel();
            showAlert('Connexion admin réussie !', 'success');
        } else {
            showAlert(result.error || 'Identifiants incorrects', 'danger');
        }
    } catch (error) {
        console.error('Erreur connexion admin:', error);
        showAlert('Erreur lors de la connexion', 'danger');
    }
}

function showAdminLink() {
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
        adminLink.style.display = 'block';
    }
}

function showAdminPanel() {
    console.log('showAdminPanel appelée');
    const modalElement = document.getElementById('adminPanelModal');
    console.log('Modal element:', modalElement);
    
    if (!modalElement) {
        console.error('Modal adminPanelModal non trouvée');
        showAlert('Erreur: Modal admin non trouvée', 'danger');
        return;
    }
    
    try {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Nettoyer les onglets avant de charger les données
        setTimeout(() => {
            // Retirer la classe active de tous les onglets
            const allTabs = document.querySelectorAll('#adminTabs .nav-link');
            allTabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Masquer tous les contenus d'onglets
            const allTabPanes = document.querySelectorAll('.tab-pane');
            allTabPanes.forEach(pane => {
                pane.classList.remove('show', 'active');
                pane.style.display = 'none';
            });
            
            // S'assurer que le premier onglet est actif
            const firstTab = document.querySelector('#adminTabs .nav-link');
            if (firstTab) {
                firstTab.classList.add('active');
                const targetId = firstTab.getAttribute('href');
                const targetPane = document.querySelector(targetId);
                if (targetPane) {
                    targetPane.classList.add('show', 'active');
                    targetPane.style.display = 'block';
                }
            }
            
            loadAdminData();
        }, 100);
    } catch (error) {
        console.error('Erreur lors de l\'ouverture de la modal:', error);
        showAlert('Erreur lors de l\'ouverture du panel admin', 'danger');
    }
}

async function loadAdminData() {
    // Éviter les chargements multiples simultanés
    if (isLoadingData) {
        console.log('⏸️ Chargement déjà en cours, abandon...');
        return;
    }
    
    isLoadingData = true;
    
    try {
        console.log('🚀 Début loadAdminData');
        console.log('🔑 État des tokens:');
        console.log('   - adminToken:', adminToken ? 'Présent' : 'Absent');
        console.log('   - userToken:', userToken ? 'Présent' : 'Absent');
        console.log('   - currentUser:', currentUser);
        
        // Ajouter un petit délai pour éviter les conflits
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await Promise.all([
            loadPendingVideos(),
            loadApprovedVideos(),
            loadAdminCategories(),
            loadAdminPartners(),
            loadAdminUsers()
        ]);
        console.log('✅ loadAdminData terminé');
    } catch (error) {
        console.error('❌ Erreur chargement données admin:', error);
    } finally {
        isLoadingData = false;
    }
}

async function loadPendingVideos() {
    try {
        console.log('🔄 Début loadPendingVideos');
        
        // Éviter les chargements multiples
        if (loadPendingVideos.loading) {
            console.log('⏸️ loadPendingVideos déjà en cours');
            return;
        }
        loadPendingVideos.loading = true;
        
        const token = adminToken || userToken; // Utiliser le token disponible
        console.log('🔑 Token utilisé:', token ? 'Présent' : 'Absent');
        console.log('🔑 adminToken:', adminToken ? 'Présent' : 'Absent');
        console.log('🔑 userToken:', userToken ? 'Présent' : 'Absent');
        
        const response = await fetch(`${API_BASE_URL}/admin/videos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Réponse API:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur API:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const videos = await response.json();
        console.log('📹 Vidéos en attente reçues:', videos);
        console.log('📹 Nombre de vidéos:', videos.length);
        
        // Debug: Vérifier les données de copyright pour chaque vidéo
        videos.forEach((video, index) => {
            console.log(`🔍 Vidéo ${index + 1} - Données copyright:`, {
                title: video.title,
                recordedVideo: video.recordedVideo,
                copyrightOwnership: video.copyrightOwnership,
                signature: video.signature,
                recordedVideoType: typeof video.recordedVideo,
                copyrightOwnershipType: typeof video.copyrightOwnership
            });
        });
        
        displayPendingVideos(videos);
        updatePendingCount(videos.length);
        console.log('✅ loadPendingVideos terminé avec succès');
    } catch (error) {
        console.error('❌ Erreur chargement vidéos en attente:', error);
        showAlert(`Erreur lors du chargement des vidéos en attente: ${error.message}`, 'danger');
        
        // Afficher un message d'erreur dans le container
        const container = document.getElementById('pendingVideosContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Erreur lors du chargement des vidéos en attente. 
                    <button class="btn btn-sm btn-outline-danger ms-2 retry-pending-btn">
                        <i class="fas fa-redo me-1"></i>Réessayer
                    </button>
                </div>
            `;
        }
    } finally {
        loadPendingVideos.loading = false;
    }
}

function displayPendingVideos(videos) {
    console.log('📹 Affichage des vidéos en attente:', videos);
    
    const container = document.getElementById('pendingVideosContainer');
    if (!container) {
        console.error('❌ Container pendingVideosContainer non trouvé');
        return;
    }
    
    if (videos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Aucune vidéo en attente de validation.</div>';
        return;
    }
    
    // Debug: Afficher les données de copyright pour chaque vidéo
    videos.forEach((video, index) => {
        console.log(`📹 Vidéo ${index + 1}:`, {
            title: video.title,
            recordedVideo: video.recordedVideo,
            copyrightOwnership: video.copyrightOwnership,
            signature: video.signature
        });
    });
    
    container.innerHTML = videos.map(video => `
        <div class="admin-video-item">
            <div class="row">
                <div class="col-md-8">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0">${video.title}</h6>
                        ${video.user ? `<small class="text-info"><i class="fas fa-envelope me-1"></i>${video.user.email}</small>` : '<small class="text-muted">Utilisateur anonyme</small>'}
                </div>
                <p class="mb-2">${video.description || 'Aucune description'}</p>
                
                <!-- Catégorie avec possibilité de modification -->
                <div class="mb-2">
                    <label class="form-label small">Catégorie :</label>
                    <div class="d-flex align-items-center">
                        <select class="form-select form-select-sm me-2 category-select" id="categorySelect_${video._id}" data-video-id="${video._id}">
                            <option value="">Aucune catégorie</option>
                            ${categories.map(cat => `
                                <option value="${cat._id}" ${video.category && video.category._id === cat._id ? 'selected' : ''}>
                                    ${cat.name}
                                </option>
                            `).join('')}
                        </select>
                        <span class="badge bg-secondary small">
                            ${video.category ? video.category.name : 'Aucune'}
                        </span>
                    </div>
                </div>
                
                <small class="text-muted">Soumis le ${new Date(video.submittedAt).toLocaleDateString()}</small>
                
                    <!-- Informations de copyright et propriété -->
                    <div class="copyright-info mt-3">
                                        <h6 class="text-primary mb-2">
                    <i class="fas fa-file-contract me-2"></i>
                    Droits d'auteur et propriété
                </h6>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-2">
                                    <small class="text-muted d-block mb-1">
                                        <i class="fas fa-video me-1"></i>
                                        Avez-vous enregistré la vidéo ?
                                    </small>
                                    <span class="badge ${video.recordedVideo === 'yes' ? 'bg-primary' : 'bg-warning'}">
                                        ${video.recordedVideo === 'yes' ? 'Oui' : 'Non'}
                                    </span>
                                    ${video.recordedVideo === 'no' && video.recorderEmail ? `
                                        <div class="mt-1">
                                            <small class="text-info">
                                                <i class="fas fa-envelope me-1"></i>
                                                Enregistreur: ${video.recorderEmail}
                                            </small>
                                        </div>
                                    ` : ''}
                                    ${video.userEmail ? `
                                        <div class="mt-1">
                                            <small class="text-primary">
                                                <i class="fas fa-user me-1"></i>
                                                Soumis par: ${video.userEmail}
                                            </small>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-2">
                                    <small class="text-muted d-block mb-1">
                                        <i class="fas fa-copyright me-1"></i>
                                        Possédez-vous les droits d'auteur ?
                                    </small>
                                    <span class="badge ${video.copyrightOwnership === 'yes' ? 'bg-primary' : 'bg-warning'}">
                                        ${video.copyrightOwnership === 'yes' ? 'Oui' : 'Non'}
                                    </span>
                                    ${video.copyrightOwnership === 'no' && video.ownerEmail ? `
                                        <div class="mt-1">
                                            <small class="text-info">
                                                <i class="fas fa-envelope me-1"></i>
                                                Propriétaire: ${video.ownerEmail}
                                            </small>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">
                                <i class="fas fa-signature me-1"></i>
                                <strong>Signature :</strong> ${video.signature || 'Non spécifié'}
                            </small>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                <!-- Aperçu vidéo -->
                    <div class="video-preview-container" style="padding-top: 20px; background: #000; border-radius: 8px; overflow: hidden;">
                        <video controls preload="metadata" class="video-preview w-100" style="height: 200px; object-fit: contain; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: #000;">
                        <source src="${window.location.origin}${video.s3Url || video.videoUrl || `/uploads/${video.filename}`}" type="video/mp4">
                        <source src="${video.s3Url || video.videoUrl || `/uploads/${video.filename}`}" type="video/mp4">
                        Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                    </div>
                </div>
            </div>
            
            <div class="admin-actions mt-3">
                <button class="btn btn-success btn-sm validate-btn" data-video-id="${video._id}">
                    <i class="fas fa-check me-1"></i>Valider
                </button>
                <button class="btn btn-warning btn-sm reject-btn" data-video-id="${video._id}">
                    <i class="fas fa-times me-1"></i>Rejeter
                </button>
            </div>
        </div>
    `).join('');
    
    // Ajouter les event listeners pour les boutons
    setTimeout(() => {
        // Event listeners pour les boutons de validation
        document.querySelectorAll('.validate-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const videoId = this.getAttribute('data-video-id');
                validatePendingVideo(videoId);
            });
        });
        
        // Event listeners pour les boutons de rejet
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const videoId = this.getAttribute('data-video-id');
                rejectPendingVideo(videoId);
            });
        });
        
                // Attacher les event listeners pour les vidéos
        attachVideoEventListeners();
        
        console.log('✅ Event listeners ajoutés pour les boutons admin et vidéos');
    }, 100);
}

// Mettre à jour la catégorie d'une vidéo
async function updateVideoCategory(videoId, categoryId) {
    try {
        console.log('📝 Mise à jour catégorie vidéo:', videoId, 'vers catégorie:', categoryId);
        
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/videos/${videoId}/category`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ categoryId: categoryId || null })
        });
        
        if (response.ok) {
            const updatedVideo = await response.json();
            showAlert('Catégorie mise à jour avec succès !', 'success');
            
            // Mettre à jour le badge
            const badge = document.querySelector(`#categorySelect_${videoId}`).parentElement.querySelector('.badge');
            if (badge) {
                const categoryName = categoryId ? categories.find(cat => cat._id === categoryId)?.name || 'Inconnue' : 'Aucune';
                badge.textContent = categoryName;
            }
            
            console.log('✅ Catégorie mise à jour:', updatedVideo);
        } else {
            const error = await response.json();
            showAlert(error.error || 'Erreur lors de la mise à jour', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur mise à jour catégorie:', error);
        showAlert('Erreur lors de la mise à jour de la catégorie', 'danger');
    }
}

// Valider une vidéo en attente
async function validatePendingVideo(videoId) {
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/videos/${videoId}/validate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('Vidéo validée avec succès !', 'success');
            
            // Recharger toutes les données nécessaires
            console.log('🔄 Rechargement des données après validation...');
            
            // Recharger les vidéos en attente
            await loadPendingVideos();
            
            // Recharger les vidéos approuvées
            await loadApprovedVideos();
            
            // Attendre un peu pour s'assurer que la base de données est mise à jour
            console.log('⏳ Attente de la mise à jour de la base de données...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Recharger les vidéos publiques et mettre à jour les stats
            await loadVideos();
            await updateStats();
            
            console.log('✅ Données rechargées avec succès');
            
            // Vérifier que la vidéo a bien été validée
            console.log('🔍 Vérification de la validation...');
            try {
                const checkResponse = await fetch(`${API_BASE_URL}/videos`);
                const checkVideos = await checkResponse.json();
                const validatedVideo = checkVideos.find(v => v._id === videoId);
                console.log('🔍 Vidéo trouvée après validation:', validatedVideo ? {
                    title: validatedVideo.title,
                    status: validatedVideo.status,
                    id: validatedVideo._id
                } : 'Non trouvée');
            } catch (checkError) {
                console.error('❌ Erreur lors de la vérification:', checkError);
            }
            
            // Forcer le rechargement de la page pour s'assurer que tout est à jour
            console.log('🔄 Rechargement de la page pour afficher les vidéos validées...');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            const error = await response.json();
            showAlert(error.error || 'Erreur lors de la validation', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur validation vidéo:', error);
        showAlert('Erreur lors de la validation de la vidéo', 'danger');
    }
}

// Supprimer une vidéo en attente
async function deletePendingVideo(videoId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) {
        return;
    }
    
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/videos/${videoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        showAlert('Vidéo supprimée avec succès', 'success');
        
        // Rafraîchir les données
        await loadPendingVideos();
        await loadApprovedVideos();
        await loadVideos();
        await updateStats();
        
        // Si l'utilisateur est connecté, rafraîchir son dashboard
        if (userToken && currentUser && !currentUser.isAdmin) {
            await loadUserDashboard();
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showAlert(`Erreur lors de la suppression: ${error.message}`, 'danger');
    }
}

async function rejectPendingVideo(videoId) {
    const rejectionReason = prompt('Raison du rejet (optionnel):');
    if (rejectionReason === null) {
        return; // Utilisateur a annulé
    }
    
    const url = `${API_BASE_URL}/admin/videos/${videoId}/reject`;
    console.log('=== DEBUG REJECT ===');
    console.log('URL appelée:', url);
    console.log('videoId:', videoId);
    console.log('rejectionReason:', rejectionReason);
    console.log('==================');
    
    try {
        const token = adminToken || userToken;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rejectionReason })
        });
        
        console.log('Réponse status:', response.status);
        console.log('Réponse statusText:', response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur détaillée:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Résultat du rejet:', result);
        
        showAlert('Vidéo rejetée avec succès', 'success');
        
        // Rafraîchir les données
        await loadPendingVideos();
        await loadApprovedVideos();
        await loadVideos();
        await updateStats();
        
        // Si l'utilisateur est connecté, rafraîchir son dashboard
        if (userToken && currentUser && !currentUser.isAdmin) {
            await loadUserDashboard();
        }
    } catch (error) {
        console.error('Erreur lors du rejet:', error);
        showAlert(`Erreur lors du rejet: ${error.message}`, 'danger');
    }
}

// Charger les vidéos approuvées pour l'admin
async function loadApprovedVideos(categoryFilter = null) {
    try {
        // Éviter les chargements multiples
        if (loadApprovedVideos.loading) {
            console.log('⏸️ loadApprovedVideos déjà en cours');
            return;
        }
        loadApprovedVideos.loading = true;
        
        const token = adminToken || userToken; // Utiliser le token disponible
        const response = await fetch(`${API_BASE_URL}/admin/videos/approved`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let videos = await response.json();
        console.log('Vidéos approuvées:', videos);
        
        // Appliquer le filtre de catégorie si spécifié
        if (categoryFilter && categoryFilter !== 'all') {
            videos = videos.filter(video => 
                video.category && video.category._id === categoryFilter
            );
            console.log(`Vidéos filtrées par catégorie ${categoryFilter}:`, videos);
        }
        
        displayApprovedVideos(videos);
    } catch (error) {
        console.error('Erreur chargement vidéos approuvées:', error);
        showAlert('Erreur lors du chargement des vidéos approuvées', 'danger');
        
        // Afficher un message d'erreur dans le container
        const container = document.getElementById('approvedVideosContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Erreur lors du chargement des vidéos approuvées. 
                    <button class="btn btn-sm btn-outline-danger ms-2 retry-approved-btn">
                        <i class="fas fa-redo me-1"></i>Réessayer
                    </button>
                </div>
            `;
        }
    } finally {
        loadApprovedVideos.loading = false;
    }
}

// Afficher les vidéos approuvées
function displayApprovedVideos(videos) {
    const container = document.getElementById('approvedVideosContainer');
    if (!container) return;
    
    if (videos.length === 0) {
        container.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>Aucune vidéo approuvée pour le moment.</div>';
        return;
    }
    
    container.innerHTML = videos.map(video => {
        // Gérer les URLs Cloudinary et locales
        let videoUrl = video.s3Url || video.videoUrl;
        
        // Si c'est une URL Cloudinary (commence par https://), l'utiliser directement
        if (videoUrl && videoUrl.startsWith('https://')) {
            // URL Cloudinary - utiliser directement
            console.log('☁️ URL Cloudinary détectée:', videoUrl);
        } else if (videoUrl && !videoUrl.startsWith('http') && !videoUrl.startsWith('/uploads/')) {
            // URL locale relative - ajouter le préfixe
            videoUrl = `/uploads/${videoUrl}`;
            console.log('📁 URL locale détectée:', videoUrl);
        } else if (videoUrl) {
            // URL locale avec préfixe - utiliser directement
            console.log('📁 URL locale avec préfixe:', videoUrl);
        }
        
        return `
        <div class="card mb-3 approved-video-item">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <div class="video-thumbnail-small" style="background: #000; border-radius: 4px; overflow: hidden;">
                            <video controls preload="metadata" class="w-100" style="height: 60px; object-fit: contain; border-radius: 4px; background: #000;">
                                <source src="${videoUrl}" type="video/mp4">
                            </video>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6 class="card-title mb-1">${video.title}</h6>
                        <p class="card-text small text-muted mb-1">${video.description || 'Aucune description'}</p>
                        <small class="text-success">
                            <i class="fas fa-check-circle me-1"></i>
                            Approuvée le ${video.validatedAt ? new Date(video.validatedAt).toLocaleDateString('fr-FR') : new Date(video.submittedAt).toLocaleDateString('fr-FR')}
                        </small>
                        ${video.category ? `<br><small class="text-muted"><i class="fas fa-tag me-1"></i>${video.category.name}</small>` : ''}
                    </div>
                    <div class="col-md-2 text-center">
                        <span class="badge bg-success">
                            <i class="fas fa-eye me-1"></i>Publique
                        </span>
                    </div>
                    <div class="col-md-2 text-end">
                        <button class="btn btn-outline-primary btn-sm me-1" data-video-url="${videoUrl}" data-video-title="${video.title}" title="Prévisualiser">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm delete-approved-btn" data-video-id="${video._id}" data-video-title="${video.title}" title="Supprimer définitivement">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
    
    // Attacher les event listeners après l'affichage
    setTimeout(() => {
        attachVideoEventListeners();
    }, 100);
}

// Rechercher dans les vidéos approuvées
function searchApprovedVideos() {
    const searchTerm = document.getElementById('searchApproved').value.toLowerCase();
    
    // Récupérer le filtre de catégorie actuel
    const activeFilter = document.querySelector('.admin-filter.active');
    const activeCategoryId = activeFilter ? activeFilter.dataset.category : 'all';
    
    // Recharger les vidéos avec les filtres combinés
    loadApprovedVideosWithSearch(activeCategoryId, searchTerm);
}

// Charger les vidéos approuvées avec recherche et filtre de catégorie
async function loadApprovedVideosWithSearch(categoryFilter = 'all', searchTerm = '') {
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/videos/approved`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let videos = await response.json();
        
        // Appliquer le filtre de catégorie
        if (categoryFilter && categoryFilter !== 'all') {
            videos = videos.filter(video => 
                video.category && video.category._id === categoryFilter
            );
        }
        
        // Appliquer la recherche
        if (searchTerm) {
            videos = videos.filter(video => 
                video.title.toLowerCase().includes(searchTerm) ||
                (video.description && video.description.toLowerCase().includes(searchTerm)) ||
                (video.category && video.category.name.toLowerCase().includes(searchTerm))
            );
        }
        
        displayApprovedVideos(videos);
        
        // Re-attacher les event listeners pour les nouvelles vidéos
        setTimeout(() => {
            attachVideoEventListeners();
        }, 100);
    } catch (error) {
        console.error('Erreur chargement vidéos approuvées avec recherche:', error);
        showAlert('Erreur lors du chargement des vidéos approuvées', 'danger');
    }
}

// Prévisualiser une vidéo approuvée
function previewApprovedVideo(videoUrl, title) {
    // Créer un modal de prévisualisation
    const modalHtml = `
        <div class="modal fade" id="previewModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Prévisualisation : ${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <video controls class="w-100" style="max-height: 400px;">
                            <source src="${videoUrl}" type="video/mp4">
                            Votre navigateur ne supporte pas la lecture vidéo.
                        </video>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Supprimer le modal existant s'il existe
    const existingModal = document.getElementById('previewModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Ajouter le nouveau modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('previewModal'));
    modal.show();
    
    // Nettoyer après fermeture
    document.getElementById('previewModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Supprimer une vidéo approuvée
async function deleteApprovedVideo(videoId, title) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement la vidéo "${title}" ?\n\nCette action est irréversible et la vidéo ne sera plus visible publiquement.`)) {
        return;
    }
    
    try {
        const token = adminToken || userToken; // Utiliser le token disponible
        console.log('🗑️ Suppression vidéo avec token:', token ? 'Présent' : 'Absent');
        console.log('🔑 adminToken:', adminToken ? 'Présent' : 'Absent');
        console.log('🔑 userToken:', userToken ? 'Présent' : 'Absent');
        
        if (!token) {
            showAlert('Erreur: Aucun token d\'authentification disponible', 'danger');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/videos/${videoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Réponse suppression:', response.status, response.statusText);
        
        if (response.ok) {
            showAlert('Vidéo supprimée avec succès !', 'success');
            // Recharger les données
            await Promise.all([
                loadApprovedVideos(),
                loadVideos(), // Recharger aussi la liste publique et la bibliothèque
                loadCategories(), // Recharger les catégories
                updateStats() // Mettre à jour les statistiques
            ]);
        } else {
            const error = await response.json();
            console.error('❌ Erreur API suppression:', error);
            showAlert(error.error || 'Erreur lors de la suppression', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur suppression vidéo:', error);
        showAlert('Erreur lors de la suppression de la vidéo', 'danger');
    }
}

// Nettoyer les anciennes vidéos qui ne fonctionnent plus
async function cleanupOldVideos() {
    if (!confirm('Voulez-vous supprimer les anciennes vidéos qui ne fonctionnent plus ?')) {
        return;
    }
    
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/videos/cleanup`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        showAlert(result.message, 'success');
        
        // Recharger les données
        await loadAdminData();
        
    } catch (error) {
        console.error('Erreur lors du nettoyage des vidéos:', error);
        showAlert('Erreur lors du nettoyage des vidéos', 'danger');
    }
}

// Nettoyer complètement toutes les vidéos (nettoyage complet)
async function cleanupAllVideos() {
    if (!confirm('⚠️ ATTENTION : Voulez-vous supprimer TOUTES les vidéos de la base de données ? Cette action est irréversible !')) {
        return;
    }
    
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/videos/cleanup-all`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        showAlert(result.message, 'success');
        
        // Recharger les données
        await loadAdminData();
        
    } catch (error) {
        console.error('Erreur lors du nettoyage complet:', error);
        showAlert('Erreur lors du nettoyage complet', 'danger');
    }
}

// Garder seulement la vidéo "test1"
async function keepOnlyTest1() {
    if (!confirm('Voulez-vous supprimer toutes les vidéos sauf "test1" ?')) {
        return;
    }
    
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/videos/keep-only-test1`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        showAlert(result.message, 'success');
        
        // Recharger les données
        await loadAdminData();
        
    } catch (error) {
        console.error('Erreur lors du nettoyage:', error);
        showAlert('Erreur lors du nettoyage', 'danger');
    }
}

// Supprimer TOUTES les vidéos (nettoyage total)
async function deleteAllVideosNow() {
    if (!confirm('⚠️ ATTENTION : Voulez-vous supprimer TOUTES les vidéos de la base de données ? Cette action est irréversible !')) {
        return;
    }
    
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/videos/cleanup-all`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        showAlert(result.message, 'success');
        
        // Recharger toutes les données
        await loadAdminData();
        await loadVideos();
        await loadLibraryVideos();
        
        // Forcer le rechargement de la page après 2 secondes
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Erreur lors de la suppression totale:', error);
        showAlert('Erreur lors de la suppression totale', 'danger');
    }
}

async function loadAdminCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const categories = await response.json();
        displayAdminCategories(categories);
    } catch (error) {
        console.error('Erreur chargement catégories admin:', error);
    }
}

function displayAdminCategories(categories) {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Aucune catégorie disponible.</div>';
        return;
    }
    
    container.innerHTML = categories.map(category => `
        <div class="category-item">
            <span>${category.name}</span>
            <div class="btn-group" role="group">
                <button class="btn btn-primary btn-sm edit-category-btn" data-category-id="${category._id}" data-category-name="${category.name}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm delete-category-btn" data-category-id="${category._id}" data-category-name="${category.name}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Attacher les event listeners après l'affichage
    setTimeout(() => {
        attachCategoryEventListeners();
    }, 100);
}

// Fonction pour ajouter une catégorie
async function handleAddCategory(event) {
    event.preventDefault();
    console.log('Ajout de catégorie');
    
    const name = document.getElementById('newCategoryName').value;
    
    if (!name.trim()) {
        showAlert('Veuillez entrer un nom de catégorie', 'warning');
        return;
    }
    
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            showAlert('Catégorie ajoutée avec succès !', 'success');
            document.getElementById('newCategoryName').value = '';
            // Recharger les catégories et mettre à jour les filtres
            await loadCategories();
            await loadAdminCategories();
            await updateCategorySelect();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Erreur lors de l\'ajout de la catégorie', 'danger');
        }
    } catch (error) {
        console.error('Erreur ajout catégorie:', error);
        showAlert('Erreur lors de l\'ajout de la catégorie', 'danger');
    }
}

// Fonction pour modifier une catégorie
async function editCategory(categoryId, currentName) {
    const newName = prompt(`Modifier le nom de la catégorie "${currentName}" :`, currentName);
    
    if (!newName || newName.trim() === '') {
        showAlert('Le nom de la catégorie ne peut pas être vide', 'warning');
        return;
    }
    
    if (newName === currentName) {
        showAlert('Aucune modification apportée', 'info');
        return;
    }
    
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: newName.trim() })
        });
        
        if (response.ok) {
            const result = await response.json();
            showAlert(result.message || 'Catégorie modifiée avec succès !', 'success');
            // Recharger les catégories et mettre à jour les filtres
            await loadCategories();
            await loadAdminCategories();
            await updateCategorySelect();
            // Mettre à jour les compteurs
            await updateStats();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Erreur lors de la modification de la catégorie', 'danger');
        }
    } catch (error) {
        console.error('Erreur modification catégorie:', error);
        showAlert('Erreur lors de la modification de la catégorie', 'danger');
    }
}

// Fonction pour supprimer une catégorie
async function deleteCategory(categoryId, categoryName = '') {
    const confirmMessage = categoryName 
        ? `Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ?\n\nCette action est irréversible.`
        : 'Êtes-vous sûr de vouloir supprimer cette catégorie ?\n\nCette action est irréversible.';
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('Catégorie supprimée avec succès !', 'success');
            // Recharger les catégories et mettre à jour les filtres
            await loadCategories();
            await loadAdminCategories();
            await updateCategorySelect();
            // Mettre à jour les compteurs
            await updateStats();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Erreur lors de la suppression de la catégorie', 'danger');
        }
    } catch (error) {
        console.error('Erreur suppression catégorie:', error);
        showAlert('Erreur lors de la suppression de la catégorie', 'danger');
    }
}

// Mise à jour des statistiques
async function updateStats() {
    try {
        console.log('🔄 Mise à jour des statistiques...');
        console.log('🌐 Appel API: /api/videos/stats');
        
        // Utiliser la nouvelle route de statistiques qui filtre automatiquement les utilisateurs bannis
        const statsResponse = await fetch('/api/videos/stats');
        
        console.log('📡 Réponse API stats:', {
            status: statsResponse.status,
            ok: statsResponse.ok,
            statusText: statsResponse.statusText
        });
        
        if (!statsResponse.ok) {
            throw new Error(`Erreur statistiques: ${statsResponse.status} - ${statsResponse.statusText}`);
        }
        
        const stats = await statsResponse.json();
        console.log('📊 Statistiques récupérées (utilisateurs non bannis):', stats);
        console.log('👥 Nombre de membres dans la réponse:', stats.members);
        
        // Mettre à jour les compteurs
        updateVideoCount(stats.validated);
        updateMembersCount(stats.members);
        updatePendingCount(stats.pending);
        
        console.log('✅ Statistiques mises à jour avec succès');
    } catch (error) {
        console.error('❌ Erreur mise à jour stats:', error);
        console.error('Détails de l\'erreur:', {
            message: error.message,
            stack: error.stack
        });
    }
}

function updateVideoCount(count) {
    const element = document.getElementById('videoCount');
    if (element) {
        element.textContent = count;
        console.log('📊 Compteur vidéos mis à jour:', count);
    } else {
        console.warn('⚠️ Élément videoCount non trouvé');
    }
}

function updateMembersCount(count) {
    const element = document.getElementById('membersCount');
    if (element) {
        element.textContent = count;
        console.log('📊 Compteur membres mis à jour:', count);
    } else {
        console.warn('⚠️ Élément membersCount non trouvé');
    }
}

function updatePendingCount(count) {
    const element = document.getElementById('pendingCount');
    if (element) {
        element.textContent = count;
        console.log('📊 Compteur en attente mis à jour:', count);
    } else {
        console.warn('⚠️ Élément pendingCount non trouvé');
    }
}

// Gestion de la navigation
function handleNavigation(event) {
    event.preventDefault();
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    // Vérifier que l'attribut href existe
    const href = event.target.getAttribute('href');
    if (!href) {
        console.warn('⚠️ Attribut href manquant pour la navigation');
        return;
    }
    
    const targetId = href.substring(1);
    const targetSection = document.getElementById(targetId);
    
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        console.warn(`⚠️ Section avec l'ID "${targetId}" non trouvée`);
    }
}

// Affichage des alertes
function showAlert(message, type) {
    // Créer la notification toast
    const toast = document.createElement('div');
    toast.className = `notification-toast alert-${type}`;
    toast.innerHTML = `
        <i class="fas ${getAlertIcon(type)} me-2"></i>
        ${message}
    `;
    
    // Ajouter au body
    document.body.appendChild(toast);
    
    // Animation d'apparition
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Animation de disparition après 3 secondes
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// Fonction pour obtenir l'icône selon le type d'alerte
function getAlertIcon(type) {
    switch(type) {
        case 'success':
            return 'fa-check-circle';
        case 'danger':
            return 'fa-exclamation-circle';
        case 'warning':
            return 'fa-exclamation-triangle';
        case 'info':
            return 'fa-info-circle';
        default:
            return 'fa-info-circle';
    }
}

// Fonction utilitaire pour nettoyer les backdrops de modal
function cleanupModalBackdrops() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}

// Compteur de caractères pour la description
function updateCharCounter() {
    const textarea = document.getElementById('description');
    if (!textarea) return;
    
    const maxLength = 1000;
    const currentLength = textarea.value.length;
    const remaining = maxLength - currentLength;
    
    let counter = document.querySelector('.char-counter');
    if (!counter) {
        counter = document.createElement('div');
        counter.className = 'char-counter';
        textarea.parentNode.appendChild(counter);
    }
    
    counter.textContent = `${currentLength}/${maxLength} caractères`;
    
    if (remaining <= 100) {
        counter.style.color = remaining <= 50 ? '#dc3545' : '#ffc107';
    } else {
        counter.style.color = '';
    }
}

// Fonction pour vérifier la force du mot de passe
function checkPasswordStrength(password) {
    let score = 0;
    let feedback = [];
    
    if (password.length >= 8) score++;
    else feedback.push('Au moins 8 caractères');
    
    if (/[a-z]/.test(password)) score++;
    else feedback.push('Au moins une minuscule');
    
    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Au moins une majuscule');
    
    if (/[0-9]/.test(password)) score++;
    else feedback.push('Au moins un chiffre');
    
    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('Au moins un caractère spécial');
    
    return { score, feedback };
}

// Fonction pour mettre à jour l'indicateur de force du mot de passe
function updatePasswordStrength(password) {
    const { score, feedback } = checkPasswordStrength(password);
    const strengthBar = document.getElementById('registerStrengthBar');
    const strengthText = document.getElementById('registerStrengthText');
    const strengthScore = document.getElementById('registerStrengthScore');
    
    if (!strengthBar || !strengthText || !strengthScore) return;
    
    strengthBar.className = 'strength-bar';
    
    if (score <= 2) {
        strengthBar.classList.add('strength-weak');
        strengthText.textContent = 'Faible';
        strengthScore.textContent = `${score}/5`;
    } else if (score <= 3) {
        strengthBar.classList.add('strength-medium');
        strengthText.textContent = 'Moyen';
        strengthScore.textContent = `${score}/5`;
    } else {
        strengthBar.classList.add('strength-strong');
        strengthText.textContent = 'Fort';
        strengthScore.textContent = `${score}/5`;
    }
}

// Fonctions globales pour les boutons admin
window.validateVideo = async function(videoId) {
    try {
        const token = adminToken || userToken; // Utiliser le token disponible
        const response = await fetch(`${API_BASE_URL}/admin/videos/${videoId}/validate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('Vidéo validée avec succès !', 'success');
            // Recharger les données
            await Promise.all([
                loadPendingVideos(),
                loadApprovedVideos(),
                loadVideos(),
                loadCategories(),
                updateStats()
            ]);
            // Fermer le panel admin après validation
            const adminPanelModal = bootstrap.Modal.getInstance(document.getElementById('adminPanelModal'));
            if (adminPanelModal) {
                adminPanelModal.hide();
            }
        } else {
            const result = await response.json();
            showAlert(result.error || 'Erreur lors de la validation', 'danger');
        }
    } catch (error) {
        console.error('Erreur validation:', error);
        showAlert('Erreur lors de la validation', 'danger');
    }
};

window.deleteVideo = async function(videoId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) {
        return;
    }
    
    try {
        const token = adminToken || userToken; // Utiliser le token disponible
        const response = await fetch(`${API_BASE_URL}/admin/videos/${videoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('Vidéo supprimée avec succès !', 'success');
            // Recharger toutes les données
            await Promise.all([
                loadPendingVideos(),
                loadApprovedVideos(),
                loadVideos(),
                loadCategories(),
                updateStats()
            ]);
        } else {
            showAlert('Erreur lors de la suppression', 'danger');
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
        showAlert('Erreur lors de la suppression', 'danger');
    }
};

window.deleteCategory = async function(categoryId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
        return;
    }
    
    try {
        const token = adminToken || userToken;
        const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('Catégorie supprimée avec succès !', 'success');
            // Recharger les catégories et mettre à jour les filtres
            await loadCategories();
            await loadAdminCategories();
            await updateCategorySelect();
            // Mettre à jour les compteurs
            await updateStats();
        } else {
            const result = await response.json();
            showAlert(result.error || 'Erreur lors de la suppression', 'danger');
        }
    } catch (error) {
        console.error('Erreur suppression catégorie:', error);
        showAlert('Erreur lors de la suppression', 'danger');
    }
};

// Fonction pour supprimer une vidéo publique
window.deletePublicVideo = async function(videoId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) {
        return;
    }
    
    try {
        const token = adminToken || userToken; // Utiliser le token disponible
        console.log('🗑️ Suppression vidéo publique avec token:', token ? 'Présent' : 'Absent');
        
        if (!token) {
            showAlert('Erreur: Aucun token d\'authentification disponible', 'danger');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/videos/${videoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Réponse suppression publique:', response.status, response.statusText);
        
        if (response.ok) {
            showAlert('Vidéo supprimée avec succès !', 'success');
            loadVideos();
            loadCategories();
            updateStats();
        } else {
            const result = await response.json();
            console.error('❌ Erreur API suppression publique:', result);
            showAlert(result.error || 'Erreur lors de la suppression', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur suppression vidéo publique:', error);
        showAlert('Erreur lors de la suppression', 'danger');
    }
};

// Recherche en temps réel dans la bibliothèque
document.addEventListener('DOMContentLoaded', function() {
    const librarySearch = document.getElementById('librarySearch');
    if (librarySearch) {
        librarySearch.addEventListener('input', searchLibraryVideos);
    }
});

// ===== FONCTIONS POUR LES PARTENAIRES =====

// Charger les partenaires publics
async function loadPartners() {
    try {
        const response = await fetch(`${API_BASE_URL}/partners`);
        if (response.ok) {
            const partners = await response.json();
            displayPartners(partners);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des partenaires:', error);
    }
}

// Afficher les partenaires publics
function displayPartners(partners) {
    const container = document.getElementById('partnersContainer');
    if (!container) return;

    if (partners.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">Aucun partenaire pour le moment</p>
            </div>
        `;
        return;
    }

    container.innerHTML = partners.map(partner => `
        <div class="col-md-4 col-lg-3">
            <div class="partner-card">
                ${partner.profileImage ? `
                    <img src="${partner.profileImage}" alt="${partner.name}" class="partner-logo" onerror="this.style.display='none'">
                ` : `
                    <div class="partner-logo d-flex align-items-center justify-content-center">
                        <i class="fas fa-user fa-3x text-muted"></i>
                    </div>
                `}
                <div class="partner-info">
                    <h6 class="partner-name">${partner.name}</h6>
                    <p class="partner-username text-primary">@${partner.username}</p>
                    ${partner.description ? `<p class="partner-description">${partner.description}</p>` : ''}
                    ${partner.website ? `
                        <a href="${partner.website}" target="_blank" class="partner-website">
                            <i class="fas fa-external-link-alt me-1"></i>Visiter le site
                        </a>
                    ` : ''}
                    ${partner.email ? `
                        <div class="mt-2">
                            <small class="text-muted">
                                <i class="fas fa-envelope me-1"></i>${partner.email}
                            </small>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Charger les partenaires pour l'admin
async function loadAdminPartners() {
    // Vérifier si on a un token admin ou un utilisateur admin
    const hasAdminToken = !!adminToken;
    const hasAdminUser = currentUser && currentUser.isAdmin && userToken;
    
    if (!hasAdminToken && !hasAdminUser) {
        console.log('❌ Pas de droits admin pour charger les partenaires');
        return;
    }

    try {
        // Utiliser le bon token
        const tokenToUse = hasAdminToken ? adminToken : userToken;
        
        const response = await fetch(`${API_BASE_URL}/partners/admin`, {
            headers: {
                'Authorization': `Bearer ${tokenToUse}`
            }
        });
        
        if (response.ok) {
            const partners = await response.json();
            displayAdminPartners(partners);
        } else {
            console.error('❌ Erreur réponse serveur:', response.status);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des partenaires admin:', error);
    }
}

// Afficher les partenaires avec options admin
function displayAdminPartners(partners) {
    const container = document.getElementById('adminPartnersContainer');
    if (!container) return;

    if (partners.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">Aucun partenaire pour le moment</p>
            </div>
        `;
        return;
    }

    container.innerHTML = partners.map(partner => `
        <div class="col-md-6 col-lg-4">
            <div class="partner-card">
                ${partner.profileImage ? `
                    <img src="${partner.profileImage}" alt="${partner.name}" class="partner-logo" onerror="this.style.display='none'">
                ` : `
                    <div class="partner-logo d-flex align-items-center justify-content-center">
                        <i class="fas fa-user fa-3x text-muted"></i>
                    </div>
                `}
                <div class="partner-info">
                    <h6 class="partner-name">${partner.name}</h6>
                    <p class="partner-username text-primary">@${partner.username}</p>
                    ${partner.description ? `<p class="partner-description">${partner.description}</p>` : ''}
                    ${partner.website ? `
                        <a href="${partner.website}" target="_blank" class="partner-website">
                            <i class="fas fa-external-link-alt me-1"></i>Visiter le site
                        </a>
                    ` : ''}
                    <div class="mt-3">
                        <button class="btn btn-sm btn-outline-primary me-2 edit-partner-btn" data-partner-id="${partner._id}">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-partner-btn" data-partner-id="${partner._id}">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Attacher les event listeners après l'affichage
    setTimeout(() => {
        attachVideoEventListeners();
    }, 100);
}

// Éditer un partenaire
function editPartner(partnerId) {
    console.log('✏️ Édition du partenaire:', partnerId);
    
    // Charger les données du partenaire et ouvrir le modal
    fetch(`${API_BASE_URL}/partners/${partnerId}`)
        .then(response => response.json())
        .then(partner => {
            console.log('📋 Données du partenaire reçues:', partner);
            
            // Ouvrir d'abord le modal
            const modal = new bootstrap.Modal(document.getElementById('addPartnerModal'));
            modal.show();
            
            // Attendre que le modal soit complètement ouvert avant de remplir les champs
            setTimeout(() => {
                // S'assurer que l'élément existe avant de le modifier
                const partnerIdElement = document.getElementById('partnerId');
                if (partnerIdElement) {
                    partnerIdElement.value = partner._id;
                    console.log('✅ partnerId défini dans l\'élément:', partnerIdElement.value);
                } else {
                    console.error('❌ Élément partnerId non trouvé !');
                }
                
                document.getElementById('partnerName').value = partner.name;
                document.getElementById('partnerUsername').value = partner.username || '';
                document.getElementById('partnerEmail').value = partner.email || '';
                document.getElementById('partnerWebsite').value = partner.website || '';
                document.getElementById('partnerDescription').value = partner.description || '';
                
                document.getElementById('partnerModalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Modifier le Partenaire';
                
                console.log('✅ Formulaire rempli avec les données du partenaire');
            }, 100);
        })
        .catch(error => {
            console.error('Erreur lors du chargement du partenaire:', error);
            showAlert('Erreur lors du chargement du partenaire', 'danger');
        });
};

// Supprimer un partenaire
async function deletePartner(partnerId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce partenaire ?')) {
        return;
    }

    console.log('🗑️ Suppression du partenaire:', partnerId);
    console.log('🔍 Vérification des droits admin...');
    console.log('🔐 adminToken:', adminToken ? 'Présent' : 'Absent');
    console.log('🔐 userToken:', userToken ? 'Présent' : 'Absent');
    console.log('👤 currentUser:', currentUser);
    console.log('👤 currentUser.isAdmin:', currentUser ? currentUser.isAdmin : 'N/A');

    // Vérifier les droits admin
    const hasAdminToken = !!adminToken;
    const hasAdminUser = currentUser && currentUser.isAdmin && userToken;
    
    if (!hasAdminToken && !hasAdminUser) {
        console.log('❌ Aucun token admin valide trouvé');
        showAlert('Vous devez être connecté en tant qu\'administrateur', 'warning');
        return;
    }

    try {
        // Utiliser le bon token (priorité à userToken comme dans handlePartnerForm)
        const tokenToUse = userToken || adminToken;
        console.log('🔑 Token à utiliser:', tokenToUse ? `${tokenToUse.substring(0, 30)}...` : 'AUCUN');
        
        const response = await fetch(`${API_BASE_URL}/partners/${partnerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${tokenToUse}`
            }
        });

        console.log('📡 Réponse suppression:', response.status);

        if (response.ok) {
            console.log('✅ Partenaire supprimé avec succès');
            showAlert('Partenaire supprimé avec succès !', 'success');
            loadAdminPartners();
            loadPartners(); // Recharger aussi les partenaires publics
        } else {
            const result = await response.json();
            console.log('❌ Erreur serveur:', result);
            showAlert(result.message || 'Erreur lors de la suppression', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la suppression du partenaire:', error);
        showAlert('Erreur lors de la suppression', 'danger');
    }
};

// Réinitialiser le formulaire de partenaire
function resetPartnerForm() {
    const partnerIdElement = document.getElementById('partnerId');
    const currentPartnerId = partnerIdElement ? partnerIdElement.value : '';
    
    // Si on a déjà un ID, on est en mode édition, ne pas réinitialiser
    if (currentPartnerId && currentPartnerId.trim() !== '') {
        console.log('🧹 Mode édition détecté - pas de réinitialisation');
        return;
    }
    
    document.getElementById('partnerForm').reset();
    document.getElementById('partnerModalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Ajouter un Partenaire';
    console.log('🧹 Formulaire partenaire réinitialisé (mode ajout)');
    console.log('🔍 partnerId après reset:', partnerIdElement ? partnerIdElement.value : 'élément non trouvé');
}







// Gérer le formulaire de partenaire
async function handlePartnerForm(event) {
    event.preventDefault();
    
    // Forcer une nouvelle connexion pour obtenir un token valide
    console.log('🔄 Forçage d\'une nouvelle connexion admin...');
    
    try {
        // Se reconnecter avec les identifiants admin
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@drole.com',
                password: 'admin123'
            })
        });
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            const newToken = loginData.token;
            
            console.log('✅ Nouveau token obtenu:', newToken ? `${newToken.substring(0, 30)}...` : 'AUCUN');
            
            // Mettre à jour le token
            userToken = newToken;
            localStorage.setItem('userToken', newToken);
            
            // Mettre à jour currentUser
            currentUser = loginData.user;
            
            console.log('✅ Connexion admin renouvelée');
        } else {
            console.log('❌ Échec de la reconnexion');
            showAlert('Erreur lors de la reconnexion admin', 'danger');
            return;
        }
    } catch (error) {
        console.log('❌ Erreur de reconnexion:', error);
        showAlert('Erreur lors de la reconnexion admin', 'danger');
        return;
    }
    
            const partnerIdElement = document.getElementById('partnerId');
        const partnerId = partnerIdElement ? partnerIdElement.value : '';
        const profileImageFile = document.getElementById('partnerProfileImage').files[0];
        
        console.log('🔍 Élément partnerId trouvé:', !!partnerIdElement);
        console.log('🔍 Valeur partnerId brute:', partnerId);
        
        try {
            let profileImageUrl = '';
            
            // Upload de l'image si un fichier est sélectionné
            if (profileImageFile) {
                console.log('📸 Upload d\'image en cours...');
                const imageFormData = new FormData();
                imageFormData.append('profileImage', profileImageFile);
                
                // Utiliser le token utilisateur (qui vient d'être renouvelé)
                console.log('🔑 Token pour upload image:', userToken ? `${userToken.substring(0, 30)}...` : 'AUCUN');
                
                const imageResponse = await fetch(`${API_BASE_URL}/partners/upload-image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: imageFormData
                });
                
                console.log('📸 Réponse upload image:', imageResponse.status);
                
                if (imageResponse.ok) {
                    const imageResult = await imageResponse.json();
                    profileImageUrl = imageResult.imageUrl;
                    console.log('✅ Image uploadée:', profileImageUrl);
                } else {
                    const errorData = await imageResponse.json();
                    console.error('❌ Erreur upload image:', errorData);
                    showAlert(`Erreur lors de l'upload de l'image: ${errorData.message || 'Erreur inconnue'}`, 'danger');
                    return;
                }
            }
            
            const formData = {
                name: document.getElementById('partnerName').value,
                username: document.getElementById('partnerUsername').value,
                email: document.getElementById('partnerEmail').value,
                website: document.getElementById('partnerWebsite').value,
                profileImage: profileImageUrl,
                description: document.getElementById('partnerDescription').value,
                status: 'active' // Toujours actif par défaut
            };

            console.log('📝 Données du partenaire:', formData);
            console.log('🔍 partnerId:', partnerId);
            console.log('🔍 partnerId type:', typeof partnerId);
            console.log('🔍 partnerId length:', partnerId ? partnerId.length : 0);

            const url = partnerId && partnerId.trim() !== '' ? 
                `${API_BASE_URL}/partners/${partnerId}` : 
                `${API_BASE_URL}/partners`;
            
            const method = partnerId && partnerId.trim() !== '' ? 'PUT' : 'POST';
            
            console.log('🌐 URL finale:', url);
            console.log('📡 Méthode finale:', method);
            
            console.log('🌐 URL:', url);
            console.log('📡 Méthode:', method);
            
            // Utiliser le token utilisateur (qui vient d'être renouvelé)
            console.log('🔑 Token pour requête:', userToken ? `${userToken.substring(0, 30)}...` : 'AUCUN');
            console.log('🔑 Token complet pour debug: [HIDDEN]');
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify(formData)
            });

            console.log('📡 Réponse serveur:', response.status);

        if (response.ok) {
            const partner = await response.json();
            console.log('✅ Partenaire créé/modifié:', partner);
            showAlert(partnerId ? 'Partenaire modifié avec succès !' : 'Partenaire ajouté avec succès !', 'success');
            
            // Réinitialiser le formulaire
            resetPartnerForm();
            
            // Fermer le modal et recharger les partenaires
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPartnerModal'));
            modal.hide();
            
            loadAdminPartners();
            loadPartners(); // Recharger aussi les partenaires publics
        } else {
            const result = await response.json();
            console.error('❌ Erreur serveur:', result);
            showAlert(result.message || 'Erreur lors de l\'enregistrement', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement du partenaire:', error);
        showAlert('Erreur lors de l\'enregistrement', 'danger');
    }
}

// ===== FONCTIONS POUR LE CONTACT =====

// Gérer le formulaire de contact
async function handleContactForm(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
    };

    try {
        console.log('📧 Envoi du formulaire de contact:', formData);
        
        const response = await fetch('/api/admin/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            showAlert(result.message || 'Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.', 'success');
            
            // Réinitialiser le formulaire
            document.getElementById('contactForm').reset();
            document.querySelector('.contact-char-counter').textContent = '0/500 caractères';
            
            // Fermer le modal de contact
            const contactModal = bootstrap.Modal.getInstance(document.getElementById('contactModal'));
            if (contactModal) {
                contactModal.hide();
            }
        } else {
            showAlert(result.error || 'Erreur lors de l\'envoi du message', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi du formulaire de contact:', error);
        showAlert('Erreur lors de l\'envoi du message. Veuillez réessayer.', 'danger');
    }
}

// Mettre à jour le compteur de caractères du formulaire de contact
function updateContactCharCounter() {
    const textarea = document.getElementById('contactMessage');
    const counter = document.querySelector('.contact-char-counter');
    if (textarea && counter) {
        counter.textContent = `${textarea.value.length}/500 caractères`;
    }
}

// Mettre à jour le compteur de caractères du formulaire de partenaire
function updatePartnerCharCounter() {
    const textarea = document.getElementById('partnerDescription');
    const counter = document.querySelector('.partner-char-counter');
    if (textarea && counter) {
        counter.textContent = `${textarea.value.length}/200 caractères`;
    }
}

// ===== INITIALISATION DES NOUVELLES FONCTIONNALITÉS =====

// Ajouter les gestionnaires d'événements pour les nouvelles fonctionnalités
document.addEventListener('DOMContentLoaded', function() {
    // Gestionnaire pour le formulaire de contact
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }

    // Gestionnaire pour le formulaire de partenaire
    const partnerForm = document.getElementById('partnerForm');
    if (partnerForm) {
        partnerForm.addEventListener('submit', handlePartnerForm);
    }

    // Gestionnaires pour les compteurs de caractères
    const contactMessage = document.getElementById('contactMessage');
    if (contactMessage) {
        contactMessage.addEventListener('input', updateContactCharCounter);
    }

    const partnerDescription = document.getElementById('partnerDescription');
    if (partnerDescription) {
        partnerDescription.addEventListener('input', updatePartnerCharCounter);
    }

    // Charger les partenaires au démarrage
    loadPartners();

    // Gestionnaire pour afficher la section admin des partenaires
    const partnersModal = document.getElementById('partnersModal');
    if (partnersModal) {
        partnersModal.addEventListener('show.bs.modal', function() {
            if (adminToken) {
                document.getElementById('adminPartnersSection').style.display = 'block';
                document.getElementById('publicPartnersSection').style.display = 'none';
                loadAdminPartners();
            } else {
                document.getElementById('adminPartnersSection').style.display = 'none';
                document.getElementById('publicPartnersSection').style.display = 'block';
                loadPartners();
            }
        });
    }

    // Réinitialiser le formulaire de partenaire quand le modal s'ouvre
    const addPartnerModal = document.getElementById('addPartnerModal');
    if (addPartnerModal) {
        addPartnerModal.addEventListener('show.bs.modal', function() {
            if (!document.getElementById('partnerId').value) {
                // Mode ajout - réinitialiser le formulaire
                document.getElementById('partnerForm').reset();
                document.getElementById('partnerModalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Ajouter un Partenaire';
                document.querySelector('.partner-char-counter').textContent = '0/200 caractères';
            }
        });
    }
});

// Fonction pour ouvrir le modal des conditions de soumission
function openTermsModal() {
    const modal = new bootstrap.Modal(document.getElementById('termsModal'));
    modal.show();
}

// Fonction pour ouvrir le modal de la politique de confidentialité
function openPrivacyModal() {
    const modal = new bootstrap.Modal(document.getElementById('privacyModal'));
    modal.show();
}

// Fonctions pour la gestion des paiements
async function handlePaymentForm(event) {
    event.preventDefault();
    
    try {
        console.log('🔍 Début de la soumission du formulaire de paiement');
        
        const formData = new FormData(event.target);
        const paymentData = {
            paymentMethod: formData.get('paymentMethod'),
            paypalEmail: formData.get('paypalEmail'),
            ibanNumber: formData.get('ibanNumber'),
            bankName: formData.get('bankName'),
            accountHolder: formData.get('accountHolder'),
            bicCode: formData.get('bicCode'),
            cryptoType: formData.get('cryptoType'),
            cryptoAddress: formData.get('cryptoAddress'),
            fullName: formData.get('fullName'),
            taxId: formData.get('taxId')
        };
        
        console.log('💳 Données de paiement à sauvegarder:', paymentData);
        console.log('🔍 Token disponible:', !!userToken, !!adminToken);
        
        const token = userToken || adminToken;
        if (!token) {
            showAlert('Vous devez être connecté pour sauvegarder vos informations de paiement.', 'warning');
            return;
        }
        
        console.log('🔍 Envoi de la requête à:', `${API_BASE_URL}/users/payment-info`);
        console.log('🔍 Headers:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
        
        const response = await fetch(`${API_BASE_URL}/users/payment-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(paymentData)
        });
        
        console.log('🔍 Réponse reçue:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Réponse de succès:', result);
            showAlert('Informations de paiement sauvegardées avec succès !', 'success');
            // Recharger les informations pour confirmer la sauvegarde
            setTimeout(() => {
                loadPaymentInfo();
            }, 500);
        } else {
            const error = await response.json();
            console.log('❌ Erreur de réponse:', error);
            showAlert(error.error || 'Erreur lors de la sauvegarde', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur sauvegarde paiement:', error);
        showAlert('Erreur lors de la sauvegarde des informations de paiement', 'danger');
    }
}

async function loadPaymentInfo() {
    try {
        const token = userToken || adminToken;
        if (!token) {
            showAlert('Vous devez être connecté pour charger vos informations de paiement.', 'warning');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/users/payment-info`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const paymentInfo = await response.json();
            console.log('💳 Informations de paiement chargées:', paymentInfo);
            
            // Remplir le formulaire avec les données
            fillPaymentForm(paymentInfo);
            // Pas d'alerte de succès car chargement automatique
        } else {
            const error = await response.json();
            // Pas d'alerte d'erreur pour le chargement automatique (première fois)
            console.log('💳 Aucune information de paiement trouvée (normal pour un nouvel utilisateur)');
        }
    } catch (error) {
        console.error('❌ Erreur chargement paiement:', error);
        showAlert('Erreur lors du chargement des informations de paiement', 'danger');
    }
}

function fillPaymentForm(paymentInfo) {
    // Méthode de paiement
    const paymentMethod = paymentInfo.paymentMethod || 'paypal';
    document.querySelector(`input[name="paymentMethod"][value="${paymentMethod}"]`).checked = true;
    
    // Déclencher l'événement change pour afficher la bonne section
    const event = new Event('change');
    document.querySelector(`input[name="paymentMethod"][value="${paymentMethod}"]`).dispatchEvent(event);
    
    // Remplir les champs PayPal
    if (paymentInfo.paypalEmail) {
        document.getElementById('paypalEmail').value = paymentInfo.paypalEmail;
    }
    
    // Remplir les champs IBAN
    if (paymentInfo.ibanNumber) {
        document.getElementById('ibanNumber').value = paymentInfo.ibanNumber;
    }
    if (paymentInfo.bankName) {
        document.getElementById('bankName').value = paymentInfo.bankName;
    }
    if (paymentInfo.accountHolder) {
        document.getElementById('accountHolder').value = paymentInfo.accountHolder;
    }
    if (paymentInfo.bicCode) {
        document.getElementById('bicCode').value = paymentInfo.bicCode;
    }
    
    // Remplir les champs Crypto
    if (paymentInfo.cryptoType) {
        document.getElementById('cryptoType').value = paymentInfo.cryptoType;
    }
    if (paymentInfo.cryptoAddress) {
        document.getElementById('cryptoAddress').value = paymentInfo.cryptoAddress;
    }
    
    // Remplir les informations personnelles
    if (paymentInfo.fullName) {
        document.getElementById('fullName').value = paymentInfo.fullName;
    }
    if (paymentInfo.taxId) {
        document.getElementById('taxId').value = paymentInfo.taxId;
    }
}

// Fonction pour afficher les utilisateurs admin
async function displayAdminUsers(users) {
    console.log('🎯 Début displayAdminUsers avec', users.length, 'utilisateurs');
    
    const container = document.getElementById('adminUsersContainer');
    if (!container) {
        console.error('❌ Container adminUsersContainer non trouvé');
        return;
    }
    
    console.log('👥 Affichage de', users.length, 'utilisateurs dans adminUsersContainer');
    console.log('📋 Détails des utilisateurs reçus:');
    users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.videos ? user.videos.length : 0} vidéos - Banni: ${user.isBanned}`);
    });
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Aucun utilisateur enregistré pour le moment.
                </div>
            </div>
        `;
        return;
    }
    
    const usersHTML = users.map(user => {
        const videoCount = user.videos ? user.videos.length : 0;
        const bannedStatus = user.isBanned ? 
            '<span class="badge bg-danger"><i class="fas fa-user-slash me-1"></i>Banni</span>' : 
            '<span class="badge bg-success"><i class="fas fa-user-check me-1"></i>Actif</span>';
        
        return `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 user-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${user.name}</h6>
                            <button class="btn btn-outline-secondary btn-sm user-options-btn" type="button" data-user-id="${user._id}" data-user-name="${user.name}" data-user-email="${user.email}" data-user-banned="${user.isBanned}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                        <p class="card-text text-muted mb-2">
                            <i class="fas fa-envelope me-1"></i>${user.email}
                        </p>
                        <p class="card-text text-muted mb-2">
                            <i class="fas fa-video me-1"></i>${videoCount} vidéo(s)
                        </p>
                        <div class="mb-2">
                            ${bannedStatus}
                        </div>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>
                            Inscrit le ${new Date(user.createdAt || user._id.getTimestamp()).toLocaleDateString('fr-FR')}
                        </small>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = usersHTML;
    console.log('✅ Utilisateurs affichés dans adminUsersContainer');
    
    // Attacher les event listeners après l'affichage
    setTimeout(() => {
        attachVideoEventListeners();
        
        // Event listeners pour les boutons d'options utilisateur
        document.querySelectorAll('.user-options-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                const userName = this.getAttribute('data-user-name');
                const userEmail = this.getAttribute('data-user-email');
                const isBanned = this.getAttribute('data-user-banned') === 'true';
                showUserOptions(userId, userName, userEmail, isBanned);
            });
        });
    }, 100);
}

// Fonction pour charger les utilisateurs
async function loadAdminUsers() {
    try {
        console.log('🔍 Début loadAdminUsers');
        const token = adminToken || userToken; // Essayer les deux tokens
        console.log('🔑 Tokens disponibles:');
        console.log('  - adminToken:', adminToken ? 'Présent' : 'Absent');
        console.log('  - userToken:', userToken ? 'Présent' : 'Absent');
        console.log('  - Token utilisé:', token ? 'Présent' : 'Absent');
        
        if (!token) {
            console.error('❌ Token admin manquant');
            showAlert('Vous devez être connecté en tant qu\'administrateur', 'warning');
            return;
        }
        
        console.log('🔑 Token admin présent, appel API...');
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Réponse API:', response.status, response.statusText);
        
        if (response.ok) {
            const users = await response.json();
            console.log('👥 Utilisateurs reçus:', users);
            await displayAdminUsers(users);
        } else {
            const errorText = await response.text();
            console.error('❌ Erreur chargement utilisateurs:', errorText);
        }
    } catch (error) {
        console.error('❌ Erreur chargement utilisateurs:', error);
    }
}

// Fonction pour voir les détails d'un utilisateur
async function viewUserDetails(userId) {
    try {
        const token = adminToken || userToken;
        if (!token) {
            showAlert('Token admin manquant', 'danger');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            
            // Créer un modal pour afficher les détails
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'userDetailsModal';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-user me-2"></i>Détails de l'utilisateur
                            </h5>
                            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Informations du compte</h6>
                                    <p><strong>Nom:</strong> ${user.name}</p>
                                    <p><strong>Email:</strong> ${user.email}</p>
                                    <p><strong>Statut:</strong> ${user.isBanned ? '<span class="badge bg-danger">Banni</span>' : '<span class="badge bg-success">Actif</span>'}</p>
                                    <p><strong>Inscrit le:</strong> ${new Date(user.createdAt || user._id.getTimestamp()).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Informations de paiement</h6>
                                    ${user.paymentInfo ? `
                                        <p><strong>Méthode:</strong> ${user.paymentInfo.paymentMethod || 'Non configuré'}</p>
                                        <p><strong>Nom complet:</strong> ${user.paymentInfo.fullName || 'Non renseigné'}</p>
                                        <p><strong>Numéro fiscal:</strong> ${user.paymentInfo.taxId || 'Non renseigné'}</p>
                                    ` : '<p class="text-muted">Aucune information de paiement configurée</p>'}
                                </div>
                            </div>
                            <hr>
                            <div class="row">
                                <div class="col-12">
                                    <h6>Vidéos de l'utilisateur (${user.videos ? user.videos.length : 0})</h6>
                                    ${user.videos && user.videos.length > 0 ? `
                                        <div class="table-responsive">
                                            <table class="table table-sm">
                                                <thead>
                                                    <tr>
                                                        <th>Titre</th>
                                                        <th>Statut</th>
                                                        <th>Date</th>
                                                        <th>Droits d'auteur</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${user.videos.map(video => `
                                                        <tr>
                                                            <td>${video.title}</td>
                                                            <td>
                                                                <span class="badge ${video.status === 'approved' ? 'bg-success' : video.status === 'pending' ? 'bg-warning' : 'bg-danger'}">
                                                                    ${video.status === 'approved' ? 'Approuvée' : video.status === 'pending' ? 'En attente' : 'Rejetée'}
                                                                </span>
                                                            </td>
                                                            <td>${new Date(video.submittedAt).toLocaleDateString('fr-FR')}</td>
                                                            <td>
                                                                <small>
                                                                    Enregistré: ${video.recordedVideo === 'yes' ? 'Oui' : 'Non'}<br>
                                                                    Propriétaire: ${video.copyrightOwnership === 'yes' ? 'Oui' : 'Non'}
                                                                </small>
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    ` : '<p class="text-muted">Aucune vidéo soumise</p>'}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                            <button type="button" class="btn btn-${user.isBanned ? 'success' : 'danger'}" id="toggleUserBanBtn" data-user-id="${user._id}" data-is-banned="${user.isBanned}">
                                <i class="fas fa-${user.isBanned ? 'user-check' : 'user-slash'} me-1"></i>
                                ${user.isBanned ? 'Débannir' : 'Bannir'} l'utilisateur
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            
            // Nettoyer le modal après fermeture
            modal.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
            });
        } else {
            showAlert('Erreur lors du chargement des détails', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur affichage détails utilisateur:', error);
        showAlert('Erreur lors du chargement des détails', 'danger');
    }
}

// Fonction pour bannir/débannir un utilisateur
async function toggleUserBan(userId, isBanned) {
    try {
        const action = isBanned ? 'bannir' : 'débannir';
        if (!confirm(`Êtes-vous sûr de vouloir ${action} cet utilisateur ?\n\n${isBanned ? 'Ses vidéos seront masquées du public.' : 'Ses vidéos seront à nouveau visibles.'}`)) {
            return;
        }
        
        const token = adminToken || userToken;
        if (!token) {
            showAlert('Token admin manquant', 'danger');
            return;
        }
        
        console.log(`🔍 Tentative de ${action} utilisateur:`, userId);
        console.log('🔑 Token utilisé:', token ? `${token.substring(0, 30)}...` : 'AUCUN');
        console.log('🌐 URL appelée:', `${API_BASE_URL}/admin/users/${userId}/ban`);
        
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ isBanned })
        });
        
        console.log('📡 Réponse serveur:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Réponse de succès:', result);
            showAlert(result.message, 'success');
            
            // Recharger la liste des utilisateurs
            await loadAdminUsers();
            
            // Fermer le modal si ouvert
            const modal = document.getElementById('userDetailsModal');
            if (modal) {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            
            // Recharger les vidéos publiques si nécessaire
            if (typeof loadVideos === 'function') {
                loadVideos();
            }
            if (typeof loadRecentVideos === 'function') {
                loadRecentVideos();
            }
            
            // Mettre à jour les statistiques
            await updateStats();
        } else {
            const error = await response.json();
            console.error('❌ Erreur serveur:', error);
            showAlert(error.error || 'Erreur lors de l\'opération', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur modification statut ban:', error);
        showAlert('Erreur lors de l\'opération', 'danger');
    }
}

// Fonction pour supprimer un utilisateur
async function deleteUser(userId, userName, userEmail) {
    const confirmMessage = `⚠️ ATTENTION : Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur "${userName}" (${userEmail}) ?\n\nCette action est irréversible et supprimera :\n• Le compte utilisateur\n• Toutes ses vidéos\n• Toutes ses données\n\nCette action ne peut pas être annulée !`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const token = adminToken || userToken;
        if (!token) {
            showAlert('Token admin manquant', 'danger');
            return;
        }
        
        console.log(`🗑️ Suppression de l'utilisateur:`, userId, userName, userEmail);
        console.log('🔑 Token utilisé:', token ? `${token.substring(0, 30)}...` : 'AUCUN');
        console.log('🌐 URL appelée:', `${API_BASE_URL}/admin/users/${userId}`);
        
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Réponse serveur:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Réponse de succès:', result);
            showAlert(`Utilisateur "${userName}" supprimé avec succès ! Toutes ses vidéos ont également été supprimées.`, 'success');
            
            // Recharger la liste des utilisateurs
            await loadAdminUsers();
            
            // Mettre à jour les statistiques (compteur de membres)
            await updateStats();
            
            // Recharger les vidéos publiques
            await loadVideos();
            
            // Mettre à jour les statistiques
            await updateStats();
            
            console.log('✅ Utilisateur supprimé avec succès');
        } else {
            const error = await response.json();
            console.error('❌ Erreur serveur:', error);
            showAlert(error.error || 'Erreur lors de la suppression', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur suppression utilisateur:', error);
        showAlert('Erreur lors de la suppression de l\'utilisateur', 'danger');
    }
}

// Fonction pour rechercher des utilisateurs
async function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const userCards = document.querySelectorAll('#adminUsersContainer .card');
    
    userCards.forEach(card => {
        const userName = card.querySelector('.card-title').textContent.toLowerCase();
        const userEmail = card.querySelector('.card-text').textContent.toLowerCase();
        
        if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
            card.closest('.col-md-6').style.display = 'block';
        } else {
            card.closest('.col-md-6').style.display = 'none';
        }
    });
    
    console.log('🔍 Recherche utilisateurs:', searchTerm, 'résultats:', userCards.length);
}

// Fonction pour voir les vidéos d'un utilisateur
async function viewUserVideos(userId) {
    try {
        const token = adminToken || userToken;
        if (!token) {
            showAlert('Token admin manquant', 'danger');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            
            // Créer un modal pour afficher les vidéos
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'userVideosModal';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-video me-2"></i>Vidéos de ${user.name}
                            </h5>
                            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            ${user.videos && user.videos.length > 0 ? `
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Titre</th>
                                                <th>Statut</th>
                                                <th>Date</th>
                                                <th>Droits d'auteur</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${user.videos.map(video => `
                                                <tr>
                                                    <td>${video.title}</td>
                                                    <td>
                                                        <span class="badge ${video.status === 'approved' ? 'bg-success' : video.status === 'pending' ? 'bg-warning' : 'bg-danger'}">
                                                            ${video.status === 'approved' ? 'Approuvée' : video.status === 'pending' ? 'En attente' : 'Rejetée'}
                                                        </span>
                                                    </td>
                                                    <td>${new Date(video.submittedAt).toLocaleDateString('fr-FR')}</td>
                                                    <td>
                                                        <small>
                                                            Enregistré: ${video.recordedVideo === 'yes' ? 'Oui' : 'Non'}<br>
                                                            Propriétaire: ${video.copyrightOwnership === 'yes' ? 'Oui' : 'Non'}
                                                        </small>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : '<p class="text-muted">Aucune vidéo soumise</p>'}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            
            // Nettoyer le modal après fermeture
            modal.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
            });
        } else {
            showAlert('Erreur lors du chargement des vidéos', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur affichage vidéos utilisateur:', error);
        showAlert('Erreur lors du chargement des vidéos', 'danger');
    }
}

// Fonction pour voir les informations de paiement d'un utilisateur
async function viewUserPayment(userId) {
    try {
        const token = adminToken || userToken;
        if (!token) {
            showAlert('Token admin manquant', 'danger');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            
            // Créer un modal pour afficher les informations de paiement
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'userPaymentModal';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-credit-card me-2"></i>Informations de paiement de ${user.name}
                            </h5>
                            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            ${user.paymentInfo ? `
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Méthode de paiement</h6>
                                        <p><strong>Type:</strong> ${user.paymentInfo.paymentMethod || 'Non configuré'}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Informations personnelles</h6>
                                        <p><strong>Nom complet:</strong> ${user.paymentInfo.fullName || 'Non renseigné'}</p>
                                        <p><strong>Numéro fiscal:</strong> ${user.paymentInfo.taxId || 'Non renseigné'}</p>
                                    </div>
                                </div>
                                ${user.paymentInfo.paymentMethod === 'paypal' ? `
                                    <div class="mt-3">
                                        <h6>PayPal</h6>
                                        <p><strong>Email PayPal:</strong> ${user.paymentInfo.paypalEmail || 'Non renseigné'}</p>
                                    </div>
                                ` : ''}
                                ${user.paymentInfo.paymentMethod === 'iban' ? `
                                    <div class="mt-3">
                                        <h6>IBAN</h6>
                                        <p><strong>Numéro IBAN:</strong> ${user.paymentInfo.ibanNumber || 'Non renseigné'}</p>
                                        <p><strong>Nom de la banque:</strong> ${user.paymentInfo.bankName || 'Non renseigné'}</p>
                                    </div>
                                ` : ''}
                                ${user.paymentInfo.paymentMethod === 'crypto' ? `
                                    <div class="mt-3">
                                        <h6>Cryptomonnaies</h6>
                                        ${user.paymentInfo.btcAddress ? `<p><strong>Bitcoin:</strong> ${user.paymentInfo.btcAddress}</p>` : ''}
                                        ${user.paymentInfo.ethAddress ? `<p><strong>Ethereum:</strong> ${user.paymentInfo.ethAddress}</p>` : ''}
                                        ${user.paymentInfo.solAddress ? `<p><strong>Solana:</strong> ${user.paymentInfo.solAddress}</p>` : ''}
                                    </div>
                                ` : ''}
                            ` : '<p class="text-muted">Aucune information de paiement configurée</p>'}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            
            // Nettoyer le modal après fermeture
            modal.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
            });
        } else {
            showAlert('Erreur lors du chargement des informations de paiement', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur affichage paiement utilisateur:', error);
        showAlert('Erreur lors du chargement des informations de paiement', 'danger');
    }
}

// Fonction pour afficher les options utilisateur dans un modal
function showUserOptions(userId, userName, userEmail, isBanned) {
    // Créer le modal
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'userOptionsModal';
    modal.innerHTML = `
        <div class="modal-dialog modal-sm">
            <div class="modal-content">
                <div class="modal-header">
                    <h6 class="modal-title">
                        <i class="fas fa-cog me-2"></i>Options pour ${userName}
                    </h6>
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="d-grid gap-2">
                        <button type="button" class="btn btn-outline-primary btn-sm user-details-btn" data-user-id="${userId}">
                            <i class="fas fa-eye me-2"></i>Voir détails
                        </button>
                        <button type="button" class="btn btn-outline-info btn-sm user-payment-btn" data-user-id="${userId}">
                            <i class="fas fa-credit-card me-2"></i>Infos paiement
                        </button>
                        <hr>
                        <button type="button" class="btn btn-outline-${isBanned ? 'success' : 'warning'} btn-sm user-ban-btn" data-user-id="${userId}" data-is-banned="${isBanned}">
                            <i class="fas fa-${isBanned ? 'user-check' : 'user-slash'} me-2"></i>${isBanned ? 'Débannir' : 'Bannir'}
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-sm user-delete-btn" data-user-id="${userId}" data-user-name="${userName}" data-user-email="${userEmail}">
                            <i class="fas fa-trash me-2"></i>Supprimer définitivement
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Ajouter le modal au body et l'afficher
    document.body.appendChild(modal);
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    
    // Ajouter les event listeners pour les boutons du modal
    setTimeout(() => {
        // Voir détails
        const detailsBtn = modal.querySelector('.user-details-btn');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                viewUserDetails(userId);
                modalInstance.hide();
            });
        }
        
        // Infos paiement
        const paymentBtn = modal.querySelector('.user-payment-btn');
        if (paymentBtn) {
            paymentBtn.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                viewUserPayment(userId);
                modalInstance.hide();
            });
        }
        
        // Bannir/Débannir
        const banBtn = modal.querySelector('.user-ban-btn');
        if (banBtn) {
            banBtn.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                const currentIsBanned = this.getAttribute('data-is-banned') === 'true';
                // Inverser le statut : si actuellement banni, on débannit, sinon on bannit
                const newIsBanned = !currentIsBanned;
                toggleUserBan(userId, newIsBanned);
                modalInstance.hide();
            });
        }
        
        // Supprimer
        const deleteBtn = modal.querySelector('.user-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                const userName = this.getAttribute('data-user-name');
                const userEmail = this.getAttribute('data-user-email');
                deleteUser(userId, userName, userEmail);
                modalInstance.hide();
            });
        }
    }, 100);
    
    // Nettoyer le modal après fermeture
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}