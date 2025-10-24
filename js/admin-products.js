// js/admin-products.js - VERSÃO COMPLETAMENTE CORRIGIDA

class RomanosAdmin {
    constructor() {
        this.supabase = null;
        this.isLoading = false;
        this.currentPage = 1;
        this.totalPages = 1;
        this.pageSize = 12;
        this.currentSearchTerm = '';
        this.currentCategoryFilter = '';
        this.currentProducts = [];
        
        this.PAGINATION_CONFIG = {
            pageSize: 12,
            visiblePages: 5
        };

        // Elementos DOM
        this.elements = {
            productsGrid: document.getElementById('products-grid'),
            addProductBtn: document.getElementById('add-product-btn'),
            addFirstProduct: document.getElementById('add-first-product'),
            totalProducts: document.getElementById('total-products'),
            inStockProducts: document.getElementById('in-stock-products'),
            stockValue: document.getElementById('stock-value'),
            productsCount: document.getElementById('products-count'),
            paginationControls: document.getElementById('pagination-controls'),
            loadingProducts: document.getElementById('loading-products'),
            emptyProducts: document.getElementById('empty-products'),
            menuToggle: document.getElementById('menu-toggle'),
            searchProducts: document.getElementById('search-products'),
            clearSearch: document.getElementById('clear-search'),
            categoryFilter: document.getElementById('category-filter'),
            clearFilters: document.getElementById('clear-filters'),
            exportCsv: document.getElementById('export-csv'),
            exportJson: document.getElementById('export-json'),
            manualBackup: document.getElementById('manual-backup'),
            debugPanel: document.getElementById('debug-panel'),
            debugContent: document.getElementById('debug-content'),
            toggleDebug: document.getElementById('toggle-debug'),
            clearDebug: document.getElementById('clear-debug')
        };

        this.tableSchema = {
            hasStatus: false,
            hasSku: false,
            hasDescription: false
        };

        this.init();
    }

