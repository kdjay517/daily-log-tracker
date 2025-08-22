// Enhanced Daily Log Tracker Application with Holiday/Leave Support
class EnhancedDailyLogTracker {
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

        // Special entry types for Holiday and Leave
        this.specialEntryTypes = [
            {
                "projectId": "HOLIDAY",
                "projectTitle": "Holiday",
                "subCode": null,
                "chargeCode": "N/A",
                "commentsRequired": true,
                "color": "orange"
            },
            {
                "projectId": "LEAVE",
                "projectTitle": "Leave", 
                "subCode": null,
                "chargeCode": "N/A",
                "commentsRequired": true,
                "color": "red"
            }
        ];

        // Monthly log entries - organized by date
        this.monthlyLogs = {};
        this.selectedDate = null;
        this.currentMonth = null;
    }

    init() {
        console.log('Initializing Enhanced Daily Log Tracker...');
        this.setCurrentMonth();
        this.populateProjectDropdown();
        this.bindEventListeners();
        this.renderCalendar();
        this.updateUI();
        console.log('Initialization complete');
    }

    setCurrentMonth() {
        const monthInput = document.getElementById('monthYear');
        if (monthInput) {
            const today = new Date();
            const monthString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            monthInput.value = monthString;
            this.currentMonth = monthString;
            console.log('Month set to:', monthString);
        }
    }

    populateProjectDropdown() {
        const projectSelect = document.getElementById('projectSelection');
        if (!projectSelect) {
            console.error('Project selection element not found');
            return;
        }

        console.log('Populating project dropdown...');
        
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

        // Sort projects alphabetically by display text
        const sortedProjects = Object.values(uniqueProjects).sort((a, b) => 
            `${a.projectId} - ${a.projectTitle}`.localeCompare(`${b.projectId} - ${b.projectTitle}`)
        );

        // Clear existing options (except the default)
        projectSelect.innerHTML = '<option value="">Select a project...</option>';

        // Add regular project options
        sortedProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.projectId;
            option.textContent = `${project.projectId} - ${project.projectTitle}`;
            option.setAttribute('data-title', project.projectTitle);
            option.setAttribute('data-type', 'work');
            projectSelect.appendChild(option);
        });

        // Add special entry types (Holiday and Leave)
        this.specialEntryTypes.forEach(special => {
            const option = document.createElement('option');
            option.value = special.projectId;
            option.textContent = special.projectTitle;
            option.setAttribute('data-title', special.projectTitle);
            option.setAttribute('data-type', 'special');
            projectSelect.appendChild(option);
        });

        console.log('Project dropdown populated with', sortedProjects.length + this.specialEntryTypes.length, 'options');
    }

    populateSubCodeDropdown(selectedProjectId) {
        const subCodeSelect = document.getElementById('subCodeSelection');
        const subCodeGroup = document.getElementById('subCodeGroup');
        
        if (!subCodeSelect || !subCodeGroup) {
            console.error('Sub code elements not found');
            return;
        }

        console.log('Populating sub code dropdown for project:', selectedProjectId);
        
        // Check if this is a special entry type
        const isSpecialEntry = this.specialEntryTypes.some(special => special.projectId === selectedProjectId);
        
        if (isSpecialEntry) {
            // Hide sub code field for Holiday/Leave
            subCodeGroup.classList.add('hidden');
            subCodeSelect.disabled = true;
            subCodeSelect.removeAttribute('required');
            subCodeSelect.value = '';
            this.updateChargeCode(selectedProjectId, null);
            return;
        }

        // Show sub code field for regular projects
        subCodeGroup.classList.remove('hidden');
        subCodeSelect.setAttribute('required', 'required');
        
        if (!selectedProjectId) {
            subCodeSelect.innerHTML = '<option value="">Select sub code...</option>';
            subCodeSelect.disabled = true;
            subCodeSelect.value = '';
            this.updateChargeCode('', '');
            return;
        }

        // Get sub codes for the selected project
        const subCodes = this.projectData
            .filter(item => item.projectId === selectedProjectId)
            .map(item => item.subCode)
            .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
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
        console.log('Sub code dropdown enabled with', subCodes.length, 'options');
    }

    updateChargeCode(projectId, subCode) {
        const chargeCodeInput = document.getElementById('chargeCode');
        if (!chargeCodeInput) {
            console.error('Charge code input element not found');
            return;
        }
        
        // Check if this is a special entry type
        const isSpecialEntry = this.specialEntryTypes.some(special => special.projectId === projectId);
        
        if (isSpecialEntry) {
            chargeCodeInput.value = 'N/A';
            chargeCodeInput.classList.add('na-field');
            console.log('Charge code set to N/A for special entry');
        } else if (projectId && subCode) {
            const chargeCode = `${projectId}-${subCode}`;
            chargeCodeInput.value = chargeCode;
            chargeCodeInput.classList.remove('na-field');
            console.log('Charge code updated to:', chargeCode);
        } else {
            chargeCodeInput.value = '';
            chargeCodeInput.classList.remove('na-field');
        }
    }

    updateCommentsRequirement(projectId) {
        const commentsField = document.getElementById('comments');
        const commentsLabel = document.querySelector('label[for="comments"]');
        const requiredIndicator = document.getElementById('commentsRequired');
        
        const isSpecialEntry = this.specialEntryTypes.some(special => special.projectId === projectId);
        
        if (isSpecialEntry) {
            commentsField.setAttribute('required', 'required');
            requiredIndicator.classList.remove('hidden');
            commentsField.placeholder = 'Please specify the reason/type (required for Holiday/Leave)';
            console.log('Comments made required for special entry');
        } else {
            commentsField.removeAttribute('required');
            requiredIndicator.classList.add('hidden');
            commentsField.placeholder = 'Enter any additional notes or comments...';
        }
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendar');
        if (!calendarGrid || !this.currentMonth) {
            console.error('Calendar grid or current month not available');
            return;
        }

        const [year, month] = this.currentMonth.split('-').map(Number);
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        calendarGrid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day calendar-day-header';
            dayElement.textContent = day;
            calendarGrid.appendChild(dayElement);
        });

        // Add calendar days
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = currentDate.getDate();
            dayElement.setAttribute('data-date', this.formatDate(currentDate));
            dayElement.setAttribute('tabindex', '0'); // Make focusable for accessibility
            
            // Check if day is in current month
            if (currentDate.getMonth() !== month - 1) {
                dayElement.classList.add('other-month');
            }
            
            // Check for entries on this date
            const dateKey = this.formatDate(currentDate);
            const dayEntries = this.monthlyLogs[dateKey];
            
            if (dayEntries && dayEntries.length > 0) {
                dayElement.classList.add('has-entries');
                
                // Determine entry types for color coding
                const entryTypes = dayEntries.map(entry => entry.entryType);
                const uniqueTypes = [...new Set(entryTypes)];
                
                if (uniqueTypes.length > 1) {
                    dayElement.classList.add('mixed-entry');
                } else {
                    switch (uniqueTypes[0]) {
                        case 'work':
                            dayElement.classList.add('work-entry');
                            break;
                        case 'holiday':
                            dayElement.classList.add('holiday-entry');
                            break;
                        case 'leave':
                            dayElement.classList.add('leave-entry');
                            break;
                    }
                }
            }
            
            // Check if this is the selected date
            if (this.selectedDate && dateKey === this.selectedDate) {
                dayElement.classList.add('selected');
            }
            
            // Add click handler for date selection
            const clickHandler = () => {
                if (!dayElement.classList.contains('other-month')) {
                    this.selectDate(dateKey);
                }
            };
            
            dayElement.addEventListener('click', clickHandler);
            dayElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clickHandler();
                }
            });
            
            calendarGrid.appendChild(dayElement);
        }

        console.log('Calendar rendered for', this.currentMonth);
    }

    selectDate(dateString) {
        this.selectedDate = dateString;
        this.updateSelectedDateDisplay();
        this.renderCalendar(); // Re-render to update selection
        this.updateDailyEntries();
        this.clearForm();
        console.log('Selected date:', dateString);
    }

    updateSelectedDateDisplay() {
        const selectedDateElement = document.getElementById('selectedDate');
        if (selectedDateElement && this.selectedDate) {
            const date = new Date(this.selectedDate + 'T00:00:00');
            const formattedDate = date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            selectedDateElement.textContent = formattedDate;
        }
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    bindEventListeners() {
        console.log('Binding event listeners...');

        // Month/Year selection change
        const monthInput = document.getElementById('monthYear');
        if (monthInput) {
            monthInput.addEventListener('change', (e) => {
                this.currentMonth = e.target.value;
                this.selectedDate = null;
                this.renderCalendar();
                this.updateMonthlyUI();
                console.log('Month changed to:', this.currentMonth);
            });
        }

        // Project selection change
        const projectSelect = document.getElementById('projectSelection');
        if (projectSelect) {
            projectSelect.addEventListener('change', (e) => {
                console.log('Project selection changed to:', e.target.value);
                const selectedProjectId = e.target.value;
                this.populateSubCodeDropdown(selectedProjectId);
                this.updateCommentsRequirement(selectedProjectId);
                
                // Clear sub code selection when project changes
                const subCodeSelect = document.getElementById('subCodeSelection');
                if (subCodeSelect) {
                    subCodeSelect.value = '';
                }
                
                // Update charge code
                this.updateChargeCode(selectedProjectId, '');
            });
        }

        // Sub code selection change
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

        // Clear form button
        const clearBtn = document.getElementById('clearForm');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                console.log('Clear form clicked');
                this.clearForm();
            });
        }

        // Excel download
        const downloadBtn = document.getElementById('downloadExcel');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                console.log('Download Excel clicked');
                this.downloadExcel();
            });
        }

        // Character count for comments
        const commentsField = document.getElementById('comments');
        if (commentsField) {
            commentsField.addEventListener('input', (e) => {
                this.updateCharacterCount(e.target.value.length);
            });
        }

        // Employee ID validation
        const employeeIdField = document.getElementById('employeeId');
        if (employeeIdField) {
            employeeIdField.addEventListener('input', () => {
                this.updateDownloadButtonState();
            });
        }

        console.log('Event listeners bound successfully');
    }

    addProjectEntry() {
        console.log('Adding project entry...');
        
        if (!this.validateForm()) {
            return;
        }

        const projectId = document.getElementById('projectSelection').value;
        const subCodeSelect = document.getElementById('subCodeSelection');
        const subCode = subCodeSelect.value;
        const hours = parseFloat(document.getElementById('hoursSpent').value);
        const comments = document.getElementById('comments').value.trim();

        // Get project title and type
        const projectSelect = document.getElementById('projectSelection');
        const selectedOption = projectSelect.options[projectSelect.selectedIndex];
        const projectTitle = selectedOption.getAttribute('data-title');
        const entryType = selectedOption.getAttribute('data-type');

        // Check if this is a special entry
        const isSpecialEntry = entryType === 'special';
        
        let entry;
        if (isSpecialEntry) {
            // Holiday or Leave entry
            entry = {
                projectId,
                projectTitle,
                subCode: null,
                chargeCode: 'N/A',
                hours,
                comments,
                entryType: projectId.toLowerCase()
            };
        } else {
            // Regular work entry
            entry = {
                projectId,
                projectTitle,
                subCode,
                chargeCode: `${projectId}-${subCode}`,
                hours,
                comments,
                entryType: 'work'
            };
        }

        console.log('Entry data:', entry);

        // Check for duplicates
        if (this.isDuplicate(entry)) {
            this.showMessage('This entry combination already exists for the selected date.', 'error');
            return;
        }

        // Add entry to monthly logs
        if (!this.monthlyLogs[this.selectedDate]) {
            this.monthlyLogs[this.selectedDate] = [];
        }
        
        this.monthlyLogs[this.selectedDate].push(entry);
        
        this.updateUI();
        this.clearForm();
        
        const entryTypeText = isSpecialEntry ? 'time-off' : 'work';
        this.showMessage(`${projectTitle} entry added successfully!`, 'success');
        console.log('Entry added successfully:', entry);
    }

    validateForm() {
        const employeeId = document.getElementById('employeeId').value.trim();
        const projectId = document.getElementById('projectSelection').value;
        const subCodeSelect = document.getElementById('subCodeSelection');
        const subCode = subCodeSelect.value;
        const hoursValue = document.getElementById('hoursSpent').value;
        const comments = document.getElementById('comments').value.trim();

        console.log('Validating form:', { employeeId, projectId, subCode, hoursValue, comments });

        if (!employeeId) {
            this.showMessage('Employee ID is required.', 'error');
            document.getElementById('employeeId').focus();
            return false;
        }

        if (!this.selectedDate) {
            this.showMessage('Please select a date on the calendar.', 'error');
            return false;
        }

        if (!projectId) {
            this.showMessage('Please select a project.', 'error');
            document.getElementById('projectSelection').focus();
            return false;
        }

        // Check if it's a special entry
        const isSpecialEntry = this.specialEntryTypes.some(special => special.projectId === projectId);
        
        if (!isSpecialEntry && (!subCode || subCodeSelect.disabled)) {
            this.showMessage('Please select a sub code.', 'error');
            subCodeSelect.focus();
            return false;
        }

        if (!hoursValue || parseFloat(hoursValue) <= 0 || parseFloat(hoursValue) > 24) {
            this.showMessage('Please enter valid hours (0.25 - 24).', 'error');
            document.getElementById('hoursSpent').focus();
            return false;
        }

        if (isSpecialEntry && !comments) {
            this.showMessage('Comments are required for Holiday/Leave entries.', 'error');
            document.getElementById('comments').focus();
            return false;
        }

        return true;
    }

    isDuplicate(newEntry) {
        const dayEntries = this.monthlyLogs[this.selectedDate] || [];
        return dayEntries.some(entry => 
            entry.projectId === newEntry.projectId && 
            entry.subCode === newEntry.subCode
        );
    }

    clearForm() {
        console.log('Clearing form...');
        
        const projectSelect = document.getElementById('projectSelection');
        const subCodeSelect = document.getElementById('subCodeSelection');
        const subCodeGroup = document.getElementById('subCodeGroup');
        const chargeCode = document.getElementById('chargeCode');
        const hoursSpent = document.getElementById('hoursSpent');
        const comments = document.getElementById('comments');
        const requiredIndicator = document.getElementById('commentsRequired');

        if (projectSelect) projectSelect.value = '';
        if (subCodeSelect) {
            subCodeSelect.innerHTML = '<option value="">Select sub code...</option>';
            subCodeSelect.disabled = true;
            subCodeSelect.setAttribute('required', 'required');
        }
        if (subCodeGroup) subCodeGroup.classList.remove('hidden');
        if (chargeCode) {
            chargeCode.value = '';
            chargeCode.classList.remove('na-field');
        }
        if (hoursSpent) hoursSpent.value = '';
        if (comments) {
            comments.value = '';
            comments.removeAttribute('required');
            comments.placeholder = 'Enter any additional notes or comments...';
        }
        if (requiredIndicator) requiredIndicator.classList.add('hidden');
        
        this.updateCharacterCount(0);
    }

    updateUI() {
        this.renderCalendar();
        this.updateDailyEntries();
        this.updateMonthlyUI();
        this.updateDownloadButtonState();
    }

    updateDailyEntries() {
        const emptyState = document.getElementById('emptyState');
        const projectTable = document.getElementById('projectTable');
        const tableBody = document.getElementById('projectTableBody');

        if (!emptyState || !projectTable || !tableBody) {
            console.error('Required table elements not found');
            return;
        }

        const dayEntries = this.selectedDate ? this.monthlyLogs[this.selectedDate] || [] : [];

        if (dayEntries.length === 0) {
            emptyState.classList.remove('hidden');
            projectTable.classList.add('hidden');
            this.updateDailySummary(0, 0);
            return;
        }

        emptyState.classList.add('hidden');
        projectTable.classList.remove('hidden');

        tableBody.innerHTML = '';

        dayEntries.forEach((entry, index) => {
            const row = document.createElement('tr');
            const entryTypeDisplay = entry.entryType.charAt(0).toUpperCase() + entry.entryType.slice(1);
            
            row.innerHTML = `
                <td><span class="entry-type ${entry.entryType}">${entryTypeDisplay}</span></td>
                <td>${entry.projectId}</td>
                <td>${entry.projectTitle}</td>
                <td>${entry.subCode || '-'}</td>
                <td><span class="charge-code">${entry.chargeCode}</span></td>
                <td class="hours-cell">${entry.hours.toFixed(2)}</td>
                <td class="comments-cell">${entry.comments || '-'}</td>
                <td>
                    <button type="button" class="btn-delete" onclick="tracker.removeEntry(${index})">
                        Delete
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Update daily summary
        const totalHours = dayEntries.reduce((sum, entry) => sum + entry.hours, 0);
        const workHours = dayEntries
            .filter(entry => entry.entryType === 'work')
            .reduce((sum, entry) => sum + entry.hours, 0);
        
        this.updateDailySummary(totalHours, workHours);
    }

    updateDailySummary(totalHours, workHours) {
        const totalElement = document.getElementById('totalHours');
        const workElement = document.getElementById('workHours');
        
        if (totalElement) totalElement.textContent = totalHours.toFixed(2);
        if (workElement) workElement.textContent = workHours.toFixed(2);
    }

    updateMonthlyUI() {
        // Calculate monthly statistics
        const stats = this.calculateMonthlyStats();
        
        // Update summary cards
        const elements = {
            'daysLogged': stats.daysLogged,
            'workingDays': stats.workingDays,
            'holidayDays': stats.holidayDays,
            'leaveDays': stats.leaveDays,
            'monthlyTotalHours': stats.totalHours.toFixed(2),
            'productiveHours': stats.productiveHours.toFixed(2)
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    calculateMonthlyStats() {
        const currentMonthEntries = Object.keys(this.monthlyLogs)
            .filter(dateKey => dateKey.startsWith(this.currentMonth))
            .map(dateKey => this.monthlyLogs[dateKey])
            .flat();

        const dayCount = Object.keys(this.monthlyLogs)
            .filter(dateKey => dateKey.startsWith(this.currentMonth))
            .length;

        const workDays = new Set();
        const holidayDays = new Set();
        const leaveDays = new Set();

        Object.keys(this.monthlyLogs)
            .filter(dateKey => dateKey.startsWith(this.currentMonth))
            .forEach(dateKey => {
                const dayEntries = this.monthlyLogs[dateKey];
                const entryTypes = dayEntries.map(entry => entry.entryType);
                
                if (entryTypes.includes('work')) workDays.add(dateKey);
                if (entryTypes.includes('holiday')) holidayDays.add(dateKey);
                if (entryTypes.includes('leave')) leaveDays.add(dateKey);
            });

        const totalHours = currentMonthEntries.reduce((sum, entry) => sum + entry.hours, 0);
        const productiveHours = currentMonthEntries
            .filter(entry => entry.entryType === 'work')
            .reduce((sum, entry) => sum + entry.hours, 0);

        return {
            daysLogged: dayCount,
            workingDays: workDays.size,
            holidayDays: holidayDays.size,
            leaveDays: leaveDays.size,
            totalHours,
            productiveHours
        };
    }

    removeEntry(index) {
        if (!this.selectedDate || !confirm('Are you sure you want to delete this entry?')) {
            return;
        }

        const dayEntries = this.monthlyLogs[this.selectedDate];
        if (dayEntries && dayEntries[index]) {
            dayEntries.splice(index, 1);
            
            // Remove the date key if no entries remain
            if (dayEntries.length === 0) {
                delete this.monthlyLogs[this.selectedDate];
            }
            
            this.updateUI();
            this.showMessage('Entry deleted successfully.', 'success');
        }
    }

    updateDownloadButtonState() {
        const employeeId = document.getElementById('employeeId').value.trim();
        const downloadBtn = document.getElementById('downloadExcel');
        
        const hasEntries = Object.keys(this.monthlyLogs)
            .filter(dateKey => dateKey.startsWith(this.currentMonth))
            .length > 0;
        
        if (downloadBtn) {
            downloadBtn.disabled = !employeeId || !hasEntries;
        }
    }

    updateCharacterCount(count) {
        const countElement = document.getElementById('commentCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    downloadExcel() {
        const employeeId = document.getElementById('employeeId').value.trim();
        const monthYear = this.currentMonth;

        const monthlyEntries = Object.keys(this.monthlyLogs)
            .filter(dateKey => dateKey.startsWith(monthYear))
            .sort();

        if (!employeeId || monthlyEntries.length === 0) {
            this.showMessage('Cannot export: Missing employee ID or no entries for the selected month.', 'error');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // Create Summary Sheet
            this.createSummarySheet(wb, employeeId, monthYear);
            
            // Create Daily Details Sheet
            this.createDailyDetailsSheet(wb, monthlyEntries);
            
            // Create Project Summary Sheet
            this.createProjectSummarySheet(wb, monthlyEntries);

            // Generate filename
            const [year, month] = monthYear.split('-');
            const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
            const filename = `Monthly_Log_${employeeId}_${monthName}_${year}.xlsx`;

            // Download file
            XLSX.writeFile(wb, filename);

            this.showMessage(`Excel report "${filename}" downloaded successfully!`, 'success');

        } catch (error) {
            console.error('Excel export error:', error);
            this.showMessage('Error generating Excel file. Please try again.', 'error');
        }
    }

    createSummarySheet(wb, employeeId, monthYear) {
        const stats = this.calculateMonthlyStats();
        const [year, month] = monthYear.split('-');
        const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
        
        const summaryData = [
            ['Monthly Work Log Summary'],
            [''],
            ['Employee ID:', employeeId],
            ['Month/Year:', `${monthName} ${year}`],
            ['Report Generated:', new Date().toLocaleString()],
            [''],
            ['MONTHLY STATISTICS'],
            ['Total Days Logged', stats.daysLogged],
            ['Working Days', stats.workingDays],
            ['Holiday Days', stats.holidayDays],
            ['Leave Days', stats.leaveDays],
            [''],
            ['HOURS BREAKDOWN'],
            ['Total Hours Logged', stats.totalHours.toFixed(2)],
            ['Productive Work Hours', stats.productiveHours.toFixed(2)],
            ['Non-productive Hours', (stats.totalHours - stats.productiveHours).toFixed(2)],
            [''],
            ['EFFICIENCY METRICS'],
            ['Work vs Time-off Ratio', stats.totalHours > 0 ? ((stats.productiveHours / stats.totalHours) * 100).toFixed(1) + '%' : '0%'],
            ['Average Work Hours/Day', stats.workingDays > 0 ? (stats.productiveHours / stats.workingDays).toFixed(2) : '0.00']
        ];

        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        ws['!cols'] = [{ wch: 25 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Monthly Summary');
    }

    createDailyDetailsSheet(wb, monthlyEntries) {
        const detailsData = [
            ['Date', 'Project ID', 'Project Title', 'Sub Code', 'Charge Code', 'Hours', 'Comments', 'Entry Type']
        ];

        monthlyEntries.forEach(dateKey => {
            const dayEntries = this.monthlyLogs[dateKey];
            dayEntries.forEach(entry => {
                detailsData.push([
                    dateKey,
                    entry.projectId,
                    entry.projectTitle,
                    entry.subCode || 'N/A',
                    entry.chargeCode,
                    entry.hours,
                    entry.comments || '',
                    entry.entryType.toUpperCase()
                ]);
            });
        });

        const ws = XLSX.utils.aoa_to_sheet(detailsData);
        ws['!cols'] = [
            { wch: 12 }, // Date
            { wch: 18 }, // Project ID
            { wch: 20 }, // Project Title
            { wch: 10 }, // Sub Code
            { wch: 20 }, // Charge Code
            { wch: 8 },  // Hours
            { wch: 30 }, // Comments
            { wch: 12 }  // Entry Type
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Details');
    }

    createProjectSummarySheet(wb, monthlyEntries) {
        const projectSummary = {};
        const timeOffSummary = { holiday: 0, leave: 0 };

        // Aggregate project data
        monthlyEntries.forEach(dateKey => {
            const dayEntries = this.monthlyLogs[dateKey];
            dayEntries.forEach(entry => {
                if (entry.entryType === 'work') {
                    const key = `${entry.projectId}-${entry.subCode}`;
                    if (!projectSummary[key]) {
                        projectSummary[key] = {
                            projectId: entry.projectId,
                            projectTitle: entry.projectTitle,
                            subCode: entry.subCode,
                            chargeCode: entry.chargeCode,
                            totalHours: 0,
                            days: new Set()
                        };
                    }
                    projectSummary[key].totalHours += entry.hours;
                    projectSummary[key].days.add(dateKey);
                } else {
                    timeOffSummary[entry.entryType] += entry.hours;
                }
            });
        });

        const summaryData = [
            ['WORK PROJECTS SUMMARY'],
            ['Project ID', 'Project Title', 'Sub Code', 'Charge Code', 'Total Hours', 'Days Worked'],
            ['']
        ];

        Object.values(projectSummary).forEach(project => {
            summaryData.push([
                project.projectId,
                project.projectTitle,
                project.subCode,
                project.chargeCode,
                project.totalHours.toFixed(2),
                project.days.size
            ]);
        });

        summaryData.push(['']);
        summaryData.push(['TIME-OFF SUMMARY']);
        summaryData.push(['Type', 'Total Hours']);
        summaryData.push(['Holiday', timeOffSummary.holiday.toFixed(2)]);
        summaryData.push(['Leave', timeOffSummary.leave.toFixed(2)]);

        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        ws['!cols'] = [
            { wch: 20 }, // Project ID
            { wch: 20 }, // Project Title
            { wch: 10 }, // Sub Code
            { wch: 25 }, // Charge Code
            { wch: 12 }, // Total Hours
            { wch: 12 }  // Days Worked
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Project Summary');
    }

    showMessage(text, type) {
        const container = document.getElementById('messageContainer');
        if (!container) return;
        
        const message = document.createElement('div');
        message.className = `message message--${type}`;
        message.textContent = text;

        container.appendChild(message);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);

        // Remove on click
        message.addEventListener('click', () => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing enhanced tracker...');
    window.tracker = new EnhancedDailyLogTracker();
    window.tracker.init();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to add entry
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('projectForm');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to clear form
    if (e.key === 'Escape') {
        e.preventDefault();
        if (window.tracker) {
            window.tracker.clearForm();
        }
    }
});
