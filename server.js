const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SOURCE_DATA_DIR = path.join(__dirname, 'data');
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'pos-data') : SOURCE_DATA_DIR;
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PAYMENT_METHODS = ['Tunai', 'Kartu', 'QRIS', 'Transfer Bank'];
const DEFAULT_SETTINGS = {
    vatRate: 11,
    bankAccounts: []
};

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'coffee-shop-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to check cashier login
function requireCashier(req, res, next) {
    if (!req.session.cashierName) {
        return res.redirect('/login');
    }
    next();
}

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function ensureDataFile(filePath, defaultContent, seedFilePath) {
    ensureDataDirectory();
    if (fs.existsSync(filePath)) {
        return;
    }

    if (
        seedFilePath &&
        fs.existsSync(seedFilePath) &&
        path.resolve(seedFilePath) !== path.resolve(filePath)
    ) {
        fs.copyFileSync(seedFilePath, filePath);
        return;
    }

    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
}

function readProductsData() {
    ensureDataFile(
        PRODUCTS_FILE,
        { categories: [], products: [] },
        path.join(SOURCE_DATA_DIR, 'products.json')
    );
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
}

function writeProductsData(productsData) {
    ensureDataDirectory();
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(productsData, null, 2));
}

function readOrdersData() {
    ensureDataFile(ORDERS_FILE, [], path.join(SOURCE_DATA_DIR, 'orders.json'));
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
}

function writeOrdersData(ordersData) {
    ensureDataDirectory();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersData, null, 2));
}

function readSettingsData() {
    ensureDataFile(SETTINGS_FILE, DEFAULT_SETTINGS, path.join(SOURCE_DATA_DIR, 'settings.json'));
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    const vatRate = Number(parsed.vatRate);
    return {
        vatRate: Number.isNaN(vatRate) ? DEFAULT_SETTINGS.vatRate : vatRate,
        bankAccounts: Array.isArray(parsed.bankAccounts) ? parsed.bankAccounts : []
    };
}

function writeSettingsData(settingsData) {
    ensureDataDirectory();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2));
}

function parseBankAccountPayload(body) {
    const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
    const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
    const accountHolder = typeof body.accountHolder === 'string' ? body.accountHolder.trim() : '';
    const branch = typeof body.branch === 'string' ? body.branch.trim() : '';

    if (!bankName || !accountNumber || !accountHolder) {
        return null;
    }

    return {
        bankName,
        accountNumber,
        accountHolder,
        branch
    };
}

function formatRupiah(value) {
    return Number(value)
        .toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
        .replace(/\u00A0/g, ' ');
}

function parseProductPayload(body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const image = typeof body.image === 'string' ? body.image.trim() : '';
    const price = Number(body.price);

    if (!name || !description || !category || !image || Number.isNaN(price) || price < 0) {
        return null;
    }

    return { name, description, category, image, price };
}

// Persistent storage for orders
let orders = readOrdersData();
let orderCounter = orders.reduce((maxId, order) => Math.max(maxId, Number(order.id) || 0), 0) + 1;

// Routes
app.get('/login', (req, res) => {
    if (req.session.cashierName) {
        return res.redirect('/');
    }
    res.render('login');
});

app.post('/login', (req, res) => {
    const { cashierName } = req.body;
    if (cashierName && cashierName.trim()) {
        req.session.cashierName = cashierName.trim();
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/', requireCashier, (req, res) => {
    const products = readProductsData();
    const settings = readSettingsData();
    res.render('index', { 
        products,
        settings,
        cashierName: req.session.cashierName
    });
});

app.get('/orders', requireCashier, (req, res) => {
    res.render('orders', { 
        orders: orders.slice().reverse(),
        cashierName: req.session.cashierName
    });
});

app.get('/admin', requireCashier, (req, res) => {
    const products = readProductsData();
    res.render('admin', { 
        products,
        cashierName: req.session.cashierName
    });
});

app.get('/reports', requireCashier, (req, res) => {
    res.render('reports', { 
        orders,
        cashierName: req.session.cashierName
    });
});

app.get('/settings', requireCashier, (req, res) => {
    const settings = readSettingsData();
    res.render('settings', {
        settings,
        cashierName: req.session.cashierName
    });
});

app.post('/api/orders', requireCashier, (req, res) => {
    const { items, customerName, paymentMethod, bankAccountId } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Payload pesanan tidak valid' });
    }

    const products = readProductsData();
    const settings = readSettingsData();
    const normalizedItems = [];

    for (const incomingItem of items) {
        const productId = Number(incomingItem.id);
        const quantity = Number(incomingItem.quantity);
        const product = products.products.find(item => Number(item.id) === productId);

        if (!product || !Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ success: false, error: 'Item pesanan tidak valid' });
        }

        normalizedItems.push({
            id: product.id,
            name: product.name,
            category: product.category,
            price: Number(product.price),
            quantity
        });
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vatRate = Number(settings.vatRate);
    const tax = Math.round(subtotal * (vatRate / 100));
    const total = subtotal + tax;

    const sanitizedCustomerName = typeof customerName === 'string' && customerName.trim()
        ? customerName.trim()
        : 'Pelanggan Umum';
    const sanitizedPaymentMethod = PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'Tunai';
    const selectedBankAccount = sanitizedPaymentMethod === 'Transfer Bank'
        ? settings.bankAccounts.find(account => Number(account.id) === Number(bankAccountId))
        : null;

    if (sanitizedPaymentMethod === 'Transfer Bank' && !selectedBankAccount) {
        return res.status(400).json({ success: false, error: 'Rekening bank untuk transfer tidak valid' });
    }

    const orderId = orderCounter++;
    const order = {
        id: orderId,
        items: normalizedItems,
        subtotal,
        tax,
        vatRate,
        total,
        customerName: sanitizedCustomerName,
        cashierName: req.session.cashierName || 'Tidak diketahui',
        paymentMethod: sanitizedPaymentMethod,
        bankAccount: selectedBankAccount || null,
        paymentStatus: 'Lunas',
        customerNotification: `Halo ${sanitizedCustomerName}, pembayaran ${formatRupiah(total)} untuk Pesanan #${orderId} sudah kami terima. Terima kasih.`,
        paidAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        status: 'Selesai'
    };
    orders.push(order);
    writeOrdersData(orders);
    res.json({ success: true, order });
});

