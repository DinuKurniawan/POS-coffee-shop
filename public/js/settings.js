const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true
});

const bankFormContainer = document.getElementById('bankFormContainer');
const bankFormTitle = document.getElementById('bankFormTitle');
const bankForm = document.getElementById('bankForm');
const vatForm = document.getElementById('vatForm');

document.getElementById('showBankFormBtn').addEventListener('click', () => {
    resetBankForm();
    bankFormContainer.classList.remove('hidden');
});

document.getElementById('cancelBankFormBtn').addEventListener('click', () => {
    resetBankForm();
    bankFormContainer.classList.add('hidden');
});

vatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const vatRate = Number(document.getElementById('vatRateInput').value);

    try {
        const response = await fetch('/api/settings/vat', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vatRate })
        });
        const result = await response.json();

        if (!result.success) {
            await Swal.fire({
                icon: 'error',
                title: 'Gagal menyimpan PPN',
                text: result.error || 'Terjadi kesalahan'
            });
            return;
        }

        await Toast.fire({
            icon: 'success',
            title: `PPN berhasil diperbarui ke ${vatRate}%`
        });
    } catch (error) {
        await Swal.fire({
            icon: 'error',
            title: 'Terjadi kesalahan',
            text: error.message
        });
    }
});

bankForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const bankId = document.getElementById('bankId').value;

    const payload = {
        bankName: document.getElementById('bankName').value.trim(),
        accountNumber: document.getElementById('accountNumber').value.trim(),
        accountHolder: document.getElementById('accountHolder').value.trim(),
        branch: document.getElementById('branch').value.trim()
    };

    const url = bankId ? `/api/settings/bank-accounts/${bankId}` : '/api/settings/bank-accounts';
    const method = bankId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (!result.success) {
            await Swal.fire({
                icon: 'error',
                title: 'Gagal menyimpan rekening',
                text: result.error || 'Terjadi kesalahan'
            });
            return;
        }

        await Toast.fire({
            icon: 'success',
            title: bankId ? 'Rekening berhasil diperbarui' : 'Rekening berhasil ditambahkan'
        });
        location.reload();
    } catch (error) {
        await Swal.fire({
            icon: 'error',
            title: 'Terjadi kesalahan',
            text: error.message
        });
    }
});

function editBankAccount(account) {
    bankFormContainer.classList.remove('hidden');
    bankFormTitle.textContent = 'Ubah Rekening Bank';
    document.getElementById('bankId').value = account.id;
    document.getElementById('bankName').value = account.bankName;
    document.getElementById('accountNumber').value = account.accountNumber;
    document.getElementById('accountHolder').value = account.accountHolder;
    document.getElementById('branch').value = account.branch || '';
    bankFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteBankAccount(id) {
    const confirmation = await Swal.fire({
        icon: 'warning',
        title: 'Hapus rekening bank?',
        text: 'Rekening yang dihapus tidak akan muncul di POS.',
        showCancelButton: true,
        confirmButtonText: 'Ya, hapus',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#DC2626'
    });

    if (!confirmation.isConfirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/settings/bank-accounts/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (!result.success) {
            await Swal.fire({
                icon: 'error',
                title: 'Gagal menghapus rekening',
                text: result.error || 'Terjadi kesalahan'
            });
            return;
        }

        await Toast.fire({
            icon: 'success',
            title: 'Rekening berhasil dihapus'
        });
        location.reload();
    } catch (error) {
        await Swal.fire({
            icon: 'error',
            title: 'Terjadi kesalahan',
            text: error.message
        });
    }
}

function resetBankForm() {
    bankForm.reset();
    document.getElementById('bankId').value = '';
    bankFormTitle.textContent = 'Tambah Rekening Bank';
}
