// ==================================
// APPLICATION STATE & LOGIC
// ==================================

const state = {
    currentStep: 1,
    truckType: null,
    products: [],
    sameSize: false,
    result: null
};

// Truck Specifications (in cm)
const truckSpecs = {
    standard: {
        length: 1360,
        width: 245,
        height: 270,
        maxWeight: 22000,
        image: 'C:/Users/Alp Tek Bilişim/.gemini/antigravity/brain/9c74c3b8-cbc0-480e-8c9c-84e7742dc4b4/truck_standard_1769897111092.png'
    },
    mega: {
        length: 1360,
        width: 245,
        height: 300,
        maxWeight: 22000,
        image: 'C:/Users/Alp Tek Bilişim/.gemini/antigravity/brain/9c74c3b8-cbc0-480e-8c9c-84e7742dc4b4/truck_mega_1769897127402.png'
    }
};

let productCounter = 0;
const MAX_PRODUCTS = 20;

// ==================================
// INITIALIZATION
// ==================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateProgress();
    addProductRow(); // Add first product row by default
});

function setupEventListeners() {
    // Truck type selection
    document.querySelectorAll('[data-truck]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectTruckType(e.currentTarget.dataset.truck, e.currentTarget);
        });
    });

    // Same size checkbox
    document.getElementById('sameSizeCheckbox').addEventListener('change', (e) => {
        state.sameSize = e.target.checked;
        handleSameSizeChange();
    });

    // Add product button
    document.getElementById('addProductBtn').addEventListener('click', addProductRow);

    // Calculate button
    document.getElementById('calculateOptimizationBtn').addEventListener('click', calculateOptimization);
}

// ==================================
// TRUCK SELECTION
// ==================================

