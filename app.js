// Enhanced Daily Log Tracker Application
class DailyLogTracker {
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

        this.logEntries = [];
    }

    init() {
        console.log('Initializing Daily Log Tracker...');
        this.setCurrentDate();
        this.populateProjectDropdown();
        this.bindEventListeners();
        this.updateUI();
        console.log('Initialization complete');
    }

    setCurrentDate() {
        const dateInput = document.getElementById('logDate');
        if (dateInput) {
            const today = new Date();
            const dateString = today.toISOString().split('T')[0];
            dateInput.value = dateString;
            console.log('Date set to:', dateString);
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
        console.log('Sub code dropdown enabled with', subCodes.length, 'options');
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

        // Project selection change
        const projectSelect = document.getElementById('projectSelection');
        if (projectSelect) {
            projectSelect.addEventListener('change', (e) => {
                console.log('Project selection changed to:', e.target.value);
                const selectedProjectId = e.target.value;
                this.populateSubCodeDropdown(selectedProjectId);
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
        const subCode = document.getElementById('subCodeSelection').value;
        const hours = parseFloat(document.getElementById('hoursSpent').value);
        const comments = document.getElementById('comments').value.trim();

        // Get project title
        const projectSelect = document.getElementById('projectSelection');
        const selectedOption = projectSelect.options[projectSelect.selectedIndex];
        const projectTitle = selectedOption.getAttribute('data-title');

        console.log('Entry data:', { projectId, projectTitle, subCode, hours, comments });

        // Check for duplicates
        if (this.isDuplicate(projectId, subCode)) {
            this.showMessage('This project and sub code combination already exists.', 'error');
            return;
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

        this.logEntries.push(entry);
        this.updateUI();
        this.clearForm();
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

    isDuplicate(projectId, subCode) {
        return this.logEntries.some(entry => 
            entry.projectId === projectId && entry.subCode === subCode
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

    updateUI() {
        this.renderProjectTable();
        this.updateTotalHours();
        this.updateDownloadButtonState();
    }

    renderProjectTable() {
        const emptyState = document.getElementById('emptyState');
        const projectTable = document.getElementById('projectTable');
        const tableBody = document.getElementById('projectTableBody');

        if (!emptyState || !projectTable || !tableBody) {
            console.error('Required table elements not found');
            return;
        }

        if (this.logEntries.length === 0) {
            emptyState.classList.remove('hidden');
            projectTable.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        projectTable.classList.remove('hidden');

        tableBody.innerHTML = '';

        this.logEntries.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.projectId}</td>
                <td>${entry.projectTitle}</td>
                <td>${entry.subCode}</td>
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
    }

    removeEntry(index) {
        if (confirm('Are you sure you want to delete this entry?')) {
            this.logEntries.splice(index, 1);
            this.updateUI();
            this.showMessage('Project entry deleted.', 'success');
        }
    }

    updateTotalHours() {
        const total = this.logEntries.reduce((sum, entry) => sum + entry.hours, 0);
        const totalElement = document.getElementById('totalHours');
        if (totalElement) {
            totalElement.textContent = total.toFixed(2);
        }
    }

    updateDownloadButtonState() {
        const employeeId = document.getElementById('employeeId').value.trim();
        const downloadBtn = document.getElementById('downloadExcel');
        
        if (downloadBtn) {
            downloadBtn.disabled = !employeeId || this.logEntries.length === 0;
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
        const date = document.getElementById('logDate').value;

        if (!employeeId || this.logEntries.length === 0) {
            this.showMessage('Cannot export: Missing employee ID or no project entries.', 'error');
            return;
        }

        try {
            // Create workbook
            const wb = XLSX.utils.book_new();

            // Prepare data for Excel
            const excelData = [];
            
            // Add metadata
            excelData.push(['Employee ID:', employeeId]);
            excelData.push(['Date:', date]);
            excelData.push(['Generated:', new Date().toLocaleString()]);
            excelData.push([]); // Empty row

            // Add headers
            excelData.push(['Project ID', 'Project Title', 'Sub Code', 'Charge Code', 'Hours', 'Comments']);

            // Add project entries
            this.logEntries.forEach(entry => {
                excelData.push([
                    entry.projectId,
                    entry.projectTitle,
                    entry.subCode,
                    entry.chargeCode,
                    entry.hours,
                    entry.comments || ''
                ]);
            });

            // Add total
            excelData.push([]); // Empty row
            excelData.push(['', '', '', 'Total Hours:', this.getTotalHours(), '']);

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Set column widths
            ws['!cols'] = [
                { wch: 15 }, // Project ID
                { wch: 20 }, // Project Title
                { wch: 10 }, // Sub Code
                { wch: 20 }, // Charge Code
                { wch: 8 },  // Hours
                { wch: 30 }  // Comments
            ];

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Daily Log');

            // Generate filename
            const filename = `Daily_Log_${employeeId}_${date}.xlsx`;

            // Download file
            XLSX.writeFile(wb, filename);

            this.showMessage(`Excel file "${filename}" downloaded successfully!`, 'success');

        } catch (error) {
            console.error('Excel export error:', error);
            this.showMessage('Error generating Excel file. Please try again.', 'error');
        }
    }

    getTotalHours() {
        return this.logEntries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(2);
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
    console.log('DOM loaded, initializing tracker...');
    window.tracker = new DailyLogTracker();
    window.tracker.init();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to add project
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
