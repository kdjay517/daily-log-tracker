// Enhanced Monthly Work Log Tracker with Cloud Sync
class MonthlyWorkLogTracker {
    constructor() {
        // Project data from the provided JSON
        this.projectData = [
            { "projectId": "IN-1100-NA", "subCode": "0010", "projectTitle": "General Overhead" },
            { "projectId": "WV-1112-4152", "subCode": "0210", "projectTitle": "AS_Strategy" },
            { "projectId": "WV-1112-4152", "subCode": "1010", "projectTitle": "AS_Strategy" },
            { "projectId": "WV-1112-4152", "subCode": "1020", "projectTitle": "AS_Strategy" },
            { "projectId": "RW-1173-9573P00303", "subCode": "0010", "projectTitle": "RW Tracking" }
            { "projectId": " WV-1137-D75B1-C4285-08-03", "subCode": "1250", "projectTitle": "MERCIA_INSIGNIA_ElectronicController_Mil" }
            { "projectId": " WV-1116-4306", "subCode": "0020", "projectTitle": "SensorLess_Controller_Demo" }
        ];

        // Special entry types
        this.specialEntryTypes = [
            { "projectId": "HOLIDAY", "projectTitle": "Holiday", "subCode": null, "chargeCode": "N/A", "color": "orange" },
            { "projectId": "LEAVE", "projectTitle": "Leave", "subCode": null, "chargeCode": "N/A", "color": "red" }
        ];

        // Application state
        this.currentDate = new Date();
        this.selectedDate = null;
        this.monthlyData = {};
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.isAuthenticated = false;
        this.isGuest = false;
        this.user = null;
        this.syncEnabled = true;
        this.isOnline = navigator.onLine;
        this.currentEntryType = 'work';
        this.availableMonths = [];
        this.historicalData = {};

        // Firebase initialization check
        this.firebaseReady = false;
        this.initFirebase();
    }

    async initFirebase() {
        try {
            if (window.auth && window.db) {
                this.firebaseReady = true;
                this.setupAuthStateListener();
                console.log('Firebase initialized successfully');
            } else {
                console.warn('Firebase not available, using localStorage only');
                this.firebaseReady = false;
            }
        } catch (error) {
            console.warn('Firebase initialization failed:', error);
            this.firebaseReady = false;
        }
    }