    async init() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                await this.initializeApp();
            }
        } catch (error) {
            this.showError('Erro na inicialização: ' + error.message);
        }
    }

    async initializeApp() {
        try {
            // Configuração do Supabase
            const SUPABASE_URL = 'https://zgrevlntkgmonqxyhjww.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpncmV2bG50a2dtb25xeHloand3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjMxNjksImV4cCI6MjA3NjY5OTE2OX0.9svTC7fzUWgZXOraUcNOifl5XggZfvwwzEWHanN2aP0';
            
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            this.updateDebug('✅ Cliente Supabase inicializado');
            this.setupEventListeners();
            await this.detectTableSchema();
            await this.testConnection();
            
        } catch (error) {
            this.updateDebug('❌ Erro na inicialização: ' + error.message);
            this.showError('Erro na inicialização: ' + error.message);
        }
    }

    async detectTableSchema() {
        try {
            this.updateDebug('🔍 Detectando esquema da tabela...');
            
            const { data, error } = await this.supabase
                .from('products')
                .select('*')
                .limit(1)
                .single();

            if (error) {
                this.updateDebug('⚠️ Não foi possível detectar o esquema, usando padrão');
                return;
            }

            if (data) {
                this.tableSchema.hasStatus = 'status' in data;
                this.tableSchema.hasSku = 'sku' in data;
                this.tableSchema.hasDescription = 'description' in data;
                
                this.updateDebug(`📋 Esquema detectado: status=${this.tableSchema.hasStatus}, sku=${this.tableSchema.hasSku}, description=${this.tableSchema.hasDescription}`);
            }
            
        } catch (error) {
            this.updateDebug('⚠️ Erro ao detectar esquema: ' + error.message);
        }
    }

    updateDebug(message) {
        if (this.elements.debugContent) {
            const timestamp = new Date().toLocaleTimeString();
            this.elements.debugContent.innerHTML += `<div>[${timestamp}] ${message}</div>`;
            this.elements.debugContent.scrollTop = this.elements.debugContent.scrollHeight;
        }
        console.log(`[ROMANOS-ADMIN] ${message}`);
    }

    showError(message) {
        this.updateDebug('❌ ERRO: ' + message);
        Swal.fire({
            title: 'Erro!',
            text: message,
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#7c3aed'
        });
    }

    showSuccess(message) {
        this.updateDebug('✅ SUCESSO: ' + message);
        return Swal.fire({
            title: 'Sucesso!',
            text: message,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#7c3aed'
        });
    }

    setupEventListeners() {
        this.updateDebug('🔧 Configurando event listeners...');
        
        // Menu toggle
        if (this.elements.menuToggle) {
            this.elements.menuToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Botões de ação
        if (this.elements.addProductBtn) {
            this.elements.addProductBtn.addEventListener('click', () => this.openProductForm());
        }
        
        if (this.elements.addFirstProduct) {
            this.elements.addFirstProduct.addEventListener('click', () => this.openProductForm());
        }
        
        // Filtros
        if (this.elements.categoryFilter) {
            this.elements.categoryFilter.addEventListener('change', () => {
                this.currentCategoryFilter = this.elements.categoryFilter.value;
                this.currentPage = 1;
                this.loadProducts();
            });
        }
        
        // Busca
        if (this.elements.searchProducts) {
            this.elements.searchProducts.addEventListener('input', this.debounce(() => {
                this.currentSearchTerm = this.elements.searchProducts.value.trim();
                this.currentPage = 1;
                this.loadProducts();
            }, 500));
        }
        
        if (this.elements.clearSearch) {
            this.elements.clearSearch.addEventListener('click', () => this.clearSearch());
        }
        
        // Limpar filtros
        if (this.elements.clearFilters) {
            this.elements.clearFilters.addEventListener('click', () => this.clearFilters());
        }
        
        // Botões de exportação
        if (this.elements.exportCsv) {
            this.elements.exportCsv.addEventListener('click', () => this.exportToCSV());
        }
        
        if (this.elements.exportJson) {
            this.elements.exportJson.addEventListener('click', () => this.exportToJSON());
        }
        
        if (this.elements.manualBackup) {
            this.elements.manualBackup.addEventListener('click', () => this.createManualBackup());
        }
        
        // Debug panel
        if (this.elements.toggleDebug) {
            this.elements.toggleDebug.addEventListener('click', () => this.toggleDebug());
        }
        
        if (this.elements.clearDebug) {
            this.elements.clearDebug.addEventListener('click', () => this.clearDebug());
        }
        
        this.updateDebug('✅ Event listeners configurados');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ===== SIDEBAR FUNCTIONS =====
    toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('active');
    }

    // ===== PRODUCT FORM =====
    async openProductForm(product = null) {
        const isEditing = !!product;
        const title = isEditing ? 'Editar Produto' : 'Adicionar Produto';
        
        const { value: formData, isConfirmed } = await Swal.fire({
            title: title,
            html: this.generateProductFormHTML(product),
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: isEditing ? 'Atualizar' : 'Salvar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#7c3aed',
            showClass: {
                popup: 'animate__animated animate__fadeInDown'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp'
            },
            preConfirm: () => {
                return this.validateProductForm();
            },
            didOpen: () => {
                // Configurar eventos
                const imageUpload = document.getElementById('product-image-upload');
                const imageUrlInput = document.getElementById('product-image-url');
                const removeImageBtn = document.getElementById('remove-image');
                const uploadArea = document.getElementById('upload-area');
                
                if (imageUpload && uploadArea) {
                    uploadArea.addEventListener('click', () => imageUpload.click());
                    imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
                }
                
                if (imageUrlInput) {
                    imageUrlInput.addEventListener('input', (e) => this.handleImageUrlChange(e));
                }

                if (removeImageBtn) {
                    removeImageBtn.addEventListener('click', () => this.removeImage());
                }
            }
        });

        if (isConfirmed && formData) {
            await this.saveProduct(formData, isEditing ? product.id : null);
        }
    }

    generateProductFormHTML(product = null) {
        // Criar um ID seguro para usar no HTML
        const safeProduct = product ? {
            ...product,
            id: product.id || '',
            name: product.name || '',
            category: product.category || '',
            price: product.price || '',
            stock: product.stock || '',
            sku: product.sku || '',
            status: product.status || 'active',
            description: product.description || '',
            image_url: product.image_url || ''
        } : null;

        const statusField = this.tableSchema.hasStatus ? `
            <div class="form-group">
                <label for="product-status" class="form-label">Status</label>
                <select id="product-status" class="form-select">
                    <option value="active" ${!safeProduct || safeProduct.status === 'active' ? 'selected' : ''}>Ativo</option>
                    <option value="inactive" ${safeProduct?.status === 'inactive' ? 'selected' : ''}>Inativo</option>
                </select>
            </div>
        ` : '';

        const skuField = this.tableSchema.hasSku ? `
            <div class="form-group">
                <label for="product-sku" class="form-label">SKU</label>
                <input type="text" id="product-sku" class="form-input" value="${safeProduct?.sku || ''}" placeholder="Código do produto">
            </div>
        ` : '';

        const descriptionField = this.tableSchema.hasDescription ? `
            <div class="form-group" style="margin-bottom: 1rem;">
                <label for="product-description" class="form-label">Descrição</label>
                <textarea id="product-description" rows="3" class="form-textarea" placeholder="Descreva o produto...">${safeProduct?.description || ''}</textarea>
            </div>
        ` : '';

        return `
            <div class="product-form" style="max-width: 600px; margin: 0 auto;">
                <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="product-name" class="form-label">Nome do Produto *</label>
                        <input type="text" id="product-name" class="form-input" value="${safeProduct?.name || ''}" placeholder="Ex: Camiseta Básica" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="product-category" class="form-label">Categoria *</label>
                        <select id="product-category" class="form-select" required>
                            <option value="">Selecione...</option>
                            <option value="masculino" ${safeProduct?.category === 'masculino' ? 'selected' : ''}>Masculino</option>
                            <option value="feminino" ${safeProduct?.category === 'feminino' ? 'selected' : ''}>Feminino</option>
                            <option value="infantil" ${safeProduct?.category === 'infantil' ? 'selected' : ''}>Infantil</option>
                            <option value="acessorios" ${safeProduct?.category === 'acessorios' ? 'selected' : ''}>Acessórios</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="product-price" class="form-label">Preço (R$) *</label>
                        <input type="number" id="product-price" step="0.01" min="0" class="form-input" value="${safeProduct?.price || ''}" placeholder="0,00" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="product-stock" class="form-label">Estoque *</label>
                        <input type="number" id="product-stock" min="0" class="form-input" value="${safeProduct?.stock || ''}" placeholder="0" required>
                    </div>
                </div>

                ${skuField || statusField ? `
                <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    ${skuField}
                    ${statusField}
                </div>
                ` : ''}

                ${descriptionField}
                
                <div class="form-group">
                    <label class="form-label">Imagem do Produto</label>
                    
                    <div id="upload-area" class="upload-area" style="border: 2px dashed #d1d5db; border-radius: 0.5rem; padding: 2rem; text-align: center; cursor: pointer; background: #f9fafb; transition: all 0.3s; margin-bottom: 1rem;">
                        <div id="upload-content">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                            <p style="color: #6b7280; margin-bottom: 0.25rem;">Clique ou arraste uma imagem aqui</p>
                            <p style="color: #9ca3af; font-size: 0.875rem;">PNG, JPG, WEBP até 5MB</p>
                        </div>
                        <input type="file" id="product-image-upload" accept="image/*" style="display: none;">
                    </div>
                    
                    <div id="image-preview-container" style="${safeProduct?.image_url ? '' : 'display: none;'} margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span class="form-label">Pré-visualização:</span>
                            <button type="button" id="remove-image" class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                <i class="fas fa-times"></i> Remover
                            </button>
                        </div>
                        <img id="image-preview" src="${safeProduct?.image_url || ''}" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: 0.5rem; border: 1px solid #e5e7eb;">
                        <input type="hidden" id="product-image" value="${safeProduct?.image_url || ''}">
                    </div>
                    
                    <div>
                        <label for="product-image-url" class="form-label">Ou use URL da imagem:</label>
                        <input type="url" id="product-image-url" class="form-input" value="${safeProduct?.image_url || ''}" placeholder="https://exemplo.com/imagem.jpg">
                    </div>
                </div>
            </div>
        `;
    }

    validateProductForm() {
        const name = document.getElementById('product-name')?.value.trim() || '';
        const category = document.getElementById('product-category')?.value || '';
        const price = parseFloat(document.getElementById('product-price')?.value || 0);
        const stock = parseInt(document.getElementById('product-stock')?.value || 0);
        const imageInput = document.getElementById('product-image');
        const imageUrlInput = document.getElementById('product-image-url');
        const image = imageInput?.value || imageUrlInput?.value || '';

        const errors = [];

        if (!name || name.length < 2) {
            errors.push('Nome do produto deve ter pelo menos 2 caracteres');
        }

        if (!category) {
            errors.push('Categoria é obrigatória');
        }

        if (!price || price <= 0 || isNaN(price)) {
            errors.push('Preço deve ser maior que zero');
        }

        if (stock < 0 || isNaN(stock)) {
            errors.push('Estoque deve ser um número válido');
        }

        if (errors.length > 0) {
            Swal.showValidationMessage(errors.join('<br>'));
            return false;
        }

        const productData = {
            name,
            category,
            price,
            stock,
            image_url: image || null
        };

        // Adicionar campos opcionais apenas se existirem no schema
        if (this.tableSchema.hasStatus) {
            const status = document.getElementById('product-status')?.value || 'active';
            productData.status = status;
        }

        if (this.tableSchema.hasSku) {
            const sku = document.getElementById('product-sku')?.value.trim() || '';
            productData.sku = sku || null;
        }

        if (this.tableSchema.hasDescription) {
            const description = document.getElementById('product-description')?.value.trim() || '';
            productData.description = description || null;
        }

        return productData;
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validações básicas
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.showError('Tipo de arquivo inválido. Use JPEG, PNG ou WebP.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showError('Imagem muito grande. Tamanho máximo: 5MB.');
            return;
        }

        // Criar preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageInput = document.getElementById('product-image');
            const imagePreview = document.getElementById('image-preview');
            const imagePreviewContainer = document.getElementById('image-preview-container');
            const imageUrlInput = document.getElementById('product-image-url');
            
            if (imageInput) imageInput.value = e.target.result;
            if (imagePreview) imagePreview.src = e.target.result;
            if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
            if (imageUrlInput) imageUrlInput.value = '';
        };
        reader.readAsDataURL(file);
    }

    handleImageUrlChange(event) {
        const url = event.target.value.trim();
        if (url) {
            const imageInput = document.getElementById('product-image');
            const imagePreview = document.getElementById('image-preview');
            const imagePreviewContainer = document.getElementById('image-preview-container');
            
            if (imageInput) imageInput.value = url;
            if (imagePreview) imagePreview.src = url;
            if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
        }
    }

    removeImage() {
        const imageInput = document.getElementById('product-image');
        const imagePreview = document.getElementById('image-preview');
        const imagePreviewContainer = document.getElementById('image-preview-container');
        const imageUrlInput = document.getElementById('product-image-url');
        
        if (imageInput) imageInput.value = '';
        if (imagePreview) imagePreview.src = '';
        if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
        if (imageUrlInput) imageUrlInput.value = '';
    }

    // ===== PRODUCT CRUD OPERATIONS =====
    async testConnection() {
        try {
            this.updateDebug('🔍 Testando conexão com Supabase...');
            
            const { data, error, count } = await this.supabase
                .from('products')
                .select('id, name, created_at', { count: 'exact' })
                .limit(1);
            
            if (error) {
                throw error;
            }
            
            const message = count > 0 
                ? `Conexão OK! ${count} produto(s) encontrado(s)`
                : 'Conexão OK! Nenhum produto cadastrado.';
            
            this.updateDebug('✅ ' + message);
            await this.loadProducts();
            return true;
            
        } catch (error) {
            this.updateDebug('❌ Erro na conexão: ' + error.message);
            this.showError('Erro na conexão com o banco de dados: ' + error.message);
            return false;
        }
    }

    async loadProducts() {
        this.updateDebug('📋 Carregando produtos...');
        this.setProductsLoadingState(true);
        
        try {
            let query = this.supabase
                .from('products')
                .select('*', { count: 'exact' });
            
            // Aplicar filtros
            if (this.currentCategoryFilter) {
                query = query.eq('category', this.currentCategoryFilter);
            }
            
            if (this.currentSearchTerm) {
                query = query.ilike('name', `%${this.currentSearchTerm}%`);
            }
            
            // Calcular range para paginação
            const from = (this.currentPage - 1) * this.pageSize;
            const to = from + this.pageSize - 1;
            
            // Ordenar e paginar
            query = query.order('created_at', { ascending: false });
            query = query.range(from, to);
            
            const { data, error, count } = await query;
            
            if (error) {
                throw error;
            }
            
            this.totalPages = Math.ceil(count / this.pageSize);
            this.currentProducts = data || [];
            
            this.updateDebug(`✅ ${data ? data.length : 0} produtos carregados (Página ${this.currentPage}/${this.totalPages})`);
            
            this.renderProductsGrid(this.currentProducts);
            this.updatePaginationControls(count);
            this.updateStats(data || []);
            
        } catch (error) {
            this.updateDebug('❌ Erro ao carregar: ' + error.message);
            this.showError('Erro ao carregar produtos: ' + error.message);
        } finally {
            this.setProductsLoadingState(false);
        }
    }

    async saveProduct(productData, productId = null) {
        this.setLoadingState(true);
        
        try {
            let result;
            
            if (productId) {
                this.updateDebug('🔄 Atualizando produto: ' + productId);
                result = await this.supabase
                    .from('products')
                    .update({
                        ...productData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', productId)
                    .select();
            } else {
                this.updateDebug('➕ Criando novo produto');
                result = await this.supabase
                    .from('products')
                    .insert([productData])
                    .select();
            }
            
            if (result.error) {
                throw result.error;
            }
            
            await this.showSuccess(`Produto ${productId ? 'atualizado' : 'criado'} com sucesso!`);
            await this.loadProducts();
            
        } catch (error) {
            this.updateDebug('❌ Erro ao salvar: ' + error.message);
            this.showError(`Erro ao ${productId ? 'atualizar' : 'criar'} produto: ` + error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    async deleteProduct(productId) {
        const product = this.currentProducts.find(p => p.id === productId);
        if (!product) {
            this.showError('Produto não encontrado');
            return;
        }
        
        const { isConfirmed } = await Swal.fire({
            title: 'Confirmar Exclusão',
            html: `Tem certeza que deseja excluir o produto <strong>"${product.name}"</strong>?<br>Esta ação não pode ser desfeita.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            showClass: {
                popup: 'animate__animated animate__fadeInDown'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp'
            }
        });
        
        if (!isConfirmed) return;
        
        try {
            this.updateDebug('🗑️ Excluindo produto: ' + productId);
            
            const { error } = await this.supabase
                .from('products')
                .delete()
                .eq('id', productId);
            
            if (error) throw error;
            
            await this.showSuccess('Produto excluído permanentemente!');
            await this.loadProducts();
            
        } catch (error) {
            this.updateDebug('❌ Erro ao excluir: ' + error.message);
            this.showError('Erro ao excluir produto: ' + error.message);
        }
    }

    // ===== RENDER FUNCTIONS =====
    updateStats(products) {
        if (this.elements.totalProducts) {
            this.elements.totalProducts.textContent = products.length;
        }
        
        if (this.elements.inStockProducts) {
            const inStock = products.filter(p => p.stock > 0).length;
            this.elements.inStockProducts.textContent = inStock;
        }
        
        if (this.elements.stockValue) {
            const totalValue = products.reduce((sum, product) => {
                return sum + (product.price * (product.stock || 0));
            }, 0);
            this.elements.stockValue.textContent = `R$ ${totalValue.toFixed(2).replace('.', ',')}`;
        }
        
        if (this.elements.productsCount) {
            this.elements.productsCount.textContent = `${products.length} produto(s) encontrado(s)`;
        }
    }

    renderProductsGrid(products) {
        if (!this.elements.productsGrid) return;
        
        if (!products || products.length === 0) {
            this.elements.productsGrid.classList.add('hidden');
            if (this.elements.emptyProducts) this.elements.emptyProducts.classList.remove('hidden');
            this.updateDebug('📭 Nenhum produto encontrado');
            return;
        }
        
        if (this.elements.emptyProducts) this.elements.emptyProducts.classList.add('hidden');
        this.elements.productsGrid.classList.remove('hidden');
        
        this.elements.productsGrid.innerHTML = products.map(product => this.createProductCard(product)).join('');
        this.updateDebug(`📊 Grid atualizada com ${products.length} produtos`);
    }

    createProductCard(product) {
        const formatPrice = (price) => price ? 'R$ ' + parseFloat(price).toFixed(2).replace('.', ',') : 'R$ 0,00';
        const formatCategory = (category) => {
            const categories = {
                'masculino': '👔 Masculino',
                'feminino': '👗 Feminino', 
                'infantil': '👶 Infantil',
                'acessorios': '👜 Acessórios'
            };
            return categories[category] || category;
        };
        
        const stockStatus = this.getStockStatus(product.stock);
        const statusBadge = this.tableSchema.hasStatus && product.status === 'active' ? 'badge-success' : 'badge-error';
        const statusText = this.tableSchema.hasStatus ? (product.status === 'active' ? 'Ativo' : 'Inativo') : 'Ativo';

        // Usar dados disponíveis
        const description = this.tableSchema.hasDescription ? (product.description || 'Sem descrição') : 'Sem descrição';
        const skuInfo = this.tableSchema.hasSku && product.sku ? `<br><i class="fas fa-barcode"></i> ${product.sku}` : '';
        
        // Imagem placeholder segura (SVG base64)
        const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNlbSBJbWFnZW08L3RleHQ+PC9zdmc+';
        
        return `
            <div class="product-card fade-in">
                <div class="product-image-container">
                    <img src="${product.image_url || placeholderImage}" 
                         alt="${product.name}" 
                         class="product-image"
                         onerror="this.src='${placeholderImage}'">
                    <div class="product-badges">
                        <span class="badge ${stockStatus.class}">${stockStatus.text}</span>
                        ${this.tableSchema.hasStatus ? `<span class="badge ${statusBadge}">${statusText}</span>` : ''}
                    </div>
                </div>
                
                <div class="product-content">
                    <h3 class="product-title">${this.escapeHtml(product.name)}</h3>
                    <p class="product-description">${this.escapeHtml(description)}</p>
                    
                    <div class="product-meta">
                        <span class="product-category">${formatCategory(product.category)}</span>
                        <span class="product-price">${formatPrice(product.price)}</span>
                    </div>
                    
                    <div class="product-details">
                        <i class="fas fa-box"></i> Estoque: ${product.stock || 0} unidades
                        ${skuInfo}
                    </div>
                    
                    <div class="product-actions">
                        <button onclick="romanosAdmin.openEditProductModal('${product.id}')" 
                                class="btn btn-secondary">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="romanosAdmin.deleteProduct('${product.id}')" 
                                class="btn btn-danger">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Método auxiliar para escapar HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async openEditProductModal(productId) {
        const product = this.currentProducts.find(p => p.id === productId);
        if (product) {
            await this.openProductForm(product);
        } else {
            this.showError('Produto não encontrado');
        }
    }

    getStockStatus(stock) {
        if (stock > 10) return { class: 'badge-success', text: 'Em Estoque' };
        if (stock > 0) return { class: 'badge-warning', text: `${stock} un` };
        return { class: 'badge-error', text: 'Sem Estoque' };
    }

    // ===== PAGINATION =====
    updatePaginationControls(totalCount) {
        if (!this.elements.paginationControls) return;
        
        if (this.totalPages <= 1) {
            this.elements.paginationControls.classList.add('hidden');
            return;
        }
        
        this.elements.paginationControls.classList.remove('hidden');
        
        let paginationHTML = `
            <div class="pagination">
                <div class="pagination-info">
                    Página ${this.currentPage} de ${this.totalPages} • ${totalCount} produtos no total
                </div>
                
                <div class="pagination-controls">
                    <button onclick="romanosAdmin.goToPage(${this.currentPage - 1})" 
                            ${this.currentPage === 1 ? 'disabled' : ''}
                            class="pagination-btn">
                        ‹ Anterior
                    </button>
                    
                    <div class="pagination-pages">
        `;
        
        // Calcular páginas visíveis
        let startPage = Math.max(1, this.currentPage - Math.floor(this.PAGINATION_CONFIG.visiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + this.PAGINATION_CONFIG.visiblePages - 1);
        
        // Ajustar se estiver no início
        if (endPage - startPage + 1 < this.PAGINATION_CONFIG.visiblePages) {
            startPage = Math.max(1, endPage - this.PAGINATION_CONFIG.visiblePages + 1);
        }
        
        // Primeira página
        if (startPage > 1) {
            paginationHTML += `
                <button onclick="romanosAdmin.goToPage(1)" class="pagination-page">1</button>
                ${startPage > 2 ? '<span class="pagination-ellipsis">...</span>' : ''}
            `;
        }
        
        // Páginas numeradas
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button onclick="romanosAdmin.goToPage(${i})" 
                        class="pagination-page ${this.currentPage === i ? 'active' : ''}">
                    ${i}
                </button>
            `;
        }
        
        // Última página
        if (endPage < this.totalPages) {
            paginationHTML += `
                ${endPage < this.totalPages - 1 ? '<span class="pagination-ellipsis">...</span>' : ''}
                <button onclick="romanosAdmin.goToPage(${this.totalPages})" class="pagination-page">${this.totalPages}</button>
            `;
        }
        
        paginationHTML += `
                    </div>
                    
                    <button onclick="romanosAdmin.goToPage(${this.currentPage + 1})" 
                            ${this.currentPage === this.totalPages ? 'disabled' : ''}
                            class="pagination-btn">
                        Próxima ›
                    </button>
                </div>
            </div>
        `;
        
        this.elements.paginationControls.innerHTML = paginationHTML;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.loadProducts();
        window.scrollTo({ top: this.elements.productsGrid?.offsetTop || 0, behavior: 'smooth' });
    }

    // ===== EXPORTAÇÃO =====
    async exportToCSV() {
        try {
            this.updateDebug('📊 Exportando dados para CSV...');
            
            const { data: products, error } = await this.supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            if (!products || products.length === 0) {
                this.showError('Nenhum dado para exportar.');
                return;
            }
            
            // Cabeçalhos CSV baseados no schema detectado
            const headers = ['ID', 'Nome', 'Categoria', 'Preço', 'Estoque', 'Imagem', 'Criado em'];
            
            if (this.tableSchema.hasDescription) headers.splice(2, 0, 'Descrição');
            if (this.tableSchema.hasSku) headers.splice(5, 0, 'SKU');
            if (this.tableSchema.hasStatus) headers.splice(6, 0, 'Status');
            
            // Dados CSV
            const csvData = products.map(product => {
                const row = [
                    product.id,
                    `"${(product.name || '').replace(/"/g, '""')}"`,
                    product.category,
                    product.price,
                    product.stock,
                    product.image_url,
                    product.created_at
                ];

                if (this.tableSchema.hasDescription) {
                    row.splice(2, 0, `"${(product.description || '').replace(/"/g, '""')}"`);
                }
                if (this.tableSchema.hasSku) {
                    row.splice(5, 0, product.sku);
                }
                if (this.tableSchema.hasStatus) {
                    row.splice(6, 0, product.status);
                }

                return row;
            });
            
            // Combinar cabeçalhos e dados
            const csvContent = [headers, ...csvData]
                .map(row => row.join(','))
                .join('\n');
            
            // Criar e baixar arquivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `produtos_romanos_${new Date().toISOString().split('T')[0]}.csv`);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.updateDebug('✅ Exportação CSV concluída');
            this.showSuccess(`Dados exportados com sucesso! ${products.length} produtos.`);
            
        } catch (error) {
            this.updateDebug('❌ Erro na exportação CSV: ' + error.message);
            this.showError('Erro ao exportar dados: ' + error.message);
        }
    }

    async exportToJSON() {
        try {
            this.updateDebug('📊 Exportando dados para JSON...');
            
            const { data: products, error } = await this.supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            if (!products || products.length === 0) {
                this.showError('Nenhum dado para exportar.');
                return;
            }
            
            // Estruturar dados para exportação
            const exportData = {
                export_date: new Date().toISOString(),
                store: 'Romanos Store',
                total_products: products.length,
                schema: this.tableSchema,
                products: products.map(product => {
                    const productData = {
                        id: product.id,
                        name: product.name,
                        category: product.category,
                        price: product.price,
                        stock: product.stock,
                        image_url: product.image_url,
                        created_at: product.created_at,
                        updated_at: product.updated_at
                    };

                    if (this.tableSchema.hasDescription) {
                        productData.description = product.description;
                    }
                    if (this.tableSchema.hasSku) {
                        productData.sku = product.sku;
                    }
                    if (this.tableSchema.hasStatus) {
                        productData.status = product.status;
                    }

                    return productData;
                })
            };
            
            // Criar e baixar arquivo
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `produtos_romanos_${new Date().toISOString().split('T')[0]}.json`);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.updateDebug('✅ Exportação JSON concluída');
            this.showSuccess(`Dados exportados com sucesso! ${products.length} produtos.`);
            
        } catch (error) {
            this.updateDebug('❌ Erro na exportação JSON: ' + error.message);
            this.showError('Erro ao exportar dados: ' + error.message);
        }
    }

    // ===== BACKUP SYSTEM =====
    async createManualBackup() {
        try {
            this.updateDebug('💾 Criando backup manual...');
            
            const { data: products, error } = await this.supabase
                .from('products')
                .select('*');
            
            if (error) throw error;
            
            if (!products || products.length === 0) {
                this.showError('Nenhum dado para backup.');
                return;
            }
            
            const backupData = {
                timestamp: new Date().toISOString(),
                type: 'manual_backup',
                store: 'Romanos Store',
                total_products: products.length,
                schema: this.tableSchema,
                products: products
            };
            
            // Salvar no localStorage
            const backupKey = `backup_romanos_${new Date().toISOString().replace(/[:.]/g, '-')}`;
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            
            // Oferecer download
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `backup_romanos_${new Date().toISOString().split('T')[0]}.json`);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.updateDebug('✅ Backup manual criado e baixado');
            this.showSuccess(`Backup criado com sucesso! ${products.length} produtos salvos.`);
            
        } catch (error) {
            this.updateDebug('❌ Erro no backup manual: ' + error.message);
            this.showError('Erro ao criar backup: ' + error.message);
        }
    }

    // ===== UTILITY FUNCTIONS =====
    setLoadingState(loading) {
        this.isLoading = loading;
    }

    setProductsLoadingState(loading) {
        if (this.elements.loadingProducts) {
            this.elements.loadingProducts.classList.toggle('hidden', !loading);
        }
        
        if (loading) {
            this.elements.productsGrid?.classList.add('hidden');
            this.elements.emptyProducts?.classList.add('hidden');
            this.elements.paginationControls?.classList.add('hidden');
        }
    }

    clearSearch() {
        if (this.elements.searchProducts) {
            this.elements.searchProducts.value = '';
        }
        this.currentSearchTerm = '';
        this.currentPage = 1;
        this.loadProducts();
    }

    clearFilters() {
        if (this.elements.categoryFilter) this.elements.categoryFilter.value = '';
        
        this.currentCategoryFilter = '';
        this.currentPage = 1;
        this.loadProducts();
    }

    toggleDebug() {
        if (this.elements.debugPanel) {
            this.elements.debugPanel.classList.toggle('hidden');
        }
    }

    clearDebug() {
        if (this.elements.debugContent) {
            this.elements.debugContent.innerHTML = 'Console limpo...';
        }
    }
}

// Inicializa a aplicação
const romanosAdmin = new RomanosAdmin();

// Torna disponível globalmente
window.romanosAdmin = romanosAdmin;