// Daily Project Log Tracker Application
class DailyLogTracker {
    constructor() {
        this.projects = [];
        this.currentDeleteIndex = -1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setCurrentDate();
        this.updateDisplay();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('projectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addProject();
        });

        // Clear form button
        document.getElementById('clearForm').addEventListener('click', () => {
            this.clearForm();
        });

        // Download Excel button
        document.getElementById('downloadExcel').addEventListener('click', () => {
            this.downloadExcel();
        });

        // Modal buttons
        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.confirmDelete();
        });

        document.getElementById('cancelDelete').addEventListener('click', () => {
            this.hideModal();
        });

        // Modal overlay click
        document.getElementById('modalOverlay').addEventListener('click', () => {
            this.hideModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                const form = document.getElementById('projectForm');
                if (this.isFormValid()) {
                    e.preventDefault();
                    this.addProject();
                }
            } else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.downloadExcel();
            } else if (e.key === 'Escape') {
                this.hideModal();
            }
        });

        // Real-time validation
        const inputs = document.querySelectorAll('.form-control');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }

    setCurrentDate() {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        document.getElementById('logDate').value = formattedDate;
    }

    addProject() {
        if (!this.isFormValid()) {
            this.showMessage('Please fill in all required fields correctly.', 'error');
            return;
        }

        const projectData = this.getFormData();
        
        // Check for duplicates
        if (this.isDuplicateProject(projectData)) {
            this.showMessage('A project with the same name and charge code already exists.', 'error');
            return;
        }

        this.projects.push(projectData);
        this.clearForm();
        this.updateDisplay();
        this.showMessage('Project added successfully!', 'success');
        
        // Focus back to project name for quick entry
        document.getElementById('projectName').focus();
    }

    getFormData() {
        return {
            projectName: document.getElementById('projectName').value.trim(),
            chargeCode: document.getElementById('chargeCode').value.trim(),
            hours: parseFloat(document.getElementById('hoursSpent').value),
            comments: document.getElementById('comments').value.trim()
        };
    }

    isDuplicateProject(newProject) {
        return this.projects.some(project => 
            project.projectName.toLowerCase() === newProject.projectName.toLowerCase() &&
            project.chargeCode.toLowerCase() === newProject.chargeCode.toLowerCase()
        );
    }

    isFormValid() {
        const employeeId = document.getElementById('employeeId').value.trim();
        const projectName = document.getElementById('projectName').value.trim();
        const chargeCode = document.getElementById('chargeCode').value.trim();
        const hours = document.getElementById('hoursSpent').value;

        let isValid = true;

        // Validate Employee ID
        if (!employeeId) {
            this.setFieldError('employeeId', 'Employee ID is required');
            isValid = false;
        }

        // Validate Project Name
        if (!projectName) {
            this.setFieldError('projectName', 'Project name is required');
            isValid = false;
        } else if (projectName.length > 100) {
            this.setFieldError('projectName', 'Project name must be 100 characters or less');
            isValid = false;
        }

        // Validate Charge Code
        if (!chargeCode) {
            this.setFieldError('chargeCode', 'Charge code is required');
            isValid = false;
        } else if (chargeCode.length > 20) {
            this.setFieldError('chargeCode', 'Charge code must be 20 characters or less');
            isValid = false;
        }

        // Validate Hours
        if (!hours || hours === '') {
            this.setFieldError('hoursSpent', 'Hours spent is required');
            isValid = false;
        } else if (parseFloat(hours) < 0 || parseFloat(hours) > 24) {
            this.setFieldError('hoursSpent', 'Hours must be between 0 and 24');
            isValid = false;
        }

        // Validate Comments length
        const comments = document.getElementById('comments').value.trim();
        if (comments.length > 500) {
            this.setFieldError('comments', 'Comments must be 500 characters or less');
            isValid = false;
        }

        return isValid;
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldId = field.id;
        let isValid = true;

        switch (fieldId) {
            case 'employeeId':
                if (!value) {
                    this.setFieldError(fieldId, 'Employee ID is required');
                    isValid = false;
                }
                break;
            case 'projectName':
                if (!value) {
                    this.setFieldError(fieldId, 'Project name is required');
                    isValid = false;
                } else if (value.length > 100) {
                    this.setFieldError(fieldId, 'Project name must be 100 characters or less');
                    isValid = false;
                }
                break;
            case 'chargeCode':
                if (!value) {
                    this.setFieldError(fieldId, 'Charge code is required');
                    isValid = false;
                } else if (value.length > 20) {
                    this.setFieldError(fieldId, 'Charge code must be 20 characters or less');
                    isValid = false;
                }
                break;
            case 'hoursSpent':
                if (!value || value === '') {
                    this.setFieldError(fieldId, 'Hours spent is required');
                    isValid = false;
                } else if (parseFloat(value) < 0 || parseFloat(value) > 24) {
                    this.setFieldError(fieldId, 'Hours must be between 0 and 24');
                    isValid = false;
                }
                break;
            case 'comments':
                if (value.length > 500) {
                    this.setFieldError(fieldId, 'Comments must be 500 characters or less');
                    isValid = false;
                }
                break;
        }

        return isValid;
    }

    setFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const existingError = field.parentNode.querySelector('.field-error');
        
        field.classList.add('form-control--error');
        
        if (!existingError) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = message;
            field.parentNode.appendChild(errorDiv);
        } else {
            existingError.textContent = message;
        }
    }

    clearFieldError(field) {
        field.classList.remove('form-control--error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    clearForm() {
        document.getElementById('projectName').value = '';
        document.getElementById('chargeCode').value = '';
        document.getElementById('hoursSpent').value = '';
        document.getElementById('comments').value = '';
        
        // Clear any validation errors
        const errorFields = document.querySelectorAll('.form-control--error');
        errorFields.forEach(field => this.clearFieldError(field));
        
        const errorMessages = document.querySelectorAll('.field-error');
        errorMessages.forEach(error => error.remove());
    }

    updateDisplay() {
        const hasProjects = this.projects.length > 0;
        const emptyState = document.getElementById('emptyState');
        const projectTable = document.getElementById('projectTable');
        
        if (hasProjects) {
            emptyState.classList.add('hidden');
            projectTable.classList.remove('hidden');
            this.renderProjectTable();
        } else {
            emptyState.classList.remove('hidden');
            projectTable.classList.add('hidden');
        }
        
        this.updateTotalHours();
    }

    renderProjectTable() {
        const tbody = document.getElementById('projectTableBody');
        tbody.innerHTML = '';
        
        this.projects.forEach((project, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.escapeHtml(project.projectName)}</td>
                <td>${this.escapeHtml(project.chargeCode)}</td>
                <td class="hours-cell">${project.hours.toFixed(2)}</td>
                <td class="comments-cell">${this.escapeHtml(project.comments)}</td>
                <td class="action-cell">
                    <button class="btn btn--delete" onclick="app.showDeleteConfirmation(${index})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    showDeleteConfirmation(index) {
        this.currentDeleteIndex = index;
        document.getElementById('confirmModal').classList.remove('hidden');
        document.getElementById('modalOverlay').classList.remove('hidden');
        document.getElementById('confirmDelete').focus();
    }

    confirmDelete() {
        if (this.currentDeleteIndex >= 0) {
            const deletedProject = this.projects[this.currentDeleteIndex];
            this.projects.splice(this.currentDeleteIndex, 1);
            this.updateDisplay();
            this.hideModal();
            this.showMessage(`Project "${deletedProject.projectName}" has been deleted.`, 'success');
            this.currentDeleteIndex = -1;
        }
    }

    hideModal() {
        document.getElementById('confirmModal').classList.add('hidden');
        document.getElementById('modalOverlay').classList.add('hidden');
        this.currentDeleteIndex = -1;
    }

    updateTotalHours() {
        const total = this.projects.reduce((sum, project) => sum + project.hours, 0);
        document.getElementById('totalHours').textContent = total.toFixed(2);
    }

    downloadExcel() {
        const employeeId = document.getElementById('employeeId').value.trim();
        
        if (!employeeId) {
            this.showMessage('Please enter an Employee ID before downloading.', 'error');
            return;
        }
        
        if (this.projects.length === 0) {
            this.showMessage('Please add at least one project before downloading.', 'error');
            return;
        }

        try {
            const button = document.getElementById('downloadExcel');
            button.classList.add('btn--loading');
            button.disabled = true;

            // Prepare data for Excel
            const logDate = document.getElementById('logDate').value;
            const totalHours = this.projects.reduce((sum, project) => sum + project.hours, 0);
            const timestamp = new Date().toLocaleString();

            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Prepare data with metadata
            const data = [
                ['Daily Project Log'],
                [''],
                ['Employee ID:', employeeId],
                ['Date:', logDate],
                ['Total Hours:', totalHours.toFixed(2)],
                ['Generated:', timestamp],
                [''],
                ['Project Name', 'Charge Code', 'Hours', 'Comments']
            ];

            // Add project data
            this.projects.forEach(project => {
                data.push([
                    project.projectName,
                    project.chargeCode,
                    project.hours,
                    project.comments
                ]);
            });

            // Add total row
            data.push(['', '', totalHours.toFixed(2), 'TOTAL HOURS']);

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(data);

            // Set column widths
            ws['!cols'] = [
                { wch: 30 }, // Project Name
                { wch: 15 }, // Charge Code
                { wch: 10 }, // Hours
                { wch: 50 }  // Comments
            ];

            // Style the header
            if (ws['A1']) {
                ws['A1'].s = {
                    font: { bold: true, sz: 16 },
                    alignment: { horizontal: 'center' }
                };
            }

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Daily Log');

            // Generate filename
            const dateForFile = logDate.replace(/-/g, '_');
            const filename = `Daily_Log_${employeeId}_${dateForFile}.xlsx`;

            // Download file
            XLSX.writeFile(wb, filename);

            this.showMessage('Excel file downloaded successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating Excel file:', error);
            this.showMessage('Error generating Excel file. Please try again.', 'error');
        } finally {
            const button = document.getElementById('downloadExcel');
            button.classList.remove('btn--loading');
            button.disabled = false;
        }
    }

    showMessage(text, type = 'success') {
        const container = document.getElementById('messageContainer');
        const message = document.createElement('div');
        message.className = `message message--${type}`;
        message.textContent = text;
        
        container.appendChild(message);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 5000);
        
        // Remove on click
        message.addEventListener('click', () => {
            message.remove();
        });
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DailyLogTracker();
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
    if (app) {
        app.showMessage('An unexpected error occurred. Please refresh the page if issues persist.', 'error');
    }
});

// Handle beforeunload to warn about unsaved data
window.addEventListener('beforeunload', (e) => {
    if (app && app.projects.length > 0) {
        const message = 'You have unsaved project entries. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
    }
});