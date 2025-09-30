/**
 * Enhanced Monthly Work Log Tracker with Cloud Sync (Rewritten)
 * * Note: This code assumes the global Firebase variables (window.auth, window.db) 
 * have been initialized and are available in the main application environment.
 */
class MonthlyWorkLogTracker {
    constructor() {
        // --- Configuration (Model) ---
        this.projectData = [
            { "projectId": "IN-1100-NA", "subCode": "0010", "projectTitle": "General Overhead" },
            { "projectId": "WV-1112-4152", "subCode": "0210", "projectTitle": "AS_Strategy" },
            { "projectId": "WV-1112-4152", "subCode": "1010", "projectTitle": "AS_Strategy" },
            { "projectId": "WV-1112-4152", "subCode": "1020", "projectTitle": "AS_Strategy" },
            { "projectId": "RW-1173-9573P00303", "subCode": "0010", "projectTitle": "RW Tracking" },
            { "projectId": " WV-1137-D75B1-C4285-08-03", "subCode": "1250", "projectTitle": "MERCIA_INSIGNIA_ElectronicController_Mil" },
            { "projectId": " WV-1116-4306", "subCode": "0020", "projectTitle": "SensorLess_Controller_Demo" }
        ];

        this.specialEntryTypes = [
            { "projectId": "HOLIDAY", "projectTitle": "Holiday", "subCode": null, "chargeCode": "N/A", "color": "orange" },
            { "projectId": "LEAVE", "projectTitle": "Leave", "subCode": null, "chargeCode": "N/A", "color": "red" }
        ];
        
        // --- Application State (Controller/State Management) ---
        this.currentDate = new Date();
        this.selectedDate = null; // Date object for selected calendar day
        this.currentMonthKey = this._getMonthKey(this.currentDate); // Format: YYYY-MM
        this.monthlyLogs = {}; // Daily log entries for the currently selected month
        this.historicalData = {}; // Cache for all loaded monthly data (Cloud/Local)
        
        this.isAuthenticated = false;
        this.isGuest = false;
        this.user = null;
        this.syncEnabled = true;
        this.isOnline = navigator.onLine;
        this.currentEntryType = 'work'; // 'work', 'holiday', 'leave'

        this.firebaseReady = false;
        this.initFirebaseCheck();
    }

    // ========================================================================
    // --- 1. INITIALIZATION & SETUP ---
    // ========================================================================

    initFirebaseCheck() {
        if (window.auth && window.db) {
            this.firebaseReady = true;
            console.log('Firebase services available.');
        } else {
            console.warn('Firebase not available, using localStorage only.');
        }
    }

    async init() {
        console.log('Initializing Enhanced Monthly Work Log Tracker...');
        
        this._setupNetworkListeners();
        this._populateProjectDropdown();
        this._bindEventListeners();
        
        if (this.firebaseReady) {
            this.setupAuthStateListener();
        } else {
            this._checkGuestMode();
        }

        // Wait for potential auth resolution (if not handled by the listener yet)
        await new Promise(resolve => setTimeout(resolve, 500)); 
        this._finalizeInitialization();
        console.log('Initialization complete');
    }
    
    _finalizeInitialization() {
        if (!this.isAuthenticated && !this.isGuest) {
            this._showAuthUI();
        } else {
            this._showAppUI();
        }
    }

