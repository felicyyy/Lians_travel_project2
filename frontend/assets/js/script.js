// ================================================================
// LIANS TRAVEL - CUSTOMER SCRIPT
// ================================================================

const API_URL = '/api';

const homePage = document.getElementById('homePage');
const myBookingsPage = document.getElementById('myBookingsPage');
const navHome = document.querySelector('.nav-home');
const navBookings = document.querySelector('.nav-bookings');
const bookingForm = document.getElementById('bookingForm');
const toast = document.getElementById('toastMsg');
const vehicleSelect = document.getElementById('vehicleType');

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

function showHome() {
    homePage.style.display = 'block';
    myBookingsPage.style.display = 'none';
    navHome.classList.add('active');
    navBookings.classList.remove('active');
}

function showMyBookings() {
    homePage.style.display = 'none';
    myBookingsPage.style.display = 'block';
    navHome.classList.remove('active');
    navBookings.classList.add('active');
    renderMyBookings();
}

navHome.addEventListener('click', showHome);
navBookings.addEventListener('click', showMyBookings);

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

async function loadVehicles() {
    try {
        const response = await fetch(`${API_URL}/vehicles`);
        const result = await response.json();
        if (result.success) {
            vehicleSelect.innerHTML = '<option value="">-- Pilih Kendaraan --</option>';
            result.data.forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle.vehicle_id;
                const price = formatRupiah(vehicle.price_per_day);
                option.textContent = `🚐 ${vehicle.vehicle_name} - Rp ${price}/hari`;
                vehicleSelect.appendChild(option);
            });
        }
    } catch (error) { console.error('Error loading vehicles:', error); }
}

document.querySelectorAll('.vehicle-card').forEach(card => {
    card.addEventListener('click', function() {
        const vehicleName = this.getAttribute('data-vehicle');
        for (let i = 0; i < vehicleSelect.options.length; i++) {
            if (vehicleSelect.options[i].text.includes(vehicleName)) {
                vehicleSelect.selectedIndex = i;
                break;
            }
        }
        showToast(`Kendaraan "${vehicleName}" dipilih`);
        document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
    });
});

async function handleBooking(event) {
    event.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    if (!fullname) return showToast('⚠️ Nama lengkap harus diisi!');
    const phone = document.getElementById('phone').value.trim();
    if (!phone) return showToast('📞 No. WhatsApp harus diisi!');
    const startDate = document.getElementById('startDate').value;
    if (!startDate) return showToast('📅 Pilih tanggal mulai sewa');
    const rentalDays = parseInt(document.getElementById('rentalDays').value);
    if (rentalDays < 1) return showToast('Durasi sewa minimal 1 hari');
    const vehicleId = document.getElementById('vehicleType').value;
    if (!vehicleId) return showToast('🚐 Silakan pilih kendaraan!');

    const selectedOption = document.getElementById('vehicleType').options[document.getElementById('vehicleType').selectedIndex];
    const vehicleName = selectedOption.text;
    const priceMatch = vehicleName.match(/Rp\s?([\d\.]+)/);
    let vehiclePrice = 0;
    if (priceMatch) vehiclePrice = parseInt(priceMatch[1].replace(/\./g, ''));
    if (vehiclePrice === 0) return showToast('❌ Gagal membaca harga kendaraan');

    const email = document.getElementById('email').value;
    const pickupLocation = document.getElementById('pickupLocation').value || '-';
    const destination = document.getElementById('destination').value || '-';
    const notes = document.getElementById('notes').value || '-';
    const outsideCity = document.querySelector('input[name="outsideCity"]:checked')?.value || 'no';
    const isOutsideCity = outsideCity === 'yes';
    const estimatedTotal = Number(vehiclePrice) * Number(rentalDays);

    const bookingData = {
        fullname, email, phone,
        vehicle_id: parseInt(vehicleId),
        vehicle_name: vehicleName,
        vehicle_price_per_day: vehiclePrice,
        start_date: startDate,
        rental_days: rentalDays,
        estimated_total: estimatedTotal,
        pickup_location: pickupLocation,
        destination: destination,
        is_outside_city: isOutsideCity,
        additional_charge: 0,
        notes: notes,
        status: 'pending'
    };

    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        const result = await response.json();

        if (result.success) {
            showToast(`✅ Booking berhasil! Estimasi: Rp ${formatRupiah(estimatedTotal)}`);
            bookingForm.reset();
            document.getElementById('rentalDays').value = 1;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showToast('❌ ' + result.message);
        }
    } catch (error) {
        showToast('❌ Gagal membuat booking');
    }
}