app.get('/api/settings', requireCashier, (req, res) => {
    const settings = readSettingsData();
    res.json({ success: true, settings });
});

app.put('/api/settings/vat', requireCashier, (req, res) => {
    const vatRate = Number(req.body.vatRate);
    if (Number.isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
        return res.status(400).json({ success: false, error: 'Nilai PPN harus antara 0 sampai 100' });
    }

    const settings = readSettingsData();
    settings.vatRate = vatRate;
    writeSettingsData(settings);

    res.json({ success: true, settings });
});

app.post('/api/settings/bank-accounts', requireCashier, (req, res) => {
    const bankAccount = parseBankAccountPayload(req.body);
    if (!bankAccount) {
        return res.status(400).json({ success: false, error: 'Data rekening bank tidak valid' });
    }

    const settings = readSettingsData();
    const nextId = settings.bankAccounts.reduce((maxId, account) => Math.max(maxId, Number(account.id) || 0), 0) + 1;
    const newAccount = { id: nextId, ...bankAccount };
    settings.bankAccounts.push(newAccount);
    writeSettingsData(settings);

    res.json({ success: true, bankAccount: newAccount });
});

app.put('/api/settings/bank-accounts/:id', requireCashier, (req, res) => {
    const bankAccount = parseBankAccountPayload(req.body);
    if (!bankAccount) {
        return res.status(400).json({ success: false, error: 'Data rekening bank tidak valid' });
    }

    const settings = readSettingsData();
    const index = settings.bankAccounts.findIndex(account => Number(account.id) === Number(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Rekening bank tidak ditemukan' });
    }

    settings.bankAccounts[index] = {
        ...settings.bankAccounts[index],
        ...bankAccount
    };
    writeSettingsData(settings);

    res.json({ success: true, bankAccount: settings.bankAccounts[index] });
});

app.delete('/api/settings/bank-accounts/:id', requireCashier, (req, res) => {
    const settings = readSettingsData();
    const index = settings.bankAccounts.findIndex(account => Number(account.id) === Number(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Rekening bank tidak ditemukan' });
    }

    settings.bankAccounts.splice(index, 1);
    writeSettingsData(settings);

    res.json({ success: true });
});

app.post('/api/products', requireCashier, (req, res) => {
    try {
        const products = readProductsData();
        const parsedPayload = parseProductPayload(req.body);
        if (!parsedPayload) {
            return res.status(400).json({ success: false, error: 'Data menu tidak valid' });
        }
        if (!products.categories.some(cat => cat.id === parsedPayload.category)) {
            return res.status(400).json({ success: false, error: 'Kategori menu tidak valid' });
        }

        const newProduct = {
            id: products.products.reduce((maxId, product) => Math.max(maxId, Number(product.id) || 0), 0) + 1,
            ...parsedPayload
        };
        products.products.push(newProduct);
        writeProductsData(products);
        res.json({ success: true, product: newProduct });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/products/:id', requireCashier, (req, res) => {
    try {
        const products = readProductsData();
        const parsedPayload = parseProductPayload(req.body);
        if (!parsedPayload) {
            return res.status(400).json({ success: false, error: 'Data menu tidak valid' });
        }
        if (!products.categories.some(cat => cat.id === parsedPayload.category)) {
            return res.status(400).json({ success: false, error: 'Kategori menu tidak valid' });
        }

        const index = products.products.findIndex(p => p.id === parseInt(req.params.id));
        if (index !== -1) {
            products.products[index] = { ...products.products[index], ...parsedPayload };
            writeProductsData(products);
            res.json({ success: true, product: products.products[index] });
        } else {
            res.status(404).json({ success: false, error: 'Menu tidak ditemukan' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/products/:id', requireCashier, (req, res) => {
    try {
        const products = readProductsData();
        const index = products.products.findIndex(p => p.id === parseInt(req.params.id));
        if (index !== -1) {
            products.products.splice(index, 1);
            writeProductsData(products);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Menu tidak ditemukan' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/orders/:id', requireCashier, (req, res) => {
    const order = orders.find(o => o.id === parseInt(req.params.id));
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }
});

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 POS Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
