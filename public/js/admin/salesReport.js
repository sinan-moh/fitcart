document.addEventListener("DOMContentLoaded", function() {
    // Show/hide custom date fields based on selection
    const dateRangeSelect = document.getElementById("dateRange");
    const customDateFilter = document.getElementById("customDateFilter");
    
    if (dateRangeSelect && customDateFilter) {
        dateRangeSelect.addEventListener("change", function() {
            if (this.value === "custom") {
                customDateFilter.style.display = "flex";
            } else {
                customDateFilter.style.display = "none";
            }
        });
    }
    
    // Apply filter button event
    document.getElementById("applyFilterBtn").addEventListener("click", function() {
        console.log("Filter button clicked!");
        const selectedDateRange = document.getElementById("dateRange").value;
        
        let url = `/admin/salesReport?dateRange=${selectedDateRange}`;
        
        // Add custom date parameters if selected
        if (selectedDateRange === "custom") {
            const startDate = document.getElementById("startDate").value;
            const endDate = document.getElementById("endDate").value;
            
            if (!startDate || !endDate) {
                alert("Please select both start and end dates");
                return;
            }
            
            url += `&startDate=${startDate}&endDate=${endDate}`;
        }
        
        fetch(url, {
            method: "GET",
            headers: {
                'Accept': 'application/json', // Expect JSON response
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(data);
            updateTable(data.sales);
            updateSummary(data.summary);
            
            // Update URL without page reload to maintain filter state
            window.history.pushState(null, '', url);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
    
    // Initialize date inputs with default values if needed
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");
    
    if (startDateInput && endDateInput) {
        // Set default dates if not already set
        if (!startDateInput.value) {
            const today = new Date();
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(today.getMonth() - 1);
            
            startDateInput.valueAsDate = oneMonthAgo;
            endDateInput.valueAsDate = today;
        }
    }
    
    // Check URL parameters on load to set the correct filter state
    const urlParams = new URLSearchParams(window.location.search);
    const dateRange = urlParams.get('dateRange');
    
    if (dateRange && dateRangeSelect) {
        dateRangeSelect.value = dateRange;
        
        if (dateRange === "custom" && customDateFilter) {
            customDateFilter.style.display = "flex";
            
            const startDate = urlParams.get('startDate');
            const endDate = urlParams.get('endDate');
            
            if (startDate && startDateInput) startDateInput.value = startDate;
            if (endDate && endDateInput) endDateInput.value = endDate;
        }
    }
});

function updateTable(sales) {
    const tbody = document.querySelector('#salesTable tbody');
    tbody.innerHTML = ''; // Clear existing rows
    
    sales.forEach(sale => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sale.orderId}</td>
            <td>₹${sale.totalAmount.toFixed(2)}</td>
            <td>${sale.offerDiscount ? `₹${sale.offerDiscount.toFixed(2)}` : 'No offers'}</td>
            <td>${sale.userName}</td>
            <td>${sale.date}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateSummary(summary) {
    document.querySelector('.summary-box:nth-child(1) p').textContent = summary.totalSales;
    document.querySelector('.summary-box:nth-child(2) p').textContent = `₹${summary.totalAmount.toFixed(2)}`;
    document.querySelector('.summary-box:nth-child(3) p').textContent = `₹${summary.totalDiscount.toFixed(2)}`;
}

function downloadCSV() {
    // Get current filter parameters
    const selectedDateRange = document.getElementById("dateRange").value;
    let filterParam = `dateRange=${selectedDateRange}`;
    
    if (selectedDateRange === "custom") {
        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;
        
        if (startDate && endDate) {
            filterParam += `&startDate=${startDate}&endDate=${endDate}`;
        }
    }
    
    // Option 1: Fetch filtered data and create CSV client-side
    const table = document.getElementById('salesTable');
    let csv = [];
    
    // Get headers
    let headers = [];
    const headerCells = table.querySelectorAll('th');
    headerCells.forEach(cell => {
        headers.push(cell.textContent.trim());
    });
    csv.push(headers.join(','));
    
    // Get rows
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        let rowData = [];
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
            rowData.push(cell.textContent.trim());
        });
        csv.push(rowData.join(','));
    });
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Add current date to filename
    const date = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${date}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
   
}

function downloadPDF() {
    // Get current filter for filename
    const selectedDateRange = document.getElementById("dateRange").value;
    let filterSuffix = selectedDateRange;
    
    if (selectedDateRange === "custom") {
        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;
        
        if (startDate && endDate) {
            filterSuffix = `${startDate}_to_${endDate}`;
        }
    }
    
    const element = document.getElementById('reportContent');
    
    html2canvas(element, {
        scale: 2, // Higher scale for better quality
        backgroundColor: '#ffffff',
    })
        .then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf; // Ensure jsPDF is available
            const pdf = new jsPDF('p', 'mm', 'a4'); // A4 paper format
            
            // Calculate width and height for the PDF
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`sales_report_${filterSuffix}.pdf`); // Trigger download with filter info
        })
        .catch(error => {
            console.error('Error generating PDF:', error);
        });
}