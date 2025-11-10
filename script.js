document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('data-table');
    const addRowBtn = document.getElementById('add-row-btn');
    const submitBtn = document.getElementById('submit-btn');
    const reportList = document.getElementById('report-list');
    const clearReportsBtn = document.getElementById('clear-reports-btn');
    const downloadRangeBtn = document.getElementById('download-range-btn');
    const fromDateInput = document.getElementById('from-date');
    const toDateInput = document.getElementById('to-date');
    const modal = document.getElementById('chart-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const chartContainer = document.getElementById('chart-container');
    const chartTitle = document.getElementById('chart-title');
    const reportBtn = document.getElementById('report-btn');

    let customerCount = 1;

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

    const addRow = () => {
        if (customerCount >= 100) return;
        customerCount++;
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>Customer ${customerCount}</td>
            <td><input type="number" class="editable" data-column="purchase" value="0"></td>
            <td><input type="number" class="editable" data-column="return" value="0"></td>
            <td><input type="number" class="calculated" data-column="sell" value="0" readonly></td>
            <td><input type="number" class="editable" data-column="rate" value="0"></td>
            <td><input type="number" class="calculated" data-column="net-value" value="0" readonly></td>
            <td><input type="number" class="editable" data-column="vc" value="0"></td>
            <td><input type="number" class="editable" data-column="due" value="0"></td>
            <td><input type="number" class="calculated" data-column="total" value="0" readonly></td>
            <td><button class="view-btn">📊</button></td>
        `;
        table.querySelector('tbody').appendChild(newRow);
    };

    const getTableData = () => {
        const rows = table.querySelectorAll('tbody tr');
        const data = [];
        rows.forEach(row => {
            const rowData = {
                name: row.cells[0].innerText,
                purchase: row.querySelector('[data-column="purchase"]').value,
                return: row.querySelector('[data-column="return"]').value,
                sell: row.querySelector('[data-column="sell"]').value,
                rate: row.querySelector('[data-column="rate"]').value,
                netValue: row.querySelector('[data-column="net-value"]').value,
                vc: row.querySelector('[data-column="vc"]').value,
                due: row.querySelector('[data-column="due"]').value,
                total: row.querySelector('[data-column="total"]').value,
            };
            data.push(rowData);
        });
        return data;
    };

    const saveReport = () => {
        const today = new Date().toISOString().slice(0, 10);
        const data = getTableData();
        localStorage.setItem(`report-${today}`, JSON.stringify(data));
        loadReports();
    };

    const loadReports = () => {
        reportList.innerHTML = '';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('report-')) {
                const date = key.replace('report-', '');
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <span>${date}</span>
                    <div class="report-actions">
                        <button class="download-report-btn" data-date="${date}">📄</button>
                        <button class="delete-report-btn" data-date="${date}">🗑️</button>
                    </div>
                `;
                reportList.appendChild(listItem);
            }
        }
    };

    const deleteReport = (date) => {
        localStorage.removeItem(`report-${date}`);
        loadReports();
    };

    const clearAllReports = () => {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('report-')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        loadReports();
    };

    const downloadAsXLS = (data, filename) => {
        const headers = Object.keys(data[0]);
        const csv = [
            headers.join('\t'),
            ...data.map(row => headers.map(h => row[h]).join('\t'))
        ].join('\n');

        const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    const downloadReport = (date) => {
        const data = JSON.parse(localStorage.getItem(`report-${date}`));
        if (data) {
            downloadAsXLS(data, `report-${date}.xls`);
        }
    };

    const downloadDateRange = () => {
        const from = fromDateInput.value;
        const to = toDateInput.value;
        if (!from || !to) {
            alert('Please select a date range.');
            return;
        }

        let combinedData = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('report-')) {
                const date = key.replace('report-', '');
                if (date >= from && date <= to) {
                    const data = JSON.parse(localStorage.getItem(key));
                    combinedData = combinedData.concat(data);
                }
            }
        }

        if (combinedData.length > 0) {
            downloadAsXLS(combinedData, `report-${from}-to-${to}.xls`);
        } else {
            alert('No reports found in the selected date range.');
        }
    };

    const showChart = (row) => {
        const data = {
            purchase: parseFloat(row.querySelector('[data-column="purchase"]').value) || 0,
            return: parseFloat(row.querySelector('[data-column="return"]').value) || 0,
            sell: parseFloat(row.querySelector('[data-column="sell"]').value) || 0,
            netValue: parseFloat(row.querySelector('[data-column="net-value"]').value) || 0,
        };

        chartTitle.innerText = `${row.cells[0].innerText} Data`;
        chartContainer.innerHTML = '';

        const maxValue = Math.max(...Object.values(data));

        for (const key in data) {
            const bar = document.createElement('div');
            bar.className = 'bar';
            const height = maxValue > 0 ? (data[key] / maxValue) * 100 : 0;
            bar.style.height = `${height}%`;
            bar.innerHTML = `<span>${key}<br>${data[key].toFixed(2)}</span>`;
            chartContainer.appendChild(bar);
        }

        modal.style.display = 'block';
    };

    // Event Listeners
    table.addEventListener('input', (e) => {
        if (e.target.classList.contains('editable')) {
            const row = e.target.closest('tr');
            calculateRow(row);
        }
    });

    addRowBtn.addEventListener('click', addRow);
    submitBtn.addEventListener('click', () => {
        saveReport();
        const today = new Date().toISOString().slice(0, 10);
        downloadReport(today);
    });

    clearReportsBtn.addEventListener('click', clearAllReports);
    downloadRangeBtn.addEventListener('click', downloadDateRange);

    reportList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-report-btn')) {
            const date = e.target.dataset.date;
            deleteReport(date);
        } else if (e.target.classList.contains('download-report-btn')) {
            const date = e.target.dataset.date;
            downloadReport(date);
        }
    });

    table.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-btn')) {
            const row = e.target.closest('tr');
            showChart(row);
        }
    });

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    });

    reportBtn.addEventListener('click', () => {
        document.getElementById('report-section').scrollIntoView({ behavior: 'smooth' });
    });

    // Initial Load
    loadReports();
    document.querySelectorAll('tbody tr').forEach(calculateRow);
});
