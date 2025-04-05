// تأكد من أن DOM جاهز قبل تنفيذ الكود
document.addEventListener('DOMContentLoaded', function() {
    // إضافة زر التنبيهات الذكية إلى صفحة الرئيسية
    addSmartAlertsButton();
});

// إضافة زر التنبيهات الذكية إلى الصفحة الرئيسية
function addSmartAlertsButton() {
    // التحقق من أننا في الصفحة الرئيسية
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage !== 'index.html' && currentPage !== '') return;

    // البحث عن عنصر مناسب لإضافة الزر
    const containerElement = document.querySelector('.container') || document.body;
    if (!containerElement) return;

    // إنشاء زر التنبيهات الذكية
    const alertButton = document.createElement('button');
    alertButton.className = 'btn btn-info mb-3';
    alertButton.innerHTML = '<i class="fas fa-bell me-2"></i> عرض التنبيهات الذكية';
    alertButton.onclick = showSmartAlerts;

    // إضافة الزر قبل جدول التوزيعات
    const tableElement = document.querySelector('table') || document.getElementById('distributionsTable');
    if (tableElement && tableElement.parentElement) {
        tableElement.parentElement.insertBefore(alertButton, tableElement);
    } else {
        // إذا لم يتم العثور على الجدول، أضف الزر إلى حاوية الصفحة
        containerElement.prepend(alertButton);
    }

    // إضافة مربع الحوار للتنبيهات إلى DOM
    prepareAlertsModal();
}

// تحضير مربع حوار التنبيهات
function prepareAlertsModal() {
    // التحقق من وجود مربع الحوار مسبقاً
    if (document.getElementById('smartAlertsModal')) return;
    
    // إنشاء مربع حوار فارغ
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal fade';
    modalDiv.id = 'smartAlertsModal';
    modalDiv.tabIndex = '-1';
    modalDiv.setAttribute('aria-hidden', 'true');
    
    // هيكل أساسي لمربع الحوار
    modalDiv.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-bell me-2"></i>
                        تنبيهات ذكية وتوصيات
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" id="smartAlertsContent">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">جاري التحميل...</span>
                        </div>
                        <p class="mt-2">جاري تحليل البيانات...</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                    <button type="button" class="btn btn-primary" onclick="exportAlerts()">
                        <i class="fas fa-file-export me-1"></i> تصدير التقرير
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // إضافة مربع الحوار إلى المستند
    document.body.appendChild(modalDiv);
}

