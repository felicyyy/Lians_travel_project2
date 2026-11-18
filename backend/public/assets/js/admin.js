const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'admin') {
    alert('Anda harus login sebagai admin!');
    window.location.href = '/login';
}

const API_URL = '/api';

function formatRupiahInput(input) {
    let value = input.value.replace(/[^,\d]/g, '').toString();
    let split = value.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    input.value = rupiah;
}

let bookingsData = [];
let filteredData = [];
let rentunerData = [];
let monthlyChartInstance = null;
let statusChartInstance = null;

let currentPage = 1;
const rowsPerPage = 5;

const statsPage = document.getElementById('statsPage');
const bookingsPage = document.getElementById('bookingsPage');
const rentunerPage = document.getElementById('rentunerPage');
const menuStats = document.getElementById('menuStats');
const menuBookings = document.getElementById('menuBookings');
const menuRentuner = document.getElementById('menuRentuner');
const menuLogout = document.getElementById('menuLogout');

function formatRupiahInput(input) {
    let value = input.value.replace(/[^,\d]/g, '').toString();
    let split = value.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    input.value = rupiah;
}

menuLogout.addEventListener('click', function() {
    if (confirm('Logout dari admin?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
});

function showToast(msg) {
    const t = document.getElementById('adminToast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function formatRupiah(angka) {
    if (!angka) return '0';
    return Number(angka).toLocaleString('id-ID');
}

function formatTanggal(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return dateString; }
}

function formatTanggalPendek(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return dateString; }
}

async function loadData() {
    try {
        const response = await fetch(`${API_URL}/bookings`);
        const result = await response.json();
        if (result.success) {
            bookingsData = result.data;
            filteredData = [...bookingsData];
        } else {
            bookingsData = [];
            filteredData = [];
        }
    } catch (error) {
        bookingsData = [];
        filteredData = [];
    }
}

async function loadRentuner() {
    try {
        const response = await fetch(`${API_URL}/bookings/rentuner`);
        const result = await response.json();
        if (result.success) {
            rentunerData = result.data;
        } else {
            rentunerData = [];
        }
    } catch (error) {
        rentunerData = [];
    }
}

function applyDateFilter() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;

    if (!startDate && !endDate) {
        filteredData = [...bookingsData];
        showToast('Filter direset');
    } else {
        filteredData = bookingsData.filter(b => {
            if (startDate && b.start_date < startDate) return false;
            if (endDate && b.start_date > endDate) return false;
            return true;
        });
        showToast(`Menampilkan ${filteredData.length} data`);
    }
    updateStatsCards();
    updateMonthlyChart();
    updateStatusChart();
    updateVehicleStats();
}

function updateStatsCards() {
    const data = filteredData;
    const total = data.length;
    let pending = 0, confirmed = 0, completed = 0, cancelled = 0;
    let revenue = 0;

    data.forEach(b => {
        const finalPrice = b.manual_price || b.estimated_total || 0;
        if (b.status === 'pending') pending++;
        else if (b.status === 'confirmed') { confirmed++; revenue += Number(finalPrice); }
        else if (b.status === 'completed') { completed++; revenue += Number(finalPrice); }
        else if (b.status === 'cancelled') cancelled++;
    });

    document.getElementById('totalBookingStat').innerText = total;
    document.getElementById('pendingStat').innerText = pending;
    document.getElementById('confirmedStat').innerText = confirmed;
    document.getElementById('completedStat').innerText = completed;
    document.getElementById('revenueStat').innerHTML = `Rp ${formatRupiah(revenue)}`;
}

