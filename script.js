document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const tableBody = document.getElementById('data-table').querySelector('tbody');
    const summaryRow = document.getElementById('summary-row');
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
    const reportListPanel = document.getElementById('report-list-panel');
    const reportPreviewPanel = document.getElementById('report-preview-panel');
    const searchByDateInput = document.getElementById('search-by-date');
    const searchByNameInput = document.getElementById('search-by-name');
    const clearAllDataBtn = document.getElementById('clear-all-data-btn');
    const downloadAllReportsBtn = document.getElementById('download-all-reports-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');
    const importJsonFile = document.getElementById('import-json-file');
    const selectAllDatesBtn = document.getElementById('select-all-dates-btn');


    // --- State Management ---
    let customerIdCounter = 0;
    let currentlyEditing = null; // { dateKey: 'DD-MM-YYYY', index: 0 }

    // --- Utility Functions ---
    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const parseFormattedDate = (ddmmyyyy) => {
        const [day, month, year] = ddmmyyyy.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid timezone shifts
    };

    const validateRow = (row) => {
        const name = row.querySelector('[data-column="name"]').value.trim();
        const purchase = parseFloat(row.querySelector('[data-column="purchase"]').value);
        if (!name) {
            alert('Customer Name cannot be empty.');
            return false;
        }
        if (isNaN(purchase) || purchase < 0) { // Purchase can be 0
            alert('Purchase amount must be a non-negative number.');
            return false;
        }
        return true;
    };

    // --- Core Table & Data Functions ---
    const calculateRow = (row) => {
        const purchase = parseFloat(row.querySelector('[data-column="purchase"]').value) || 0;
        const bookings = parseFloat(row.querySelector('[data-column="bookings"]').value) || 0;
        const ret = parseFloat(row.querySelector('[data-column="return"]').value) || 0;
        const rate = parseFloat(row.querySelector('[data-column="rate"]').value) || 0;
        const vc = parseFloat(row.querySelector('[data-column="vc"]').value) || 0;
        const due = parseFloat(row.querySelector('[data-column="due"]').value) || 0;
        const paid = parseFloat(row.querySelector('[data-column="paid"]').value) || 0;

        const sell = purchase - ret;
        const netValue = sell * rate;
        const total = (netValue - vc) + due - paid;

        row.querySelector('[data-column="sell"]').value = sell.toFixed(2);
        row.querySelector('[data-column="net-value"]').value = netValue.toFixed(2);
        row.querySelector('[data-column="total"]').value = total.toFixed(2);
    };

    const updateSummaryRow = () => {
        const data = getTableData();
        const summary = data.reduce((acc, row) => {
            acc.purchase += parseFloat(row.purchase) || 0;
            acc.bookings += parseFloat(row.bookings) || 0;
            acc.return += parseFloat(row.return) || 0;
            acc.sell += parseFloat(row.sell) || 0;
            acc.netValue += parseFloat(row.netValue) || 0;
            acc.vc += parseFloat(row.vc) || 0;
            acc.due += parseFloat(row.due) || 0;
            acc.paid += parseFloat(row.paid) || 0;
            acc.total += parseFloat(row.total) || 0;
            return acc;
        }, { purchase: 0, bookings: 0, return: 0, sell: 0, netValue: 0, vc: 0, due: 0, paid: 0, total: 0 });

        summaryRow.querySelector('[data-summary="purchase"]').textContent = summary.purchase.toFixed(2);
        summaryRow.querySelector('[data-summary="bookings"]').textContent = summary.bookings.toFixed(2);
        summaryRow.querySelector('[data-summary="return"]').textContent = summary.return.toFixed(2);
        summaryRow.querySelector('[data-summary="sell"]').textContent = summary.sell.toFixed(2);
        summaryRow.querySelector('[data-summary="net-value"]').textContent = summary.netValue.toFixed(2);
        summaryRow.querySelector('[data-summary="vc"]').textContent = summary.vc.toFixed(2);
        summaryRow.querySelector('[data-summary="due"]').textContent = summary.due.toFixed(2);
        summaryRow.querySelector('[data-summary="paid"]').textContent = summary.paid.toFixed(2);
        summaryRow.querySelector('[data-summary="total"]').textContent = summary.total.toFixed(2);
    };

    const createRow = (customerData = {}) => {
        const newId = customerData.id || `customer-${++customerIdCounter}`;
        const row = tableBody.insertRow();
        row.dataset.id = newId;

        row.innerHTML = `
            <td><input type="text" class="editable" data-column="name" value="${customerData.name || ''}"></td>
            <td><input type="number" class="editable" data-column="purchase" value="${customerData.purchase || 0}"></td>
            <td><input type="number" class="editable" data-column="bookings" value="${customerData.bookings || 0}"></td>
            <td><input type="number" class="editable" data-column="return" value="${customerData.return || 0}"></td>
            <td><input type="number" class="calculated" data-column="sell" value="${customerData.sell || 0}" readonly></td>
            <td><input type="number" class="editable" data-column="rate" value="${customerData.rate || 0}"></td>
            <td><input type="number" class="calculated" data-column="net-value" value="${customerData.netValue || 0}" readonly></td>
            <td><input type="number" class="editable" data-column="vc" value="${customerData.vc || 0}"></td>
            <td><input type="number" class="editable" data-column="due" value="${customerData.due || 0}"></td>
            <td><input type="text" class="editable" data-column="paid" value="${customerData.paid || ''}"></td>
            <td><input type="number" class="calculated" data-column="total" value="${customerData.total || 0}" readonly></td>
            <td>
                <button class="view-btn" title="View Details">📊</button>
                <button class="delete-btn" title="Delete Row">🗑️</button>
            </td>
        `;
        if (!customerData.name) {
             row.querySelector('[data-column="name"]').value = `Customer ${tableBody.rows.length}`;
        }
        calculateRow(row);
        return row;
    };

    const getTableData = () => Array.from(tableBody.rows).map(row => ({
        id: row.dataset.id,
        name: row.querySelector('[data-column="name"]').value,
        purchase: row.querySelector('[data-column="purchase"]').value,
        bookings: row.querySelector('[data-column="bookings"]').value,
        return: row.querySelector('[data-column="return"]').value,
        sell: row.querySelector('[data-column="sell"]').value,
        rate: row.querySelector('[data-column="rate"]').value,
        netValue: row.querySelector('[data-column="net-value"]').value,
        vc: row.querySelector('[data-column="vc"]').value,
        due: row.querySelector('[data-column="due"]').value,
        paid: row.querySelector('[data-column="paid"]').value,
        total: row.querySelector('[data-column="total"]').value,
    }));

    const loadDataForDate = (dateKey) => {
        tableBody.innerHTML = '';
        const data = JSON.parse(localStorage.getItem(`report-${dateKey}`));
        let maxId = 0;
        if (data && data.length > 0) {
            data.forEach(cust => {
                createRow(cust);
                const idNum = parseInt((cust.id || 'customer-0').split('-')[1]);
                if (idNum > maxId) maxId = idNum;
            });
        } else {
            createRow();
        }
        customerIdCounter = maxId;
        updateSummaryRow();
    };

    // --- Data Persistence ---
    const saveCurrentData = () => {
        const dateToSave = datePicker.valueAsDate || new Date();
        const dateKey = formatDate(dateToSave);
        const data = getTableData();
        
        // Validate all rows before saving
        for (const row of tableBody.rows) {
            if (!validateRow(row)) {
                return false; // Prevent saving if validation fails
            }
        }

        // Don't save if the only row is the default empty one
        if (data.length === 1 && data[0].name.startsWith("Customer ") && parseFloat(data[0].purchase) === 0) {
            localStorage.removeItem(`report-${dateKey}`);
            return true; // Indicate successful "removal" of empty data
        }
        
        localStorage.setItem(`report-${dateKey}`, JSON.stringify(data));
        return true; // Indicate successful save
    };

    const getLatestReportDateKey = () => {
        const reportKeys = Object.keys(localStorage).filter(k => k.startsWith('report-'));
        if (reportKeys.length === 0) return null;
        return reportKeys.sort((a, b) => parseFormattedDate(b.replace('report-', '')) - parseFormattedDate(a.replace('report-', '')))[0].replace('report-', '');
    };

    // --- Report Page ---
    const renderReportCards = (dateFilter = '', nameFilter = '') => {
        reportListPanel.innerHTML = '';
        reportPreviewPanel.innerHTML = '<p>Select a customer from a report to see details.</p>';
        let reportKeys = Object.keys(localStorage).filter(k => k.startsWith('report-')).sort((a, b) => parseFormattedDate(b.replace('report-', '')) - parseFormattedDate(a.replace('report-', '')));

        if (dateFilter) {
            reportKeys = reportKeys.filter(key => key.includes(dateFilter));
        }

        if (reportKeys.length === 0) {
            reportListPanel.innerHTML = '<p>No reports found.</p>';
            return;
        }

        reportKeys.forEach(key => {
            const dateKey = key.replace('report-', '');
            let reportData = JSON.parse(localStorage.getItem(key));
            if (!reportData || reportData.length === 0) return;

            let filteredReportData = reportData;
            if (nameFilter) {
                filteredReportData = reportData.filter(customer => customer.name.toLowerCase().includes(nameFilter.toLowerCase()));
            }
            if (filteredReportData.length === 0) return;

            const card = document.createElement('div');
            card.className = 'report-card';
            
            let customerListHtml = '';
            filteredReportData.forEach((customer, index) => {
                const originalIndex = reportData.findIndex(c => c.id === customer.id);
                customerListHtml += `
                    <div class="customer-list-item" data-date="${dateKey}" data-index="${originalIndex}">
                        <input type="checkbox" class="select-customer-checkbox" data-date="${dateKey}" data-index="${originalIndex}">
                        <span class="customer-name-text">${customer.name}</span>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="report-card-header">
                    <input type="checkbox" class="select-date-checkbox" data-date="${dateKey}">
                    <h3>Report Date: ${dateKey}</h3>
                </div>
                <div class="customer-list-scroll">
                    ${customerListHtml}
                </div>
            `;
            reportListPanel.appendChild(card);
        });
    };

    const displayCustomerPreview = (dateKey, customerIndex) => {
        const reportData = JSON.parse(localStorage.getItem(`report-${dateKey}`));
        const customer = reportData[customerIndex];
        if (!customer) {
            reportPreviewPanel.innerHTML = '<p>Could not find customer data.</p>';
            return;
        }

        let previewHTML = '<div class="customer-preview-card">';
        for (const [key, value] of Object.entries(customer)) {
            previewHTML += `
                <div class="preview-item">
                    <span>${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span>${value}</span>
                </div>
            `;
        }
        previewHTML += `
            <div class="preview-actions">
                <button class="edit-customer-btn" data-date="${dateKey}" data-index="${customerIndex}">✏️ Edit</button>
                <button class="delete-customer-btn" data-date="${dateKey}" data-index="${customerIndex}">🗑️ Delete</button>
                <button class="download-customer-pdf-btn" data-date="${dateKey}" data-index="${customerIndex}">📄 Download PDF</button>
            </div>
        </div>`;
        
        reportPreviewPanel.innerHTML = previewHTML;
    };

    const deleteCustomerFromReport = (dateKey, customerIndex) => {
        let reportData = JSON.parse(localStorage.getItem(`report-${dateKey}`));
        const customerName = reportData[customerIndex].name;
        if (confirm(`Are you sure you want to delete "${customerName}" from the report of ${dateKey}?`)) {
            reportData.splice(customerIndex, 1);
            if (reportData.length > 0) {
                localStorage.setItem(`report-${dateKey}`, JSON.stringify(reportData));
            } else {
                localStorage.removeItem(`report-${dateKey}`);
            }
            renderReportCards(searchByDateInput.value, searchByNameInput.value);
            reportPreviewPanel.innerHTML = '<p>Select a customer from a report to see details.</p>';
        }
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

    const downloadCustomerPDF = (dateKey, customerIndex) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const reportData = JSON.parse(localStorage.getItem(`report-${dateKey}`));
        const customer = reportData[customerIndex];

        doc.setFontSize(18);
        doc.text(`Customer Report: ${customer.name}`, 14, 22);
        doc.setFontSize(11);
        doc.text(`Date: ${dateKey}`, 14, 30);

        const tableHeaders = Object.keys(customer).map(key => key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim());
        const tableBodyData = [Object.values(customer)];

        doc.autoTable({
            startY: 40,
            head: [tableHeaders],
            body: tableBodyData,
        });

        doc.save(`report-${dateKey}-${customer.name}.pdf`);
    };

    const downloadAllReportsPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let finalY = 20; // Starting Y position for content

        const selectedDateCheckboxes = document.querySelectorAll('.select-date-checkbox:checked');
        if (selectedDateCheckboxes.length === 0) {
            alert('Please select at least one report date to download.');
            return;
        }

        const allSelectedReportsData = [];
        const allDatesSummary = {}; // To store summary for each date

        selectedDateCheckboxes.forEach(checkbox => {
            const dateKey = checkbox.dataset.date;
            const reportData = JSON.parse(localStorage.getItem(`report-${dateKey}`));
            if (reportData && reportData.length > 0) {
                allSelectedReportsData.push({ dateKey, data: reportData });

                // Calculate summary for this date
                const summary = reportData.reduce((acc, row) => {
                    acc.purchase += parseFloat(row.purchase) || 0;
                    acc.bookings += parseFloat(row.bookings) || 0;
                    acc.return += parseFloat(row.return) || 0;
                    acc.sell += parseFloat(row.sell) || 0;
                    acc.netValue += parseFloat(row.netValue) || 0;
                    acc.vc += parseFloat(row.vc) || 0;
                    acc.due += parseFloat(row.due) || 0;
                    acc.paid += parseFloat(row.paid) || 0;
                    acc.total += parseFloat(row.total) || 0;
                    return acc;
                }, { purchase: 0, bookings: 0, return: 0, sell: 0, netValue: 0, vc: 0, due: 0, paid: 0, total: 0 });
                allDatesSummary[dateKey] = summary;
            }
        });

        if (allSelectedReportsData.length === 0) {
            alert('No data found for the selected reports.');
            return;
        }

        // Sort reports by date (oldest first for summary table)
        allSelectedReportsData.sort((a, b) => parseFormattedDate(a.dateKey) - parseFormattedDate(b.dateKey));

        // --- Title ---
        doc.setFontSize(18);
        doc.text('Daily Business Snapshot', 14, finalY);
        finalY += 8;
        doc.setFontSize(11);
        const firstDate = allSelectedReportsData[0].dateKey;
        const lastDate = allSelectedReportsData[allSelectedReportsData.length - 1].dateKey;
        doc.text(`From ${firstDate} To ${lastDate}`, 14, finalY);
        finalY += 10;

        // --- Summary of Total Row Values (Each Date) ---
        doc.setFontSize(14);
        doc.text('Summary of Total Row Values (Each Date)', 14, finalY);
        finalY += 8;

        const summaryHeaders = ['Date', 'Purchase', 'Booking', 'Return', 'SELL', 'Rate/PCS', 'NET VALUE', 'VC', 'Previous Due', 'Paid in A/C', 'TOTAL'];
        const summaryBody = [];
        let grandTotalSummary = { purchase: 0, bookings: 0, return: 0, sell: 0, netValue: 0, vc: 0, due: 0, paid: 0, total: 0 };

        allSelectedReportsData.forEach(report => {
            const summary = allDatesSummary[report.dateKey];
            summaryBody.push([
                report.dateKey,
                summary.purchase.toFixed(2),
                summary.bookings.toFixed(2),
                summary.return.toFixed(2),
                summary.sell.toFixed(2),
                '-', // Rate/PCS is not a sum
                summary.netValue.toFixed(2),
                summary.vc.toFixed(2),
                summary.due.toFixed(2),
                summary.paid.toFixed(2),
                summary.total.toFixed(2)
            ]);
            grandTotalSummary.purchase += summary.purchase;
            grandTotalSummary.bookings += summary.bookings;
            grandTotalSummary.return += summary.return;
            grandTotalSummary.sell += summary.sell;
            grandTotalSummary.netValue += summary.netValue;
            grandTotalSummary.vc += summary.vc;
            grandTotalSummary.due += summary.due;
            grandTotalSummary.paid += summary.paid;
            grandTotalSummary.total += summary.total;
        });

        summaryBody.push([
            'Total Sum',
            grandTotalSummary.purchase.toFixed(2),
            grandTotalSummary.bookings.toFixed(2),
            grandTotalSummary.return.toFixed(2),
            grandTotalSummary.sell.toFixed(2),
            '-',
            grandTotalSummary.netValue.toFixed(2),
            grandTotalSummary.vc.toFixed(2),
            grandTotalSummary.due.toFixed(2),
            grandTotalSummary.paid.toFixed(2),
            grandTotalSummary.total.toFixed(2)
        ]);

        doc.autoTable({
            startY: finalY,
            head: [summaryHeaders],
            body: summaryBody,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [108, 122, 224], textColor: 255, fontStyle: 'bold' },
            didDrawPage: function (data) {
                finalY = data.cursor.y + 10; // Update finalY for next content
            }
        });

        // --- Individual Date Reports ---
        allSelectedReportsData.forEach((report, reportIndex) => {
            if (reportIndex > 0 || finalY > doc.internal.pageSize.height - 50) { // Add page if not first report or content too long
                doc.addPage();
                finalY = 20;
            }

            doc.setFontSize(14);
            doc.text(`Date: ${report.dateKey}`, 14, finalY);
            finalY += 8;

            const customerHeaders = ['Name', 'Purchase', 'Booking', 'Return', 'SELL', 'Rate/PCS', 'NET VALUE', 'VC', 'Previous Due', 'Paid in A/C', 'TOTAL'];
            const customerBody = [];
            let dateTotalSummary = { purchase: 0, bookings: 0, return: 0, sell: 0, netValue: 0, vc: 0, due: 0, paid: 0, total: 0 };

            report.data.forEach(customer => {
                customerBody.push([
                    customer.name,
                    parseFloat(customer.purchase).toFixed(2),
                    parseFloat(customer.bookings).toFixed(2),
                    parseFloat(customer.return).toFixed(2),
                    parseFloat(customer.sell).toFixed(2),
                    parseFloat(customer.rate).toFixed(2),
                    parseFloat(customer.netValue).toFixed(2),
                    parseFloat(customer.vc).toFixed(2),
                    parseFloat(customer.due).toFixed(2),
                    customer.paid, // Paid in A/C is text
                    parseFloat(customer.total).toFixed(2)
                ]);
                dateTotalSummary.purchase += parseFloat(customer.purchase) || 0;
                dateTotalSummary.bookings += parseFloat(customer.bookings) || 0;
                dateTotalSummary.return += parseFloat(customer.return) || 0;
                dateTotalSummary.sell += parseFloat(customer.sell) || 0;
                dateTotalSummary.netValue += parseFloat(customer.netValue) || 0;
                dateTotalSummary.vc += parseFloat(customer.vc) || 0;
                dateTotalSummary.due += parseFloat(customer.due) || 0;
                dateTotalSummary.paid += parseFloat(customer.paid) || 0;
                dateTotalSummary.total += parseFloat(customer.total) || 0;
            });

            customerBody.push([
                'Total',
                dateTotalSummary.purchase.toFixed(2),
                dateTotalSummary.bookings.toFixed(2),
                dateTotalSummary.return.toFixed(2),
                dateTotalSummary.sell.toFixed(2),
                '-',
                dateTotalSummary.netValue.toFixed(2),
                dateTotalSummary.vc.toFixed(2),
                dateTotalSummary.due.toFixed(2),
                dateTotalSummary.paid.toFixed(2),
                dateTotalSummary.total.toFixed(2)
            ]);

            doc.autoTable({
                startY: finalY,
                head: [customerHeaders],
                body: customerBody,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [108, 122, 224], textColor: 255, fontStyle: 'bold' },
                didDrawPage: function (data) {
                    finalY = data.cursor.y + 10;
                }
            });
        });

        doc.save(`all-reports-${formatDate(new Date())}.pdf`);
    };

    const exportDataAsJson = () => {
        const allData = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('report-')) {
                allData[key] = JSON.parse(localStorage.getItem(key));
            }
        });
        const dataStr = JSON.stringify(allData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `business-snapshot-backup-${formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Data exported successfully!');
    };

    const importDataFromJson = (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (confirm('Importing data will overwrite all existing reports. Are you sure you want to continue?')) {
                    // Clear existing reports
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('report-')) {
                            localStorage.removeItem(key);
                        }
                    });
                    // Import new data
                    for (const key in importedData) {
                        if (key.startsWith('report-')) {
                            localStorage.setItem(key, JSON.stringify(importedData[key]));
                        }
                    }
                    alert('Data imported successfully! Reloading page...');
                    location.reload(); // Reload to reflect changes
                }
            } catch (error) {
                alert('Failed to import data. Invalid JSON file.');
                console.error('Import JSON error:', error);
            }
        };
        reader.readAsText(file);
    };


    // --- Event Listeners ---
    tableBody.addEventListener('input', (e) => {
        if (e.target.closest('tr')) {
            const row = e.target.closest('tr');
            calculateRow(row);
            updateSummaryRow();
            saveCurrentData(); // Autosave
        }
    });

    tableBody.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (viewBtn) {
            const row = viewBtn.closest('tr');
            const rowIndex = Array.from(tableBody.children).indexOf(row);
            const data = getTableData()[rowIndex];
            if(data) {
                // For now, show chart modal. This will be replaced by the full data view modal later.
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
            }
        }

        if (deleteBtn) {
            const row = deleteBtn.closest('tr');
            if (confirm(`Are you sure you want to delete "${row.querySelector('[data-column="name"]').value}"?`)) {
                row.remove();
                updateSummaryRow();
                saveCurrentData();
            }
        }
    });

    addRowBtn.addEventListener('click', () => {
        createRow();
        updateSummaryRow();
    });

    submitBtn.addEventListener('click', () => {
        const dateToSave = datePicker.valueAsDate || new Date();
        const dateString = dateToSave.toLocaleDateString();
        if (confirm(`Do you want to finalize saving the data for ${dateString}?`)) {
            if (saveCurrentData()) { // Only show success if save was successful
                alert('Data saved successfully!');
            }
        }
    });

    datePicker.addEventListener('change', () => {
        if (datePicker.value) {
            loadDataForDate(formatDate(datePicker.value));
        }
    });
    
    viewReportsBtn.addEventListener('click', () => { 
        renderReportCards(searchByDateInput.value, searchByNameInput.value);
        reportPage.style.display = 'block';
    });

    closeReportPageBtn.addEventListener('click', () => { reportPage.style.display = 'none'; });

    reportListPanel.addEventListener('click', (e) => {
        const customerListItem = e.target.closest('.customer-list-item');
        if (customerListItem && e.target.tagName !== 'INPUT') { // Ensure click is not on checkbox
            const dateKey = customerListItem.dataset.date;
            const customerIndex = parseInt(customerListItem.dataset.index);
            displayCustomerPreview(dateKey, customerIndex);
        }
    });

    reportPreviewPanel.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const { date, index } = button.dataset;
        const customerIndex = parseInt(index);

        if (button.classList.contains('delete-customer-btn')) {
            deleteCustomerFromReport(date, customerIndex);
        } else if (button.classList.contains('edit-customer-btn')) {
            editCustomerData(date, customerIndex);
        } else if (button.classList.contains('download-customer-pdf-btn')) {
            downloadCustomerPDF(date, customerIndex);
        }
    });

    searchByDateInput.addEventListener('input', () => renderReportCards(searchByDateInput.value, searchByNameInput.value));
    searchByNameInput.addEventListener('input', () => renderReportCards(searchByDateInput.value, searchByNameInput.value));

    clearAllDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete ALL saved data? This action cannot be undone.')) {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('report-')) {
                    localStorage.removeItem(key);
                }
            });
            alert('All data cleared!');
            loadDataForDate(formatDate(new Date())); // Load empty table for current date
            renderReportCards(); // Clear report view
            reportPreviewPanel.innerHTML = '<p>Select a customer from a report to see details.</p>';
        }
    });

    selectAllDatesBtn.addEventListener('click', () => {
        const allDateCheckboxes = document.querySelectorAll('.select-date-checkbox');
        const allChecked = Array.from(allDateCheckboxes).every(cb => cb.checked);
        allDateCheckboxes.forEach(cb => cb.checked = !allChecked);
    });

    downloadAllReportsBtn.addEventListener('click', downloadAllReportsPDF);
    exportJsonBtn.addEventListener('click', exportDataAsJson);
    importJsonBtn.addEventListener('click', () => importJsonFile.click());
    importJsonFile.addEventListener('change', importDataFromJson);


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