// دالة تحليل البيانات وإنشاء التنبيهات الذكية
function setupSmartAlerts() {
    const distributions = JSON.parse(localStorage.getItem('distributions')) || [];
    const branches = JSON.parse(localStorage.getItem('branches')) || [];
    
    if (distributions.length < 7) return null; // لا تتوفر بيانات كافية
    
    // ترتيب التوزيعات حسب التاريخ
    const sortedDistributions = [...distributions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // الحصول على البيانات الأخيرة (آخر 7 أيام)
    const recentData = sortedDistributions.slice(-7);
    
    // حساب متوسط الاستهلاك اليومي
    const dailyAvg = recentData.reduce((sum, dist) => sum + dist.quantity, 0) / recentData.length;
    
    // حساب متوسط السعر اليومي
    const dailyPriceAvg = recentData.reduce((sum, dist) => sum + (dist.price || 0), 0) / recentData.length;
    
    // تحديد يوم الذروة
    const dayTotals = {};
    const dayPrices = {};
    recentData.forEach(dist => {
        const date = new Date(dist.date);
        const day = date.getDay();
        if (!dayTotals[day]) {
            dayTotals[day] = 0;
            dayPrices[day] = 0;
        }
        dayTotals[day] += dist.quantity;
        dayPrices[day] += (dist.price || 0);
    });
    
    let peakDay = 0;
    let peakValue = 0;
    let peakPrice = 0;
    
    for (let day in dayTotals) {
        if (dayTotals[day] > peakValue) {
            peakValue = dayTotals[day];
            peakPrice = dayPrices[day];
            peakDay = parseInt(day);
        }
    }
    
    // تحويل رقم اليوم إلى اسم اليوم بالعربية
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const peakDayName = dayNames[peakDay];
    
    // تحديد الفروع الأكثر استهلاكًا
    const branchConsumption = {};
    const branchPrices = {};
    recentData.forEach(dist => {
        if (!branchConsumption[dist.branchId]) {
            branchConsumption[dist.branchId] = 0;
            branchPrices[dist.branchId] = 0;
        }
        branchConsumption[dist.branchId] += dist.quantity;
        branchPrices[dist.branchId] += (dist.price || 0);
    });
    
    // ترتيب الفروع حسب الاستهلاك
    const branchRanking = Object.keys(branchConsumption)
        .map(id => ({
            id,
            name: branches.find(b => b.id === id)?.name || 'غير معروف',
            total: branchConsumption[id],
            totalPrice: branchPrices[id]
        }))
        .sort((a, b) => b.total - a.total);
    
    // اكتشاف الشذوذات (الإنحرافات الكبيرة عن المتوسط)
    const recent = recentData.map(dist => dist.quantity);
    const avgConsumption = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    // حساب الانحراف المعياري
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - avgConsumption, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    
    // تحديد الأيام التي تختلف بشكل كبير عن المتوسط (أكثر من انحرافين معياريين)
    const anomalies = recentData.filter(dist => 
        Math.abs(dist.quantity - avgConsumption) > 2 * stdDev
    );
    
    // إنشاء ملخص للتنبيهات
    return {
        dailyAverage: Math.round(dailyAvg),
        dailyPriceAverage: Math.round(dailyPriceAvg),
        peakDay: peakDayName,
        peakValue: Math.round(peakValue / (recentData.length / 7)), // تقسيم على عدد الأسابيع
        peakPrice: Math.round(peakPrice / (recentData.length / 7)),
        topBranches: branchRanking.slice(0, 3),
        anomalies: anomalies.map(dist => ({
            date: dist.date,
            value: dist.quantity,
            price: dist.price || 0,
            percentDiff: Math.round((dist.quantity - avgConsumption) / avgConsumption * 100)
        }))
    };
}

// عرض مربع حوار التنبيهات الذكية
function showSmartAlerts() {
    // إظهار مربع الحوار أولاً
    const modalElement = document.getElementById('smartAlertsModal');
    if (modalElement) {
        const modalInstance = new bootstrap.Modal(modalElement);
        modalInstance.show();
        
        // تأخير معالجة البيانات لتحسين تجربة المستخدم
        setTimeout(() => {
            const alertsData = setupSmartAlerts();
            updateAlertsModal(alertsData);
        }, 500);
    } else {
        console.error('مربع الحوار غير موجود في DOM');
    }
}

// تحديث محتوى مربع حوار التنبيهات
function updateAlertsModal(alertsData) {
    const modalContent = document.getElementById('smartAlertsContent');
    if (!modalContent) return;
    
    if (!alertsData) {
        modalContent.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                لا تتوفر بيانات كافية للتحليل. يرجى تسجيل توزيعات لمدة أسبوع على الأقل.
            </div>
        `;
        return;
    }
    
    modalContent.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card mb-3 border-info">
                    <div class="card-header bg-info text-white">
                        <i class="fas fa-chart-line me-2"></i>
                        إحصائيات الاستهلاك الرئيسية
                    </div>
                    <div class="card-body">
                        <p><strong>متوسط الاستهلاك اليومي:</strong> ${alertsData.dailyAverage} كيس عيش (${alertsData.dailyPriceAverage} جنيه)</p>
                        <p><strong>يوم الذروة:</strong> ${alertsData.peakDay} (${alertsData.peakValue} كيس عيش - ${alertsData.peakPrice} جنيه)</p>
                        <p><strong>الفروع الأكثر استهلاكًا:</strong></p>
                        <ol>
                            ${alertsData.topBranches.map(branch => 
                                `<li>${branch.name} - ${branch.total} كيس عيش (${branch.totalPrice} جنيه)</li>`
                            ).join('')}
                        </ol>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card mb-3 border-warning">
                    <div class="card-header bg-warning text-dark">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        تحليل الشذوذات والانحرافات
                    </div>
                    <div class="card-body">
                        ${alertsData.anomalies.length > 0 ? `
                            <p>تم اكتشاف ${alertsData.anomalies.length} حالات غير عادية في الاستهلاك:</p>
                            <ul>
                                ${alertsData.anomalies.map(anomaly => 
                                    `<li>${formatDateArabic(anomaly.date)}: 
                                    ${anomaly.value} كيس عيش (${anomaly.price} جنيه)
                                    (${anomaly.percentDiff > 0 ? '+' : ''}${anomaly.percentDiff}% عن المتوسط)</li>`
                                ).join('')}
                            </ul>
                        ` : `
                            <p>لم يتم اكتشاف أي انحرافات كبيرة في الاستهلاك خلال الأسبوع الماضي.</p>
                        `}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card border-success">
            <div class="card-header bg-success text-white">
                <i class="fas fa-lightbulb me-2"></i>
                توصيات وإجراءات مقترحة
            </div>
            <div class="card-body">
                <ol>
                    <li>زيادة مخزون الفروع الثلاثة الأولى بنسبة 10% على الأقل.</li>
                    <li>يوم ${alertsData.peakDay} هو الأكثر استهلاكًا، يفضل زيادة المخزون قبله بيوم.</li>
                    ${alertsData.anomalies.length > 0 ? 
                        `<li>مراجعة أسباب الانحرافات المكتشفة في الاستهلاك.</li>` : ''}
                    <li>متوسط الاستهلاك اليومي هو ${alertsData.dailyAverage} كيس عيش (${alertsData.dailyPriceAverage} جنيه)، استخدم هذه الأرقام كأساس للتوقعات المستقبلية.</li>
                </ol>
            </div>
        </div>
    `;
}

// تصدير التقرير
function exportAlerts() {
    const alertsData = setupSmartAlerts();
    if (!alertsData) {
        alert('لا تتوفر بيانات كافية للتصدير');
        return;
    }
    
    // إنشاء المحتوى المراد تصديره
    let exportContent = 
`تقرير التنبيهات الذكية - ${new Date().toLocaleDateString('ar-EG')}
------------------------------------------------
إحصائيات الاستهلاك الرئيسية:
* متوسط الاستهلاك اليومي: ${alertsData.dailyAverage} كيس عيش (${alertsData.dailyPriceAverage} جنيه)
* يوم الذروة: ${alertsData.peakDay} (${alertsData.peakValue} كيس عيش - ${alertsData.peakPrice} جنيه)

الفروع الأكثر استهلاكًا:
${alertsData.topBranches.map((branch, index) => 
    `${index + 1}. ${branch.name} - ${branch.total} كيس عيش (${branch.totalPrice} جنيه)`
).join('\n')}

${alertsData.anomalies.length > 0 ? 
    `\nتحليل الانحرافات:
${alertsData.anomalies.map(anomaly => 
    `* ${formatDateArabic(anomaly.date)}: ${anomaly.value} كيس عيش (${anomaly.percentDiff > 0 ? '+' : ''}${anomaly.percentDiff}% عن المتوسط)`
).join('\n')}` : '\nلم يتم اكتشاف أي انحرافات كبيرة في الاستهلاك.'}

توصيات وإجراءات مقترحة:
1. زيادة مخزون الفروع الثلاثة الأولى بنسبة 10% على الأقل.
2. يوم ${alertsData.peakDay} هو الأكثر استهلاكًا، يفضل زيادة المخزون قبله بيوم.
${alertsData.anomalies.length > 0 ? '3. مراجعة أسباب الانحرافات المكتشفة في الاستهلاك.\n' : ''}`;
    
    // إنشاء ملف للتنزيل
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_التنبيهات_الذكية_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.txt`;
    link.click();
}

// دالة مساعدة لتنسيق التاريخ
function formatDateArabic(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ar-EG', options);
}
