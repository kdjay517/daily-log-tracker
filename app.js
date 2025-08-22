// Monthly Work Log Tracker Application
class MonthlyWorkLogTracker {
    constructor() {
        // Project data from the provided JSON
        this.projectData = [
            {
                "projectId": "IN-1100-NA",
                "subCode": "0010",
                "projectTitle": "General Overhead"
            },
            {
                "projectId": "WV-1112-4152",
                "subCode": "0210",
                "projectTitle": "AS_Strategy"
            },
            {
                "projectId": "WV-1112-4152",
                "subCode": "1010",
                "projectTitle": "AS_Strategy"
            },
            {
                "projectId": "WV-1112-4152",
                "subCode": "1020",
                "projectTitle": "AS_Strategy"
            },
            {
                "projectId": "RW-1173-9573P00303",
                "subCode": "0010",
                "projectTitle": "RW Tracking"
            }
        ];

        this.currentDate = new Date();
        this.selectedDate = null;
        this.monthlyData = {};
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
    }

    init() {
        console.log('Initializing Monthly Work Log Tracker...');
        this.loadEmployeeData();
        this.populateProjectDropdown();
        this.bindEventListeners();
        this.renderCalendar();
        this.updateMonthlyStats();
        this.updateUI();
        console.log('Initialization complete');
    }

    loadEmployeeData() {
        const savedEmployeeId = localStorage.getItem('employeeId');
        if (savedEmployeeId) {
            const employeeInput = document.getElementById('employeeId');
            if (employeeInput) {
                employeeInput.value = savedEmployeeId;
            }
        }
        this.loadMonthlyData();
    }

    loadMonthlyData() {
        const monthKey = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
        const savedData = localStorage.getItem(`worklog_${monthKey}`);
        if (savedData) {
            this.monthlyData = JSON.parse(savedData);
        } else {
            this.monthlyData = {};
        }
        console.log('Loaded monthly data for', monthKey, this.monthlyData);
    }

    saveMonthlyData() {
        const monthKey = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
        localStorage.setItem(`worklog_${monthKey}`, JSON.stringify(this.monthlyData));
        console.log('Saved monthly data for', monthKey);
    }

    saveEmployeeData() {
        const employeeId = document.getElementById('employeeId').value.trim();
        if (employeeId) {
            localStorage.setItem('employeeId', employeeId);
        }
    }

    populateProjectDropdown() {
        const projectSelect = document.getElementById('projectSelection');
        if (!projectSelect) {
            console.error('Project selection element not found');
            return;
        }

        // Get unique projects
        const uniqueProjects = {};
        this.projectData.forEach(item => {
            if (!uniqueProjects[item.projectId]) {
                uniqueProjects[item.projectId] = {
                    projectId: item.projectId,
                    projectTitle: item.projectTitle
                };
            }
        });

        // Sort projects alphabetically
        const sortedProjects = Object.values(uniqueProjects).sort((a, b) => 
            `${a.projectId} - ${a.projectTitle}`.localeCompare(`${b.projectId} - ${b.projectTitle}`)
        );

        // Clear existing options
        projectSelect.innerHTML = '<option value="">Select a project...</option>';

        // Add project options
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
        if (!subCodeSelect) {
            console.error('Sub code selection element not found');
            return;
        }

        console.log('Populating sub code dropdown for project:', selectedProjectId);

        if (!selectedProjectId) {
            subCodeSelect.innerHTML = '<option value="">Select sub code...</option>';
            subCodeSelect.disabled = true;
            this.updateChargeCode('', '');
            return;
        }

        // Get sub codes for the selected project
        const subCodes = this.projectData
            .filter(item => item.projectId === selectedProjectId)
            .map(item => item.subCode)
            .sort();

        console.log('Found sub codes:', subCodes);

        // Clear and populate sub code dropdown
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
        if (!chargeCodeInput) {
            console.error('Charge code input element not found');
            return;
        }
        
        if (projectId && subCode) {
            const chargeCode = `${projectId}-${subCode}`;
            chargeCodeInput.value = chargeCode;
            console.log('Charge code updated to:', chargeCode);
        } else {
            chargeCodeInput.value = '';
        }
    }

