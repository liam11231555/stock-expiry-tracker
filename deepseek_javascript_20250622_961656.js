document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    const app = {
        items: [],
        currentItemId: null,
        
        init: function() {
            this.loadItems();
            this.checkPassword();
            this.setupEventListeners();
        },
        
        // Password Management
        checkPassword: function() {
            const storedPassword = localStorage.getItem('expiryTrackerPassword');
            
            if (!storedPassword) {
                // First time setup - set default password
                localStorage.setItem('expiryTrackerPassword', 'admin123');
            }
            
            // Always show login screen initially
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('appContainer').classList.add('hidden');
        },
        
        login: function() {
            const password = document.getElementById('password').value;
            const storedPassword = localStorage.getItem('expiryTrackerPassword');
            
            if (password === storedPassword) {
                document.getElementById('loginScreen').classList.add('hidden');
                document.getElementById('appContainer').classList.remove('hidden');
                document.getElementById('passwordError').classList.add('hidden');
                document.getElementById('password').value = '';
                this.renderItems();
            } else {
                document.getElementById('passwordError').classList.remove('hidden');
            }
        },
        
        logout: function() {
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('appContainer').classList.add('hidden');
        },
        
        // Item Management
        loadItems: function() {
            const storedItems = localStorage.getItem('expiryTrackerItems');
            this.items = storedItems ? JSON.parse(storedItems) : [];
        },
        
        saveItems: function() {
            localStorage.setItem('expiryTrackerItems', JSON.stringify(this.items));
        },
        
        addItem: function(item) {
            // Generate a unique ID
            item.id = Date.now().toString();
            item.addedDate = new Date().toISOString().split('T')[0];
            this.items.push(item);
            this.saveItems();
            this.renderItems();
            this.showToast('Item added successfully');
        },
        
        updateItem: function(updatedItem) {
            const index = this.items.findIndex(item => item.id === updatedItem.id);
            if (index !== -1) {
                // Preserve the original added date
                updatedItem.addedDate = this.items[index].addedDate;
                this.items[index] = updatedItem;
                this.saveItems();
                this.renderItems();
                this.showToast('Item updated successfully');
            }
        },
        
        deleteItem: function(id) {
            this.items = this.items.filter(item => item.id !== id);
            this.saveItems();
            this.renderItems();
            this.showToast('Item deleted successfully');
        },
        
        // UI Rendering
        renderItems: function() {
            const container = document.getElementById('itemsContainer');
            const noItemsMessage = document.getElementById('noItemsMessage');
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const filterStatus = document.getElementById('filterStatus').value;
            const sortBy = document.getElementById('sortBy').value;
            
            // Clear the container
            container.innerHTML = '';
            
            // Filter and sort items
            let filteredItems = this.items.filter(item => {
                const itemName = item.name.toLowerCase();
                const itemNotes = item.notes ? item.notes.toLowerCase() : '';
                const matchesSearch = itemName.includes(searchTerm) || itemNotes.includes(searchTerm);
                
                if (filterStatus === 'all') {
                    return matchesSearch;
                }
                
                const status = this.getItemStatus(item);
                return status === filterStatus && matchesSearch;
            });
            
            // Sort items
            filteredItems.sort((a, b) => {
                if (sortBy === 'expiryDate') {
                    return new Date(a.expiryDate) - new Date(b.expiryDate);
                } else if (sortBy === 'name') {
                    return a.name.localeCompare(b.name);
                } else if (sortBy === 'addedDate') {
                    return new Date(a.addedDate) - new Date(b.addedDate);
                }
            });
            
            // Show or hide the "no items" message
            if (filteredItems.length === 0) {
                if (this.items.length === 0) {
                    noItemsMessage.classList.remove('hidden');
                } else {
                    container.innerHTML = `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-search text-4xl mb-3"></i>
                            <p>No items match your search criteria.</p>
                        </div>
                    `;
                }
            } else {
                noItemsMessage.classList.add('hidden');
                
                // Render each item
                filteredItems.forEach(item => {
                    const status = this.getItemStatus(item);
                    const statusClass = status;
                    const statusText = status === 'expired' ? 'Expired' : 
                                      status === 'expiring-soon' ? 'Expiring Soon' : 'Safe';
                    const statusDotClass = status === 'expired' ? 'expired-dot' : 
                                         status === 'expiring-soon' ? 'expiring-soon-dot' : 'safe-dot';
                    
                    const daysUntilExpiry = this.getDaysUntilExpiry(item);
                    const daysText = daysUntilExpiry < 0 ? `Expired ${Math.abs(daysUntilExpiry)} days ago` : 
                                   daysUntilExpiry === 0 ? 'Expires today' : 
                                   `Expires in ${daysUntilExpiry} days`;
                    
                    const itemElement = document.createElement('div');
                    itemElement.className = `${statusClass} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-300`;
                    itemElement.innerHTML = `
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div class="mb-3 md:mb-0">
                                <div class="flex items-center">
                                    <span class="status-dot ${statusDotClass}"></span>
                                    <h3 class="text-lg font-semibold text-gray-800">${item.name}</h3>
                                </div>
                                <div class="mt-1 text-sm text-gray-600">
                                    <span class="font-medium">${statusText}:</span> ${daysText}
                                </div>
                                ${item.notes ? `<p class="mt-2 text-sm text-gray-600">${item.notes}</p>` : ''}
                            </div>
                            <div class="flex flex-col md:items-end">
                                <div class="flex items-center space-x-2 mb-2 md:mb-3">
                                    ${item.quantity ? `<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Qty: ${item.quantity}</span>` : ''}
                                    <span class="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">Added: ${this.formatDate(item.addedDate)}</span>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="edit-btn text-blue-600 hover:text-blue-800 p-1" data-id="${item.id}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="delete-btn text-red-600 hover:text-red-800 p-1" data-id="${item.id}">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 pt-3 border-t border-gray-200">
                            <div class="flex justify-between text-xs text-gray-500">
                                <span>Expiry Date: ${this.formatDate(item.expiryDate)}</span>
                                <span>Added: ${this.formatDate(item.addedDate)}</span>
                            </div>
                        </div>
                    `;
                    
                    container.appendChild(itemElement);
                    
                    // Add event listeners to the buttons
                    itemElement.querySelector('.edit-btn').addEventListener('click', () => this.showEditModal(item.id));
                    itemElement.querySelector('.delete-btn').addEventListener('click', () => this.showDeleteModal(item.id));
                });
            }
            
            // Update status counts
            this.updateStatusCounts();
        },
        
        updateStatusCounts: function() {
            let expiredCount = 0;
            let expiringSoonCount = 0;
            let safeCount = 0;
            
            this.items.forEach(item => {
                const status = this.getItemStatus(item);
                if (status === 'expired') {
                    expiredCount++;
                } else if (status === 'expiring-soon') {
                    expiringSoonCount++;
                } else {
                    safeCount++;
                }
            });
            
            document.getElementById('expiredCount').textContent = expiredCount;
            document.getElementById('expiringSoonCount').textContent = expiringSoonCount;
            document.getElementById('safeCount').textContent = safeCount;
        },
        
        // Modal Management
        showAddModal: function() {
            document.getElementById('modalTitle').textContent = 'Add New Item';
            document.getElementById('itemForm').reset();
            document.getElementById('itemId').value = '';
            document.getElementById('expiryDate').min = new Date().toISOString().split('T')[0];
            this.currentItemId = null;
            this.openModal('itemModal');
        },
        
        showEditModal: function(id) {
            const item = this.items.find(item => item.id === id);
            if (item) {
                document.getElementById('modalTitle').textContent = 'Edit Item';
                document.getElementById('itemId').value = item.id;
                document.getElementById('itemName').value = item.name;
                document.getElementById('expiryDate').value = item.expiryDate;
                document.getElementById('quantity').value = item.quantity || '';
                document.getElementById('notes').value = item.notes || '';
                this.currentItemId = id;
                this.openModal('itemModal');
            }
        },
        
        showDeleteModal: function(id) {
            this.currentItemId = id;
            this.openModal('deleteModal');
        },
        
        openModal: function(modalId) {
            document.getElementById(modalId).classList.remove('hidden');
        },
        
        closeModal: function(modalId) {
            document.getElementById(modalId).classList.add('hidden');
        },
        
        // Form Handling
        handleItemFormSubmit: function(e) {
            e.preventDefault();
            
            const itemId = document.getElementById('itemId').value;
            const name = document.getElementById('itemName').value;
            const expiryDate = document.getElementById('expiryDate').value;
            const quantity = document.getElementById('quantity').value;
            const notes = document.getElementById('notes').value;
            
            const item = {
                name,
                expiryDate,
                quantity: quantity ? parseInt(quantity) : null,
                notes
            };
            
            if (itemId) {
                // Update existing item
                item.id = itemId;
                this.updateItem(item);
            } else {
                // Add new item
                this.addItem(item);
            }
            
            this.closeModal('itemModal');
        },
        
        // Utility Functions
        getItemStatus: function(item) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const expiryDate = new Date(item.expiryDate);
            expiryDate.setHours(0, 0, 0, 0);
            
            const timeDiff = expiryDate - today;
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            if (daysDiff < 0) {
                return 'expired';
            } else if (daysDiff <= 7) {
                return 'expiring-soon';
            } else {
                return 'safe';
            }
        },
        
        getDaysUntilExpiry: function(item) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const expiryDate = new Date(item.expiryDate);
            expiryDate.setHours(0, 0, 0, 0);
            
            const timeDiff = expiryDate - today;
            return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        },
        
        showToast: function(message) {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toastMessage');
            
            toastMessage.textContent = message;
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        },
        
        downloadCSV: function() {
            if (this.items.length === 0) {
                this.showToast('No items to export');
                return;
            }
            
            // Sort items by expiry date
            const sortedItems = [...this.items].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
            
            // Create CSV header
            let csvContent = 'Item Name,Expiry Date,Added Date,Quantity,Notes,Status\n';
            
            // Add each item to CSV
            sortedItems.forEach(item => {
                const status = this.getItemStatus(item) === 'expired' ? 'Expired' : 
                              this.getItemStatus(item) === 'expiring-soon' ? 'Expiring Soon' : 'Safe';
                
                // Escape commas in notes
                const notes = item.notes ? `"${item.notes.replace(/"/g, '""')}"` : '';
                
                csvContent += `${item.name},${item.expiryDate},${item.addedDate},${item.quantity || ''},${notes},${status}\n`;
            });
            
            // Create and download the file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `expired-items-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showToast('CSV file downloaded successfully');
        },
        
        // Event Listeners
        setupEventListeners: function() {
            // Login
            document.getElementById('loginButton').addEventListener('click', () => this.login());
            document.getElementById('password').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.login();
                }
            });
            
            // Logout
            document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
            
            // Item Management
            document.getElementById('addItemBtn').addEventListener('click', () => this.showAddModal());
            document.getElementById('itemForm').addEventListener('submit', (e) => this.handleItemFormSubmit(e));
            document.getElementById('cancelItemBtn').addEventListener('click', () => this.closeModal('itemModal'));
            
            // Delete Confirmation
            document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
                this.deleteItem(this.currentItemId);
                this.closeModal('deleteModal');
            });
            document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeModal('deleteModal'));
            
            // Search and Filter
            document.getElementById('searchInput').addEventListener('input', () => this.renderItems());
            document.getElementById('filterStatus').addEventListener('change', () => this.renderItems());
            document.getElementById('sortBy').addEventListener('change', () => this.renderItems());
            
            // CSV Download
            document.getElementById('downloadBtn').addEventListener('click', () => this.downloadCSV());
        }
    };
    
    // Initialize the application
    app.init();
});