    setupAuthStateListener() {
        if (!this.firebaseReady) return;

        window.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.user = user;
                this.isAuthenticated = true;
                this.isGuest = false;
                await this._loadUserProfile();
                await this._loadAllMonthlyData(); // Load cloud data
                this._showAppUI();
                this._showMessage('Successfully logged in and synced!', 'success');
            } else {
                this.user = null;
                this.isAuthenticated = false;
                if (!this.isGuest) {
                    this.monthlyLogs = {}; // Clear logs on logout
                    this._showAuthUI();
                }
            }
            this._updateGlobalUI();
        });
    }
    
    _checkGuestMode() {
        const guestData = localStorage.getItem('guestMode');
        if (guestData) {
            const guest = JSON.parse(guestData);
            this.setupGuestMode(guest.employeeId);
        }
    }

    // ========================================================================
    // --- 2. AUTHENTICATION & USER MANAGEMENT ---
    // ========================================================================

    async login(email, password) {
        if (!this.firebaseReady) {
            this._showMessage('Cloud services unavailable. Try guest mode.', 'error');
            return false;
        }

        this._showLoading('Logging in...');
        try {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signInWithEmailAndPassword(window.auth, email, password);
            return true;
        } catch (error) {
            this._hideLoading();
            this._showMessage(this._getAuthErrorMessage(error.code), 'error');
            return false;
        }
    }

    async logout() {
        if (this.isGuest) {
            localStorage.removeItem('guestMode');
            this.isGuest = false;
            this.user = null;
            this.monthlyLogs = {};
            this.historicalData = {};
            this.currentMonthKey = this._getMonthKey(new Date());
            this._showAuthUI();
            return;
        }

        if (this.firebaseReady) {
            try {
                await window.auth.signOut();
                this._showMessage('Logged out successfully!', 'success');
            } catch (error) {
                this._showMessage('Error logging out: ' + error.message, 'error');
            }
        }
    }

    setupGuestMode(employeeId) {
        this.isGuest = true;
        this.isAuthenticated = false;
        // Use a static ID for guest, but persist their employeeId
        this.user = { uid: 'guest-' + employeeId, employeeId: employeeId, email: 'guest@local.com' }; 
        this.syncEnabled = false;
        
        localStorage.setItem('guestMode', JSON.stringify({ employeeId }));
        
        this._loadAllMonthlyData(); // Loads all local data
        this._showAppUI();
        this._showMessage('Using guest mode (local data only)', 'info');
    }

    async _loadUserProfile() {
        if (!this.firebaseReady || !this.user) return;

        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docSnap = await getDoc(doc(window.db, 'users', this.user.uid));
            
            if (docSnap.exists()) {
                this.user = { ...this.user, ...docSnap.data(), profile: docSnap.data() };
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            this._showMessage('Error loading profile. Data syncing may be affected.', 'error');
        }
    }

    // ========================================================================
    // --- 3. DATA PERSISTENCE (Cloud & Local) ---
    // ========================================================================
    
    async _loadAllMonthlyData() {
        const currentKey = this._getMonthKey(new Date());
        this.historicalData = {};
        
        if (this.isAuthenticated && !this.isGuest && this.firebaseReady) {
            this._showLoading('Loading cloud data...');
            try {
                const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const q = query(collection(window.db, 'users', this.user.uid, 'monthlyData'), orderBy('monthKey', 'desc'));
                const snapshot = await getDocs(q);
                
                snapshot.forEach((doc) => {
                    this.historicalData[doc.id] = doc.data();
                });
            } catch (error) {
                console.error('Error loading cloud data:', error);
                this._showMessage('Cloud load failed. Using local storage.', 'error');
            } finally {
                this._hideLoading();
            }
        }
        
        // Always attempt to load from local storage to merge/fill gaps
        this._loadAllLocalData();
        
        // Set the currently viewed month data
        const logData = this.historicalData[this.currentMonthKey]?.dailyLogs || {};
        this.monthlyLogs = logData;

        // Check for cloud migration
        if (this.isAuthenticated && !this.isGuest && this.firebaseReady) {
            this._checkAndMigrateLocalData();
        }
    }
    
    _loadAllLocalData() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('worklog_')) {
                const monthKey = key.replace('worklog_', '');
                try {
                    const dailyLogs = JSON.parse(localStorage.getItem(key));
                    // Local data always has lower priority than cloud data if available
                    if (!this.historicalData[monthKey]) {
                        this.historicalData[monthKey] = {
                            monthKey,
                            dailyLogs,
                            summary: this.calculateStatsForData(dailyLogs),
                            lastUpdated: new Date().toISOString()
                        };
                    }
                } catch (e) {
                    console.error(`Corrupt local data for ${monthKey}`, e);
                }
            }
        }
    }

    /**
     * Centralized function to save the current month's data.
     * @param {string} dateKey - The YYYY-MM-DD key for the entry.
     * @param {Array} logEntries - The array of entries for that day.
     */
    async _updateCurrentMonthDataAndPersist(dateKey, logEntries) {
        if (!dateKey) return;
        
        if (logEntries.length === 0) {
            delete this.monthlyLogs[dateKey];
        } else {
            this.monthlyLogs[dateKey] = logEntries;
        }

        const monthKey = this.currentMonthKey;
        const stats = this.calculateMonthlyStats();

        // 1. Update historical cache
        this.historicalData[monthKey] = {
            monthKey: monthKey,
            dailyLogs: this.monthlyLogs,
            summary: stats,
            lastUpdated: new Date().toISOString()
        };

        // 2. Persist to localStorage (Always happens)
        localStorage.setItem(`worklog_${monthKey}`, JSON.stringify(this.monthlyLogs));
        
        // 3. Sync to Cloud (If connected and authenticated)
        if (this.isAuthenticated && !this.isGuest && this.syncEnabled && this.isOnline) {
            await this._syncCurrentMonthToCloud(monthKey, stats);
        } else if (this.isAuthenticated && !this.isGuest) {
            this.updateSyncStatus('pending'); // Mark as pending sync if offline
        }

        // 4. Update UI
        this._updateQuickStats(stats);
        this._renderCalendarDay(dateKey);
    }
    
    async _syncCurrentMonthToCloud(monthKey, stats) {
        if (!this.firebaseReady || !this.user || this.isGuest) return;
        
        this.updateSyncStatus('syncing');
        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const monthDoc = doc(window.db, 'users', this.user.uid, 'monthlyData', monthKey);
            
            await setDoc(monthDoc, {
                monthKey: monthKey,
                dailyLogs: this.monthlyLogs,
                summary: stats,
                lastUpdated: new Date().toISOString()
            });
            
            this.updateSyncStatus('synced');
            this._showMessage('Data synced successfully.', 'success-brief');
            
        } catch (error) {
            console.error('Error saving to cloud:', error);
            this.updateSyncStatus('error');
            this._showMessage('Cloud sync failed. Data saved locally.', 'error');
        }
    }

    async _checkAndMigrateLocalData() {
        // Migration logic remains complex, it's called once after cloud data is loaded.
        // Simplified check: If any worklog_ exists in localStorage but is not in historicalData
        const localKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('worklog_')) {
                const monthKey = key.replace('worklog_', '');
                if (!this.historicalData[monthKey] && monthKey !== this.currentMonthKey) {
                    localKeys.push(monthKey);
                }
            }
        }
        
        if (localKeys.length > 0) {
            const shouldMigrate = confirm(`Found ${localKeys.length} months of local data. Migrate to cloud?`);
            if (shouldMigrate) {
                // ... (Original long migration logic would go here)
                this._showMessage(`Initiating migration for ${localKeys.length} months... (Placeholder)`, 'info');
            }
        }
    }


    // ========================================================================
    // --- 4. DATE AND NAVIGATION ---
    // ========================================================================

    /**
     * Helper to navigate to a new month, updating state and reloading data.
     * @param {string} monthKey - YYYY-MM format.
     */
    async navigateToMonth(monthKey) {
        if (this.currentMonthKey === monthKey) return;
        
        this.currentMonthKey = monthKey;
        this.selectedDate = null;
        
        // 1. Load data for the new month from historical cache or local storage
        const monthData = this.historicalData[monthKey];
        this.monthlyLogs = monthData?.dailyLogs || {};
        
        // 2. Update UI components
        this._renderMonthSelector(); // To ensure the new month is selected
        this._renderCalendar();
        this.updateMonthlyStats();
        this._updateGlobalUI();
        this._clearDailyLogForm();
    }
    
    navigateToPreviousMonth() {
        const [year, month] = this.currentMonthKey.split('-').map(Number);
        let newDate = new Date(year, month - 2, 1); // JS months are 0-indexed
        this.navigateToMonth(this._getMonthKey(newDate));
    }

    navigateToNextMonth() {
        const [year, month] = this.currentMonthKey.split('-').map(Number);
        let newDate = new Date(year, month, 1);
        this.navigateToMonth(this._getMonthKey(newDate));
    }

    // ========================================================================
    // --- 5. LOG ENTRY MANAGEMENT (C-R-U-D) ---
    // ========================================================================

    handleDaySelection(dateKey) {
        this.selectedDate = new Date(dateKey);
        this._renderDailyLogs();
        // Highlight the selected day in the calendar
        this._renderCalendar(); 
        
        // Reset form for a fresh entry
        this._clearDailyLogForm();
        this._showDailyLogPanel(true);
        document.getElementById('dailyLogDate')?.textContent = dateKey;
    }

    addProjectEntry() {
        if (!this.selectedDate) {
            return this._showMessage('Please select a date first.', 'warning');
        }

        // 1. Gather and validate form data (placeholder)
        const dateKey = this._getDateKey(this.selectedDate);
        const projectId = document.getElementById('projectSelection').value;
        const subCode = document.getElementById('subCodeSelection').value;
        const hours = parseFloat(document.getElementById('hours').value);
        const comments = document.getElementById('comments').value;

        if (!projectId || !subCode || !hours || hours <= 0 || hours > 24) {
            return this._showMessage('Invalid project, sub code, or hours.', 'error');
        }

        const projectTitle = document.getElementById('projectSelection').options[document.getElementById('projectSelection').selectedIndex].getAttribute('data-title');

        const newEntry = {
            id: Date.now(),
            type: 'work',
            date: dateKey,
            projectId,
            subCode,
            projectTitle,
            chargeCode: `${projectId}-${subCode}`,
            hours: hours,
            comments: comments
        };

        // 2. Update logs and persist
        const dayLogs = this.monthlyLogs[dateKey] || [];
        dayLogs.push(newEntry);
        this._updateCurrentMonthDataAndPersist(dateKey, dayLogs);
        
        // 3. UI update
        this._renderDailyLogs();
        this._clearDailyLogForm();
        this._showMessage('Work entry added!', 'success-brief');
    }

    deleteEntry(dateKey, entryId) {
        if (!confirm('Are you sure you want to delete this entry?')) return;
        
        const dayLogs = this.monthlyLogs[dateKey] || [];
        const updatedLogs = dayLogs.filter(entry => entry.id !== entryId);
        
        this._updateCurrentMonthDataAndPersist(dateKey, updatedLogs);
        this._renderDailyLogs();
        this._showMessage('Entry deleted!', 'success-brief');
    }
    
    // The `addSpecialEntry` method remains similar, but uses `_updateCurrentMonthDataAndPersist`
    // ... (The rest of the CRUD methods would follow the same pattern)

    // ========================================================================
    // --- 6. STATISTICS & REPORTS ---
    // ========================================================================

    calculateMonthlyStats() {
        let totalHours = 0;
        let projectHours = {};
        let totalDaysWorked = 0;
        let dayLogCount = 0;

        for (const dateKey in this.monthlyLogs) {
            const dayLogs = this.monthlyLogs[dateKey];
            if (dayLogs.length > 0) {
                totalDaysWorked++;
                dayLogs.forEach(entry => {
                    const hours = entry.hours || 0;
                    totalHours += hours;
                    dayLogCount++;
                    
                    const code = entry.chargeCode || entry.projectId;
                    projectHours[code] = (projectHours[code] || 0) + hours;
                });
            }
        }

        return {
            totalHours: totalHours,
            totalDaysWorked: totalDaysWorked,
            projectBreakdown: projectHours,
            totalEntries: dayLogCount
        };
    }
    
    updateMonthlyStats() {
        const stats = this.calculateMonthlyStats();
        this._renderMonthlySummary(stats);
        this._updateQuickStats(stats);
    }
    
    // ... (Export methods like exportMonthly, exportDateRange, etc.)

    // ========================================================================
    // --- 7. UI RENDERING AND UPDATES ---
    // ========================================================================
    
    _showAuthUI() {
        document.getElementById('authContainer')?.classList.remove('hidden');
        document.getElementById('appContainer')?.classList.add('hidden');
    }

    _showAppUI() {
        document.getElementById('authContainer')?.classList.add('hidden');
        document.getElementById('appContainer')?.classList.remove('hidden');
        
        this._renderMonthSelector();
        this._renderCalendar();
        this.updateMonthlyStats();
        this._renderHistoricalSummary();
        this._updateGlobalUI();
        this._showDailyLogPanel(false);
    }
    
    _updateGlobalUI() {
        this._renderUserDisplay();
        this.updateSyncStatus();
        // ... (other global UI updates)
    }

    _renderUserDisplay() {
        const userDisplayName = document.getElementById('userDisplayName');
        const userEmail = document.getElementById('userEmail');
        const userEmployeeId = document.getElementById('userEmployeeId');
        
        if (this.user) {
            if (userDisplayName) userDisplayName.textContent = this.isGuest ? 'Guest' : this.user.email.split('@')[0];
            if (userEmail) userEmail.textContent = this.isGuest ? 'Local Mode' : this.user.email;
            if (userEmployeeId) userEmployeeId.textContent = this.user.employeeId || 'Not set';
        }
    }

    /** Renders the current month's calendar based on this.monthlyLogs */
    _renderCalendar() {
        // ... (Logic to generate and draw the calendar grid)
        const monthTitle = document.getElementById('currentMonthTitle');
        if (monthTitle) {
            const [year, month] = this.currentMonthKey.split('-');
            monthTitle.textContent = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        
        const calendarGrid = document.getElementById('calendarGrid');
        if (calendarGrid) {
            calendarGrid.innerHTML = ''; // Clear existing
            // Re-render days, highlighting entries (this.monthlyLogs) and selectedDate
            // Day click listener should call this.handleDaySelection(dateKey)
            // ...
        }
    }
    
    _renderCalendarDay(dateKey) {
        // Optimized: only update the HTML element for the specific dateKey
        // Find the day element in the calendar grid and update its color/badge
        // ...
    }

    /** Renders the list of project entries for the selected day */
    _renderDailyLogs() {
        const logsContainer = document.getElementById('dailyLogEntries');
        if (!logsContainer || !this.selectedDate) return;
        
        const dateKey = this._getDateKey(this.selectedDate);
        const entries = this.monthlyLogs[dateKey] || [];
        
        logsContainer.innerHTML = entries.length === 0 
            ? '<p class="text-gray-500">No entries for this day.</p>' 
            : entries.map(this._formatLogEntry).join('');
        
        // Re-bind delete buttons after rendering
        logsContainer.querySelectorAll('.delete-entry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.deleteEntry(dateKey, id);
            });
        });
    }

    _formatLogEntry(entry) {
        const color = this.specialEntryTypes.find(t => t.projectId === entry.projectId)?.color || 'blue';
        return `
            <div class="log-entry bg-white p-3 rounded shadow-sm border-l-4 border-${color}-500 mb-2 flex justify-between items-center">
                <div>
                    <p class="font-semibold">${entry.hours}h - ${entry.projectTitle}</p>
                    <p class="text-sm text-gray-600">${entry.chargeCode || entry.projectId}</p>
                    ${entry.comments ? `<p class="text-xs text-gray-500 italic">"${entry.comments}"</p>` : ''}
                </div>
                <button data-id="${entry.id}" class="delete-entry-btn text-red-500 hover:text-red-700 text-lg">
                    &times;
                </button>
            </div>
        `;
    }

    _renderMonthSelector() {
        const monthSelector = document.getElementById('monthSelector');
        if (!monthSelector) return;
        
        // Get sorted list of all months from historicalData
        const availableMonths = Object.keys(this.historicalData).sort().reverse();

        if (!availableMonths.includes(this.currentMonthKey)) {
            availableMonths.unshift(this.currentMonthKey);
        }

        monthSelector.innerHTML = availableMonths.map(monthKey => `
            <option value="${monthKey}" ${monthKey === this.currentMonthKey ? 'selected' : ''}>
                ${this._formatMonthKey(monthKey)}
            </option>
        `).join('');
    }

    _updateQuickStats(stats) {
        const quickTotalHours = document.getElementById('quickTotalHours');
        const quickWorkDays = document.getElementById('quickWorkDays');
        
        if (quickTotalHours) quickTotalHours.textContent = stats.totalHours.toFixed(1);
        if (quickWorkDays) quickWorkDays.textContent = stats.totalDaysWorked;
    }

    // ... (The rest of the UI rendering and helper methods remain similar)

    // ========================================================================
    // --- 8. HELPER METHODS ---
    // ========================================================================

    _getDateKey(date) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    _getMonthKey(date) {
        return date.toISOString().substring(0, 7); // YYYY-MM
    }

    _formatMonthKey(monthKey) {
        const [year, month] = monthKey.split('-');
        return new Date(year, month - 1, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }

    _showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer');
        if (messageContainer) {
            // Implement a temporary banner/toast message display
            console.log(`[${type.toUpperCase()}] ${message}`);
            // Example: messageContainer.innerHTML = `<div class="${type}">${message}</div>`;
        }
    }
    
    // ... (The rest of the original helper methods: clearForm, getAuthErrorMessage, etc.)
    // ... (Bind Event Listeners logic remains similar but calls new methods)
}
