// بيانات التطبيق - سيتم تخزينها في localStorage
let branches = JSON.parse(localStorage.getItem('branches')) || [];
let distributions = JSON.parse(localStorage.getItem('distributions')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    productName: 'كيس عيش',
    productUnit: 'كيس',
    currency: 'جنيه',
    pricePerUnit: 11,
    paymentTypes: ['كاش', 'آجل'],
    defaultPaymentType: 'كاش'
};

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تحديد الصفحة الحالية
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // تعيين التاريخ الحالي في حقول التاريخ
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (input.id === 'startDate') {
            // تعيين تاريخ بداية الأسبوع الحالي (الأحد)
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            input.value = startOfWeek.toISOString().split('T')[0];
        } else if (input.id === 'endDate') {
            input.value = today;
        } else {
            input.value = today;
        }
    });
    
    // تنفيذ الوظائف المناسبة حسب الصفحة الحالية
    if (currentPage === 'index.html' || currentPage === '') {
        loadBranchesIntoSelect();
        loadDistributions();
        setupDistributionForm();
    } else if (currentPage === 'branches.html') {
        loadBranches();
        setupBranchForm();
        setupEditBranchModal();
    } else if (currentPage === 'reports.html') {
        loadBranchesIntoSelect();
        setupReportForm();
        setupReportTypeChange();
    } else if (currentPage === 'settings.html') {
        loadSettings();
        setupSettingsForm();
    }

    // إضافة مستمع للأحداث لحساب السعر التلقائي
    const quantityInput = document.getElementById('quantity');
    const priceInput = document.getElementById('price');
    
    if (quantityInput && priceInput) {
        // إضافة مستمع لتغيير الكمية
        quantityInput.addEventListener('input', function() {
            const quantity = parseInt(this.value) || 0;
            const totalPrice = quantity * settings.pricePerUnit;
            priceInput.value = totalPrice.toFixed(2);
        });
        
        // إضافة مستمع لتغيير السعر
        priceInput.addEventListener('input', function() {
            const price = parseFloat(this.value) || 0;
            const quantity = parseInt(quantityInput.value) || 0;
            if (quantity > 0) {
                const pricePerUnit = (price / quantity).toFixed(2);
                // يمكن إضافة سعر الوحدة الواحدة في مكان آخر إذا أردت
            }
        });
    }
});

// وظائف الإعدادات
function loadSettings() {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }
    return settings;
}

function saveSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    localStorage.setItem('settings', JSON.stringify(settings));
    return settings;
}

function setupSettingsForm() {
    const settingsForm = document.getElementById('settingsForm');
    if (!settingsForm) return;

    const currentSettings = loadSettings();
    
    // تعبئة النموذج بالقيم الحالية
    document.getElementById('productName').value = currentSettings.productName;
    document.getElementById('productUnit').value = currentSettings.productUnit;
    document.getElementById('currency').value = currentSettings.currency;
    document.getElementById('pricePerUnit').value = currentSettings.pricePerUnit;
    document.getElementById('defaultPaymentType').value = currentSettings.defaultPaymentType;

    // معالجة إرسال النموذج
    settingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newSettings = {
            productName: document.getElementById('productName').value,
            productUnit: document.getElementById('productUnit').value,
            currency: document.getElementById('currency').value,
            pricePerUnit: parseFloat(document.getElementById('pricePerUnit').value),
            defaultPaymentType: document.getElementById('defaultPaymentType').value
        };

        saveSettings(newSettings);
        
        // إظهار رسالة نجاح
        alert('تم حفظ الإعدادات بنجاح');
    });
}

// وظائف الصفحة الرئيسية (index.html)
function loadBranchesIntoSelect() {
    const branchSelect = document.getElementById('branchSelect');
    const reportBranch = document.getElementById('reportBranch');
    
    if (branchSelect) {
        branchSelect.innerHTML = '<option value="" selected disabled>اختر الفرع</option>';
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = branch.name;
            branchSelect.appendChild(option);
        });
    }
    
    if (reportBranch) {
        // الإبقاء على خيار "جميع الفروع"
        reportBranch.innerHTML = '<option value="all" selected>جميع الفروع</option>';
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = branch.name;
            reportBranch.appendChild(option);
        });
    }
}

