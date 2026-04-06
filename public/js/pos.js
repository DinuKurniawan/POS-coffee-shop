let cart = [];
const posConfig = window.POS_CONFIG || { vatRate: 11, bankAccounts: [] };
let vatRate = Number(posConfig.vatRate) || 11;

const paymentMethodSelect = document.getElementById('paymentMethod');
const bankAccountContainer = document.getElementById('bankAccountContainer');
const bankAccountSelect = document.getElementById('bankAccountId');
const vatRateLabel = document.getElementById('vat-rate-label');
const checkoutButton = document.getElementById('checkout-btn');

const Toast = window.Swal
    ? Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2200,
        timerProgressBar: true
    })
    : null;

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(amount);
}

function normalizePaymentMethod(method) {
    return ({ Cash: 'Tunai', Card: 'Kartu', Mobile: 'QRIS' })[method] || method || 'Tunai';
}

function requiresBankAccount() {
    return paymentMethodSelect.value === 'Transfer Bank';
}

function updatePaymentUI() {
    if (requiresBankAccount()) {
        bankAccountContainer.classList.remove('hidden');
    } else {
        bankAccountContainer.classList.add('hidden');
        bankAccountSelect.value = '';
    }
    updateCheckoutButtonState();
}

function updateCheckoutButtonState() {
    const hasItems = cart.length > 0;
    const transferReady = !requiresBankAccount() || Boolean(bankAccountSelect.value);
    checkoutButton.disabled = !(hasItems && transferReady);
}

function showToast(message) {
    if (Toast) {
        Toast.fire({ icon: 'success', title: message });
        return;
    }
    console.log(message);
}

async function showError(message) {
    if (window.Swal) {
        await Swal.fire({
            icon: 'error',
            title: 'Terjadi kesalahan',
            text: message
        });
        return;
    }
    alert(message);
}

async function confirmDialog(message) {
    if (window.Swal) {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Konfirmasi',
            text: message,
            showCancelButton: true,
            confirmButtonText: 'Ya',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#DC2626'
        });
        return result.isConfirmed;
    }
    return confirm(message);
}

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    updateCartDisplay();
    showToast(`${product.name} ditambahkan ke keranjang`);
}

function updateQuantity(productId, change) {
    const item = cart.find(cartItem => cartItem.id === productId);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    updateCartDisplay();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
}

async function clearCart() {
    if (cart.length === 0) return;

    const confirmed = await confirmDialog('Yakin ingin mengosongkan keranjang?');
    if (!confirmed) return;

    cart = [];
    updateCartDisplay();
    showToast('Keranjang berhasil dikosongkan');
}

function updateCartDisplay() {
    const cartItemsDiv = document.getElementById('cart-items');

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p class="text-gray-500 text-center py-8">Keranjang masih kosong</p>';
    } else {
        cartItemsDiv.innerHTML = cart.map(item => `
            <div class="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800">${item.name}</h4>
                    <p class="text-sm text-gray-600">${formatRupiah(item.price)} / item</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="updateQuantity(${item.id}, -1)" class="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-bold">-</button>
                    <span class="w-8 text-center font-semibold">${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)" class="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-bold">+</button>
                    <button onclick="removeFromCart(${item.id})" class="ml-2 text-red-500 hover:text-red-700">✕</button>
                </div>
            </div>
        `).join('');
    }

    updateTotals();
    updateCheckoutButtonState();
}

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * (vatRate / 100));
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = formatRupiah(subtotal);
    document.getElementById('tax').textContent = formatRupiah(tax);
    document.getElementById('total').textContent = formatRupiah(total);
}

async function showPaymentSuccess(order) {
    const message = order.customerNotification || `Pembayaran untuk pesanan #${order.id} berhasil diterima.`;

    if (!window.Swal) {
        return;
    }

    const result = await Swal.fire({
        icon: 'success',
        title: 'Pembayaran Berhasil',
        html: `
            <p class="mb-2">Pesanan <strong>#${order.id}</strong> sudah <strong>${order.paymentStatus || 'Lunas'}</strong>.</p>
            <p class="mb-2">Total pembayaran: <strong>${formatRupiah(order.total)}</strong></p>
            <div class="text-left bg-gray-100 rounded-lg p-3 text-sm text-gray-700">
                <p class="font-semibold mb-1">Notifikasi pelanggan:</p>
                <p>${message}</p>
            </div>
        `,
        showDenyButton: true,
        denyButtonText: 'Salin Notifikasi',
        confirmButtonText: 'Tutup'
    });

    if (result.isDenied && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        showToast('Pesan notifikasi berhasil disalin');
    }
}

