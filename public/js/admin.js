const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true
});

function showAddProductForm() {
    document.getElementById('productForm').classList.remove('hidden');
    document.getElementById('formTitle').textContent = 'Tambah Menu Baru';
    document.getElementById('productFormElement').reset();
    document.getElementById('productId').value = '';
}

function cancelForm() {
    document.getElementById('productForm').classList.add('hidden');
    document.getElementById('productFormElement').reset();
}

function editProduct(product) {
    document.getElementById('productForm').classList.remove('hidden');
    document.getElementById('formTitle').textContent = 'Ubah Menu';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productImage').value = product.image;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteProduct(id) {
    const confirmation = await Swal.fire({
        icon: 'warning',
        title: 'Hapus menu ini?',
        text: 'Perubahan tidak bisa dibatalkan.',
        showCancelButton: true,
        confirmButtonText: 'Ya, hapus',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#DC2626'
    });

    if (!confirmation.isConfirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (!result.success) {
            await Swal.fire({
                icon: 'error',
                title: 'Gagal menghapus menu',
                text: result.error || 'Terjadi kesalahan'
            });
            return;
        }

        await Toast.fire({
            icon: 'success',
            title: 'Menu berhasil dihapus'
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

document.getElementById('productFormElement').addEventListener('submit', async (event) => {
    event.preventDefault();

    const productId = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value.trim(),
        price: Number(document.getElementById('productPrice').value),
        category: document.getElementById('productCategory').value,
        image: document.getElementById('productImage').value.trim(),
        description: document.getElementById('productDescription').value.trim()
    };

    const url = productId ? `/api/products/${productId}` : '/api/products';
    const method = productId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });
        const result = await response.json();

        if (!result.success) {
            await Swal.fire({
                icon: 'error',
                title: 'Gagal menyimpan menu',
                text: result.error || 'Terjadi kesalahan'
            });
            return;
        }

        await Toast.fire({
            icon: 'success',
            title: productId ? 'Menu berhasil diperbarui' : 'Menu berhasil ditambahkan'
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
