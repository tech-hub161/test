document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const tableBody = document.getElementById('data-table').querySelector('tbody');
    const addRowBtn = document.getElementById('add-row-btn');
    const submitBtn = document.getElementById('submit-btn');
    const viewReportsBtn = document.getElementById('view-reports-btn');
    const datePicker = document.getElementById('date-picker');
    const modal = document.getElementById('chart-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const chartContainer = document.getElementById('chart-container');
    const chartTitle = document.getElementById('chart-title');
    const reportPage = document.getElementById('report-page');
    const closeReportPageBtn = document.getElementById('close-report-page-btn');
    const reportListContainer = document.getElementById('report-list-container');

    // --- State Management ---
    let currentlyEditing = null; // { dateKey: 'DDMMYY', index: 0 }

    // --- Utility Functions ---
    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}${month}${year}`;
    };

    const parseFormattedDate = (ddmmyy) => {
        const day = ddmmyy.slice(0, 2);
        const month = ddmmyy.slice(2, 4);
        const year = `20${ddmmyy.slice(4, 6)}`;
        return new Date(`${year}-${month}-${day}T12:00:00`); // Use noon to avoid timezone shifts
    };

    // --- Core Table & Data Functions ---
    const calculateRow = (row) => {
        const purchase = parseFloat(row.querySelector('[data-column="purchase"]').value) || 0;
        const ret = parseFloat(row.querySelector('[data-column="return"]').value) || 0;
        const rate = parseFloat(row.querySelector('[data-column="rate"]').value) || 0;
        const vc = parseFloat(row.querySelector('[data-column="vc"]').value) || 0;
        const due = parseFloat(row.querySelector('[data-column="due"]').value) || 0;
        const sell = purchase - ret;
        const netValue = sell * rate;
        const total = (netValue - vc) + due;
        row.querySelector('[data-column="sell"]').value = sell.toFixed(2);
        row.querySelector('[data-column="net-value"]').value = netValue.toFixed(2);
        row.querySelector('[data-column="total"]').value = total.toFixed(2);
    };

    const createRow = (customerData = {}) => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td><input type="text" class="editable" data-column="name" value="${customerData.name || ''}"></td>
            <td><input type="number" class="editable" data-column="purchase" value="${customerData.purchase || 0}"></td>
            <td><input type="number" class="editable" data-column="return" value="${customerData.return || 0}"></td>
            <td><input type="number" class="calculated" data-column="sell" value="${customerData.sell || 0}" readonly></td>
            <td><input type="number" class="editable" data-column="rate" value="${customerData.rate || 0}"></td>
            <td><input type="number" class="calculated" data-column="net-value" value="${customerData.netValue || 0}" readonly></td>
            <td><input type="number" class="editable" data-column="vc" value="${customerData.vc || 0}"></td>
            <td><input type="number" class="editable" data-column="due" value="${customerData.due || 0}"></td>
            <td><input type="number" class="calculated" data-column="total" value="${customerData.total || 0}" readonly></td>
            <td><button class="view-btn">📊</button></td>
        `;
        if (!customerData.name) {
             row.querySelector('[data-column="name"]').value = `Customer ${tableBody.rows.length}`;
        }
        calculateRow(row);
        return row;
    };

    const getTableData = () => Array.from(tableBody.rows).map(row => ({
        name: row.querySelector('[data-column="name"]').value,
        purchase: row.querySelector('[data-column="purchase"]').value,
        return: row.querySelector('[data-column="return"]').value,
        sell: row.querySelector('[data-column="sell"]').value,
        rate: row.querySelector('[data-column="rate"]').value,
        netValue: row.querySelector('[data-column="net-value"]').value,
        vc: row.querySelector('[data-column="vc"]').value,
        due: row.querySelector('[data-column="due"]').value,
        total: row.querySelector('[data-column="total"]').value,
    }));

    const loadDataForDate = (dateKey) => {
        tableBody.innerHTML = '';
        currentlyEditing = null;
        const data = JSON.parse(localStorage.getItem(`report-${dateKey}`));
        if (data && data.length > 0) {
            data.forEach(createRow);
        } else {
            createRow();
        }
    };

    // --- Data Persistence ---
    const saveReport = () => {
        const data = getTableData();
        if (data.length === 0 || (data.length === 1 && !data[0].name)) {
            alert('Cannot save empty data.');
            return;
        }

        if (currentlyEditing) {
            const { dateKey, index } = currentlyEditing;
            let reportData = JSON.parse(localStorage.getItem(`report-${dateKey}`)) || [];
            reportData[index] = data[0];
            localStorage.setItem(`report-${dateKey}`, JSON.stringify(reportData));
            alert(`Record for ${data[0].name} on ${dateKey} updated!`);
            currentlyEditing = null;
        } else {
            const dateToSave = datePicker.value ? new Date(datePicker.value) : new Date();
            const dateKey = formatDate(dateToSave);
            localStorage.setItem(`report-${dateKey}`, JSON.stringify(data));
            alert(`Report for ${dateKey} saved!`);
        }
    };

    const getLatestReportDateKey = () => {
        const reportKeys = Object.keys(localStorage).filter(k => k.startsWith('report-'));
        if (reportKeys.length === 0) return null;
        return reportKeys.sort((a, b) => parseFormattedDate(b.replace('report-', '')) - parseFormattedDate(a.replace('report-', '')))[0].replace('report-', '');
    };

    // --- Report Page ---
    const renderReports = () => {
        reportListContainer.innerHTML = '';
        const reportKeys = Object.keys(localStorage).filter(k => k.startsWith('report-')).sort((a, b) => parseFormattedDate(b.replace('report-', '')) - parseFormattedDate(a.replace('report-', '')));

        if (reportKeys.length === 0) {
            reportListContainer.innerHTML = '<p>No reports found.</p>';
            return;
        }

        reportKeys.forEach(key => {
            const dateKey = key.replace('report-', '');
            const reportData = JSON.parse(localStorage.getItem(key));
            if (!reportData) return; // Skip if data is somehow null/invalid
            const groupDiv = document.createElement('div');
            groupDiv.className = 'report-group';
            groupDiv.innerHTML = `<h3>Report Date: ${dateKey}</h3>`;

            reportData.forEach((customer, index) => {
                const recordDiv = document.createElement('div');
                recordDiv.className = 'customer-record';
                recordDiv.innerHTML = `
                    <span>${customer.name}</span>
                    <div class="customer-actions">
                        <button class="preview-customer-btn" title="Preview" data-date="${dateKey}" data-index="${index}">📊</button>
                        <button class="download-customer-btn" title="Download" data-date="${dateKey}" data-index="${index}">📄</button>
                        <button class="edit-customer-btn" title="Edit" data-date="${dateKey}" data-index="${index}">✏️</button>
                        <button class="delete-customer-btn" title="Delete" data-date="${dateKey}" data-index="${index}">🗑️</button>
                    </div>
                `;
                groupDiv.appendChild(recordDiv);
            });
            reportListContainer.appendChild(groupDiv);
        });
    };

    const deleteCustomerData = (dateKey, customerIndex) => {
        let reportData = JSON.parse(localStorage.getItem(`report-${dateKey}`));
        reportData.splice(customerIndex, 1);
        if (reportData.length > 0) {
            localStorage.setItem(`report-${dateKey}`, JSON.stringify(reportData));
        } else {
            localStorage.removeItem(`report-${dateKey}`);
        }
        renderReports();
    };

    const editCustomerData = (dateKey, customerIndex) => {
        const reportData = JSON.parse(localStorage.getItem(`report-${dateKey}`));
        const customerData = reportData[customerIndex];
        
        tableBody.innerHTML = '';
        createRow(customerData);
        
        datePicker.valueAsDate = parseFormattedDate(dateKey);

        currentlyEditing = { dateKey, index: customerIndex };
        reportPage.style.display = 'none';
    };

    const downloadAsXLS = (data, filename) => {
        if (!data || data.length === 0) return;
        const headers = Object.keys(data[0]);
        const csv = [headers.join('\t'), ...data.map(row => headers.map(h => row[h]).join('\t'))].join('\n');
        const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    // --- Chart Modal ---
    const showChart = (data) => {
        chartTitle.innerText = `${data.name} Data`;
        chartContainer.innerHTML = '';
        const chartData = { Purchase: data.purchase, Return: data.return, Sell: data.sell, NetValue: data.netValue };
        const maxValue = Math.max(...Object.values(chartData).map(v => parseFloat(v) || 0));
        for (const key in chartData) {
            const bar = document.createElement('div');
            bar.className = 'bar';
            const value = parseFloat(chartData[key]) || 0;
            bar.style.height = `${maxValue > 0 ? (value / maxValue) * 100 : 0}%`;
            bar.innerHTML = `<span>${key}<br>${value.toFixed(2)}</span>`;
            chartContainer.appendChild(bar);
        }
        modal.style.display = 'block';
    };

    // --- Event Listeners ---
    tableBody.addEventListener('input', (e) => e.target.closest('tr') && calculateRow(e.target.closest('tr')));
    addRowBtn.addEventListener('click', createRow);
    submitBtn.addEventListener('click', saveReport);
    datePicker.addEventListener('change', () => {
        if (datePicker.value) {
            loadDataForDate(formatDate(datePicker.value));
        }
    });
    viewReportsBtn.addEventListener('click', () => { renderReports(); reportPage.style.display = 'block'; });
    closeReportPageBtn.addEventListener('click', () => { reportPage.style.display = 'none'; });
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target == modal) modal.style.display = 'none'; });

    reportListContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const { date, index } = button.dataset;
        const customerIndex = parseInt(index, 10);

        if (button.classList.contains('delete-customer-btn')) {
            if (confirm('Are you sure you want to delete this record?')) deleteCustomerData(date, customerIndex);
        } else if (button.classList.contains('download-customer-btn')) {
            const reportData = JSON.parse(localStorage.getItem(`report-${date}`));
            if(reportData) downloadAsXLS([reportData[customerIndex]], `report-${date}-${reportData[customerIndex].name}.xls`);
        } else if (button.classList.contains('edit-customer-btn')) {
            editCustomerData(date, customerIndex);
        } else if (button.classList.contains('preview-customer-btn')) {
            const reportData = JSON.parse(localStorage.getItem(`report-${date}`));
            if(reportData) showChart(reportData[customerIndex]);
        }
    });

    tableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-btn')) {
            const row = e.target.closest('tr');
            const rowIndex = Array.from(tableBody.children).indexOf(row);
            const data = getTableData()[rowIndex];
            if(data) showChart(data);
        }
    });

    // --- Initial Load ---
    const latestDateKey = getLatestReportDateKey();
    if (latestDateKey) {
        datePicker.valueAsDate = parseFormattedDate(latestDateKey);
        loadDataForDate(latestDateKey);
    } else {
        datePicker.valueAsDate = new Date();
        loadDataForDate(formatDate(new Date()));
    }
});