    bindEventListeners() {
        console.log('Binding event listeners...');

        // Month navigation
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');
        
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => this.navigateToPreviousMonth());
        }
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => this.navigateToNextMonth());
        }

        // Project selection - Fixed event handling
        const projectSelect = document.getElementById('projectSelection');
        if (projectSelect) {
            projectSelect.addEventListener('change', (e) => {
                console.log('Project selection changed to:', e.target.value);
                const selectedProjectId = e.target.value;
                this.populateSubCodeDropdown(selectedProjectId);
                // Clear charge code when project changes
                this.updateChargeCode('', '');
            });
        }

        // Sub code selection - Fixed event handling
        const subCodeSelect = document.getElementById('subCodeSelection');
        if (subCodeSelect) {
            subCodeSelect.addEventListener('change', (e) => {
                console.log('Sub code selection changed to:', e.target.value);
                const projectId = document.getElementById('projectSelection').value;
                const subCode = e.target.value;
                this.updateChargeCode(projectId, subCode);
            });
        }

        // Form submission
        const projectForm = document.getElementById('projectForm');
        if (projectForm) {
            projectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Form submitted');
                this.addProjectEntry();
            });
        }

        // Clear form
        const clearBtn = document.getElementById('clearForm');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                console.log('Clear form clicked');
                this.clearForm();
            });
        }

        // Export buttons
        document.getElementById('exportDaily')?.addEventListener('click', () => this.exportDaily());
        document.getElementById('exportMonth')?.addEventListener('click', () => this.exportMonthly());
        document.getElementById('exportRange')?.addEventListener('click', () => this.showDateRangeModal());

        // Employee ID save
        const employeeIdInput = document.getElementById('employeeId');
        if (employeeIdInput) {
            employeeIdInput.addEventListener('blur', () => {
                this.saveEmployeeData();
                this.updateExportButtons();
            });
            employeeIdInput.addEventListener('input', () => {
                this.updateExportButtons();
            });
        }

        // Comments character count
        const commentsField = document.getElementById('comments');
        if (commentsField) {
            commentsField.addEventListener('input', (e) => {
                this.updateCharacterCount(e.target.value.length);
            });
        }

        // Date range modal
        this.bindModalEventListeners();

        console.log('Event listeners bound successfully');
    }

    bindModalEventListeners() {
        const dateRangeModal = document.getElementById('dateRangeModal');
        const closeDateRange = document.getElementById('closeDateRange');
        const cancelRange = document.getElementById('cancelRange');
        const exportRangeConfirm = document.getElementById('exportRangeConfirm');

        if (closeDateRange) {
            closeDateRange.addEventListener('click', () => this.hideDateRangeModal());
        }
        if (cancelRange) {
            cancelRange.addEventListener('click', () => this.hideDateRangeModal());
        }
        if (exportRangeConfirm) {
            exportRangeConfirm.addEventListener('click', () => this.exportDateRange());
        }
        if (dateRangeModal) {
            dateRangeModal.addEventListener('click', (e) => {
                if (e.target === dateRangeModal) {
                    this.hideDateRangeModal();
                }
            });
        }
    }

    navigateToPreviousMonth() {
        if (this.currentMonth === 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else {
            this.currentMonth--;
        }
        this.loadMonthlyData();
        this.renderCalendar();
        this.updateMonthlyStats();
        this.clearSelectedDate();
    }

    navigateToNextMonth() {
        if (this.currentMonth === 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else {
            this.currentMonth++;
        }
        this.loadMonthlyData();
        this.renderCalendar();
        this.updateMonthlyStats();
        this.clearSelectedDate();
    }

    renderCalendar() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        // Update month display
        const currentMonthYear = document.getElementById('currentMonthYear');
        if (currentMonthYear) {
            currentMonthYear.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        }

        // Render calendar dates
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
            if (dayData) dateCell.classList.add('has-work');

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

        // Restore selected date if it exists in current month
        if (this.selectedDate && 
            this.selectedDate.year === this.currentYear && 
            this.selectedDate.month === this.currentMonth) {
            this.updateCalendarSelection();
        }
    }

    selectDate(year, month, day) {
        this.selectedDate = { year, month, day };
        this.updateCalendarSelection();
        this.showDailyEntry();
        this.renderDailyProjects();
        this.updateExportButtons();
        console.log('Selected date:', this.selectedDate);
    }

    updateCalendarSelection() {
        // Clear all selections
        document.querySelectorAll('.calendar-date').forEach(cell => {
            cell.classList.remove('selected');
        });
        
        // Highlight selected date
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

    addProjectEntry() {
        console.log('Adding project entry...');
        
        if (!this.validateForm()) {
            return;
        }

        if (!this.selectedDate) {
            this.showMessage('Please select a date first.', 'error');
            return;
        }

        const projectId = document.getElementById('projectSelection').value;
        const subCode = document.getElementById('subCodeSelection').value;
        const hours = parseFloat(document.getElementById('hoursSpent').value);
        const comments = document.getElementById('comments').value.trim();

        console.log('Entry data:', { projectId, subCode, hours, comments });

        // Get project title
        const projectSelect = document.getElementById('projectSelection');
        const selectedOption = projectSelect.options[projectSelect.selectedIndex];
        const projectTitle = selectedOption.getAttribute('data-title');

        const dateKey = this.formatDateKey(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day);

        // Check for duplicates
        if (this.isDuplicate(dateKey, projectId, subCode)) {
            this.showMessage('This project and sub code combination already exists for this date.', 'error');
            return;
        }

        // Initialize daily data if doesn't exist
        if (!this.monthlyData[dateKey]) {
            this.monthlyData[dateKey] = {
                projects: [],
                totalHours: 0
            };
        }

        // Create entry
        const entry = {
            projectId,
            projectTitle,
            subCode,
            chargeCode: `${projectId}-${subCode}`,
            hours,
            comments
        };

        this.monthlyData[dateKey].projects.push(entry);
        this.monthlyData[dateKey].totalHours += hours;

        this.saveMonthlyData();
        this.saveEmployeeData();
        this.clearForm();
        this.renderCalendar();
        this.renderDailyProjects();
        this.updateMonthlyStats();
        this.updateExportButtons();
        this.showMessage('Project entry added successfully!', 'success');
        console.log('Entry added successfully:', entry);
    }

    validateForm() {
        const employeeId = document.getElementById('employeeId').value.trim();
        const projectId = document.getElementById('projectSelection').value;
        const subCode = document.getElementById('subCodeSelection').value;
        const hoursValue = document.getElementById('hoursSpent').value;

        console.log('Validating form:', { employeeId, projectId, subCode, hoursValue });

        if (!employeeId) {
            this.showMessage('Employee ID is required.', 'error');
            document.getElementById('employeeId').focus();
            return false;
        }

        if (!projectId) {
            this.showMessage('Please select a project.', 'error');
            document.getElementById('projectSelection').focus();
            return false;
        }

        if (!subCode) {
            this.showMessage('Please select a sub code.', 'error');
            document.getElementById('subCodeSelection').focus();
            return false;
        }

        if (!hoursValue || parseFloat(hoursValue) <= 0 || parseFloat(hoursValue) > 24) {
            this.showMessage('Please enter valid hours (0.25 - 24).', 'error');
            document.getElementById('hoursSpent').focus();
            return false;
        }

        return true;
    }

    isDuplicate(dateKey, projectId, subCode) {
        if (!this.monthlyData[dateKey]) return false;
        return this.monthlyData[dateKey].projects.some(entry => 
            entry.projectId === projectId && entry.subCode === subCode
        );
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
            projectList.innerHTML = dayData.projects.map((project, index) => `
                <div class="project-item">
                    <div class="project-item-header">
                        <div>
                            <div class="project-title">${project.projectId} - ${project.projectTitle}</div>
                            <div class="project-details">Sub Code: ${project.subCode} | Charge: ${project.chargeCode}</div>
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
            `).join('');
        }
    }

    removeProjectEntry(dateKey, index) {
        if (!confirm('Are you sure you want to delete this entry?')) return;

        const dayData = this.monthlyData[dateKey];
        if (!dayData || !dayData.projects[index]) return;

        const removedProject = dayData.projects.splice(index, 1)[0];
        dayData.totalHours -= removedProject.hours;

        if (dayData.projects.length === 0) {
            delete this.monthlyData[dateKey];
        }

        this.saveMonthlyData();
        this.renderCalendar();
        this.renderDailyProjects();
        this.updateMonthlyStats();
        this.showMessage('Project entry deleted.', 'success');
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

    calculateMonthlyStats() {
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        let totalDaysWorked = 0;
        let totalHours = 0;
        let totalProjectEntries = 0;
        const uniqueProjectsSet = new Set();

        Object.values(this.monthlyData).forEach(dayData => {
            if (dayData.projects.length > 0) {
                totalDaysWorked++;
                totalHours += dayData.totalHours;
                totalProjectEntries += dayData.projects.length;
                
                dayData.projects.forEach(project => {
                    uniqueProjectsSet.add(`${project.projectId}-${project.projectTitle}`);
                });
            }
        });

        return {
            totalDaysWorked,
            totalHours,
            averageHours: totalDaysWorked > 0 ? totalHours / totalDaysWorked : 0,
            totalProjectEntries,
            uniqueProjects: uniqueProjectsSet.size,
            progressPercentage: (totalDaysWorked / daysInMonth) * 100
        };
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

    updateCharacterCount(count) {
        const countElement = document.getElementById('commentCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    updateExportButtons() {
        const employeeId = document.getElementById('employeeId').value.trim();
        const hasData = Object.keys(this.monthlyData).length > 0;
        
        const exportDailyBtn = document.getElementById('exportDaily');
        const exportMonthBtn = document.getElementById('exportMonth');
        const exportRangeBtn = document.getElementById('exportRange');
        
        if (exportDailyBtn) {
            exportDailyBtn.disabled = !employeeId || !this.selectedDate;
        }
        if (exportMonthBtn) {
            exportMonthBtn.disabled = !employeeId || !hasData;
        }
        if (exportRangeBtn) {
            exportRangeBtn.disabled = !employeeId || !hasData;
        }
    }

    updateUI() {
        this.renderCalendar();
        this.updateMonthlyStats();
        this.updateExportButtons();
    }

    // Export Functions
    exportDaily() {
        if (!this.selectedDate) {
            this.showMessage('Please select a date to export.', 'error');
            return;
        }

        const employeeId = document.getElementById('employeeId').value.trim();
        const dateKey = this.formatDateKey(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day);
        const dayData = this.monthlyData[dateKey];

        if (!dayData) {
            this.showMessage('No data found for selected date.', 'error');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();
            const data = this.prepareDailyExportData(employeeId, dateKey, dayData);
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            ws['!cols'] = [
                { wch: 15 }, { wch: 20 }, { wch: 10 }, 
                { wch: 20 }, { wch: 8 }, { wch: 30 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Daily Log');
            
            const filename = `Daily_Log_${employeeId}_${dateKey}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            this.showMessage(`Daily export "${filename}" downloaded successfully!`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showMessage('Error generating export file.', 'error');
        }
    }

    exportMonthly() {
        const employeeId = document.getElementById('employeeId').value.trim();
        const monthKey = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;

        try {
            const wb = XLSX.utils.book_new();

            // Summary Sheet
            const summaryData = this.prepareMonthlyySummaryData(employeeId, monthKey);
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

            const filename = `Monthly_Log_${employeeId}_${monthKey}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            this.showMessage(`Monthly report "${filename}" downloaded successfully!`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showMessage('Error generating monthly report.', 'error');
        }
    }

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

    // Helper Functions
    formatDateKey(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

    prepareDailyExportData(employeeId, dateKey, dayData) {
        const data = [];
        data.push(['Employee ID:', employeeId]);
        data.push(['Date:', dateKey]);
        data.push(['Generated:', new Date().toLocaleString()]);
        data.push([]);
        data.push(['Project ID', 'Project Title', 'Sub Code', 'Charge Code', 'Hours', 'Comments']);

        dayData.projects.forEach(project => {
            data.push([
                project.projectId,
                project.projectTitle,
                project.subCode,
                project.chargeCode,
                project.hours,
                project.comments || ''
            ]);
        });

        data.push([]);
        data.push(['', '', '', 'Total Hours:', dayData.totalHours.toFixed(2), '']);

        return data;
    }

    prepareMonthlyySummaryData(employeeId, monthKey) {
        const stats = this.calculateMonthlyStats();
        const data = [];
        
        data.push(['Monthly Work Log Summary']);
        data.push([]);
        data.push(['Employee ID:', employeeId]);
        data.push(['Month:', monthKey]);
        data.push(['Generated:', new Date().toLocaleString()]);
        data.push([]);
        data.push(['Statistics']);
        data.push(['Total Days Worked:', stats.totalDaysWorked]);
        data.push(['Total Hours:', stats.totalHours.toFixed(2)]);
        data.push(['Average Hours per Day:', stats.averageHours.toFixed(2)]);
        data.push(['Total Project Entries:', stats.totalProjectEntries]);
        data.push(['Unique Projects:', stats.uniqueProjects]);
        data.push(['Month Progress:', `${stats.progressPercentage.toFixed(1)}%`]);

        return data;
    }

    prepareDailyDetailsData() {
        const data = [];
        data.push(['Date', 'Project ID', 'Project Title', 'Sub Code', 'Charge Code', 'Hours', 'Comments']);

        Object.keys(this.monthlyData).sort().forEach(dateKey => {
            const dayData = this.monthlyData[dateKey];
            dayData.projects.forEach(project => {
                data.push([
                    dateKey,
                    project.projectId,
                    project.projectTitle,
                    project.subCode,
                    project.chargeCode,
                    project.hours,
                    project.comments || ''
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
                    projectTotals[key] = { hours: 0, days: new Set() };
                }
                projectTotals[key].hours += project.hours;
                projectTotals[key].days.add(project.projectId);
            });
        });

        const data = [];
        data.push(['Project', 'Total Hours', 'Days Worked', 'Average Hours/Day']);

        Object.entries(projectTotals).forEach(([project, totals]) => {
            const daysWorked = totals.days.size;
            data.push([
                project,
                totals.hours.toFixed(2),
                daysWorked,
                (totals.hours / daysWorked).toFixed(2)
            ]);
        });

        return data;
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
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Monthly Work Log Tracker...');
    window.tracker = new MonthlyWorkLogTracker();
    window.tracker.init();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('projectForm');
        if (form && window.tracker?.selectedDate) {
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
            }
        }
    }
});