function loadDistributions() {
    const tableBody = document.getElementById('distributionsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const sortedDistributions = [...distributions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    const recentDistributions = sortedDistributions.slice(0, 10);
    
    if (recentDistributions.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" class="text-center">لا توجد توزيعات مسجلة بعد</td>';
        tableBody.appendChild(emptyRow);
        return;
    }
    
    recentDistributions.forEach(dist => {
        const branch = branches.find(b => b.id === dist.branchId);
        const branchName = branch ? branch.name : 'غير معروف';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${branchName}</td>
            <td>${dist.quantity} ${settings.productUnit}</td>
            <td>${dist.price} ${settings.currency}</td>
            <td>${dist.paymentType}</td>
            <td>${formatDateArabic(dist.date)}</td>
            <td>${dist.notes || '-'}</td>
            <td>
                <button class="btn btn-sm btn-danger delete-distribution" data-id="${dist.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    document.querySelectorAll('.delete-distribution').forEach(button => {
        button.addEventListener('click', function() {
            const distId = this.getAttribute('data-id');
            deleteDistribution(distId);
        });
    });
}

function setupDistributionForm() {
    const form = document.getElementById('distributionForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const branchId = document.getElementById('branchSelect').value;
        const quantity = document.getElementById('quantity').value;
        const price = document.getElementById('price').value;
        const date = document.getElementById('distributionDate').value;
        const notes = document.getElementById('notes').value;
        const paymentType = document.getElementById('paymentType').value;
        
        if (!branchId || !quantity || !date || !price || !paymentType) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        
        const newDistribution = {
            id: generateId(),
            branchId: branchId,
            quantity: parseInt(quantity),
            price: parseFloat(price),
            date: date,
            notes: notes,
            paymentType: paymentType
        };
        
        distributions.push(newDistribution);
        saveDistributions();
        
        updateBranchBalance(branchId, parseInt(quantity), parseFloat(price), paymentType);
        
        form.reset();
        document.getElementById('distributionDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('paymentType').value = settings.defaultPaymentType;
        loadDistributions();
        
        alert('تم إضافة التوزيع بنجاح');
    });
}

function deleteDistribution(id) {
    if (confirm('هل أنت متأكد من حذف هذا التوزيع؟')) {
        const distIndex = distributions.findIndex(d => d.id === id);
        if (distIndex !== -1) {
            const dist = distributions[distIndex];
            
            // عكس تأثير التوزيع على رصيد الفرع (طرح الكمية)
            updateBranchBalance(dist.branchId, -dist.quantity, -dist.price, dist.paymentType);
            
            // حذف التوزيع
            distributions.splice(distIndex, 1);
            saveDistributions();
            loadDistributions();
            
            alert('تم حذف التوزيع بنجاح');
        }
    }
}

// وظائف صفحة الفروع (branches.html)
function loadBranches() {
    const tableBody = document.getElementById('branchesTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (branches.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" class="text-center">لا توجد فروع مسجلة بعد</td>';
        tableBody.appendChild(emptyRow);
        return;
    }
    
    branches.forEach(branch => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${branch.name}</td>
            <td>${branch.location}</td>
            <td>${branch.contact || '-'}</td>
            <td>${branch.balance || 0} ${settings.productUnit}</td>
            <td>${branch.totalPrice || 0} ${settings.currency}</td>
            <td>${branch.cashBalance || 0} ${settings.currency} (كاش)</td>
            <td>${branch.creditBalance || 0} ${settings.currency} (آجل)</td>
            <td>
                <button class="btn btn-sm btn-warning edit-branch" data-id="${branch.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-branch" data-id="${branch.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // إضافة مستمعي الأحداث لأزرار التعديل والحذف
    document.querySelectorAll('.edit-branch').forEach(button => {
        button.addEventListener('click', function() {
            const branchId = this.getAttribute('data-id');
            openEditBranchModal(branchId);
        });
    });
    
    document.querySelectorAll('.delete-branch').forEach(button => {
        button.addEventListener('click', function() {
            const branchId = this.getAttribute('data-id');
            deleteBranch(branchId);
        });
    });
}

function setupBranchForm() {
    const form = document.getElementById('branchForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('branchName').value;
        const location = document.getElementById('branchLocation').value;
        const contact = document.getElementById('branchContact').value;
        
        if (!name || !location) {
            alert('يرجى ملء حقول الاسم والعنوان');
            return;
        }
        
        // إضافة فرع جديد مع تهيئة الحسابات
        const newBranch = {
            id: generateId(),
            name: name,
            location: location,
            contact: contact,
            balance: 0,
            cashBalance: 0,
            creditBalance: 0,
            totalPrice: 0
        };
        
        branches.push(newBranch);
        saveBranches();
        
        // إعادة تعيين النموذج وتحديث القائمة
        form.reset();
        loadBranches();
        
        alert('تم إضافة الفرع بنجاح');
    });
}

function setupEditBranchModal() {
    const form = document.getElementById('editBranchForm');
    const saveBtn = document.getElementById('saveBranchEdit');
    
    if (!form || !saveBtn) return;
    
    saveBtn.addEventListener('click', function() {
        const branchId = document.getElementById('editBranchId').value;
        const name = document.getElementById('editBranchName').value;
        const location = document.getElementById('editBranchLocation').value;
        const contact = document.getElementById('editBranchContact').value;
        
        if (!name || !location) {
            alert('يرجى ملء حقول الاسم والعنوان');
            return;
        }
        
        // تحديث بيانات الفرع
        const branchIndex = branches.findIndex(b => b.id === branchId);
        if (branchIndex !== -1) {
            branches[branchIndex].name = name;
            branches[branchIndex].location = location;
            branches[branchIndex].contact = contact;
            
            saveBranches();
            loadBranches();
            
            // إغلاق النافذة المنبثقة
            const modal = bootstrap.Modal.getInstance(document.getElementById('editBranchModal'));
            modal.hide();
            
            alert('تم تحديث بيانات الفرع بنجاح');
        }
    });
}

function openEditBranchModal(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    
    document.getElementById('editBranchId').value = branch.id;
    document.getElementById('editBranchName').value = branch.name;
    document.getElementById('editBranchLocation').value = branch.location;
    document.getElementById('editBranchContact').value = branch.contact || '';
    
    // فتح النافذة المنبثقة
    const modal = new bootstrap.Modal(document.getElementById('editBranchModal'));
    modal.show();
}

function deleteBranch(id) {
    // التحقق من وجود توزيعات مرتبطة بالفرع
    const hasDistributions = distributions.some(dist => dist.branchId === id);
    
    if (hasDistributions) {
        alert('لا يمكن حذف هذا الفرع لأنه يوجد توزيعات مرتبطة به. قم بحذف التوزيعات أولاً.');
        return;
    }
    
    if (confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
        const branchIndex = branches.findIndex(b => b.id === id);
        if (branchIndex !== -1) {
            branches.splice(branchIndex, 1);
            saveBranches();
            loadBranches();
            alert('تم حذف الفرع بنجاح');
        }
    }
}

// وظائف صفحة التقارير (reports.html)
function setupReportForm() {
    const form = document.getElementById('reportForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const reportType = document.getElementById('reportType').value;
        const branchId = document.getElementById('reportBranch').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            alert('يرجى تحديد فترة التقرير');
            return;
        }
        
        generateReport(reportType, branchId, startDate, endDate);
    });
    
    // زر طباعة التقرير
    const printBtn = document.getElementById('printReport');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
}

