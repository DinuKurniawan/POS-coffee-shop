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

// Cetak pesanan dari riwayat
async function printOrder(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}`);
        const order = await response.json();

        if (order) {
            printReceipt(order);
            return;
        }
        await showError('Data pesanan tidak ditemukan.');
    } catch (error) {
        await showError('Gagal memuat pesanan: ' + error.message);
    }
}

// Cetak struk
function printReceipt(order) {
    const printWindow = window.open('', '_blank');
    const subtotal = order.subtotal ?? order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = order.tax ?? (order.total - subtotal);
    const vatDisplay = Number.isFinite(Number(order.vatRate)) ? Number(order.vatRate) : 0;

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