function selectTruckType(type, btn) {
    state.truckType = truckSpecs[type];

    // Update UI
    document.querySelectorAll('[data-truck]').forEach(b => {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');

    // Update truck image and specs
    updateTruckVisual(type);

    // Move to next step
    setTimeout(() => goToStep(2), 300);
}

function updateTruckVisual(type) {
    const truck = truckSpecs[type];
    const img = document.getElementById('truckImage');

    // Add transition class
    img.classList.add('switching');

    setTimeout(() => {
        img.src = truck.image;
        img.classList.remove('switching');

        // Update specs
        const specs = document.getElementById('truckSpecs');
        specs.innerHTML = `
            <div class="spec-item">
                <span class="spec-label">Uzunluk</span>
                <span class="spec-value">13.60 m</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Genişlik</span>
                <span class="spec-value">${(truck.width / 100).toFixed(2)} m</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Yükseklik</span>
                <span class="spec-value">${(truck.height / 100).toFixed(2)} m</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Maks. Yük</span>
                <span class="spec-value">22,000 kg</span>
            </div>
        `;
    }, 250);
}

// ==================================
// PRODUCT INPUT MANAGEMENT
// ==================================

function addProductRow() {
    const currentCount = document.querySelectorAll('.product-row').length;
    if (currentCount >= MAX_PRODUCTS) {
        alert(`En fazla ${MAX_PRODUCTS} farklı ürün ekleyebilirsiniz!`);
        return;
    }

    productCounter++;
    const productList = document.getElementById('productList');

    const productRow = document.createElement('div');
    productRow.className = 'product-row';
    productRow.dataset.productId = productCounter;

    // Modified Header with Rotation Checkbox
    productRow.innerHTML = `
        <div class="product-header">
            <div style="display:flex; align-items:center; gap:15px;">
                <span class="product-number">#${productCounter}</span>
                <div class="rotation-control" style="display:flex; align-items:center; gap:6px;" title="Ürünü yan çevir (En/Boy değişimi)">
                    <input type="checkbox" id="rot_${productCounter}" class="product-rotation" style="width:16px; height:16px; cursor:pointer; accent-color:#3b82f6;">
                    <label for="rot_${productCounter}" style="font-size:0.85rem; color:#94a3b8; cursor:pointer; user-select:none; font-weight:500;">Döndür</label>
                </div>
            </div>
            ${productCounter > 1 ? `<button class="btn-remove-product" onclick="removeProductRow(${productCounter})">×</button>` : `<button class="btn-remove-product" onclick="removeProductRow(${productCounter})" style="visibility:hidden">×</button>`}
        </div>
        <div class="product-inputs">
            <div class="input-group">
                <label>Uzunluk (cm)</label>
                <input type="number" class="product-length" placeholder="örn: 60" min="1" step="0.1">
            </div>
            <div class="input-group">
                <label>Genişlik (cm)</label>
                <input type="number" class="product-width" placeholder="örn: 40" min="1" step="0.1">
            </div>
            <div class="input-group">
                <label>Yükseklik (cm)</label>
                <input type="number" class="product-height product-height-input" placeholder="örn: 40" min="1" step="0.1" oninput="updateMaxStackOptions(this)">
            </div>
            <div class="input-group">
                <label>Ağırlık (kg)</label>
                <input type="number" class="product-weight" placeholder="örn: 25" min="0.1" step="0.1">
            </div>
            <div class="input-group" style="min-width: 100px;">
                <label>Üst Üste Max</label>
                <select class="product-max-stack" disabled style="width:100%; padding: 0.65rem; background:rgba(0,0,0,0.4); border:2px solid rgba(59,130,246,0.4); border-radius:6px; color:white;">
                    <option value="1">-</option>
                </select>
            </div>
            <div class="input-group ${state.sameSize ? 'quantity-highlight' : ''}">
                <label>Adet</label>
                <input type="number" class="product-quantity" placeholder="örn: 10" min="1" value="${state.sameSize ? '' : '1'}">
            </div>
        </div>
    `;

    productList.appendChild(productRow);

    // Rotation Logic: Swap dimensions visually
    const rotationCheckbox = productRow.querySelector('.product-rotation');
    if (rotationCheckbox) {
        rotationCheckbox.addEventListener('change', (e) => {
            const lengthInput = productRow.querySelector('.product-length');
            const widthInput = productRow.querySelector('.product-width');

            // Swap values if both exist
            if (lengthInput.value && widthInput.value) {
                const temp = lengthInput.value;
                lengthInput.value = widthInput.value;
                widthInput.value = temp;

                // Optional: Flash effect to verify swap
                lengthInput.style.borderColor = '#3b82f6';
                widthInput.style.borderColor = '#3b82f6';
                setTimeout(() => {
                    lengthInput.style.borderColor = '';
                    widthInput.style.borderColor = '';
                }, 300);
            }
        });
    }

    // Scroll to bottom to show new item
    // productList.scrollTop = productList.scrollHeight; // Simple scroll

    // Better scroll: ensure the new row is visible
    setTimeout(() => {
        productRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    updateProductRowIndices();
    updateAddProductButtonState();

    if (state.sameSize && productCounter > 1) {
        productRow.style.display = 'none';
    }
}

// Function to update Max Stack options dynamically based on height
window.updateMaxStackOptions = function (inputElement) {
    const row = inputElement.closest('.product-row');
    const height = parseFloat(inputElement.value);
    const select = row.querySelector('.product-max-stack');

    if (!height || height <= 0 || !state.truckType) {
        select.innerHTML = '<option value="1">-</option>';
        select.disabled = true;
        return;
    }

    const truckHeight = state.truckType.height;
    const maxPossible = Math.floor(truckHeight / height);

    // Clear options
    select.innerHTML = '';

    if (maxPossible < 1) {
        // Item is taller than truck!
        select.innerHTML = '<option value="0">Sığmaz</option>';
        select.disabled = true;
    } else {
        select.disabled = false;
        // Add options from 1 to maxPossible
        for (let i = 1; i <= maxPossible; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} sıra`;
            if (i === maxPossible) option.selected = true; // Auto-select max
            select.appendChild(option);
        }
    }
};

function removeProductRow(productId) {
    // We use the passed ID to find the specific row, but since IDs are re-indexed, we can also just find by dataset
    const productRow = document.querySelector(`.product-row[data-product-id="${productId}"]`);
    if (productRow) {
        productRow.remove();
        // Remove from state implementation if it exists, though state is usually rebuilt on calculating
        if (state.products.length > 0) {
            state.products = state.products.filter(p => p.id !== productId);
        }
        updateProductRowIndices();
        updateAddProductButtonState();
    }
}

function updateProductRowIndices() {
    const rows = document.querySelectorAll('.product-row');
    rows.forEach((row, index) => {
        const newId = index + 1;
        row.dataset.productId = newId;

        // Update Label
        const numberSpan = row.querySelector('.product-number');
        if (numberSpan) numberSpan.textContent = `#${newId}`;

        // Update Rotation Checkbox IDs to ensure they work with labels
        const rotCheckbox = row.querySelector('.product-rotation');
        const rotLabel = row.querySelector('.rotation-control label');

        if (rotCheckbox && rotLabel) {
            rotCheckbox.id = `rot_${newId}`;
            rotLabel.setAttribute('for', `rot_${newId}`);
        }

        // Update Remove Button
        const removeBtn = row.querySelector('.btn-remove-product');
        if (removeBtn) {
            // Re-bind the click with new ID
            removeBtn.setAttribute('onclick', `removeProductRow(${newId})`);
            // Show/hide based on if it's the first item
            if (newId === 1) {
                removeBtn.style.visibility = 'hidden';
            } else {
                removeBtn.style.visibility = 'visible';
            }
        }
    });

    // Update global counter
    productCounter = rows.length;
}

function updateAddProductButtonState() {
    const addBtn = document.getElementById('addProductBtn');
    const currentCount = document.querySelectorAll('.product-row').length;

    if (currentCount >= MAX_PRODUCTS) {
        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
        addBtn.style.cursor = 'not-allowed';
    } else {
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
        addBtn.style.cursor = 'pointer';
    }

    // Hide button if same size mode
    if (state.sameSize) {
        addBtn.style.display = 'none';
    } else {
        addBtn.style.display = 'flex';
    }
}

function handleSameSizeChange() {
    const productRows = document.querySelectorAll('.product-row');

    if (state.sameSize) {
        // Show only first row, highlight quantity
        productRows.forEach((row, index) => {
            if (index === 0) {
                row.style.display = 'block';
                const qtyInput = row.querySelector('.product-quantity');
                const qtyGroup = row.querySelector('.input-group:has(.product-quantity)');
                qtyGroup.classList.add('quantity-highlight');
                qtyInput.placeholder = 'Toplam adet girin';
            } else {
                row.style.display = 'none';
            }
        });
    } else {
        // Show all rows
        productRows.forEach((row, index) => {
            row.style.display = 'block';
            const qtyGroup = row.querySelector('.input-group:has(.product-quantity)');
            qtyGroup.classList.remove('quantity-highlight');
            const qtyInput = row.querySelector('.product-quantity');
            qtyInput.placeholder = 'örn: 10';
            if (qtyInput.value === '') {
                qtyInput.value = '1';
            }
        });
    }

    updateAddProductButtonState();
}

// ==================================
// CALCULATION
// ==================================

function calculateOptimization() {
    // Reset previous results
    if (typeof resetVisualization === 'function') {
        resetVisualization();
    }

    // Collect product data
    state.products = [];
    const productRows = document.querySelectorAll('.product-row');
    let hasSkippedRows = false;

    if (state.sameSize) {
        // Single product type with quantity
        const row = productRows[0];
        const length = parseFloat(row.querySelector('.product-length').value);
        const width = parseFloat(row.querySelector('.product-width').value);
        const height = parseFloat(row.querySelector('.product-height').value);
        const weight = parseFloat(row.querySelector('.product-weight').value);
        const quantity = parseInt(row.querySelector('.product-quantity').value);

        // Extra features
        const maxStackSelect = row.querySelector('.product-max-stack');
        let maxStack = 999;
        if (maxStackSelect && !maxStackSelect.disabled) maxStack = parseInt(maxStackSelect.value);

        const rotationParams = row.querySelector('.product-rotation');
        // If checked, allowRotation is TRUE. If not checked (default), false.
        const allowRotation = rotationParams ? rotationParams.checked : false;

        if (isNaN(length) || isNaN(width) || isNaN(height) || isNaN(weight) || isNaN(quantity) ||
            length <= 0 || width <= 0 || height <= 0 || weight <= 0 || quantity <= 0) {
            alert('Lütfen tüm değerleri doğru ve eksiksiz girin!');
            return;
        }

        state.products.push({
            id: 1,
            length,
            width,
            height,
            weight,
            quantity,
            maxStack,
            allowRotation
        });
    } else {
        // Multiple product types
        const uniqueProducts = [];
        let pId = 1;

        productRows.forEach((row, index) => {
            const length = parseFloat(row.querySelector('.product-length').value);
            const width = parseFloat(row.querySelector('.product-width').value);
            const height = parseFloat(row.querySelector('.product-height').value);
            const weight = parseFloat(row.querySelector('.product-weight').value);
            const quantity = parseInt(row.querySelector('.product-quantity').value) || 1;

            // Extra features
            const maxStackSelect = row.querySelector('.product-max-stack');
            let maxStack = 999;
            if (maxStackSelect && !maxStackSelect.disabled) maxStack = parseInt(maxStackSelect.value);

            const rotationParams = row.querySelector('.product-rotation');
            const allowRotation = rotationParams ? rotationParams.checked : false;

            if (length > 0 && width > 0 && height > 0 && weight > 0 && quantity > 0) {
                uniqueProducts.push({
                    id: pId++, // Ensures 1, 2, 3...
                    length,
                    width,
                    height,
                    weight,
                    quantity,
                    maxStack,
                    allowRotation
                });
            } else {
                // If the row has any content but fails validation, track it
                if (row.querySelector('.product-length').value || row.querySelector('.product-width').value ||
                    row.querySelector('.product-height').value || row.querySelector('.product-weight').value ||
                    row.querySelector('.product-quantity').value) {
                    hasSkippedRows = true;
                }
            }
        });
        state.products = uniqueProducts;
    }

    if (hasSkippedRows) {
        alert('Bazı ürünlerin bilgileri eksik olduğu için hesaplamaya dahil edilmedi. Lütfen kontrol edin.');
    }

    if (state.products.length === 0) {
        if (!hasSkippedRows) alert('Lütfen en az bir ürün bilgisi girin!');
        return;
    }

    console.log('🎯 Starting optimization with products:', state.products);
    console.log('🚛 Truck specs:', state.truckType);

    // Run 3D Bin Packing Algorithm
    const binPacker = new window.BinPacking3D(state.truckType, state.products);
    const result = binPacker.pack();

    console.log('✅ Optimization result:', result);
    console.log('📊 Placed items count:', result.placedItems.length);
    console.log('📦 First placed item:', result.placedItems[0]);

    state.result = result;

    // Render 3D Visualization FIRST (truck section is always visible)
    render3DVisualization(result);

    // Show results
    displayResults(result);

    // Check if we need to expand results
    const step3 = document.getElementById('step3');
    if (!step3.classList.contains('active')) {
        goToStep(3);
    }
}

function displayResults(result) {
    const summaryEl = document.getElementById('resultSummary');
    const warningEl = document.getElementById('warningSection');
    const warningContent = document.getElementById('warningContent');

    // Calculate totals
    const totalRequested = state.products.reduce((sum, p) => sum + p.quantity, 0);
    const totalFitted = result.totalItems;
    const percentage = ((totalFitted / totalRequested) * 100).toFixed(1);

    // Build stylized breakdown HTML
    let breakdownHTML = '<div class="detailed-report">';
    breakdownHTML += '<h3 class="report-title">Ürün Bazlı Detay Rapory</h3>';
    breakdownHTML += '<div class="report-grid">';

    for (let [itemId, data] of Object.entries(result.itemBreakdown)) {
        const originalProduct = state.products.find(p => p.id == itemId);
        if (originalProduct) {
            breakdownHTML += `
                <div class="report-card">
                    <div class="report-card-header">
                        <span class="report-id">#${itemId}</span>
                        <span class="report-count">${data.count} / ${originalProduct.quantity} Adet</span>
                    </div>
                    <div class="report-stats">
                        <div class="report-stat">
                            <span class="stat-label">Sıra (Boyunca)</span>
                            <span class="stat-value">${data.rows}</span>
                        </div>
                        <div class="report-stat">
                            <span class="stat-label">Sütun (Enince)</span>
                            <span class="stat-value">${data.columns}</span>
                        </div>
                        <div class="report-stat">
                            <span class="stat-label">Kat (Yükseklik)</span>
                            <span class="stat-value">${data.layers}</span>
                        </div>
                    </div>
                    <div class="report-progress-container">
                        <div class="report-progress-bar" style="width: ${(data.count / originalProduct.quantity * 100)}%"></div>
                    </div>
                </div>
            `;
        }
    }
    breakdownHTML += '</div></div>';

    summaryEl.innerHTML = `
        <div class="summary-cards-grid">
            <div class="summary-card">
                <div class="summary-card-icon">📦</div>
                <div class="summary-card-content">
                    <span class="summary-label">Toplam Yüklenen</span>
                    <span class="summary-value">${totalFitted} <small>/ ${totalRequested}</small></span>
                    <span class="summary-meta">%${percentage} Başarı</span>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-card-icon">⚖️</div>
                <div class="summary-card-content">
                    <span class="summary-label">Toplam Ağırlık</span>
                    <span class="summary-value">${result.totalWeight.toLocaleString('tr-TR')} <small>kg</small></span>
                    <span class="summary-meta">Yük Sınırı:%${((result.totalWeight / state.truckType.maxWeight) * 100).toFixed(1)}</span>
                </div>
            </div>
            <div class="summary-card highlight">
                <div class="summary-card-icon">⚡</div>
                <div class="summary-card-content">
                    <span class="summary-label">Hacim Verimliliği</span>
                    <span class="summary-value">%${result.efficiency.toFixed(1)}</span>
                    <span class="summary-meta">Kullanılan Alan</span>
                </div>
            </div>
        </div>
        ${breakdownHTML}
    `;

    // Show warning if not all items fit
    if (totalFitted < totalRequested) {
        warningEl.style.display = 'flex';
        warningContent.innerHTML = `
            <p><strong>Dorse Kapasitesi Yetersiz!</strong></p>
            <p>${totalRequested - totalFitted} adet ürün yerleştirilemedi. Lütfen dorse tipini değiştirin veya yük miktarını revize edin.</p>
        `;
    } else {
        warningEl.style.display = 'none';
    }
}

function render3DVisualization(result) {
    // Show visual canvas
    document.getElementById('truckImage').style.display = 'none';
    const canvasEl = document.getElementById('truckVisualCanvas');
    canvasEl.style.display = 'block';

    const outline = document.getElementById('truckOutline');
    outline.innerHTML = '';

    // Create simple 2D representation from top view
    // This is a simplified visualization - can be enhanced with Three.js later

    const cubeContainer = document.createElement('div');
    cubeContainer.className = 'cube-animation-container';
    cubeContainer.id = 'cubeContainer';
    cubeContainer.style.width = '100%';
    cubeContainer.style.height = '100%';
    outline.appendChild(cubeContainer);

    // Initialize cube animator with packed items
    if (window.cubeAnimator) {
        // window.cubeAnimator.destroy(); // CubeAnimator might not have destroy, just overwrite logic
    }

    requestAnimationFrame(() => {
        window.cubeAnimator = new window.CubeAnimator('cubeContainer', {
            packedItems: result.placedItems,
            containerDims: state.truckType,
            entryAnimation: true
        });
    });
}

// ==================================
// NAVIGATION
// ==================================

function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

    // Show target step
    document.getElementById(`step${step}`).classList.add('active');

    state.currentStep = step;
    updateProgress();
}

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progress = (state.currentStep / 3) * 100;
    progressFill.style.width = `${progress}%`;
}

// Reset Visualization Helper
window.resetVisualization = function () {
    state.result = null;
    const outline = document.getElementById('truckOutline');
    if (outline) outline.innerHTML = '';

    const legend = document.getElementById('productLegend');
    if (legend) legend.innerHTML = '';

    if (window.cubeAnimator) {
        window.cubeAnimator = null;
    }

    const img = document.getElementById('truckImage');
    const canvas = document.getElementById('truckVisualCanvas');
    if (img) img.style.display = 'block';
    if (canvas) canvas.style.display = 'none';

    console.log('🧹 Visualization cleared');
};

// ==================================
// ANIMATIONS
// ==================================

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideIn {
        from { opacity: 0; transform: translateX(30px); }
        to { opacity: 1; transform: translateX(0); }
    }

    .switching {
        opacity: 0 !important;
        transform: scale(0.95) !important;
    }
`;
document.head.appendChild(style);