function updateMonthlyChart() {
    const data = filteredData;
    const months = [];
    const monthCounts = {};
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthName = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        months.push({ key: monthKey, name: monthName });
        monthCounts[monthKey] = 0;
    }

    data.forEach(b => {
        if (b.start_date) {
            const monthKey = b.start_date.substring(0, 7);
            if (monthCounts[monthKey] !== undefined) monthCounts[monthKey]++;
        }
    });

    const chartData = months.map(m => monthCounts[m.key] || 0);
    const chartLabels = months.map(m => m.name);

    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    monthlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{ label: 'Jumlah Booking', data: chartData, backgroundColor: '#1f6e8c', borderRadius: 8 }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function updateStatusChart() {
    const data = filteredData;
    let pending = 0, confirmed = 0, completed = 0, cancelled = 0;
    data.forEach(b => {
        if (b.status === 'pending') pending++;
        else if (b.status === 'confirmed') confirmed++;
        else if (b.status === 'completed') completed++;
        else if (b.status === 'cancelled') cancelled++;
    });

    const ctx = document.getElementById('statusChart').getContext('2d');
    if (statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
            datasets: [{ data: [pending, confirmed, completed, cancelled], backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444'] }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function updateVehicleStats() {
    const data = filteredData;
    const vehicleCount = {};
    data.forEach(b => {
        const name = b.vehicle_name?.split(' - ')[0] || 'Unknown';
        vehicleCount[name] = (vehicleCount[name] || 0) + 1;
    });

    const sorted = Object.entries(vehicleCount).sort((a, b) => b[1] - a[1]);
    const container = document.getElementById('vehicleStatsList');

    if (sorted.length === 0) {
        container.innerHTML = '<div class="vehicle-item">Belum ada data</div>';
        return;
    }

    let html = '';
    sorted.forEach(([name, count]) => {
        let icon = '<i class="fas fa-car"></i>';
        if (name.includes('Bus')) icon = '<i class="fas fa-bus"></i>';
        html += `<div class="vehicle-item"><div class="vehicle-name">${icon} ${name}</div><div class="vehicle-count">${count} x</div></div>`;
    });
    container.innerHTML = html;
}

function refreshAllStats() {
    updateStatsCards();
    updateMonthlyChart();
    updateStatusChart();
    updateVehicleStats();
}

function renderBookingsTable() {
    const statusFilter = document.getElementById('statusFilter').value;
    const search = document.getElementById('searchInput').value.toLowerCase();

    let filtered = bookingsData
        .filter(b => {
            if (statusFilter !== 'all' && b.status !== statusFilter) return false;
            if (search && !b.fullname?.toLowerCase().includes(search) && !b.vehicle_name?.toLowerCase().includes(search)) return false;
            return true;
        })
        .sort((a, b) => new Date(b.booking_time) - new Date(a.booking_time)); // Terbaru di atas

    const tbody = document.getElementById('tableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="no-data">📭 Belum ada data</td></tr>';
        document.getElementById('paginationControls').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    let html = '';
    paginatedData.forEach(b => {
        const statusClass = {
            pending: 'status-pending',
            confirmed: 'status-confirmed',
            completed: 'status-completed',
            cancelled: 'status-cancelled'
        }[b.status] || 'status-pending';

        const isFilled = (b.unit_number && b.unit_number !== '') || (b.driver_name && b.driver_name !== '') || (b.driver_phone && b.driver_phone !== '') ? true : false;
        const hasDP = Number(b.dp_amount) > 0;
        const isRentuner = b.is_rentuner === true;

        const finalPrice = b.manual_price || b.estimated_total || 0;

        html += `<tr>
            <td>${b.booking_code || b.booking_id}</td>
            <td>${b.fullname}</td>
            <td>${b.phone || '-'}<br><small>${b.email || '-'}</small></td>
            <td>${b.vehicle_name || '-'}</td>
            <td>${b.is_outside_city ? '🚗 Luar Kota' : '📍 Dalam Kota'}</td>
            <td>${b.pickup_location || '-'}</td>
            <td>${b.destination || '-'}</td>
            <td>${formatTanggalPendek(b.start_date)} - ${formatTanggalPendek(b.end_date)}</td>
            <td>${b.rental_days || 1} hari</td>
            <td>
                Rp ${formatRupiah(finalPrice)}
                ${b.manual_price ? '<br><small style="color: #b45309;"><i class="fas fa-pen"></i> Harga Manual</small>' : ''}
            </td>
            <td>
                <select class="status-select" data-id="${b.booking_id}">
                    <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <span class="status-badge ${statusClass}">${(b.status || 'pending').toUpperCase()}</span>
                ${isRentuner ? '<br><span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 20px; font-size: 0.65rem; font-weight: 700; margin-top: 4px; display: inline-block;"><i class="fas fa-handshake"></i> RENTUNER</span>' : ''}
                ${hasDP ? '<br><span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 20px; font-size: 0.65rem; font-weight: 700; margin-top: 4px; display: inline-block;"><i class="fas fa-money-bill"></i> DP: Rp ' + formatRupiah(b.dp_amount) + '</span>' : ''}
                ${Number(b.additional_units) > 0 ? '<br><span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 20px; font-size: 0.65rem; font-weight: 700; margin-top: 4px; display: inline-block;"><i class="fas fa-plus-circle"></i> +' + b.additional_units + ' unit (' + formatTanggalPendek(b.additional_unit_date) + ')</span>' : ''}
            </td>
            <td style="display: flex; gap: 6px; align-items: center; flex-wrap: nowrap;">
                <button class="action-btn detail-btn" data-id="${b.booking_id}" style="background: ${isFilled ? '#d1fae5' : '#e6f0f5'}; color: ${isFilled ? '#065f46' : '#1f6e8c'}; border: none; padding: 6px 14px; border-radius: 30px; cursor: pointer; font-weight: 600; white-space: nowrap; display: flex; align-items: center; gap: 6px;">
                    ${isFilled ? '<span style="display: inline-block; width: 10px; height: 10px; background: #10b981; border-radius: 50%;"></span>' : ''}
                    <i class="fas fa-edit"></i> Detail
                </button>
                <button class="action-btn delete-btn" data-id="${b.booking_id}" style="background: #fee2e2; color: #b91c1c; border: none; padding: 6px 14px; border-radius: 30px; cursor: pointer; font-weight: 600; white-space: nowrap;">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;

    renderPagination(totalPages);

    document.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', async function() {
            const id = this.getAttribute('data-id');
            const newStatus = this.value;
            try {
                const response = await fetch(`${API_URL}/bookings/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                const result = await response.json();
                if (result.success) {
                    showToast('Status diperbarui');
                    await loadData();
                    renderBookingsTable();
                    updateBookingStats();
                    refreshAllStats();
                }
            } catch (error) { showToast('❌ Gagal update status'); }
        });
    });

    document.querySelectorAll('.detail-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const booking = bookingsData.find(b => b.booking_id == id);
            if (booking) {
                openDetailModal(booking);
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            if (confirm('Hapus booking ini?')) {
                try {
                    const response = await fetch(`${API_URL}/bookings/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (result.success) {
                        showToast('Booking dihapus');
                        await loadData();
                        renderBookingsTable();
                        updateBookingStats();
                        refreshAllStats();
                    }
                } catch (error) { showToast('❌ Gagal hapus booking'); }
            }
        });
    });
}

function renderPagination(totalPages) {
    const container = document.getElementById('paginationControls');
    container.innerHTML = '';

    if (totalPages <= 1) return; 

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderBookingsTable();
        }
    };
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                currentPage = i;
                renderBookingsTable();
            };
            container.appendChild(pageBtn);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            const dots = document.createElement('span');
            dots.className = 'pagination-dots';
            dots.textContent = '...';
            container.appendChild(dots);
        }
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderBookingsTable();
        }
    };
    container.appendChild(nextBtn);
}

function renderRentunerTable() {
    const search = document.getElementById('searchRentuner').value.toLowerCase();

    let filtered = rentunerData
        .filter(b => {
            if (search && !b.partner_company?.toLowerCase().includes(search) && !b.fullname?.toLowerCase().includes(search)) return false;
            return true;
        })
        .sort((a, b) => new Date(b.booking_time) - new Date(a.booking_time));

    const tbody = document.getElementById('rentunerTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">📭 Belum ada data rentuner</td></tr>';
        return;
    }

    let html = '';
    filtered.forEach(b => {
        const statusClass = {
            pending: 'status-pending',
            confirmed: 'status-confirmed',
            completed: 'status-completed',
            cancelled: 'status-cancelled'
        }[b.status] || 'status-pending';

        html += `<tr>
            <td>${b.booking_code || b.booking_id}</td>
            <td><strong>${b.partner_company || '-'}</strong><br><small>${b.fullname}</small></td>
            <td>${b.vehicle_name || '-'}</td>
            <td>${formatTanggalPendek(b.start_date)} - ${formatTanggalPendek(b.end_date)}</td>
            <td>Rp ${formatRupiah(b.estimated_total || 0)}</td>
            <td style="color: #b45309; font-weight: 700;">Rp ${formatRupiah(b.manual_price || b.estimated_total || 0)}</td>
            <td>
                <span class="status-badge ${statusClass}">${(b.status || 'pending').toUpperCase()}</span>
            </td>
            <td>
                <button class="action-btn detail-btn-rentuner" data-id="${b.booking_id}" style="background: #e6f0f5; color: #1f6e8c; border: none; padding: 6px 14px; border-radius: 30px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-edit"></i> Detail
                </button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;

    document.getElementById('totalRentuner').innerText = rentunerData.length;

    document.querySelectorAll('.detail-btn-rentuner').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const booking = rentunerData.find(b => b.booking_id == id);
            if (booking) openDetailModal(booking);
        });
    });
}

function updateBookingStats() {
    document.getElementById('totalBookings').innerText = bookingsData.length;
    let pending = bookingsData.filter(b => b.status === 'pending').length;
    document.getElementById('pendingCount').innerText = pending;
}

function openDetailModal(booking) {
    document.getElementById('detailBookingId').value = booking.booking_id;
    document.getElementById('detailBookingCode').value = booking.booking_code || '';
    document.getElementById('detailUnitNumber').value = booking.unit_number || '';
    document.getElementById('detailDriverName').value = booking.driver_name || '';
    document.getElementById('detailDriverPhone').value = booking.driver_phone || '';
    
    document.getElementById('detailIsRentuner').checked = booking.is_rentuner === true;
    document.getElementById('detailPartnerCompany').value = booking.partner_company || '';
    
    const manualPriceVal = booking.manual_price ? Number(booking.manual_price) : '';
    const dpAmountVal = booking.dp_amount ? Number(booking.dp_amount) : '';
    
    document.getElementById('detailManualPrice').value = manualPriceVal ? manualPriceVal.toLocaleString('id-ID') : '';
    document.getElementById('detailDpAmount').value = dpAmountVal ? dpAmountVal.toLocaleString('id-ID') : '';
    

    document.getElementById('detailDpDate').value = booking.dp_date ? booking.dp_date.substring(0, 10) : '';
    document.getElementById('detailAdditionalUnits').value = booking.additional_units || '';
    document.getElementById('detailAdditionalUnitDate').value = booking.additional_unit_date ? booking.additional_unit_date.substring(0, 10) : '';
    document.getElementById('detailAdminNotes').value = booking.admin_notes || '';

    toggleRentunerFields();
    document.getElementById('detailModal').style.display = 'flex';
}

function toggleRentunerFields() {
    const isChecked = document.getElementById('detailIsRentuner').checked;
    const rentunerFields = document.getElementById('rentunerFields');
    rentunerFields.style.display = isChecked ? 'block' : 'none';
}

document.getElementById('detailIsRentuner').addEventListener('change', toggleRentunerFields);

function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

document.getElementById('detailModal').addEventListener('click', function(e) {
    if (e.target === this) closeDetailModal();
});

document.getElementById('detailForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const bookingId = document.getElementById('detailBookingId').value;
    const isRentuner = document.getElementById('detailIsRentuner').checked;

    const rawManualPrice = document.getElementById('detailManualPrice').value.replace(/\./g, '');
    const rawDpAmount = document.getElementById('detailDpAmount').value.replace(/\./g, '');

    const data = {
        unit_number: document.getElementById('detailUnitNumber').value.trim() || null,
        driver_name: document.getElementById('detailDriverName').value.trim() || null,
        driver_phone: document.getElementById('detailDriverPhone').value.trim() || null,
        is_rentuner: isRentuner,
        partner_company: isRentuner ? (document.getElementById('detailPartnerCompany').value.trim() || null) : null,
        manual_price: isRentuner && rawManualPrice ? parseFloat(rawManualPrice) : null,
        dp_amount: rawDpAmount ? parseFloat(rawDpAmount) : 0,
        dp_date: document.getElementById('detailDpDate').value || null,
        additional_units: parseInt(document.getElementById('detailAdditionalUnits').value) || 0,
        additional_unit_date: document.getElementById('detailAdditionalUnitDate').value || null,
        admin_notes: document.getElementById('detailAdminNotes').value.trim() || null
    };
    // ----------------------------------------------

    if (isRentuner && !data.partner_company) {
        showToast('⚠️ Isi nama perusahaan rekan untuk fitur Rentuner');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/detail`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            showToast('✅ Data berhasil disimpan!');
            closeDetailModal();
            await loadData();
            await loadRentuner();
            renderBookingsTable();
            renderRentunerTable();
            updateBookingStats();
            refreshAllStats();
        } else {
            showToast('❌ ' + result.message);
        }
    } catch (error) {
        showToast('❌ Gagal menyimpan data');
    }
});


document.getElementById('btnAddRentuner')?.addEventListener('click', async function() {
    document.getElementById('addRentunerModal').style.display = 'flex';
    document.getElementById('rnStartDate').min = new Date().toISOString().split('T')[0];
    
    const select = document.getElementById('rnVehicle');
    select.innerHTML = '<option value="">-- Pilih Kendaraan --</option>';
    try {
        const res = await fetch(`${API_URL}/vehicles`);
        const result = await res.json();
        if (result.success) {
            result.data.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.vehicle_id;
                opt.textContent = `${v.vehicle_name} - Rp ${formatRupiah(v.price_per_day)}/hari`;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Gagal load kendaraan:', error);
    }
});

function closeAddRentunerModal() {
    document.getElementById('addRentunerModal').style.display = 'none';
    document.getElementById('addRentunerForm').reset();
}

document.getElementById('addRentunerModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeAddRentunerModal();
});

document.getElementById('addRentunerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const vehicleId = document.getElementById('rnVehicle').value;
    const selectedOption = document.getElementById('rnVehicle').options[document.getElementById('rnVehicle').selectedIndex];
    
    const rawManualPrice = document.getElementById('rnManualPrice').value.replace(/\./g, '');

    const data = {
        partner_company: document.getElementById('rnPartner').value.trim(),
        fullname: document.getElementById('rnFullname').value.trim(),
        phone: document.getElementById('rnPhone').value.trim(),
        vehicle_id: parseInt(vehicleId),
        vehicle_name: selectedOption.text.split(' - ')[0],
        start_date: document.getElementById('rnStartDate').value,
        rental_days: parseInt(document.getElementById('rnRentalDays').value),
        manual_price: parseFloat(rawManualPrice),
        
        is_rentuner: true,
        email: null,
        is_outside_city: false,
        additional_charge: 0,
        notes: 'Pesanan via fitur Rentuner'
    };

    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            showToast('✅ Order Rentuner berhasil dibuat!');
            closeAddRentunerModal();
            await loadData();
            await loadRentuner();
            renderRentunerTable();
            renderBookingsTable();
            refreshAllStats();
        } else {
            showToast('❌ ' + result.message);
        }
    } catch (error) {
        showToast('❌ Gagal membuat order rentuner');
    }
});

document.getElementById('rnManualPrice')?.addEventListener('keyup', function() {
    formatRupiahInput(this);
});
document.getElementById('detailManualPrice')?.addEventListener('keyup', function() {
    formatRupiahInput(this);
});
document.getElementById('detailDpAmount')?.addEventListener('keyup', function() {
    formatRupiahInput(this);
});


document.getElementById('checkAvailabilityBtn')?.addEventListener('click', async function() {
    const date = document.getElementById('checkAvailabilityDate').value;
    if (!date) return showToast('Pilih tanggal terlebih dahulu');

    try {
        const vehicleResponse = await fetch(`${API_URL}/vehicles`);
        const vehicleResult = await vehicleResponse.json();
        if (!vehicleResult.success) return showToast('Gagal mengambil data kendaraan');

        const vehicles = vehicleResult.data;
        const bookingResponse = await fetch(`${API_URL}/bookings`);
        const bookingResult = await bookingResponse.json();
        const bookings = bookingResult.success ? bookingResult.data : [];

        const bookedCount = {};
        vehicles.forEach(v => { bookedCount[v.vehicle_id] = 0; });

        const vehicleMap = {};
        vehicles.forEach(v => {
            const shortName = v.vehicle_name.split(' - ')[0] || v.vehicle_name;
            vehicleMap[shortName.toLowerCase()] = v.vehicle_id;
            vehicleMap[v.vehicle_name.toLowerCase()] = v.vehicle_id;
        });

        bookings.forEach(b => {
            if (b.status === 'cancelled' || b.status === 'pending') return;
            if (date >= b.start_date && date <= b.end_date) {
                let foundId = null;
                const bookingName = b.vehicle_name || '';
                for (const [name, id] of Object.entries(vehicleMap)) {
                    if (bookingName.toLowerCase().includes(name) || name.includes(bookingName.toLowerCase())) {
                        foundId = id;
                        break;
                    }
                }
                if (foundId && bookedCount[foundId] !== undefined) bookedCount[foundId]++;
            }
        });

        const container = document.getElementById('availabilityResult');
        let html = `<h4 style="margin-bottom: 12px;">📅 Ketersediaan Tanggal ${date}</h4>
                   <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px;">`;

        let totalAvailable = 0;

        vehicles.forEach(v => {
            const booked = bookedCount[v.vehicle_id] || 0;
            const stock = v.stock || 5;
            const available = stock - booked;
            const isFull = available <= 0;
            if (available > 0) totalAvailable++;

            const statusColor = isFull ? '#fee2e2' : '#d1fae5';
            const statusText = isFull ? '❌ HABIS' : `✅ ${available} tersisa`;
            const textColor = isFull ? '#b91c1c' : '#065f46';
            const borderColor = isFull ? '#b91c1c' : '#065f46';

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: ${statusColor}; border-radius: 12px; border-left: 4px solid ${borderColor};">
                    <div>
                        <span style="font-weight: 600;">${v.vehicle_name}</span>
                        <br>
                        <small style="color: #6c757d;">Stok: ${stock} unit | Dipesan: ${booked} unit</small>
                    </div>
                    <span style="font-weight: 700; color: ${textColor}; font-size: 1rem;">${statusText}</span>
                </div>
            `;
        });

        html += `</div>
                 <div style="margin-top: 12px; padding: 10px; background: #f0f4f8; border-radius: 12px; text-align: center; font-weight: 600;">
                     <span>${totalAvailable} dari ${vehicles.length} tipe kendaraan tersedia</span>
                 </div>`;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error checking availability:', error);
        showToast('❌ Gagal mengecek ketersediaan');
    }
});


menuStats.addEventListener('click', function() {
    statsPage.style.display = 'block';
    bookingsPage.style.display = 'none';
    rentunerPage.style.display = 'none';
    menuStats.classList.add('active');
    menuBookings.classList.remove('active');
    menuRentuner.classList.remove('active');
    refreshAllStats();
});

menuBookings.addEventListener('click', function() {
    statsPage.style.display = 'none';
    bookingsPage.style.display = 'block';
    rentunerPage.style.display = 'none';
    menuStats.classList.remove('active');
    menuBookings.classList.add('active');
    menuRentuner.classList.remove('active');
    currentPage = 1; 
    renderBookingsTable();
    updateBookingStats();
});

menuRentuner.addEventListener('click', async function() {
    statsPage.style.display = 'none';
    bookingsPage.style.display = 'none';
    rentunerPage.style.display = 'block';
    menuStats.classList.remove('active');
    menuBookings.classList.remove('active');
    menuRentuner.classList.add('active');
    await loadRentuner();
    renderRentunerTable();
});


document.getElementById('applyFilterBtn').addEventListener('click', function() {
    currentPage = 1; 
    applyDateFilter();
});
document.getElementById('exportFilteredBtn').addEventListener('click', function() {
    exportCSV(filteredData, 'laporan_filtered');
});
document.getElementById('exportAllBtn').addEventListener('click', function() {
    exportCSV(bookingsData, 'laporan_semua');
});

document.getElementById('refreshBtn').addEventListener('click', async function() {
    await loadData();
    filteredData = [...bookingsData];
    currentPage = 1; 
    renderBookingsTable();
    updateBookingStats();
    refreshAllStats();
    showToast('Data dimuat');
});

document.getElementById('refreshRentunerBtn').addEventListener('click', async function() {
    await loadRentuner();
    renderRentunerTable();
    showToast('Data Rentuner dimuat');
});

document.getElementById('statusFilter').addEventListener('change', function() {
    currentPage = 1; 
    renderBookingsTable();
});
document.getElementById('searchInput').addEventListener('input', function() {
    currentPage = 1; 
    renderBookingsTable();
});
document.getElementById('searchRentuner').addEventListener('input', renderRentunerTable);


function exportCSV(data, filename) {
    if (data.length === 0) {
        showToast('Tidak ada data untuk diexport');
        return;
    }

    let csv = "ID,Nama,Email,No HP,Kendaraan,Rute,Penjemputan,Tujuan,Tanggal Mulai,Tanggal Selesai,Durasi,Total,Status,Unit,Driver,HP Driver\n";
    data.forEach(b => {
        const finalPrice = b.manual_price || b.estimated_total || 0;
        csv += `${b.booking_code || b.booking_id},${b.fullname},${b.email || ''},${b.phone || ''},${b.vehicle_name || ''},${b.is_outside_city ? 'Luar Kota' : 'Dalam Kota'},${b.pickup_location || ''},${b.destination || ''},${formatTanggalPendek(b.start_date)},${formatTanggalPendek(b.end_date)},${b.rental_days || 1},${finalPrice},${b.status},${b.unit_number || ''},${b.driver_name || ''},${b.driver_phone || ''}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast('✅ Laporan berhasil diexport!');
}

async function init() {
    await loadData();
    await loadRentuner();
    filteredData = [...bookingsData];
    currentPage = 1;
    refreshAllStats();
}

document.getElementById('detailManualPrice')?.addEventListener('keyup', function() {
    formatRupiahInput(this);
});
document.getElementById('detailDpAmount')?.addEventListener('keyup', function() {
    formatRupiahInput(this);
});

init();