async function checkout() {
    if (cart.length === 0) return;
    if (requiresBankAccount() && !bankAccountSelect.value) {
        await showError('Pilih rekening tujuan untuk pembayaran transfer bank.');
        return;
    }

    const customerName = document.getElementById('customerName').value.trim() || 'Pelanggan Umum';
    const paymentMethod = paymentMethodSelect.value;

    const orderData = {
        items: cart,
        customerName,
        paymentMethod,
        bankAccountId: bankAccountSelect.value || null
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        const result = await response.json();

        if (!result.success) {
            await showError(result.error || 'Gagal menyimpan pesanan');
            return;
        }

        await showPaymentSuccess(result.order);
        printReceipt(result.order);
        cart = [];
        document.getElementById('customerName').value = '';
        paymentMethodSelect.value = 'Tunai';
        bankAccountSelect.value = '';
        updatePaymentUI();
        updateCartDisplay();
        showToast('Pesanan berhasil disimpan');
    } catch (error) {
        await showError(error.message);
    }
}

function printReceipt(order) {
    const printWindow = window.open('', '_blank');
    const subtotal = order.subtotal ?? order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = order.tax ?? (order.total - subtotal);
    const vatDisplay = Number.isFinite(Number(order.vatRate)) ? Number(order.vatRate) : vatRate;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Struk - Pesanan #${order.id}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    max-width: 320px;
                    margin: 20px auto;
                    padding: 20px;
                }
                h1 { text-align: center; font-size: 24px; margin-bottom: 5px; }
                h2 { text-align: center; font-size: 18px; margin-top: 0; }
                .divider { border-top: 2px dashed #000; margin: 15px 0; }
                .item { display: flex; justify-content: space-between; margin: 8px 0; gap: 8px; }
                .total { font-weight: bold; font-size: 18px; margin-top: 10px; }
                .center { text-align: center; }
                @media print {
                    body { margin: 0; padding: 10px; }
                }
            </style>
        </head>
        <body>
            <h1>☕ Kedai Kopi</h1>
            <h2>Struk Pembayaran</h2>
            <div class="divider"></div>
            <p><strong>Pesanan #${order.id}</strong></p>
            <p>Status Pembayaran: ${order.paymentStatus || 'Lunas'}</p>
            <p>Pelanggan: ${order.customerName}</p>
            <p>Kasir: ${order.cashierName || 'Tidak diketahui'}</p>
            <p>Pembayaran: ${normalizePaymentMethod(order.paymentMethod)}</p>
            ${order.bankAccount ? `<p>Bank: ${order.bankAccount.bankName} (${order.bankAccount.accountNumber})</p>` : ''}
            <p>Tanggal: ${new Date(order.timestamp).toLocaleString('id-ID')}</p>
            <div class="divider"></div>
            <h3>Item:</h3>
            ${order.items.map(item => `
                <div class="item">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>${formatRupiah(item.price * item.quantity)}</span>
                </div>
            `).join('')}
            <div class="divider"></div>
            <div class="item">
                <span>Subtotal:</span>
                <span>${formatRupiah(subtotal)}</span>
            </div>
            <div class="item">
                <span>PPN (${vatDisplay}%):</span>
                <span>${formatRupiah(tax)}</span>
            </div>
            <div class="item total">
                <span>TOTAL:</span>
                <span>${formatRupiah(order.total)}</span>
            </div>
            <div class="divider"></div>
            <p class="center">Terima kasih sudah berbelanja!</p>
            <p class="center">Sampai jumpa kembali.</p>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => window.close(), 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function filterCategory(category, clickedButton) {
    const products = document.querySelectorAll('.product-card');
    const buttons = document.querySelectorAll('.category-btn');

    buttons.forEach(button => {
        button.classList.remove('bg-indigo-600', 'text-white');
        button.classList.add('bg-gray-200', 'text-gray-700');
    });

    if (clickedButton) {
        clickedButton.classList.remove('bg-gray-200', 'text-gray-700');
        clickedButton.classList.add('bg-indigo-600', 'text-white');
    }

    products.forEach(product => {
        if (category === 'all' || product.dataset.category === category) {
            product.style.display = 'block';
        } else {
            product.style.display = 'none';
        }
    });
}

paymentMethodSelect.addEventListener('change', updatePaymentUI);
bankAccountSelect.addEventListener('change', updateCheckoutButtonState);
vatRateLabel.textContent = vatRate;
updatePaymentUI();
updateCartDisplay();