    async init() {
        console.log('Initializing Enhanced Monthly Work Log Tracker...');
        
        this.setupNetworkListeners();
        this.populateProjectDropdown();
        this.bindEventListeners();
        
        // Check for existing authentication
        if (this.firebaseReady) {
            // Wait for auth state
            await new Promise(resolve => {
                const unsubscribe = window.auth.onAuthStateChanged(user => {
                    unsubscribe();
                    resolve();
                });
            });
        } else {
            // Check for guest mode
            const guestData = localStorage.getItem('guestMode');
            if (guestData) {
                const guest = JSON.parse(guestData);
                this.setupGuestMode(guest.employeeId);
            }
        }

        console.log('Initialization complete');
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateSyncStatus();
            this.showConnectionBanner('Back online! Syncing data...', 'online');
            if (this.isAuthenticated && !this.isGuest) {
                this.syncPendingChanges();
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncStatus();
            this.showConnectionBanner('You\'re offline. Changes will sync when reconnected.', 'offline');
        });
    }

    setupAuthStateListener() {
        if (!this.firebaseReady) return;

        window.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.user = user;
                this.isAuthenticated = true;
                this.isGuest = false;
                await this.loadUserProfile();
                await this.loadCloudData();
                this.showApp();
                this.showMessage('Successfully logged in!', 'success');
            } else {
                this.user = null;
                this.isAuthenticated = false;
                if (!this.isGuest) {
                    this.showAuth();
                }
            }
            this.updateUI();
        });
    }

    // Authentication Methods
    async login(email, password) {
        if (!this.firebaseReady) {
            this.showMessage('Firebase not available. Please try guest mode.', 'error');
            return false;
        }

        this.showLoading('Logging in...');
        try {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signInWithEmailAndPassword(window.auth, email, password);
            return true;
        } catch (error) {
            this.hideLoading();
            this.showMessage(this.getAuthErrorMessage(error.code), 'error');
            return false;
        }
    }

    async register(email, password, employeeId) {
        if (!this.firebaseReady) {
            this.showMessage('Firebase not available. Please try guest mode.', 'error');
            return false;
        }

        this.showLoading('Creating account...');
        try {
            const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
            
            // Create user profile
            await setDoc(doc(window.db, 'users', userCredential.user.uid), {
                employeeId: employeeId,
                email: email,
                createdAt: new Date().toISOString(),
                lastSyncAt: new Date().toISOString()
            });
            
            return true;
        } catch (error) {
            this.hideLoading();
            this.showMessage(this.getAuthErrorMessage(error.code), 'error');
            return false;
        }
    }

    async resetPassword(email) {
        if (!this.firebaseReady) {
            this.showMessage('Firebase not available.', 'error');
            return false;
        }

        try {
            const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await sendPasswordResetEmail(window.auth, email);
            this.showMessage('Password reset email sent!', 'success');
            return true;
        } catch (error) {
            this.showMessage(this.getAuthErrorMessage(error.code), 'error');
            return false;
        }
    }

    async logout() {
        if (this.isGuest) {
            localStorage.removeItem('guestMode');
            this.isGuest = false;
            this.user = null;
            this.showAuth();
            return;
        }

        if (this.firebaseReady) {
            try {
                await window.auth.signOut();
                this.showMessage('Logged out successfully!', 'success');
            } catch (error) {
                this.showMessage('Error logging out: ' + error.message, 'error');
            }
        }
    }

    setupGuestMode(employeeId) {
        this.isGuest = true;
        this.isAuthenticated = false;
        this.user = { uid: 'guest', employeeId: employeeId };
        this.syncEnabled = false;
        
        localStorage.setItem('guestMode', JSON.stringify({ employeeId }));
        
        this.loadLocalData();
        this.showApp();
        this.showMessage('Using guest mode - data stored locally only', 'info');
    }

    // Data Management Methods
    async loadUserProfile() {
        if (!this.firebaseReady || !this.user) return;

        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docRef = doc(window.db, 'users', this.user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const profile = docSnap.data();
                this.user.employeeId = profile.employeeId;
                this.user.profile = profile;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.showMessage('Error loading profile. Using offline mode.', 'error');
        }
    }

    async loadCloudData() {
        if (!this.firebaseReady || !this.user || this.isGuest) {
            this.loadLocalData();
            return;
        }

        this.showLoading('Loading your data...');
        try {
            const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const monthlyRef = collection(window.db, 'users', this.user.uid, 'monthlyData');
            const q = query(monthlyRef, orderBy('monthKey', 'desc'));
            const snapshot = await getDocs(q);
            
            this.historicalData = {};
            this.availableMonths = [];
            
            snapshot.forEach((doc) => {
                const monthData = doc.data();
                this.historicalData[monthData.monthKey] = monthData;
                this.availableMonths.push(monthData.monthKey);
            });
            
            // Load current month data
            const currentMonthKey = this.getMonthKey();
            if (this.historicalData[currentMonthKey]) {
                this.monthlyData = this.historicalData[currentMonthKey].dailyLogs || {};
            } else {
                this.monthlyData = {};
            }
            
            this.migrateLocalStorageData();
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error loading cloud data:', error);
            this.showMessage('Error loading cloud data. Using local storage.', 'error');
            this.loadLocalData();
        }
    }

    loadLocalData() {
        const monthKey = this.getMonthKey();
        const savedData = localStorage.getItem(`worklog_${monthKey}`);
        if (savedData) {
            this.monthlyData = JSON.parse(savedData);
        } else {
            this.monthlyData = {};
        }
        
        // Load available months from localStorage
        this.loadAvailableMonthsLocal();
        console.log('Loaded local data for', monthKey);
    }

    loadAvailableMonthsLocal() {
        this.availableMonths = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('worklog_')) {
                const monthKey = key.replace('worklog_', '');
                this.availableMonths.push(monthKey);
            }
        }
        this.availableMonths.sort().reverse();
    }

    async saveData() {
        // Always save to localStorage
        this.saveToLocalStorage();
        
        // Save to cloud if authenticated and online
        if (this.isAuthenticated && !this.isGuest && this.syncEnabled && this.isOnline) {
            await this.saveToCloud();
        }
    }

    saveToLocalStorage() {
        const monthKey = this.getMonthKey();
        localStorage.setItem(`worklog_${monthKey}`, JSON.stringify(this.monthlyData));
        
        if (this.user && this.user.employeeId) {
            localStorage.setItem('employeeId', this.user.employeeId);
        }
    }

    async saveToCloud() {
        if (!this.firebaseReady || !this.user || this.isGuest) return;

        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const monthKey = this.getMonthKey();
            const stats = this.calculateMonthlyStats();
            
            const monthDoc = doc(window.db, 'users', this.user.uid, 'monthlyData', monthKey);
            await setDoc(monthDoc, {
                monthKey: monthKey,
                dailyLogs: this.monthlyData,
                summary: stats,
                lastUpdated: new Date().toISOString()
            });
            
            this.updateSyncStatus('synced');
            
        } catch (error) {
            console.error('Error saving to cloud:', error);
            this.updateSyncStatus('error');
            this.showMessage('Sync failed. Data saved locally.', 'error');
        }
    }

    async migrateLocalStorageData() {
        if (!this.firebaseReady || this.isGuest) return;

        const hasLocalData = localStorage.getItem('worklog_' + this.getMonthKey());
        if (!hasLocalData) return;

        const shouldMigrate = confirm('Local data found. Would you like to migrate it to the cloud?');
        if (!shouldMigrate) return;

        this.showLoading('Migrating data...');
        
        try {
            // Load all local months
            const monthsToMigrate = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('worklog_')) {
                    const monthKey = key.replace('worklog_', '');
                    const data = JSON.parse(localStorage.getItem(key));
                    monthsToMigrate.push({ monthKey, data });
                }
            }
            
            // Migrate each month
            for (const month of monthsToMigrate) {
                const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const monthDoc = doc(window.db, 'users', this.user.uid, 'monthlyData', month.monthKey);
                
                const stats = this.calculateStatsForData(month.data);
                await setDoc(monthDoc, {
                    monthKey: month.monthKey,
                    dailyLogs: month.data,
                    summary: stats,
                    lastUpdated: new Date().toISOString()
                });
            }
            
            this.hideLoading();
            this.showMessage(`Successfully migrated ${monthsToMigrate.length} months to cloud!`, 'success');
            
            // Reload data
            await this.loadCloudData();
            
        } catch (error) {
            this.hideLoading();
            console.error('Migration error:', error);
            this.showMessage('Migration failed. Data remains in local storage.', 'error');
        }
    }

    // UI Methods
    showAuth() {
        document.getElementById('authContainer').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
    }

    showApp() {
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        
        this.populateMonthSelector();
        this.renderCalendar();
        this.updateMonthlyStats();
        this.renderHistoricalSummary();
        this.updateUI();
    }

    updateUI() {
        this.updateUserDisplay();
        this.updateSyncStatus();
        this.updateQuickStats();
        this.updateExportButtons();
        
        if (this.selectedDate) {
            this.renderDailyProjects();
        }
    }

    updateUserDisplay() {
        const userDisplayName = document.getElementById('userDisplayName');
        const userEmail = document.getElementById('userEmail');
        const userEmployeeId = document.getElementById('userEmployeeId');
        
        if (this.user) {
            if (userDisplayName) userDisplayName.textContent = this.isGuest ? 'Guest' : this.user.email.split('@')[0];
            if (userEmail) userEmail.textContent = this.isGuest ? 'Guest Mode' : this.user.email;
            if (userEmployeeId) userEmployeeId.textContent = this.user.employeeId || 'Not set';
        }
    }

    updateSyncStatus(status) {
        const syncIndicator = document.getElementById('syncIndicator');
        const syncText = document.getElementById('syncText');
        const syncDot = syncIndicator?.querySelector('.sync-dot');
        
        if (!syncIndicator || !syncText || !syncDot) return;

        if (this.isGuest) {
            syncText.textContent = 'Local Only';
            syncDot.className = 'sync-dot offline';
            return;
        }

        if (!this.isOnline) {
            syncText.textContent = 'Offline';
            syncDot.className = 'sync-dot offline';
            return;
        }

        switch (status || 'synced') {
            case 'syncing':
                syncText.textContent = 'Syncing...';
                syncDot.className = 'sync-dot syncing';
                break;
            case 'error':
                syncText.textContent = 'Sync Error';
                syncDot.className = 'sync-dot offline';
                break;
            default:
                syncText.textContent = 'Synced';
                syncDot.className = 'sync-dot';
        }
    }

    updateQuickStats() {
        const stats = this.calculateMonthlyStats();
        const quickTotalHours = document.getElementById('quickTotalHours');
        const quickWorkDays = document.getElementById('quickWorkDays');
        
        if (quickTotalHours) quickTotalHours.textContent = stats.totalHours.toFixed(0);
        if (quickWorkDays) quickWorkDays.textContent = stats.totalDaysWorked;
    }

    populateMonthSelector() {
        const monthSelector = document.getElementById('monthSelector');
        if (!monthSelector) return;

        monthSelector.innerHTML = '';
        
        // Add current month if not in available months
        const currentMonthKey = this.getMonthKey();
        if (!this.availableMonths.includes(currentMonthKey)) {
            this.availableMonths.unshift(currentMonthKey);
        }
        
        // Sort months in reverse order (newest first)
        const sortedMonths = [...this.availableMonths].sort().reverse();
        
        sortedMonths.forEach(monthKey => {
            const option = document.createElement('option');
            option.value = monthKey;
            option.textContent = this.formatMonthKey(monthKey);
            if (monthKey === currentMonthKey) {
                option.selected = true;
            }
            monthSelector.appendChild(option);
        });

        console.log('Month selector populated with', sortedMonths.length, 'months');
    }

    populateProjectDropdown() {
        const projectSelect = document.getElementById('projectSelection');
        if (!projectSelect) return;

        const uniqueProjects = {};
        this.projectData.forEach(item => {
            if (!uniqueProjects[item.projectId]) {
                uniqueProjects[item.projectId] = {
                    projectId: item.projectId,
                    projectTitle: item.projectTitle
                };
            }
        });

        const sortedProjects = Object.values(uniqueProjects).sort((a, b) => 
            `${a.projectId} - ${a.projectTitle}`.localeCompare(`${b.projectId} - ${b.projectTitle}`)
        );

        projectSelect.innerHTML = '<option value="">Select a project...</option>';

        sortedProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.projectId;
            option.textContent = `${project.projectId} - ${project.projectTitle}`;
            option.setAttribute('data-title', project.projectTitle);
            projectSelect.appendChild(option);
        });

        console.log('Project dropdown populated with', sortedProjects.length, 'projects');
    }

    populateSubCodeDropdown(selectedProjectId) {
        const subCodeSelect = document.getElementById('subCodeSelection');
        if (!subCodeSelect) return;

        console.log('Populating sub code dropdown for project:', selectedProjectId);

        if (!selectedProjectId) {
            subCodeSelect.innerHTML = '<option value="">Select sub code...</option>';
            subCodeSelect.disabled = true;
            this.updateChargeCode('', '');
            return;
        }

        const subCodes = this.projectData
            .filter(item => item.projectId === selectedProjectId)
            .map(item => item.subCode)
            .sort();

        console.log('Found sub codes:', subCodes);

        subCodeSelect.innerHTML = '<option value="">Select sub code...</option>';
        
        subCodes.forEach(subCode => {
            const option = document.createElement('option');
            option.value = subCode;
            option.textContent = subCode;
            subCodeSelect.appendChild(option);
        });

        subCodeSelect.disabled = false;
        console.log('Sub code dropdown populated with', subCodes.length, 'options');
    }

    updateChargeCode(projectId, subCode) {
        const chargeCodeInput = document.getElementById('chargeCode');
        if (!chargeCodeInput) return;
        
        if (projectId && subCode) {
            chargeCodeInput.value = `${projectId}-${subCode}`;
            console.log('Charge code updated to:', `${projectId}-${subCode}`);
        } else {
            chargeCodeInput.value = '';
        }
    }

    bindEventListeners() {
        console.log('Binding event listeners...');
        
        // Auth event listeners
        this.bindAuthEventListeners();
        
        // Month navigation
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');
        const monthSelector = document.getElementById('monthSelector');

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                console.log('Previous month clicked');
                this.navigateToPreviousMonth();
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                console.log('Next month clicked');
                this.navigateToNextMonth();
            });
        }

        if (monthSelector) {
            monthSelector.addEventListener('change', (e) => {
                console.log('Month selector changed to:', e.target.value);
                this.navigateToMonth(e.target.value);
            });
        }

        // Project form listeners with improved event handling
        const projectSelection = document.getElementById('projectSelection');
        const subCodeSelection = document.getElementById('subCodeSelection');

        if (projectSelection) {
            projectSelection.addEventListener('change', (e) => {
                const selectedProjectId = e.target.value;
                console.log('Project selection changed to:', selectedProjectId);
                this.populateSubCodeDropdown(selectedProjectId);
                this.updateChargeCode('', '');
            });
        }

        if (subCodeSelection) {
            subCodeSelection.addEventListener('change', (e) => {
                const selectedSubCode = e.target.value;
                const projectId = projectSelection ? projectSelection.value : '';
                console.log('Sub code selection changed to:', selectedSubCode);
                this.updateChargeCode(projectId, selectedSubCode);
            });
        }

        // Entry type tabs
        document.getElementById('workTab')?.addEventListener('click', () => this.switchEntryType('work'));
        document.getElementById('holidayTab')?.addEventListener('click', () => this.switchEntryType('holiday'));
        document.getElementById('leaveTab')?.addEventListener('click', () => this.switchEntryType('leave'));

        // Form submissions
        const projectForm = document.getElementById('projectForm');
        if (projectForm) {
            projectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Project form submitted');
                this.addProjectEntry();
            });
        }

        const specialEntryForm = document.getElementById('specialEntryForm');
        if (specialEntryForm) {
            specialEntryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Special entry form submitted');
                this.addSpecialEntry();
            });
        }

        // Clear buttons
        document.getElementById('clearForm')?.addEventListener('click', () => {
            console.log('Clear form clicked');
            this.clearForm();
        });
        
        document.getElementById('clearSpecialForm')?.addEventListener('click', () => {
            console.log('Clear special form clicked');
            this.clearSpecialForm();
        });

        // User menu
        document.getElementById('userMenuBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleUserMenu();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                this.hideUserMenu();
            }
        });

        // User menu actions
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('backupData')?.addEventListener('click', () => this.exportAllData());
        document.getElementById('restoreData')?.addEventListener('click', () => this.importData());
        document.getElementById('toggleSync')?.addEventListener('click', () => this.toggleSync());

        // Export buttons
        document.getElementById('exportDaily')?.addEventListener('click', () => this.exportDaily());
        document.getElementById('exportMonth')?.addEventListener('click', () => this.exportMonthly());
        document.getElementById('exportRange')?.addEventListener('click', () => this.showDateRangeModal());
        document.getElementById('exportAll')?.addEventListener('click', () => this.exportAllData());

        // Comments character count
        const commentsField = document.getElementById('comments');
        if (commentsField) {
            commentsField.addEventListener('input', (e) => {
                this.updateCharacterCount(e.target.value.length);
            });
        }

        // Modal listeners
        this.bindModalEventListeners();

        console.log('All event listeners bound successfully');
    }

    bindAuthEventListeners() {
        // Auth tabs
        document.getElementById('loginTab')?.addEventListener('click', () => this.switchAuthTab('login'));
        document.getElementById('registerTab')?.addEventListener('click', () => this.switchAuthTab('register'));
        document.getElementById('guestTab')?.addEventListener('click', () => this.switchAuthTab('guest'));

        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await this.login(email, password);
        });

        // Register form
        document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const employeeId = document.getElementById('registerEmployeeId').value;

            if (password !== confirmPassword) {
                this.showMessage('Passwords do not match!', 'error');
                return;
            }

            await this.register(email, password, employeeId);
        });

        // Forgot password
        document.getElementById('forgotPassword')?.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            if (!email) {
                this.showMessage('Please enter your email address first.', 'error');
                return;
            }
            await this.resetPassword(email);
        });

        // Guest mode
        document.getElementById('continueAsGuest')?.addEventListener('click', () => {
            const employeeId = document.getElementById('guestEmployeeId').value.trim();
            if (!employeeId) {
                this.showMessage('Please enter an Employee ID.', 'error');
                return;
            }
            this.setupGuestMode(employeeId);
        });
    }

    bindModalEventListeners() {
        document.getElementById('closeDateRange')?.addEventListener('click', () => this.hideDateRangeModal());
        document.getElementById('cancelRange')?.addEventListener('click', () => this.hideDateRangeModal());
        document.getElementById('exportRangeConfirm')?.addEventListener('click', () => this.exportDateRange());
        
        document.getElementById('dateRangeModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'dateRangeModal') {
                this.hideDateRangeModal();
            }
        });

        // File input for restore
        document.getElementById('fileInput')?.addEventListener('change', (e) => this.handleFileImport(e));
    }

    switchAuthTab(tab) {
        // Remove active class from all tabs
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));

        // Activate selected tab
        document.getElementById(`${tab}Tab`)?.classList.add('active');
        
        if (tab === 'login') {
            document.getElementById('loginForm')?.classList.remove('hidden');
        } else if (tab === 'register') {
            document.getElementById('registerForm')?.classList.remove('hidden');
        } else if (tab === 'guest') {
            document.getElementById('guestMode')?.classList.remove('hidden');
        }
    }

    switchEntryType(type) {
        this.currentEntryType = type;
        console.log('Switching entry type to:', type);
        
        // Update tab appearance
        document.querySelectorAll('.entry-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${type}Tab`)?.classList.add('active');
        
        // Show/hide forms
        const projectForm = document.getElementById('projectForm');
        const specialEntryForm = document.getElementById('specialEntryForm');
        
        if (type === 'work') {
            projectForm?.classList.remove('hidden');
            specialEntryForm?.classList.add('hidden');
        } else {
            projectForm?.classList.add('hidden');
            specialEntryForm?.classList.remove('hidden');
            
            // Set special type
            const specialType = document.getElementById('specialType');
            if (specialType) {
                specialType.value = type.toUpperCase();
            }
        }
    }

    async navigateToMonth(monthKey) {
        console.log('Navigating to month:', monthKey);
        const [year, month] = monthKey.split('-').map(Number);
        this.currentYear = year;
        this.currentMonth = month - 1;
        
        // Load data for the selected month
        if (this.isAuthenticated && !this.isGuest && this.historicalData[monthKey]) {
            this.monthlyData = this.historicalData[monthKey].dailyLogs || {};
        } else {
            const savedData = localStorage.getItem(`worklog_${monthKey}`);
            this.monthlyData = savedData ? JSON.parse(savedData) : {};
        }
        
        this.clearSelectedDate();
        this.renderCalendar();
        this.updateMonthlyStats();
        this.renderHistoricalSummary();
        this.updateUI();
    }

    navigateToPreviousMonth() {
        if (this.currentMonth === 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else {
            this.currentMonth--;
        }
        this.navigateToMonth(this.getMonthKey());
    }

    navigateToNextMonth() {
        if (this.currentMonth === 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else {
            this.currentMonth++;
        }
        this.navigateToMonth(this.getMonthKey());
    }

    // Calendar rendering and date selection
    renderCalendar() {
        const calendarDates = document.getElementById('calendarDates');
        if (!calendarDates) return;

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        calendarDates.innerHTML = '';

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-date other-month';
            calendarDates.appendChild(emptyCell);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateCell = document.createElement('div');
            const dateKey = this.formatDateKey(this.currentYear, this.currentMonth, day);
            const dayData = this.monthlyData[dateKey];
            const isToday = this.isToday(this.currentYear, this.currentMonth, day);
            const isWeekend = this.isWeekend(this.currentYear, this.currentMonth, day);

            dateCell.className = 'calendar-date';
            dateCell.setAttribute('data-date', dateKey);
            if (isToday) dateCell.classList.add('today');
            if (isWeekend) dateCell.classList.add('weekend');
            
            if (dayData) {
                dateCell.classList.add('has-work');
                // Add special styling for holidays/leave
                const hasSpecial = dayData.projects.some(p => p.entryType === 'HOLIDAY' || p.entryType === 'LEAVE');
                if (hasSpecial) {
                    const specialType = dayData.projects.find(p => p.entryType === 'HOLIDAY' || p.entryType === 'LEAVE').entryType;
                    dateCell.classList.add(specialType.toLowerCase());
                }
            }

            dateCell.innerHTML = `
                <div class="date-number">${day}</div>
                <div class="date-info">
                    ${dayData ? `<div class="date-hours">${dayData.totalHours.toFixed(1)}h</div>` : ''}
                    ${dayData ? `<div class="project-count">${dayData.projects.length}</div>` : ''}
                </div>
            `;

            dateCell.addEventListener('click', () => this.selectDate(this.currentYear, this.currentMonth, day));
            calendarDates.appendChild(dateCell);
        }

        // Update month selector
        const monthSelector = document.getElementById('monthSelector');
        if (monthSelector) {
            monthSelector.value = this.getMonthKey();
        }

        // Restore selected date if it exists in current month
        if (this.selectedDate && 
            this.selectedDate.year === this.currentYear && 
            this.selectedDate.month === this.currentMonth) {
            this.updateCalendarSelection();
        }

        console.log('Calendar rendered for', this.getMonthKey());
    }

    selectDate(year, month, day) {
        this.selectedDate = { year, month, day };
        console.log('Date selected:', this.selectedDate);
        this.updateCalendarSelection();
        this.showDailyEntry();
        this.renderDailyProjects();
        this.updateExportButtons();
    }

    updateCalendarSelection() {
        document.querySelectorAll('.calendar-date').forEach(cell => {
            cell.classList.remove('selected');
        });
        
        if (this.selectedDate) {
            const dateKey = this.formatDateKey(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day);
            const selectedCell = document.querySelector(`[data-date="${dateKey}"]`);
            if (selectedCell) {
                selectedCell.classList.add('selected');
            }
        }
    }

    clearSelectedDate() {
        this.selectedDate = null;
        document.querySelectorAll('.calendar-date').forEach(cell => {
            cell.classList.remove('selected');
        });
        this.hideDailyEntry();
        this.updateExportButtons();
    }

    showDailyEntry() {
        if (!this.selectedDate) return;

        const entryForm = document.getElementById('entryForm');
        const selectedDateDisplay = document.getElementById('selectedDateDisplay');

        if (entryForm) {
            entryForm.classList.remove('hidden');
        }

        if (selectedDateDisplay) {
            const dateStr = new Date(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day)
                .toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            selectedDateDisplay.textContent = dateStr;
        }
    }

    hideDailyEntry() {
        const entryForm = document.getElementById('entryForm');
        const selectedDateDisplay = document.getElementById('selectedDateDisplay');

        if (entryForm) {
            entryForm.classList.add('hidden');
        }

        if (selectedDateDisplay) {
            selectedDateDisplay.textContent = 'Select a date to log work';
        }
    }

    // Entry management
    async addProjectEntry() {
        console.log('Adding project entry...');
        
        if (!this.validateForm()) return;
        if (!this.selectedDate) {
            this.showMessage('Please select a date first.', 'error');
            return;
        }

        const projectId = document.getElementById('projectSelection').value;
        const subCode = document.getElementById('subCodeSelection').value;
        const hours = parseFloat(document.getElementById('hoursSpent').value);
        const comments = document.getElementById('comments').value.trim();

        console.log('Entry data:', { projectId, subCode, hours, comments });

        const projectSelect = document.getElementById('projectSelection');
        const selectedOption = projectSelect.options[projectSelect.selectedIndex];
        const projectTitle = selectedOption.getAttribute('data-title');

        const dateKey = this.formatDateKey(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day);

        if (this.isDuplicate(dateKey, projectId, subCode)) {
            this.showMessage('This project and sub code combination already exists for this date.', 'error');
            return;
        }

        if (!this.monthlyData[dateKey]) {
            this.monthlyData[dateKey] = { projects: [], totalHours: 0 };
        }

        const entry = {
            projectId,
            projectTitle,
            subCode,
            chargeCode: `${projectId}-${subCode}`,
            hours,
            comments,
            entryType: 'WORK',
            createdAt: new Date().toISOString()
        };

        this.monthlyData[dateKey].projects.push(entry);
        this.monthlyData[dateKey].totalHours += hours;

        await this.saveData();
        this.clearForm();
        this.renderCalendar();
        this.renderDailyProjects();
        this.updateMonthlyStats();
        this.updateUI();
        this.showMessage('Work entry added successfully!', 'success');
        console.log('Entry added successfully:', entry);
    }

    async addSpecialEntry() {
        if (!this.selectedDate) {
            this.showMessage('Please select a date first.', 'error');
            return;
        }

        const specialType = document.getElementById('specialType').value;
        const comments = document.getElementById('specialComments').value.trim();

        if (!specialType || !comments) {
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }

        const dateKey = this.formatDateKey(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day);

        // Check if special entry already exists for this date
        if (this.monthlyData[dateKey] && 
            this.monthlyData[dateKey].projects.some(p => p.entryType === specialType)) {
            this.showMessage(`${specialType} entry already exists for this date.`, 'error');
            return;
        }

        if (!this.monthlyData[dateKey]) {
            this.monthlyData[dateKey] = { projects: [], totalHours: 0 };
        }

        const entry = {
            projectId: specialType,
            projectTitle: specialType === 'HOLIDAY' ? 'Holiday' : 'Leave',
            subCode: null,
            chargeCode: 'N/A',
            hours: specialType === 'HOLIDAY' ? 8 : 8, // Standard 8 hours
            comments,
            entryType: specialType,
            createdAt: new Date().toISOString()
        };

        this.monthlyData[dateKey].projects.push(entry);
        this.monthlyData[dateKey].totalHours += entry.hours;

        await this.saveData();
        this.clearSpecialForm();
        this.renderCalendar();
        this.renderDailyProjects();
        this.updateMonthlyStats();
        this.updateUI();
        this.showMessage(`${specialType} entry added successfully!`, 'success');
    }

    async removeProjectEntry(dateKey, index) {
        if (!confirm('Are you sure you want to delete this entry?')) return;

        const dayData = this.monthlyData[dateKey];
        if (!dayData || !dayData.projects[index]) return;

        const removedProject = dayData.projects.splice(index, 1)[0];
        dayData.totalHours -= removedProject.hours;

        if (dayData.projects.length === 0) {
            delete this.monthlyData[dateKey];
        }

        await this.saveData();
        this.renderCalendar();
        this.renderDailyProjects();
        this.updateMonthlyStats();
        this.updateUI();
        this.showMessage('Entry deleted successfully.', 'success');
    }

    renderDailyProjects() {
        if (!this.selectedDate) return;

        const dateKey = this.formatDateKey(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day);
        const dayData = this.monthlyData[dateKey];

        const emptyState = document.getElementById('dailyEmptyState');
        const projectList = document.getElementById('dailyProjectList');
        const totalHours = document.getElementById('dailyTotalHours');

        if (!dayData || dayData.projects.length === 0) {
            emptyState?.classList.remove('hidden');
            projectList?.classList.add('hidden');
            if (totalHours) totalHours.textContent = '0.00';
            return;
        }

        emptyState?.classList.add('hidden');
        projectList?.classList.remove('hidden');

        if (totalHours) {
            totalHours.textContent = dayData.totalHours.toFixed(2);
        }

        if (projectList) {
            projectList.innerHTML = dayData.projects.map((project, index) => {
                const entryTypeClass = project.entryType ? project.entryType.toLowerCase() : 'work';
                return `
                    <div class="project-item ${entryTypeClass}">
                        <div class="project-item-header">
                            <div>
                                <div class="project-title">
                                    ${project.projectId} - ${project.projectTitle}
                                    <span class="entry-type-badge ${entryTypeClass}">${project.entryType || 'WORK'}</span>
                                </div>
                                ${project.subCode ? `<div class="project-details">Sub Code: ${project.subCode} | Charge: ${project.chargeCode}</div>` : ''}
                            </div>
                            <div class="project-hours">${project.hours.toFixed(2)}h</div>
                        </div>
                        ${project.comments ? `<div class="project-comments">"${project.comments}"</div>` : ''}
                        <div class="project-actions">
                            <button type="button" class="btn-delete" onclick="tracker.removeProjectEntry('${dateKey}', ${index})">
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Statistics and summaries
    calculateMonthlyStats() {
        return this.calculateStatsForData(this.monthlyData);
    }

    calculateStatsForData(data) {
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        let totalDaysWorked = 0;
        let totalHours = 0;
        let totalProjectEntries = 0;
        let workHours = 0;
        const uniqueProjectsSet = new Set();

        Object.values(data).forEach(dayData => {
            if (dayData.projects.length > 0) {
                totalDaysWorked++;
                totalHours += dayData.totalHours;
                totalProjectEntries += dayData.projects.length;
                
                dayData.projects.forEach(project => {
                    uniqueProjectsSet.add(`${project.projectId}-${project.projectTitle}`);
                    if (project.entryType === 'WORK' || !project.entryType) {
                        workHours += project.hours;
                    }
                });
            }
        });

        return {
            totalDaysWorked,
            totalHours,
            workHours,
            averageHours: totalDaysWorked > 0 ? totalHours / totalDaysWorked : 0,
            totalProjectEntries,
            uniqueProjects: uniqueProjectsSet.size,
            progressPercentage: (totalDaysWorked / daysInMonth) * 100
        };
    }

    updateMonthlyStats() {
        const stats = this.calculateMonthlyStats();
        
        document.getElementById('totalDaysWorked').textContent = stats.totalDaysWorked;
        document.getElementById('totalHoursMonth').textContent = stats.totalHours.toFixed(2);
        document.getElementById('averageHours').textContent = stats.averageHours.toFixed(2);
        document.getElementById('totalProjects').textContent = stats.totalProjectEntries;
        document.getElementById('uniqueProjects').textContent = stats.uniqueProjects;
        document.getElementById('monthProgress').textContent = `${stats.progressPercentage.toFixed(1)}%`;
    }

    renderHistoricalSummary() {
        const historicalData = document.getElementById('historicalData');
        if (!historicalData) return;

        const currentMonthKey = this.getMonthKey();
        const monthsToShow = [...this.availableMonths].sort().reverse().slice(0, 12); // Show last 12 months

        if (monthsToShow.length === 0) {
            historicalData.innerHTML = '<p class="empty-state">No historical data available</p>';
            return;
        }

        historicalData.innerHTML = monthsToShow.map(monthKey => {
            const monthData = this.historicalData[monthKey]?.summary || this.calculateStatsForMonth(monthKey);
            const isCurrent = monthKey === currentMonthKey;
            
            return `
                <div class="historical-card ${isCurrent ? 'current' : ''}" onclick="tracker.navigateToMonth('${monthKey}')">
                    <div class="historical-month">${this.formatMonthKey(monthKey)}</div>
                    <div class="historical-stats">
                        <span>${monthData.totalDaysWorked || 0} days</span>
                        <span>${(monthData.totalHours || 0).toFixed(0)}h</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    calculateStatsForMonth(monthKey) {
        const savedData = localStorage.getItem(`worklog_${monthKey}`);
        if (!savedData) return { totalDaysWorked: 0, totalHours: 0 };
        
        const data = JSON.parse(savedData);
        return this.calculateStatsForData(data);
    }

    // Form validation and utilities
    validateForm() {
        const projectId = document.getElementById('projectSelection').value;
        const subCode = document.getElementById('subCodeSelection').value;
        const hoursValue = document.getElementById('hoursSpent').value;

        console.log('Validating form with values:', { projectId, subCode, hoursValue });

        if (!this.user || !this.user.employeeId) {
            this.showMessage('Employee ID is required.', 'error');
            return false;
        }

        if (!projectId) {
            this.showMessage('Please select a project.', 'error');
            document.getElementById('projectSelection')?.focus();
            return false;
        }

        if (!subCode) {
            this.showMessage('Please select a sub code.', 'error');
            document.getElementById('subCodeSelection')?.focus();
            return false;
        }

        const hours = parseFloat(hoursValue);
        if (!hoursValue || isNaN(hours) || hours <= 0 || hours > 24) {
            this.showMessage('Please enter valid hours (0.25 - 24).', 'error');
            document.getElementById('hoursSpent')?.focus();
            return false;
        }

        return true;
    }

    isDuplicate(dateKey, projectId, subCode) {
        if (!this.monthlyData[dateKey]) return false;
        return this.monthlyData[dateKey].projects.some(entry => 
            entry.projectId === projectId && entry.subCode === subCode && entry.entryType === 'WORK'
        );
    }

    clearForm() {
        console.log('Clearing form...');
        
        const projectSelect = document.getElementById('projectSelection');
        const subCodeSelect = document.getElementById('subCodeSelection');
        const chargeCode = document.getElementById('chargeCode');
        const hoursSpent = document.getElementById('hoursSpent');
        const comments = document.getElementById('comments');

        if (projectSelect) projectSelect.value = '';
        if (subCodeSelect) {
            subCodeSelect.innerHTML = '<option value="">Select sub code...</option>';
            subCodeSelect.disabled = true;
        }
        if (chargeCode) chargeCode.value = '';
        if (hoursSpent) hoursSpent.value = '';
        if (comments) comments.value = '';
        
        this.updateCharacterCount(0);
    }

    clearSpecialForm() {
        const specialType = document.getElementById('specialType');
        const specialComments = document.getElementById('specialComments');
        
        if (specialType) specialType.value = '';
        if (specialComments) specialComments.value = '';
    }

    updateCharacterCount(count) {
        const countElement = document.getElementById('commentCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    // Export functionality
    updateExportButtons() {
        const hasEmployeeId = this.user && this.user.employeeId;
        const hasData = Object.keys(this.monthlyData).length > 0;
        
        const exportDailyBtn = document.getElementById('exportDaily');
        const exportMonthBtn = document.getElementById('exportMonth');
        const exportRangeBtn = document.getElementById('exportRange');
        const exportAllBtn = document.getElementById('exportAll');
        
        if (exportDailyBtn) exportDailyBtn.disabled = !hasEmployeeId || !this.selectedDate;
        if (exportMonthBtn) exportMonthBtn.disabled = !hasEmployeeId || !hasData;
        if (exportRangeBtn) exportRangeBtn.disabled = !hasEmployeeId || !hasData;
        if (exportAllBtn) exportAllBtn.disabled = !hasEmployeeId;
    }

    exportDaily() {
        if (!this.selectedDate) {
            this.showMessage('Please select a date to export.', 'error');
            return;
        }

        const dateKey = this.formatDateKey(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day);
        const dayData = this.monthlyData[dateKey];

        if (!dayData) {
            this.showMessage('No data found for selected date.', 'error');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();
            const data = this.prepareDailyExportData(dateKey, dayData);
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            ws['!cols'] = [
                { wch: 15 }, { wch: 20 }, { wch: 10 }, 
                { wch: 20 }, { wch: 8 }, { wch: 30 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Daily Log');
            
            const filename = `Daily_Log_${this.user.employeeId}_${dateKey}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            this.showMessage(`Daily export "${filename}" downloaded successfully!`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showMessage('Error generating export file.', 'error');
        }
    }

    exportMonthly() {
        const monthKey = this.getMonthKey();

        try {
            const wb = XLSX.utils.book_new();

            // Summary Sheet
            const summaryData = this.prepareMonthlySummaryData(monthKey);
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Monthly Summary');

            // Daily Details Sheet
            const dailyData = this.prepareDailyDetailsData();
            const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
            dailyWs['!cols'] = [
                { wch: 12 }, { wch: 15 }, { wch: 20 }, 
                { wch: 10 }, { wch: 20 }, { wch: 8 }, { wch: 30 }
            ];
            XLSX.utils.book_append_sheet(wb, dailyWs, 'Daily Details');

            // Project Summary Sheet
            const projectData = this.prepareProjectSummaryData();
            const projectWs = XLSX.utils.aoa_to_sheet(projectData);
            XLSX.utils.book_append_sheet(wb, projectWs, 'Project Summary');

            const filename = `Monthly_Log_${this.user.employeeId}_${monthKey}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            this.showMessage(`Monthly report "${filename}" downloaded successfully!`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showMessage('Error generating monthly report.', 'error');
        }
    }

    exportAllData() {
        try {
            const allData = {
                employeeId: this.user?.employeeId,
                exportDate: new Date().toISOString(),
                version: '2.0',
                months: {}
            };

            // Export all available months
            this.availableMonths.forEach(monthKey => {
                const data = this.historicalData[monthKey] || 
                           (localStorage.getItem(`worklog_${monthKey}`) ? 
                            JSON.parse(localStorage.getItem(`worklog_${monthKey}`)) : {});
                
                allData.months[monthKey] = {
                    dailyLogs: data,
                    summary: this.calculateStatsForData(data),
                    lastUpdated: new Date().toISOString()
                };
            });

            const jsonStr = JSON.stringify(allData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `WorkLog_Backup_${this.user?.employeeId || 'Guest'}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showMessage('Data backup exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showMessage('Error creating backup file.', 'error');
        }
    }

    importData() {
        document.getElementById('fileInput').click();
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.months || !data.version) {
                throw new Error('Invalid backup file format');
            }

            const shouldMerge = confirm('How would you like to import this data?\n\nOK = Merge with existing data\nCancel = Replace all data');
            
            if (!shouldMerge) {
                // Replace all data
                if (confirm('This will replace ALL your existing data. Are you sure?')) {
                    if (this.isAuthenticated && !this.isGuest) {
                        await this.replaceCloudData(data);
                    }
                    this.replaceLocalData(data);
                    this.showMessage('Data replaced successfully!', 'success');
                }
            } else {
                // Merge data
                if (this.isAuthenticated && !this.isGuest) {
                    await this.mergeCloudData(data);
                }
                this.mergeLocalData(data);
                this.showMessage('Data merged successfully!', 'success');
            }

            // Reload current view
            await this.loadCloudData();
            this.renderCalendar();
            this.updateMonthlyStats();
            this.renderHistoricalSummary();
            
        } catch (error) {
            console.error('Import error:', error);
            this.showMessage('Error importing data: ' + error.message, 'error');
        }

        // Clear file input
        event.target.value = '';
    }

    replaceLocalData(data) {
        // Clear existing worklog data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('worklog_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Import new data
        Object.entries(data.months).forEach(([monthKey, monthData]) => {
            localStorage.setItem(`worklog_${monthKey}`, JSON.stringify(monthData.dailyLogs));
        });
    }

    mergeLocalData(data) {
        Object.entries(data.months).forEach(([monthKey, monthData]) => {
            const existing = localStorage.getItem(`worklog_${monthKey}`);
            if (existing) {
                // Merge logic - prefer newer entries
                const existingData = JSON.parse(existing);
                const mergedData = { ...existingData, ...monthData.dailyLogs };
                localStorage.setItem(`worklog_${monthKey}`, JSON.stringify(mergedData));
            } else {
                localStorage.setItem(`worklog_${monthKey}`, JSON.stringify(monthData.dailyLogs));
            }
        });
    }

    // Helper methods for export data preparation
    prepareDailyExportData(dateKey, dayData) {
        const data = [];
        data.push(['Employee ID:', this.user?.employeeId || 'N/A']);
        data.push(['Date:', dateKey]);
        data.push(['Generated:', new Date().toLocaleString()]);
        data.push([]);
        data.push(['Project ID', 'Project Title', 'Sub Code', 'Charge Code', 'Hours', 'Comments', 'Type']);

        dayData.projects.forEach(project => {
            data.push([
                project.projectId,
                project.projectTitle,
                project.subCode || 'N/A',
                project.chargeCode,
                project.hours,
                project.comments || '',
                project.entryType || 'WORK'
            ]);
        });

        data.push([]);
        data.push(['', '', '', 'Total Hours:', dayData.totalHours.toFixed(2), '', '']);

        return data;
    }

    prepareMonthlySummaryData(monthKey) {
        const stats = this.calculateMonthlyStats();
        const data = [];
        
        data.push(['Monthly Work Log Summary']);
        data.push([]);
        data.push(['Employee ID:', this.user?.employeeId || 'N/A']);
        data.push(['Month:', monthKey]);
        data.push(['Generated:', new Date().toLocaleString()]);
        data.push([]);
        data.push(['Statistics']);
        data.push(['Total Days Worked:', stats.totalDaysWorked]);
        data.push(['Total Hours:', stats.totalHours.toFixed(2)]);
        data.push(['Work Hours:', stats.workHours.toFixed(2)]);
        data.push(['Average Hours per Day:', stats.averageHours.toFixed(2)]);
        data.push(['Total Entries:', stats.totalProjectEntries]);
        data.push(['Unique Projects:', stats.uniqueProjects]);
        data.push(['Month Progress:', `${stats.progressPercentage.toFixed(1)}%`]);

        return data;
    }

    prepareDailyDetailsData() {
        const data = [];
        data.push(['Date', 'Project ID', 'Project Title', 'Sub Code', 'Charge Code', 'Hours', 'Comments', 'Type']);

        Object.keys(this.monthlyData).sort().forEach(dateKey => {
            const dayData = this.monthlyData[dateKey];
            dayData.projects.forEach(project => {
                data.push([
                    dateKey,
                    project.projectId,
                    project.projectTitle,
                    project.subCode || 'N/A',
                    project.chargeCode,
                    project.hours,
                    project.comments || '',
                    project.entryType || 'WORK'
                ]);
            });
        });

        return data;
    }

    prepareProjectSummaryData() {
        const projectTotals = {};
        
        Object.values(this.monthlyData).forEach(dayData => {
            dayData.projects.forEach(project => {
                const key = `${project.projectId} - ${project.projectTitle}`;
                if (!projectTotals[key]) {
                    projectTotals[key] = { hours: 0, days: new Set(), type: project.entryType || 'WORK' };
                }
                projectTotals[key].hours += project.hours;
                projectTotals[key].days.add(project.projectId);
            });
        });

        const data = [];
        data.push(['Project', 'Type', 'Total Hours', 'Days Worked', 'Average Hours/Day']);

        Object.entries(projectTotals).forEach(([project, totals]) => {
            const daysWorked = totals.days.size;
            data.push([
                project,
                totals.type,
                totals.hours.toFixed(2),
                daysWorked,
                (totals.hours / daysWorked).toFixed(2)
            ]);
        });

        return data;
    }

    // UI Helper Methods
    showDateRangeModal() {
        document.getElementById('dateRangeModal').classList.remove('hidden');
    }

    hideDateRangeModal() {
        document.getElementById('dateRangeModal').classList.add('hidden');
    }

    exportDateRange() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            this.showMessage('Please select both start and end dates.', 'error');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            this.showMessage('Start date must be before end date.', 'error');
            return;
        }

        this.showMessage('Date range export functionality will be implemented in a future version.', 'info');
        this.hideDateRangeModal();
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    }

    hideUserMenu() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }

    toggleSync() {
        this.syncEnabled = !this.syncEnabled;
        this.updateSyncStatus();
        const status = this.syncEnabled ? 'enabled' : 'disabled';
        this.showMessage(`Sync ${status}`, 'info');
    }

    showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (overlay) overlay.classList.remove('hidden');
        if (loadingText) loadingText.textContent = text;
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    showConnectionBanner(message, type) {
        // Remove existing banner
        const existingBanner = document.querySelector('.connection-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');
        banner.className = `connection-banner ${type} show`;
        banner.textContent = message;
        document.body.appendChild(banner);

        setTimeout(() => {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 300);
        }, 3000);
    }

    showMessage(text, type) {
        const container = document.getElementById('messageContainer');
        if (!container) return;
        
        const message = document.createElement('div');
        message.className = `message message--${type}`;
        message.textContent = text;

        container.appendChild(message);

        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);

        message.addEventListener('click', () => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        });
    }

    // Utility Helper Methods
    getMonthKey() {
        return `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
    }

    formatDateKey(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    formatMonthKey(monthKey) {
        const [year, month] = monthKey.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    }

    isToday(year, month, day) {
        const today = new Date();
        return year === today.getFullYear() && 
               month === today.getMonth() && 
               day === today.getDate();
    }

    isWeekend(year, month, day) {
        const date = new Date(year, month, day);
        return date.getDay() === 0 || date.getDay() === 6;
    }

    getAuthErrorMessage(code) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
        };
        return errorMessages[code] || 'An error occurred. Please try again.';
    }

    async syncPendingChanges() {
        if (!this.isAuthenticated || this.isGuest || !this.isOnline) return;
        
        this.updateSyncStatus('syncing');
        await this.saveToCloud();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing Enhanced Monthly Work Log Tracker...');
    window.tracker = new MonthlyWorkLogTracker();
    await window.tracker.init();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('projectForm');
        if (form && window.tracker?.selectedDate && window.tracker.currentEntryType === 'work') {
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    if (e.key === 'Escape') {
        e.preventDefault();
        if (window.tracker) {
            const modal = document.getElementById('dateRangeModal');
            if (modal && !modal.classList.contains('hidden')) {
                window.tracker.hideDateRangeModal();
            } else {
                window.tracker.clearForm();
                window.tracker.hideUserMenu();
            }
        }
    }
});