bookingForm.addEventListener('submit', handleBooking);

document.getElementById('scrollBookingBtn').addEventListener('click', () => {
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
});

const today = new Date().toISOString().split('T')[0];
const startDateInput = document.getElementById('startDate');
startDateInput.min = today;
const future = new Date();
future.setDate(future.getDate() + 1);
startDateInput.value = future.toISOString().split('T')[0];

async function renderMyBookings() {
    const searchQuery = document.getElementById('searchBooking')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilterBookings')?.value || 'all';

    try {
        const response = await fetch(`${API_URL}/bookings`);
        const result = await response.json();
        if (!result.success) {
            document.getElementById('bookingsList').innerHTML = '<p>Gagal memuat data</p>';
            return;
        }

        let bookings = result.data;
        if (searchQuery) bookings = bookings.filter(b => b.fullname?.toLowerCase().includes(searchQuery) || b.booking_code?.toLowerCase().includes(searchQuery));
        if (statusFilter !== 'all') bookings = bookings.filter(b => b.status === statusFilter);

        const container = document.getElementById('bookingsList');
        if (bookings.length === 0) {
            container.innerHTML = `<div class="empty-bookings"><p>Belum ada pemesanan</p></div>`;
            return;
        }

        let html = '';
        bookings.forEach(booking => {
            const statusClass = {
                pending: 'status-pending', confirmed: 'status-confirmed',
                completed: 'status-completed', cancelled: 'status-cancelled'
            }[booking.status] || 'status-pending';

            html += `
                <div class="booking-item">
                    <div class="booking-header">
                        <span class="booking-id">${booking.booking_code || booking.booking_id}</span>
                        <span class="booking-status ${statusClass}">${(booking.status || 'pending').toUpperCase()}</span>
                    </div>
                    <div class="booking-detail">
                        <div><div class="detail-label">Nama</div><div class="detail-value">${booking.fullname}</div></div>
                        <div><div class="detail-label">Kontak</div><div class="detail-value">${booking.phone || '-'}<br><small>${booking.email || '-'}</small></div></div>
                        <div><div class="detail-label">Kendaraan</div><div class="detail-value">${booking.vehicle_name}</div></div>
                        <div><div class="detail-label">Penjemputan</div><div class="detail-value">${booking.pickup_location || '-'}</div></div>
                        <div><div class="detail-label">Tujuan</div><div class="detail-value">${booking.destination || '-'}</div></div>
                        <div>
                            <div class="detail-label">Periode Sewa</div>
                            <div class="detail-value">${formatTanggal(booking.start_date)} - ${formatTanggal(booking.end_date)}<br><small style="color: #6c757d;">(${booking.rental_days} hari)</small></div>
                        </div>
                        <div><div class="detail-label">Estimasi Total</div><div class="detail-value">Rp ${formatRupiah(booking.estimated_total || 0)}</div></div>
                        <div><div class="detail-label">Rute</div><div class="detail-value">${booking.is_outside_city ? '🚗 Luar Kota' : '📍 Dalam Kota'}</div></div>
                        ${booking.notes && booking.notes !== '-' ? `<div><div class="detail-label">Catatan</div><div class="detail-value">${booking.notes}</div></div>` : ''}
                    </div>
                    ${booking.status === 'pending' ? `<button class="btn-cancel" onclick="cancelBooking('${booking.booking_id}')">Batalkan</button>` : ''}
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        document.getElementById('bookingsList').innerHTML = '<p>❌ Gagal memuat data</p>';
    }
}

window.cancelBooking = async function(bookingId) {
    if (confirm('Yakin ingin membatalkan?')) {
        try {
            const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' })
            });
            const result = await response.json();
            if (result.success) {
                showToast('Booking dibatalkan');
                renderMyBookings();
            }
        } catch (error) { showToast('❌ Gagal membatalkan'); }
    }
};

document.getElementById('searchBooking')?.addEventListener('input', renderMyBookings);
document.getElementById('statusFilterBookings')?.addEventListener('change', renderMyBookings);

// ===== CEK LOGIN =====
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (token && user.role) {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.textContent = `Halo, ${user.fullname}`;
        loginBtn.href = '#';
        loginBtn.onclick = function(e) {
            e.preventDefault();
            if (confirm('Logout?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.reload();
            }
        };
    }
}

loadVehicles();
showHome();