function setupReportTypeChange() {
    const reportType = document.getElementById('reportType');
    if (!reportType) return;
    
    reportType.addEventListener('change', function() {
        const today = new Date();
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (this.value === 'weekly') {
            // تعيين بداية الأسبوع الحالي (الأحد)
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startDateInput.value = startOfWeek.toISOString().split('T')[0];
            // تعيين نهاية الأسبوع (السبت)
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endDateInput.value = endOfWeek.toISOString().split('T')[0];
        } else if (this.value === 'monthly') {
            // تعيين بداية الشهر الحالي
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            startDateInput.value = startOfMonth.toISOString().split('T')[0];
            // تعيين نهاية الشهر الحالي
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            endDateInput.value = endOfMonth.toISOString().split('T')[0];
        } else if (this.value === 'custom') {
            // في حالة المخصص، نترك التواريخ فارغة للمستخدم
            startDateInput.value = '';
            endDateInput.value = '';
        }
    });
}

function generateReport(type, branchId, startDate, endDate) {
    // تحويل التواريخ إلى كائنات Date للمقارنة
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59); // تعيين نهاية اليوم
    
    // فلترة التوزيعات حسب الفترة المحددة والفرع
    let filteredDistributions = distributions.filter(dist => {
        const distDate = new Date(dist.date);
        return distDate >= start && distDate <= end;
    });
    
    // فلترة حسب الفرع إذا تم تحديد فرع محدد
    if (branchId !== 'all') {
        filteredDistributions = filteredDistributions.filter(dist => dist.branchId === branchId);
    }
    
    // ترتيب التوزيعات حسب التاريخ
    filteredDistributions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // إنشاء محتوى التقرير
    const reportContent = document.getElementById('reportContent');
    const reportPeriod = document.getElementById('reportPeriod');
    const reportResults = document.getElementById('reportResults');
    
    if (!reportContent || !reportPeriod || !reportResults) return;
    
    // عرض فترة التقرير
    reportPeriod.textContent = `${formatDateArabic(startDate)} - ${formatDateArabic(endDate)}`;
    
    // إنشاء محتوى التقرير
    let html = '';
    if (filteredDistributions.length === 0) {
        html = '<div class="alert alert-info">لا توجد بيانات توزيع خلال الفترة المحددة</div>';
    } else {
        // إحصائيات عامة
        const totalQuantity = filteredDistributions.reduce((sum, dist) => sum + dist.quantity, 0);
        const totalPrice = filteredDistributions.reduce((sum, dist) => sum + dist.price, 0);
        const cashTotal = filteredDistributions
            .filter(dist => dist.paymentType === 'كاش')
            .reduce((sum, dist) => sum + dist.price, 0);
        const creditTotal = filteredDistributions
            .filter(dist => dist.paymentType === 'آجل')
            .reduce((sum, dist) => sum + dist.price, 0);
        
        html = `
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h3 class="card-title">إجمالي الكمية</h3>
                            <p class="display-5 text-white">${totalQuantity} ${settings.productUnit}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <h3 class="card-title">إجمالي المبيعات</h3>
                            <p class="display-5">${totalPrice} ${settings.currency}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h3 class="card-title">المبيعات النقدية</h3>
                            <p class="display-5">${cashTotal} ${settings.currency}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body text-center">
                            <h3 class="card-title">المبيعات الآجلة</h3>
                            <p class="display-5">${creditTotal} ${settings.currency}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // جدول التوزيعات
        html += `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead class="bg-light">
                        <tr>
                            <th>التاريخ</th>
                            <th>الفرع</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>نوع العملية</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        filteredDistributions.forEach(dist => {
            const branch = branches.find(b => b.id === dist.branchId);
            const branchName = branch ? branch.name : 'غير معروف';
            
            html += `
                <tr>
                    <td>${formatDateArabic(dist.date)}</td>
                    <td>${branchName}</td>
                    <td>${dist.quantity} ${settings.productUnit}</td>
                    <td>${dist.price} ${settings.currency}</td>
                    <td>${dist.paymentType}</td>
                    <td>${dist.notes || '-'}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        // إذا كان التقرير لفرع واحد، أضف ملخص حساب الفرع
        if (branchId !== 'all') {
            const branch = branches.find(b => b.id === branchId);
            if (branch) {
                html += `
                    <div class="card mt-4 border-primary">
                        <div class="card-header bg-primary text-white">
                            <h4 class="mb-0">ملخص حساب الفرع: ${branch.name}</h4>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <p class="lead">إجمالي التوزيعات: ${totalQuantity} ${settings.productUnit}</p>
                                    <p class="lead">إجمالي المبيعات: ${totalPrice} ${settings.currency}</p>
                                </div>
                                <div class="col-md-4">
                                    <p class="lead">المبيعات النقدية: ${branch.cashBalance || 0} ${settings.currency}</p>
                                </div>
                                <div class="col-md-4">
                                    <p class="lead">المبيعات الآجلة: ${branch.creditBalance || 0} ${settings.currency}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        // تمكين زر الطباعة
        document.getElementById('printReport').classList.remove('disabled');
        document.getElementById('printReport').disabled = false;
    }
    
    reportContent.innerHTML = html;
    reportResults.style.display = 'block';
}

// وظائف مساعدة
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function updateBranchBalance(branchId, quantity, price, paymentType) {
    const branchIndex = branches.findIndex(b => b.id === branchId);
    if (branchIndex !== -1) {
        const branch = branches[branchIndex];
        
        // تحديث الرصيد العام
        branch.balance = (branch.balance || 0) + quantity;
        branch.totalPrice = (branch.totalPrice || 0) + price;
        
        // تحديث الرصيد حسب نوع الدفع
        if (paymentType === 'كاش') {
            branch.cashBalance = (branch.cashBalance || 0) + price;
        } else if (paymentType === 'آجل') {
            branch.creditBalance = (branch.creditBalance || 0) + price;
        }
        
        saveBranches();
        loadBranches();
    }
}

function formatDateArabic(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ar-EG', options);
}

function saveBranches() {
    localStorage.setItem('branches', JSON.stringify(branches));
}

function saveDistributions() {
    localStorage.setItem('distributions', JSON.stringify(distributions));
}
